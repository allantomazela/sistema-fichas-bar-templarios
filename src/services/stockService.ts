import type { MovimentacaoEstoque, Produto, TipoMovimentacaoEstoque } from '@/types/pos'
import { STORAGE_KEYS, generateLocalId, safeGetArray, safeSet } from './kvStore'

/** Limite de registros mantidos no histórico (evita crescimento sem fim no disco). */
const MAX_MOVIMENTACOES = 20000

export interface ContextoMovimentacao {
  tipo: TipoMovimentacaoEstoque
  motivo?: string
  operador?: string
  venda_id?: string
  sequencial_venda?: number
}

export interface ResultadoMovimentacao {
  produtos: Produto[]
  movimentos: MovimentacaoEstoque[]
}

/**
 * Único ponto que altera saldo de estoque: toda variação gera um registro no histórico.
 * Funções puras sobre a lista de produtos — quem chama decide quando gravar.
 */
export class StockService {
  static getMovimentacoes(produtoId?: string): MovimentacaoEstoque[] {
    const all = safeGetArray<MovimentacaoEstoque>(STORAGE_KEYS.MOVIMENTACOES_ESTOQUE)
    return produtoId ? all.filter((m) => m.produto_id === produtoId) : all
  }

  static registrar(movimentos: MovimentacaoEstoque[]): void {
    if (movimentos.length === 0) return
    const all = this.getMovimentacoes()
    const next = [...movimentos].reverse().concat(all)
    safeSet(STORAGE_KEYS.MOVIMENTACOES_ESTOQUE, next.slice(0, MAX_MOVIMENTACOES))
  }

  static substituirTudo(movimentos: MovimentacaoEstoque[]): void {
    safeSet(STORAGE_KEYS.MOVIMENTACOES_ESTOQUE, movimentos.slice(0, MAX_MOVIMENTACOES))
  }

  /**
   * Aplica variações (+entrada / -saída) somente em produtos com controle de estoque.
   * Saldo nunca fica negativo.
   */
  static aplicarVariacoes(
    produtos: Produto[],
    variacoes: Map<string, number>,
    contexto: ContextoMovimentacao,
  ): ResultadoMovimentacao {
    const movimentos: MovimentacaoEstoque[] = []
    const nowIso = new Date().toISOString()

    const atualizados = produtos.map((produto) => {
      const variacao = variacoes.get(produto.id)
      if (!variacao || !produto.controla_estoque) return produto

      const anterior = produto.estoque_atual ?? 0
      const posterior = Math.max(0, anterior + variacao)
      if (posterior === anterior) return produto

      movimentos.push(
        this.criarMovimento(produto, anterior, posterior, contexto, nowIso),
      )
      return { ...produto, estoque_atual: posterior }
    })

    return { produtos: atualizados, movimentos }
  }

  /** Define o saldo absoluto (contagem física / cadastro) e registra a diferença. */
  static definirSaldo(
    produtos: Produto[],
    produtoId: string,
    novoSaldo: number,
    contexto: ContextoMovimentacao,
  ): ResultadoMovimentacao {
    const movimentos: MovimentacaoEstoque[] = []
    const nowIso = new Date().toISOString()
    const saldo = Math.max(0, Math.floor(novoSaldo))

    const atualizados = produtos.map((produto) => {
      if (produto.id !== produtoId) return produto
      const anterior = produto.estoque_atual ?? 0
      if (anterior !== saldo) {
        movimentos.push(this.criarMovimento(produto, anterior, saldo, contexto, nowIso))
      }
      return { ...produto, controla_estoque: true, estoque_atual: saldo }
    })

    return { produtos: atualizados, movimentos }
  }

  private static criarMovimento(
    produto: Produto,
    anterior: number,
    posterior: number,
    contexto: ContextoMovimentacao,
    nowIso: string,
  ): MovimentacaoEstoque {
    return {
      id: generateLocalId('mest'),
      produto_id: produto.id,
      produto_nome: produto.nome,
      tipo: contexto.tipo,
      quantidade: posterior - anterior,
      estoque_anterior: anterior,
      estoque_posterior: posterior,
      motivo: contexto.motivo,
      operador: contexto.operador,
      venda_id: contexto.venda_id,
      sequencial_venda: contexto.sequencial_venda,
      data_hora: nowIso,
    }
  }
}
