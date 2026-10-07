import type Database from '@tauri-apps/plugin-sql'
import type { Categoria, Produto, Caixa, MovimentacaoCaixa, Venda, Ficha } from '@/types/pos'
import { guardarArrayEmCache, jsonDoItem, lerArrayEmCache } from './parsedCache'

/**
 * Espelha os JSON do kv_store em tabelas relacionais (consultas/relatórios futuros).
 * A fonte de verdade continua sendo o kv_store; falhas aqui não afetam vendas.
 *
 * Desempenho: a 1ª sincronização de cada tabela recria tudo; as seguintes gravam só as
 * linhas novas/alteradas e apagam as removidas. Como os itens são imutáveis (ver
 * parsedCache), "alterado" = objeto diferente do que foi sincronizado da última vez.
 */
interface EspelhoTabela<T> {
  tabela: string
  colunas: string[]
  linha: (item: T) => unknown[]
}

const ESPELHOS: Record<string, EspelhoTabela<never>> = {
  templarios_pdv_categorias: espelho<Categoria>('categorias', ['id', 'nome', 'ordem', 'ativa', 'json'], (c) => [
    c.id, c.nome, c.ordem ?? 0, 1, jsonDoItem(c),
  ]),
  templarios_pdv_produtos: espelho<Produto>(
    'produtos',
    ['id', 'nome', 'categoria_id', 'preco', 'ativo', 'json'],
    (p) => [p.id, p.nome, p.categoria_id ?? null, p.preco ?? 0, p.ativo === false ? 0 : 1, jsonDoItem(p)],
  ),
  templarios_pdv_caixas: espelho<Caixa>(
    'caixas',
    ['id', 'operador', 'status', 'abertura', 'fechamento', 'json'],
    (c) => [c.id, c.operador ?? null, c.status, c.abertura ?? null, c.fechamento ?? null, jsonDoItem(c)],
  ),
  templarios_pdv_movimentacoes: espelho<MovimentacaoCaixa>(
    'movimentacoes',
    ['id', 'caixa_id', 'tipo', 'valor', 'data_hora', 'json'],
    (m) => [m.id, m.caixa_id, m.tipo, m.valor, m.data_hora ?? null, jsonDoItem(m)],
  ),
  templarios_pdv_vendas: espelho<Venda>(
    'vendas',
    ['id', 'sequencial', 'caixa_id', 'operador', 'data_hora', 'total', 'forma_pagamento', 'status', 'json'],
    (v) => [
      v.id, v.sequencial_venda, v.caixa_id ?? null, v.operador ?? null, v.data_hora ?? null,
      v.total ?? 0, v.forma_pagamento ?? null, v.status, jsonDoItem(v),
    ],
  ),
  templarios_pdv_fichas: espelho<Ficha>(
    'fichas',
    ['id', 'venda_id', 'sequencial', 'produto_id', 'produto_nome', 'status', 'data_emissao', 'caixa_id', 'json'],
    (f) => [
      f.id, f.venda_id, f.sequencial, f.produto_id ?? null, f.produto_nome ?? null, f.status,
      f.data_emissao ?? null, f.caixa_id ?? null, jsonDoItem(f),
    ],
  ),
}

/** Itens sincronizados por tabela (id → objeto). Ausente = próxima sync recria a tabela. */
const sincronizados = new Map<string, Map<string, unknown>>()

export function isDomainKey(key: string): boolean {
  return Object.hasOwn(ESPELHOS, key)
}

/** Boot: recria todas as tabelas-espelho a partir do kv_store. */
export async function syncDomainTablesFromKv(
  db: Database,
  getJson: (key: string) => string | null,
): Promise<void> {
  sincronizados.clear()
  await syncDomainKeys(db, Object.keys(ESPELHOS), getJson)
}

/** Sincroniza apenas as tabelas cujas chaves mudaram. */
export async function syncDomainKeys(
  db: Database,
  keys: Iterable<string>,
  getJson: (key: string) => string | null,
): Promise<void> {
  for (const key of keys) {
    if (!isDomainKey(key)) continue
    const espelhoTabela = ESPELHOS[key] as EspelhoTabela<{ id: string }>
    try {
      await sincronizarTabela(db, espelhoTabela, lerItens(key, getJson(key)))
    } catch (err) {
      sincronizados.delete(espelhoTabela.tabela)
      throw err
    }
  }
}

async function sincronizarTabela<T extends { id: string }>(
  db: Database,
  espelhoTabela: EspelhoTabela<T>,
  itens: readonly T[],
): Promise<void> {
  const { tabela } = espelhoTabela
  const anteriores = sincronizados.get(tabela)
  const atuais = new Map(itens.map((item) => [item.id, item as unknown]))

  if (!anteriores) {
    await db.execute(`DELETE FROM ${tabela}`)
    await gravarLinhas(db, espelhoTabela, itens)
  } else {
    const removidos = [...anteriores.keys()].filter((id) => !atuais.has(id))
    const alterados = itens.filter((item) => anteriores.get(item.id) !== item)
    await apagarLinhas(db, tabela, removidos)
    await gravarLinhas(db, espelhoTabela, alterados)
  }
  sincronizados.set(tabela, atuais)
}

/** Linhas por comando — mantém (linhas × colunas) abaixo do limite de 999 parâmetros do SQLite. */
const LINHAS_POR_COMANDO = 100

/** `tabela`/`colunas` são constantes internas — nunca vêm de entrada do usuário. */
async function gravarLinhas<T>(db: Database, espelhoTabela: EspelhoTabela<T>, itens: readonly T[]) {
  const { tabela, colunas, linha } = espelhoTabela
  for (let inicio = 0; inicio < itens.length; inicio += LINHAS_POR_COMANDO) {
    const lote = itens.slice(inicio, inicio + LINHAS_POR_COMANDO)
    const values = lote
      .map((_, i) => `(${colunas.map((_, c) => `$${i * colunas.length + c + 1}`).join(', ')})`)
      .join(', ')
    await db.execute(
      `INSERT OR REPLACE INTO ${tabela} (${colunas.join(', ')}) VALUES ${values}`,
      lote.flatMap(linha),
    )
  }
}

async function apagarLinhas(db: Database, tabela: string, ids: string[]) {
  for (let inicio = 0; inicio < ids.length; inicio += LINHAS_POR_COMANDO * 5) {
    const lote = ids.slice(inicio, inicio + LINHAS_POR_COMANDO * 5)
    const params = lote.map((_, i) => `$${i + 1}`).join(', ')
    await db.execute(`DELETE FROM ${tabela} WHERE id IN (${params})`, lote)
  }
}

/** Usa o array já interpretado pelo kvStore quando possível (sem reinterpretar o JSON). */
function lerItens<T>(key: string, raw: string | null): readonly T[] {
  if (!raw) return []
  const emCache = lerArrayEmCache(key, raw)
  if (emCache) return emCache as readonly T[]
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    guardarArrayEmCache(key, raw, parsed)
    return parsed as T[]
  } catch {
    return []
  }
}

function espelho<T>(tabela: string, colunas: string[], linha: (item: T) => unknown[]) {
  return { tabela, colunas, linha } as EspelhoTabela<never>
}
