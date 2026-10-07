import type { MovimentacaoEstoque, Produto } from '@/types/pos'
import {
  calcularVariacaoLancamento,
  isLancamentoManual,
  type TipoLancamentoManual,
} from '@/lib/stock'
import { LocalDatabaseService } from './db'
import { StockService } from './stockService'

const MSG_SOMENTE_MANUAL =
  'Só entradas, contagens e perdas podem ser alteradas. Para desfazer uma venda, cancele-a em Relatórios.'

interface Contexto {
  movimento: MovimentacaoEstoque & { tipo: TipoLancamentoManual }
  movimentos: MovimentacaoEstoque[]
  produtos: Produto[]
  produto: Produto | undefined
}

function carregar(movimentoId: string): Contexto {
  const movimentos = StockService.getMovimentacoes()
  const movimento = movimentos.find((m) => m.id === movimentoId)
  if (!movimento) throw new Error('Lançamento não encontrado. Atualize a tela e tente de novo.')
  if (!isLancamentoManual(movimento.tipo)) throw new Error(MSG_SOMENTE_MANUAL)

  const produtos = LocalDatabaseService.getProdutos()
  const produto = produtos.find((p) => p.id === movimento.produto_id)
  return {
    movimento: movimento as Contexto['movimento'],
    movimentos,
    produtos,
    produto,
  }
}

/** Aplica `diferenca` ao saldo atual do produto; recusa se o saldo ficar negativo. */
function aplicarDiferenca(produtos: Produto[], produto: Produto, diferenca: number): Produto[] {
  if (!produto.controla_estoque || diferenca === 0) return produtos
  const saldoAtual = produto.estoque_atual ?? 0
  const novoSaldo = saldoAtual + diferenca
  if (novoSaldo < 0) {
    throw new Error(
      `Não é possível: o saldo atual de "${produto.nome}" é ${saldoAtual} un e ficaria negativo (${novoSaldo}). ` +
        'Provavelmente parte dessas unidades já foi vendida — faça uma contagem em vez disso.',
    )
  }
  return produtos.map((p) => (p.id === produto.id ? { ...p, estoque_atual: novoSaldo } : p))
}

export class StockLedger {
  /**
   * Corrige um lançamento manual. O saldo atual muda pela diferença entre
   * o valor antigo e o novo (como se o lançamento tivesse sido feito certo).
   */
  static editar(params: {
    movimentoId: string
    informado: number
    motivo?: string
    operador?: string
  }): MovimentacaoEstoque {
    const informado = Math.floor(params.informado)
    const { movimento, movimentos, produtos, produto } = carregar(params.movimentoId)

    if (!Number.isFinite(informado) || informado < 0) {
      throw new Error('Informe uma quantidade válida (número inteiro, zero ou maior).')
    }
    if (movimento.tipo !== 'ajuste' && informado === 0) {
      throw new Error('A quantidade precisa ser maior que zero. Para anular o lançamento, exclua-o.')
    }

    const novaVariacao = calcularVariacaoLancamento(
      movimento.tipo,
      informado,
      movimento.estoque_anterior,
    )
    const novosProdutos = produto
      ? aplicarDiferenca(produtos, produto, novaVariacao - movimento.quantidade)
      : produtos

    const atualizado: MovimentacaoEstoque = {
      ...movimento,
      quantidade: novaVariacao,
      estoque_posterior: movimento.estoque_anterior + novaVariacao,
      motivo: params.motivo?.trim() || undefined,
      editado_em: new Date().toISOString(),
      editado_por: params.operador,
    }

    LocalDatabaseService.saveProdutos(novosProdutos)
    StockService.substituirTudo(movimentos.map((m) => (m.id === movimento.id ? atualizado : m)))
    return atualizado
  }

  /** Exclui um lançamento manual e desfaz o efeito dele no saldo atual. */
  static excluir(movimentoId: string): void {
    const { movimento, movimentos, produtos, produto } = carregar(movimentoId)
    const novosProdutos = produto ? aplicarDiferenca(produtos, produto, -movimento.quantidade) : produtos

    LocalDatabaseService.saveProdutos(novosProdutos)
    StockService.substituirTudo(movimentos.filter((m) => m.id !== movimento.id))
  }

  /** Saldo que o produto terá após corrigir/excluir (para mostrar antes de confirmar). */
  static previsaoSaldo(produto: Produto | undefined, diferenca: number): number | null {
    if (!produto?.controla_estoque) return null
    return (produto.estoque_atual ?? 0) + diferenca
  }
}
