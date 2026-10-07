import type { Ficha, LoteFichas, LoteFichasItem } from '@/types/pos'

/** "L03" — identificação curta do lote, impressa nas fichas. */
export function formatNumeroLote(numero: number): string {
  return `L${String(numero).padStart(2, '0')}`
}

/** Número impresso na ficha: "0012" (venda normal) ou "L03-0012" (lote antecipado). */
export function formatNumeroFicha(ficha: Pick<Ficha, 'sequencial' | 'lote_numero'>): string {
  const seq = String(ficha.sequencial).padStart(4, '0')
  return ficha.lote_numero ? `${formatNumeroLote(ficha.lote_numero)}-${seq}` : seq
}

/** Rótulo acima do produto. Só ASCII: a Elgin imprime em CP850. */
export function rotuloFicha(ficha: Pick<Ficha, 'lote_numero'>): string {
  return ficha.lote_numero ? `Vale consumo - Lote ${formatNumeroLote(ficha.lote_numero)}` : 'Vale consumo'
}

export interface LinhaPrestacao {
  item: LoteFichasItem
  devolvidas: number
  vendidas: number
  valor: number
}

export interface ResumoPrestacao {
  linhas: LinhaPrestacao[]
  totalFichas: number
  totalDevolvidas: number
  totalVendidas: number
  valorAReceber: number
  /** Mensagem amigável quando alguma devolução é inválida. */
  erro?: string
}

/**
 * Calcula a prestação de contas: fichas que não voltaram contam como vendidas
 * (ficha antecipada vale como dinheiro).
 */
export function calcularPrestacao(
  itens: LoteFichasItem[],
  devolvidasPorProduto: Record<string, number>,
): ResumoPrestacao {
  let erro: string | undefined
  const linhas = itens.map((item) => {
    const devolvidas = devolvidasPorProduto[item.produto_id] ?? 0
    if (!Number.isInteger(devolvidas) || devolvidas < 0 || devolvidas > item.quantidade) {
      erro ??= `Devolução de "${item.produto_nome}" deve ser um número inteiro entre 0 e ${item.quantidade}.`
    }
    const vendidas = Math.max(0, item.quantidade - devolvidas)
    return { item, devolvidas, vendidas, valor: vendidas * item.preco_unitario }
  })

  return {
    linhas,
    totalFichas: linhas.reduce((acc, l) => acc + l.item.quantidade, 0),
    totalDevolvidas: linhas.reduce((acc, l) => acc + l.devolvidas, 0),
    totalVendidas: linhas.reduce((acc, l) => acc + l.vendidas, 0),
    valorAReceber: linhas.reduce((acc, l) => acc + l.valor, 0),
    erro,
  }
}

export function totalFichasLote(lote: Pick<LoteFichas, 'itens'>): number {
  return lote.itens.reduce((acc, it) => acc + it.quantidade, 0)
}

export function valorTotalLote(lote: Pick<LoteFichas, 'itens'>): number {
  return lote.itens.reduce((acc, it) => acc + it.quantidade * it.preco_unitario, 0)
}

/** Unidades reservadas em lotes abertos, por produto (para mostrar "na rua"). */
export function reservadoEmLotes(lotes: LoteFichas[]): Map<string, number> {
  const mapa = new Map<string, number>()
  for (const lote of lotes) {
    if (lote.status !== 'aberto') continue
    for (const it of lote.itens) {
      mapa.set(it.produto_id, (mapa.get(it.produto_id) ?? 0) + it.quantidade)
    }
  }
  return mapa
}
