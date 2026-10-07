import type {
  CartItem,
  ComboItem,
  MovimentacaoEstoque,
  Produto,
  TipoMovimentacaoEstoque,
  Venda,
} from '@/types/pos'

export const ESTOQUE_MINIMO_PADRAO = 10

export type StatusEstoque = 'ok' | 'baixo' | 'esgotado' | 'sem_controle'

/** Item que consome estoque (item de carrinho ou item de venda gravada). */
export interface ItemConsumivel {
  produto_id: string
  quantidade: number
  is_combo?: boolean
  itens_combo?: ComboItem[]
}

export interface DisponibilidadeProduto {
  controlado: boolean
  /** Unidades vendáveis agora (null = sem controle de estoque). */
  disponivel: number | null
  status: StatusEstoque
  /** Em combos: nome do componente que limita a quantidade disponível. */
  limitadoPor?: string
}

export interface ResultadoValidacaoEstoque {
  ok: boolean
  /** Presente quando ok = false. */
  motivo?: string
}

export function isEstoqueControlado(produto: Produto): boolean {
  return !!produto.controla_estoque && typeof produto.estoque_atual === 'number'
}

function isComboComComponentes(item: ItemConsumivel): boolean {
  return !!item.is_combo && !!item.itens_combo && item.itens_combo.length > 0
}

/**
 * Quantidade de cada produto físico consumida pelos itens.
 * Combos consomem seus componentes (não o próprio combo).
 */
export function computeConsumoEstoque(itens: ItemConsumivel[]): Map<string, number> {
  const consumo = new Map<string, number>()
  const somar = (produtoId: string, qtd: number) => {
    if (qtd <= 0) return
    consumo.set(produtoId, (consumo.get(produtoId) || 0) + qtd)
  }

  for (const item of itens) {
    if (isComboComComponentes(item)) {
      for (const sub of item.itens_combo as ComboItem[]) {
        somar(sub.produto_id, item.quantidade * sub.quantidade)
      }
    } else {
      somar(item.produto_id, item.quantidade)
    }
  }
  return consumo
}

export function cartToConsumiveis(carrinho: CartItem[]): ItemConsumivel[] {
  return carrinho.map((ci) => ({
    produto_id: ci.produto.id,
    quantidade: ci.quantidade,
    is_combo: ci.produto.is_combo,
    itens_combo: ci.produto.itens_combo,
  }))
}

function statusPorSaldo(saldo: number, minimo: number): StatusEstoque {
  if (saldo <= 0) return 'esgotado'
  if (saldo <= minimo) return 'baixo'
  return 'ok'
}

/** Status de um produto físico (sem considerar combos). */
export function getStatusEstoque(produto: Produto): StatusEstoque {
  if (!isEstoqueControlado(produto)) return 'sem_controle'
  return statusPorSaldo(
    produto.estoque_atual as number,
    produto.estoque_minimo ?? ESTOQUE_MINIMO_PADRAO,
  )
}

/**
 * Quantas unidades do produto podem ser vendidas agora.
 * Para combos, é limitado pelo componente com menor saldo proporcional.
 */
export function getDisponibilidade(
  produto: Produto,
  produtosPorId: Map<string, Produto>,
): DisponibilidadeProduto {
  if (!produto.is_combo || !produto.itens_combo || produto.itens_combo.length === 0) {
    const controlado = isEstoqueControlado(produto)
    return {
      controlado,
      disponivel: controlado ? Math.max(0, produto.estoque_atual as number) : null,
      status: getStatusEstoque(produto),
    }
  }

  let disponivel: number | null = null
  let limitadoPor: string | undefined
  let algumBaixo = false

  for (const sub of produto.itens_combo) {
    const componente = produtosPorId.get(sub.produto_id)
    if (!componente || !isEstoqueControlado(componente) || sub.quantidade <= 0) continue
    const possivel = Math.floor(Math.max(0, componente.estoque_atual as number) / sub.quantidade)
    if (getStatusEstoque(componente) === 'baixo') algumBaixo = true
    if (disponivel === null || possivel < disponivel) {
      disponivel = possivel
      limitadoPor = componente.nome
    }
  }

  if (disponivel === null) {
    return { controlado: false, disponivel: null, status: 'sem_controle' }
  }
  const status: StatusEstoque = disponivel <= 0 ? 'esgotado' : algumBaixo ? 'baixo' : 'ok'
  return { controlado: true, disponivel, status, limitadoPor }
}

