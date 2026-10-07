import type {
  Caixa,
  Ficha,
  FormaPagamento,
  LoteFichas,
  LoteFichasItem,
  Produto,
  Venda,
} from '@/types/pos'
import { calcularPrestacao, formatNumeroLote } from '@/lib/fichaLote'
import { LocalDatabaseService, generateSecurityHash } from './db'
import { STORAGE_KEYS, generateLocalId, safeGet, safeGetArray, safeSet } from './kvStore'
import { StockService } from './stockService'

const MAX_FICHAS_POR_LOTE = 500

export interface NovoLoteParams {
  responsavel: string
  motivo?: string
  itens: { produtoId: string; quantidade: number }[]
  operador: string
}

export interface PrestarContasParams {
  loteId: string
  devolvidas: Record<string, number>
  formaPagamento: FormaPagamento
  operador: string
}

export class FichaLoteService {
  static getLotes(): LoteFichas[] {
    return safeGetArray<LoteFichas>(STORAGE_KEYS.LOTES_FICHAS)
  }

  static temLoteAberto(): boolean {
    return this.getLotes().some((l) => l.status === 'aberto')
  }

  /**
   * Cria o lote, reserva o estoque e gera as fichas para impressão.
   * Não registra venda nem dinheiro no caixa.
   */
  static criar(params: NovoLoteParams): LoteFichas {
    const responsavel = params.responsavel.trim()
    if (!responsavel) throw new Error('Informe o responsável pelo lote (quem fica com as fichas).')

    const produtos = LocalDatabaseService.getProdutos()
    const itens = montarItens(params.itens, produtos)

    const lotes = this.getLotes()
    const numero = lotes.reduce((max, l) => Math.max(max, l.numero), 0) + 1
    const agora = new Date().toISOString()
    const lote: LoteFichas = {
      id: generateLocalId('lote'),
      numero,
      responsavel,
      motivo: params.motivo?.trim() || undefined,
      status: 'aberto',
      criado_em: agora,
      criado_por: params.operador,
      itens,
      fichas: [],
    }
    lote.fichas = gerarFichas(lote, produtos)

    const reserva = StockService.aplicarVariacoes(
      produtos,
      new Map(itens.map((it) => [it.produto_id, -it.quantidade])),
      { tipo: 'lote', motivo: `Reserva do lote ${formatNumeroLote(numero)} (${responsavel})`, operador: params.operador },
    )

    LocalDatabaseService.saveProdutos(reserva.produtos)
    StockService.registrar(reserva.movimentos)
    safeSet(STORAGE_KEYS.LOTES_FICHAS, [lote, ...lotes])
    return lote
  }

  /**
   * Fecha o lote: devolvidas voltam ao estoque; as demais viram uma venda
   * no caixa aberto (o estoque delas já saiu na reserva).
   */
  static prestarContas(params: PrestarContasParams): { lote: LoteFichas; venda: Venda | null } {
    const lotes = this.getLotes()
    const lote = buscarAberto(lotes, params.loteId)
    const caixa = LocalDatabaseService.getCaixaAtivo()
    if (!caixa) throw new Error('Abra o caixa antes de prestar contas: o valor das fichas vendidas entra nele.')

    const resumo = calcularPrestacao(lote.itens, params.devolvidas)
    if (resumo.erro) throw new Error(resumo.erro)

    const rotulo = formatNumeroLote(lote.numero)
    const devolucao = StockService.aplicarVariacoes(
      LocalDatabaseService.getProdutos(),
      new Map(resumo.linhas.filter((l) => l.devolvidas > 0).map((l) => [l.item.produto_id, l.devolvidas])),
      { tipo: 'lote', motivo: `Devolução do lote ${rotulo}`, operador: params.operador },
    )

    const venda =
      resumo.totalVendidas > 0
        ? montarVenda(lote, resumo.linhas, caixa, params)
        : null

    const atualizado: LoteFichas = {
      ...lote,
      status: 'prestado',
      itens: resumo.linhas.map((l) => ({ ...l.item, devolvidas: l.devolvidas })),
      prestado_em: new Date().toISOString(),
      prestado_por: params.operador,
      forma_pagamento: params.formaPagamento,
      total_recebido: resumo.valorAReceber,
      venda_id: venda?.id,
      sequencial_venda: venda?.sequencial_venda,
    }

    LocalDatabaseService.saveProdutos(devolucao.produtos)
    StockService.registrar(devolucao.movimentos)
    if (venda) {
      safeSet(STORAGE_KEYS.VENDAS, [venda, ...LocalDatabaseService.getVendas()])
      safeSet(STORAGE_KEYS.SEQUENCIAL_VENDA, venda.sequencial_venda + 1)
    }
    salvarLote(lotes, atualizado)
    return { lote: atualizado, venda }
  }

  /** Anula um lote aberto (ex.: impresso errado): todo o estoque reservado volta. */
  static cancelar(loteId: string, motivo: string, operador: string): LoteFichas {
    const lotes = this.getLotes()
    const lote = buscarAberto(lotes, loteId)

    const estorno = StockService.aplicarVariacoes(
      LocalDatabaseService.getProdutos(),
      new Map(lote.itens.map((it) => [it.produto_id, it.quantidade])),
      { tipo: 'lote', motivo: `Cancelamento do lote ${formatNumeroLote(lote.numero)}`, operador },
    )

    const atualizado: LoteFichas = {
      ...lote,
      status: 'cancelado',
      cancelado_em: new Date().toISOString(),
      motivo_cancelamento: motivo.trim() || undefined,
      fichas: lote.fichas.map((f) => ({ ...f, status: 'cancelada' as const })),
    }

    LocalDatabaseService.saveProdutos(estorno.produtos)
    StockService.registrar(estorno.movimentos)
    salvarLote(lotes, atualizado)
    return atualizado
  }
}

