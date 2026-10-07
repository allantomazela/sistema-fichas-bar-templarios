import type Database from '@tauri-apps/plugin-sql'
import { jsonDoItem } from './parsedCache'

/**
 * Listas (vendas, fichas, estoque, catálogo...) gravadas no SQLite uma linha por item,
 * em vez de um texto único: cada venda envia ao disco só os itens que mudaram.
 *
 * Tabela `kv_rows (key, pos, json)`. O item de índice i fica na posição `inicio + i`;
 * uma linha de controle (key = `<chave>#meta`) guarda { inicio, tamanho }. Linhas fora
 * dessa faixa são lixo e são ignoradas na leitura — é isso que torna cada gravação
 * atômica sem depender de transação (o pool do plugin SQL não garante a mesma conexão):
 * - parcial: itens alterados + linha de controle num único comando SQL;
 * - completa: itens numa faixa nova (ainda invisível) e, por último, a linha de controle.
 */
export type ExecutorSql = Pick<Database, 'execute' | 'select'>

export interface EstadoGravado {
  inicio: number
  itens: readonly unknown[]
}

type Linha = [pos: number, item: unknown]

export type PlanoGravacao =
  | { tipo: 'nada' }
  | { tipo: 'completa' }
  | { tipo: 'parcial'; inicio: number; linhas: Linha[] }

interface Controle {
  inicio: number
  tamanho: number
}

/** Linhas por comando: 3 parâmetros cada, abaixo do limite de 999 de builds antigos do SQLite. */
const LINHAS_POR_COMANDO = 300
const SUFIXO_CONTROLE = '#meta'

/**
 * Decide o que gravar comparando os itens por identidade (são imutáveis — ver parsedCache).
 * Testa duas âncoras: manter o começo (itens adicionados no fim) ou manter o fim
 * (itens adicionados no começo, como vendas e fichas) e fica com a que grava menos linhas.
 */
export function planejarGravacao(
  anterior: EstadoGravado | null,
  atuais: readonly unknown[],
): PlanoGravacao {
  if (!anterior) return { tipo: 'completa' }
  const ancoras = [anterior.inicio, anterior.inicio + anterior.itens.length - atuais.length]
  const planos = ancoras.map((inicio) => ({ inicio, linhas: linhasAlteradas(anterior, atuais, inicio) }))
  const melhor = planos[0].linhas.length <= planos[1].linhas.length ? planos[0] : planos[1]

  const mesmaFaixa = melhor.inicio === anterior.inicio && atuais.length === anterior.itens.length
  if (melhor.linhas.length === 0 && mesmaFaixa) return { tipo: 'nada' }
  if (melhor.linhas.length >= LINHAS_POR_COMANDO) return { tipo: 'completa' }
  return { tipo: 'parcial', ...melhor }
}

function linhasAlteradas(anterior: EstadoGravado, atuais: readonly unknown[], inicio: number): Linha[] {
  const deslocamento = inicio - anterior.inicio
  const linhas: Linha[] = []
  for (let i = 0; i < atuais.length; i++) {
    if (anterior.itens[i + deslocamento] !== atuais[i]) linhas.push([inicio + i, atuais[i]])
  }
  return linhas
}

/** Grava a lista e devolve o novo estado persistido. Em erro, o estado no disco é incerto. */
export async function gravarLista(
  db: ExecutorSql,
  key: string,
  anterior: EstadoGravado | null,
  itens: readonly unknown[],
): Promise<EstadoGravado> {
  const plano = planejarGravacao(anterior, itens)
  if (plano.tipo === 'nada') return anterior as EstadoGravado
  if (plano.tipo === 'completa') return reescreverLista(db, key, itens)

  const controle = { inicio: plano.inicio, tamanho: itens.length }
  await inserirLinhas(db, key, plano.linhas, controle)
  const anteriorDentroDaFaixa =
    anterior!.inicio >= controle.inicio &&
    anterior!.inicio + anterior!.itens.length <= controle.inicio + controle.tamanho
  if (!anteriorDentroDaFaixa) await descartarLixo(db, key, controle)
  return { inicio: plano.inicio, itens }
}

