import type Database from '@tauri-apps/plugin-sql'
import type {
  Categoria,
  Produto,
  Caixa,
  MovimentacaoCaixa,
  Venda,
  Ficha,
} from '@/types/pos'

/**
 * Espelha os JSON do kv_store em tabelas relacionais (consultas/relatórios futuros).
 * A fonte de verdade da UI continua sendo o cache/kv; isto é dual-write.
 */
export async function syncDomainTablesFromKv(
  db: Database,
  getJson: (key: string) => string | null,
): Promise<void> {
  await syncCategorias(db, parseArray<Categoria>(getJson('templarios_pdv_categorias')))
  await syncProdutos(db, parseArray<Produto>(getJson('templarios_pdv_produtos')))
  await syncCaixas(db, parseArray<Caixa>(getJson('templarios_pdv_caixas')))
  await syncMovimentacoes(db, parseArray<MovimentacaoCaixa>(getJson('templarios_pdv_movimentacoes')))
  await syncVendas(db, parseArray<Venda>(getJson('templarios_pdv_vendas')))
  await syncFichas(db, parseArray<Ficha>(getJson('templarios_pdv_fichas')))
}

function parseArray<T>(raw: string | null): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

async function replaceAll(
  db: Database,
  table: string,
  rows: unknown[][],
  columns: string,
  placeholders: string,
): Promise<void> {
  await db.execute(`DELETE FROM ${table}`)
  for (const row of rows) {
    await db.execute(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`, row)
  }
}

async function syncCategorias(db: Database, items: Categoria[]): Promise<void> {
  await replaceAll(
    db,
    'categorias',
    items.map((c) => [c.id, c.nome, c.ordem ?? 0, 1, JSON.stringify(c)]),
    'id, nome, ordem, ativa, json',
    '$1, $2, $3, $4, $5',
  )
}

async function syncProdutos(db: Database, items: Produto[]): Promise<void> {
  await replaceAll(
    db,
    'produtos',
    items.map((p) => [
      p.id,
      p.nome,
      p.categoria_id ?? null,
      p.preco ?? 0,
      p.ativo === false ? 0 : 1,
      JSON.stringify(p),
    ]),
    'id, nome, categoria_id, preco, ativo, json',
    '$1, $2, $3, $4, $5, $6',
  )
}

async function syncCaixas(db: Database, items: Caixa[]): Promise<void> {
  await replaceAll(
    db,
    'caixas',
    items.map((c) => [
      c.id,
      c.operador ?? null,
      c.status,
      c.abertura ?? null,
      c.fechamento ?? null,
      JSON.stringify(c),
    ]),
    'id, operador, status, abertura, fechamento, json',
    '$1, $2, $3, $4, $5, $6',
  )
}

async function syncMovimentacoes(db: Database, items: MovimentacaoCaixa[]): Promise<void> {
  await replaceAll(
    db,
    'movimentacoes',
    items.map((m) => [
      m.id,
      m.caixa_id,
      m.tipo,
      m.valor,
      m.data_hora ?? null,
      JSON.stringify(m),
    ]),
    'id, caixa_id, tipo, valor, data_hora, json',
    '$1, $2, $3, $4, $5, $6',
  )
}

async function syncVendas(db: Database, items: Venda[]): Promise<void> {
  await replaceAll(
    db,
    'vendas',
    items.map((v) => [
      v.id,
      v.sequencial_venda,
      v.caixa_id ?? null,
      v.operador ?? null,
      v.data_hora ?? null,
      v.total ?? 0,
      v.forma_pagamento ?? null,
      v.status,
      JSON.stringify(v),
    ]),
    'id, sequencial, caixa_id, operador, data_hora, total, forma_pagamento, status, json',
    '$1, $2, $3, $4, $5, $6, $7, $8, $9',
  )
}

async function syncFichas(db: Database, items: Ficha[]): Promise<void> {
  await replaceAll(
    db,
    'fichas',
    items.map((f) => [
      f.id,
      f.venda_id,
      f.sequencial,
      f.produto_id ?? null,
      f.produto_nome ?? null,
      f.status,
      f.data_emissao ?? null,
      f.caixa_id ?? null,
      JSON.stringify(f),
    ]),
    'id, venda_id, sequencial, produto_id, produto_nome, status, data_emissao, caixa_id, json',
    '$1, $2, $3, $4, $5, $6, $7, $8, $9',
  )
}

const DOMAIN_KEYS = new Set([
  'templarios_pdv_categorias',
  'templarios_pdv_produtos',
  'templarios_pdv_caixas',
  'templarios_pdv_movimentacoes',
  'templarios_pdv_vendas',
  'templarios_pdv_fichas',
])

export function isDomainKey(key: string): boolean {
  return DOMAIN_KEYS.has(key)
}