function buscarAberto(lotes: LoteFichas[], loteId: string): LoteFichas {
  const lote = lotes.find((l) => l.id === loteId)
  if (!lote) throw new Error('Lote não encontrado. Atualize a tela e tente de novo.')
  if (lote.status !== 'aberto') throw new Error(`O lote ${formatNumeroLote(lote.numero)} já foi encerrado.`)
  return lote
}

function salvarLote(lotes: LoteFichas[], atualizado: LoteFichas): void {
  safeSet(
    STORAGE_KEYS.LOTES_FICHAS,
    lotes.map((l) => (l.id === atualizado.id ? atualizado : l)),
  )
}

/** Agrupa por produto, valida quantidades, combos e estoque disponível. */
function montarItens(pedidos: NovoLoteParams['itens'], produtos: Produto[]): LoteFichasItem[] {
  const porProduto = new Map<string, number>()
  for (const { produtoId, quantidade } of pedidos) {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new Error('As quantidades do lote devem ser números inteiros maiores que zero.')
    }
    porProduto.set(produtoId, (porProduto.get(produtoId) ?? 0) + quantidade)
  }
  if (porProduto.size === 0) throw new Error('Adicione pelo menos um produto ao lote.')

  const total = [...porProduto.values()].reduce((a, b) => a + b, 0)
  if (total > MAX_FICHAS_POR_LOTE) {
    throw new Error(`Máximo de ${MAX_FICHAS_POR_LOTE} fichas por lote. Divida em lotes menores.`)
  }

  return [...porProduto].map(([produtoId, quantidade]) => {
    const produto = produtos.find((p) => p.id === produtoId)
    if (!produto) throw new Error('Um dos produtos não existe mais. Atualize a tela.')
    if (produto.is_combo) {
      throw new Error(`"${produto.nome}" é combo. Adicione os itens do combo separadamente.`)
    }
    if (produto.controla_estoque && quantidade > (produto.estoque_atual ?? 0)) {
      throw new Error(
        `Estoque insuficiente para "${produto.nome}": disponível ${produto.estoque_atual ?? 0} un, lote pede ${quantidade} un.`,
      )
    }
    return {
      produto_id: produto.id,
      produto_nome: produto.nome,
      preco_unitario: produto.preco,
      quantidade,
    }
  })
}

function gerarFichas(lote: LoteFichas, produtos: Produto[]): Ficha[] {
  const config = LocalDatabaseService.getConfig()
  const categorias = new Map(LocalDatabaseService.getCategorias().map((c) => [c.id, c.nome]))
  const fichas: Ficha[] = []
  let seq = 1

  for (const item of lote.itens) {
    const produto = produtos.find((p) => p.id === item.produto_id)
    const categoria = produto ? categorias.get(produto.categoria_id) || 'Geral' : 'Geral'
    for (let i = 0; i < item.quantidade; i++, seq++) {
      const { codigoValidacao, hashCompleto } = generateSecurityHash(
        seq,
        item.produto_id,
        lote.criado_em,
        `${config.salt_seguranca}-${lote.id}`,
      )
      fichas.push({
        id: `${lote.id}-${seq}`,
        venda_id: lote.id,
        sequencial_venda: 0,
        produto_id: item.produto_id,
        produto_nome: item.produto_nome,
        categoria_nome: categoria,
        preco: item.preco_unitario,
        codigo_validacao: codigoValidacao,
        hash_seguranca: hashCompleto,
        sequencial: seq,
        lote_numero: lote.numero,
        data_emissao: lote.criado_em,
        operador: lote.criado_por,
        caixa_id: '',
        status: 'emitida',
      })
    }
  }
  return fichas
}

function montarVenda(
  lote: LoteFichas,
  linhas: ReturnType<typeof calcularPrestacao>['linhas'],
  caixa: Caixa,
  params: PrestarContasParams,
): Venda {
  const id = generateLocalId('vnd')
  const sequencial = safeGet<number>(STORAGE_KEYS.SEQUENCIAL_VENDA, 1)
  const itens = linhas
    .filter((l) => l.vendidas > 0)
    .map((l, index) => ({
      id: `item-${id}-${index + 1}`,
      venda_id: id,
      produto_id: l.item.produto_id,
      produto_nome: l.item.produto_nome,
      quantidade: l.vendidas,
      preco_unitario: l.item.preco_unitario,
      total_item: l.valor,
      emite_ficha_individual: true,
    }))
  const total = itens.reduce((acc, it) => acc + it.total_item, 0)

  return {
    id,
    sequencial_venda: sequencial,
    caixa_id: caixa.id,
    operador: params.operador,
    data_hora: new Date().toISOString(),
    subtotal: total,
    desconto: 0,
    total,
    forma_pagamento: params.formaPagamento,
    valor_recebido: total,
    troco: 0,
    status: 'concluida',
    itens,
    lote_id: lote.id,
    lote_numero: lote.numero,
  }
}