async function reescreverLista(db: ExecutorSql, key: string, itens: readonly unknown[]): Promise<EstadoGravado> {
  const [ultima] = await db.select<{ proxima: number | null }[]>(
    'SELECT MAX(pos) + 1 AS proxima FROM kv_rows WHERE key = $1',
    [key],
  )
  const inicio = ultima?.proxima ?? 0
  const linhas = itens.map((item, i): Linha => [inicio + i, item])
  for (let i = 0; i < linhas.length; i += LINHAS_POR_COMANDO) {
    await inserirLinhas(db, key, linhas.slice(i, i + LINHAS_POR_COMANDO))
  }
  const controle = { inicio, tamanho: itens.length }
  await inserirLinhas(db, key, [], controle)
  await descartarLixo(db, key, controle)
  return { inicio, itens }
}

/** Itens e (opcionalmente) a linha de controle num único comando — atômico no SQLite. */
async function inserirLinhas(db: ExecutorSql, key: string, linhas: Linha[], controle?: Controle) {
  const valores: unknown[] = []
  const tuplas: string[] = []
  const adicionar = (chave: string, pos: number, json: string) => {
    const n = valores.length
    tuplas.push(`($${n + 1}, $${n + 2}, $${n + 3})`)
    valores.push(chave, pos, json)
  }
  for (const [pos, item] of linhas) adicionar(key, pos, jsonDoItem(item))
  if (controle) adicionar(key + SUFIXO_CONTROLE, 0, JSON.stringify(controle))
  if (tuplas.length === 0) return
  await db.execute(`INSERT OR REPLACE INTO kv_rows (key, pos, json) VALUES ${tuplas.join(', ')}`, valores)
}

/** Lixo não afeta a leitura; falhar aqui só adia a limpeza para o próximo boot. */
async function descartarLixo(db: ExecutorSql, key: string, controle: Controle) {
  try {
    await db.execute('DELETE FROM kv_rows WHERE key = $1 AND (pos < $2 OR pos >= $3)', [
      key,
      controle.inicio,
      controle.inicio + controle.tamanho,
    ])
  } catch (err) {
    console.warn(`Limpeza de linhas antigas de ${key} adiada`, err)
  }
}

export async function apagarLista(db: ExecutorSql, key: string): Promise<void> {
  await db.execute('DELETE FROM kv_rows WHERE key IN ($1, $2)', [key, key + SUFIXO_CONTROLE])
}

export interface ListaLida {
  inicio: number
  /** JSON de cada item, na ordem. `null` = linhas faltando (dados corrompidos). */
  jsons: string[] | null
}

/** Lê todas as listas gravadas e descarta linhas fora da faixa válida (sobras de gravações interrompidas). */
export async function lerListas(db: ExecutorSql): Promise<Map<string, ListaLida>> {
  const linhas = await db.select<{ key: string; pos: number; json: string }[]>(
    'SELECT key, pos, json FROM kv_rows ORDER BY key, pos',
  )
  const controles = new Map<string, Controle | null>()
  const porChave = new Map<string, { pos: number; json: string }[]>()
  for (const linha of linhas) {
    if (linha.key.endsWith(SUFIXO_CONTROLE)) {
      controles.set(linha.key.slice(0, -SUFIXO_CONTROLE.length), lerControle(linha.json))
    } else {
      const lista = porChave.get(linha.key) ?? []
      lista.push(linha)
      porChave.set(linha.key, lista)
    }
  }

  const listas = new Map<string, ListaLida>()
  for (const [key, controle] of controles) {
    if (!controle) {
      listas.set(key, { inicio: 0, jsons: null })
      continue
    }
    const validas = (porChave.get(key) ?? []).filter(
      (l) => l.pos >= controle.inicio && l.pos < controle.inicio + controle.tamanho,
    )
    const completa = validas.length === controle.tamanho
    listas.set(key, { inicio: controle.inicio, jsons: completa ? validas.map((l) => l.json) : null })
    if (completa && validas.length !== porChave.get(key)?.length) await descartarLixo(db, key, controle)
  }
  for (const key of porChave.keys()) {
    if (!controles.has(key)) await apagarLista(db, key)
  }
  return listas
}

function lerControle(json: string): Controle | null {
  try {
    const controle = JSON.parse(json) as Partial<Controle>
    const valido = Number.isInteger(controle.inicio) && Number.isInteger(controle.tamanho) && controle.tamanho! >= 0
    return valido ? (controle as Controle) : null
  } catch {
    return null
  }
}