/**
 * Confere se o carrinho inteiro cabe no estoque atual.
 * Usa sempre o catálogo atualizado (não o snapshot guardado no carrinho).
 */
export function validarEstoqueCarrinho(
  carrinho: CartItem[],
  produtos: Produto[],
): ResultadoValidacaoEstoque {
  const produtosPorId = new Map(produtos.map((p) => [p.id, p]))
  const consumo = computeConsumoEstoque(cartToConsumiveis(carrinho))

  for (const [produtoId, necessario] of consumo) {
    const produto = produtosPorId.get(produtoId)
    if (!produto || !isEstoqueControlado(produto)) continue
    const saldo = Math.max(0, produto.estoque_atual as number)
    if (necessario > saldo) {
      return {
        ok: false,
        motivo: `Estoque insuficiente para "${produto.nome}". Disponível: ${saldo} un, necessário: ${necessario} un.`,
      }
    }
  }
  return { ok: true }
}

/** Unidades físicas que saíram por vendas concluídas (combos contam pelos componentes). */
export function computeSaidasPorVendas(vendas: Venda[], caixaId?: string): Map<string, number> {
  const itens: ItemConsumivel[] = []
  for (const venda of vendas) {
    if (venda.status !== 'concluida') continue
    if (caixaId && venda.caixa_id !== caixaId) continue
    itens.push(...venda.itens)
  }
  return computeConsumoEstoque(itens)
}

export type TipoLancamentoManual = 'entrada' | 'ajuste' | 'perda'

/** Só lançamentos manuais podem ser corrigidos; venda/estorno mudam cancelando a venda. */
export function isLancamentoManual(tipo: TipoMovimentacaoEstoque): tipo is TipoLancamentoManual {
  return tipo === 'entrada' || tipo === 'ajuste' || tipo === 'perda'
}

/**
 * Variação de saldo de um lançamento manual.
 * entrada/perda: `informado` é a quantidade · ajuste: `informado` é o saldo contado.
 */
export function calcularVariacaoLancamento(
  tipo: TipoLancamentoManual,
  informado: number,
  estoqueAnterior: number,
): number {
  if (tipo === 'entrada') return informado
  if (tipo === 'perda') return -informado
  return informado - estoqueAnterior
}

/** Valor que o usuário digitou originalmente no lançamento (inverso de calcularVariacaoLancamento). */
export function valorInformadoDoLancamento(mov: MovimentacaoEstoque): number {
  return mov.tipo === 'ajuste' ? mov.estoque_posterior : Math.abs(mov.quantidade)
}

/** Converte texto digitado em inteiro ≥ 0 (null se inválido). */
export function parseQuantidadeInteira(bruto: string): number | null {
  if (bruto.trim() === '') return null
  const valor = Number(bruto)
  return Number.isInteger(valor) && valor >= 0 ? valor : null
}

export interface ResumoEstoque {
  controlados: number
  esgotados: number
  baixos: number
  unidadesEmEstoque: number
}

export function computeResumoEstoque(produtos: Produto[]): ResumoEstoque {
  const resumo: ResumoEstoque = { controlados: 0, esgotados: 0, baixos: 0, unidadesEmEstoque: 0 }
  for (const produto of produtos) {
    const status = getStatusEstoque(produto)
    if (status === 'sem_controle') continue
    resumo.controlados++
    resumo.unidadesEmEstoque += Math.max(0, produto.estoque_atual as number)
    if (status === 'esgotado') resumo.esgotados++
    if (status === 'baixo') resumo.baixos++
  }
  return resumo
}
