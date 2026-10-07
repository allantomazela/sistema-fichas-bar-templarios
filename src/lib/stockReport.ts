import type { Categoria, Produto } from '@/types/pos'
import { ESTOQUE_MINIMO_PADRAO, getStatusEstoque, isEstoqueControlado, type StatusEstoque } from './stock'

export interface LinhaEstoque {
  produto: Produto
  categoriaNome: string
  categoriaCor: string
  status: StatusEstoque
  /** null = produto sem controle de estoque */
  saldo: number | null
  minimo: number | null
  /** Unidades que saíram por vendas no período escolhido. */
  vendido: number
}

const PRIORIDADE_STATUS: Record<StatusEstoque, number> = {
  esgotado: 0,
  baixo: 1,
  ok: 2,
  sem_controle: 3,
}

/** Linhas da posição de estoque (combos ficam de fora: não têm saldo próprio). */
export function buildLinhasEstoque(
  produtos: Produto[],
  categorias: Categoria[],
  saidas: Map<string, number>,
): LinhaEstoque[] {
  const categoriasPorId = new Map(categorias.map((c) => [c.id, c]))

  return produtos
    .filter((p) => !p.is_combo)
    .map((produto) => {
      const categoria = categoriasPorId.get(produto.categoria_id)
      const controlado = isEstoqueControlado(produto)
      return {
        produto,
        categoriaNome: categoria?.nome || 'Sem categoria',
        categoriaCor: categoria?.cor || '#64748b',
        status: getStatusEstoque(produto),
        saldo: controlado ? Math.max(0, produto.estoque_atual as number) : null,
        minimo: controlado ? (produto.estoque_minimo ?? ESTOQUE_MINIMO_PADRAO) : null,
        vendido: saidas.get(produto.id) || 0,
      }
    })
    .sort(
      (a, b) =>
        PRIORIDADE_STATUS[a.status] - PRIORIDADE_STATUS[b.status] ||
        a.produto.nome.localeCompare(b.produto.nome, 'pt-BR'),
    )
}

function csvCell(value: string | number): string {
  const text = String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV com separador ";" e BOM — abre corretamente no Excel em português. */
export function linhasEstoqueToCsv(
  linhas: LinhaEstoque[],
  statusLabel: Record<StatusEstoque, string>,
): string {
  const header = ['Código', 'Produto', 'Categoria', 'Saldo', 'Mínimo', 'Status', 'Vendido no período']
  const rows = linhas.map((l) => [
    l.produto.codigo_rapido,
    l.produto.nome,
    l.categoriaNome,
    l.saldo ?? '',
    l.minimo ?? '',
    statusLabel[l.status],
    l.vendido,
  ])
  const body = [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
  return `\uFEFF${body}\r\n`
}
