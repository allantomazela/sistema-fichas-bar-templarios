import {
  Categoria,
  Produto,
  ProdutoComImagem,
  Configuracoes,
  Caixa,
  MovimentacaoCaixa,
  Venda,
  Ficha,
  DatabaseBackup,
  CartItem,
  FormaPagamento,
  LoteFichas,
} from '@/types/pos'
import { INITIAL_CATEGORIAS, INITIAL_PRODUTOS, INITIAL_CONFIG } from './mockData'
import { storageGetItem, storageSetItem } from './storage'
import {
  CATALOG_ARRAY_KEYS,
  EVENT_ARRAY_KEYS,
  SEQUENCE_KEYS,
  STORAGE_KEYS,
  safeGet,
  safeGetArray,
  safeSet,
} from './kvStore'
import { StockService } from './stockService'
import { ProductImageService } from './productImages'
import { computeConsumoEstoque } from '@/lib/stock'

export { StorageCorruptionError } from './kvStore'

// Simple hash generator for ticket verification
export function generateSecurityHash(
  sequencial: number,
  produtoId: string,
  dataIso: string,
  salt: string,
): { codigoValidacao: string; hashCompleto: string } {
  const payload = `${sequencial}-${produtoId}-${dataIso}-${salt}`
  let hash = 0
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0 // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')
  const codigoValidacao = `${hex.slice(0, 4)}-${hex.slice(4, 8)}`
  const hashCompleto = `AUTH:${codigoValidacao}:SEQ:${String(sequencial).padStart(5, '0')}:PID:${produtoId.slice(0, 8)}`
  return { codigoValidacao, hashCompleto }
}

export class LocalDatabaseService {
  // Inicialização com dados padrão caso o storage esteja vazio
  static initDatabase(): void {
    if (!storageGetItem(STORAGE_KEYS.CONFIG)) {
      safeSet(STORAGE_KEYS.CONFIG, INITIAL_CONFIG)
    }
    if (!storageGetItem(STORAGE_KEYS.CATEGORIAS)) {
      safeSet(STORAGE_KEYS.CATEGORIAS, INITIAL_CATEGORIAS)
    }
    if (!storageGetItem(STORAGE_KEYS.PRODUTOS)) {
      safeSet(STORAGE_KEYS.PRODUTOS, INITIAL_PRODUTOS)
    }
    if (!storageGetItem(STORAGE_KEYS.CAIXAS)) {
      // Instalação limpa: sem turno aberto — operador deve abrir o caixa
      safeSet(STORAGE_KEYS.CAIXAS, [])
    }
    if (!storageGetItem(STORAGE_KEYS.MOVIMENTACOES)) {
      safeSet(STORAGE_KEYS.MOVIMENTACOES, [])
    }
    if (!storageGetItem(STORAGE_KEYS.VENDAS)) {
      safeSet(STORAGE_KEYS.VENDAS, [])
    }
    if (!storageGetItem(STORAGE_KEYS.FICHAS)) {
      safeSet(STORAGE_KEYS.FICHAS, [])
    }
    if (!storageGetItem(STORAGE_KEYS.SEQUENCIAL_FICHA)) {
      safeSet(STORAGE_KEYS.SEQUENCIAL_FICHA, 1)
    }
    if (!storageGetItem(STORAGE_KEYS.SEQUENCIAL_VENDA)) {
      safeSet(STORAGE_KEYS.SEQUENCIAL_VENDA, 1)
    }
  }

  // CONFIGURAÇÕES
  static getConfig(): Configuracoes {
    this.initDatabase()
    const saved = safeGet<Configuracoes>(STORAGE_KEYS.CONFIG, INITIAL_CONFIG)
    const merged: Configuracoes = {
      ...INITIAL_CONFIG,
      ...saved,
      auto_imprimir_ao_finalizar: saved.auto_imprimir_ao_finalizar !== false,
      corte_automatico: saved.corte_automatico !== false,
      ficha_mostrar_qrcode: false,
      modo_impressao: saved.modo_impressao || 'escpos',
    }

    // Migração: layout Show de Prêmios + impressão direta + picote
    const migratedKey = 'templarios_pdv_ficha_show_v2'
    if (!storageGetItem(migratedKey)) {
      merged.nome_evento = 'Show de Prêmios'
      merged.subtitulo_evento = 'Bar Templários'
      merged.rodape_cupom = 'Organização: Templários da Paz'
      merged.simular_impressao_tela = false
      merged.corte_automatico = true
      merged.auto_imprimir_ao_finalizar = true
      safeSet(STORAGE_KEYS.CONFIG, merged)
      storageSetItem(migratedKey, '1')
    }

    return merged
  }

  static saveConfig(config: Configuracoes): void {
    safeSet(STORAGE_KEYS.CONFIG, config)
  }

  // CATEGORIAS
  static getCategorias(): Categoria[] {
    this.initDatabase()
    const item = storageGetItem(STORAGE_KEYS.CATEGORIAS)
    const list = item
      ? safeGetArray<Categoria>(STORAGE_KEYS.CATEGORIAS)
      : [...INITIAL_CATEGORIAS]
    return list
      .map((c) => ({
        ...c,
        ativo: c.ativo !== false,
        icone: c.icone || 'Tag',
        ordem: c.ordem || 1,
      }))
      .sort((a, b) => a.ordem - b.ordem)
  }

  static saveCategorias(categorias: Categoria[]): void {
    safeSet(STORAGE_KEYS.CATEGORIAS, categorias)
  }

  static addCategoria(categoria: Omit<Categoria, 'id'>): Categoria {
    const categorias = this.getCategorias()
    const maxOrdem = categorias.reduce((max, c) => Math.max(max, c.ordem || 0), 0)
    const newCat: Categoria = {
      ...categoria,
      id: `cat-${Date.now()}`,
      ordem: categoria.ordem || maxOrdem + 1,
      ativo: categoria.ativo !== false,
    }
    categorias.push(newCat)
    this.saveCategorias(categorias)
    return newCat
  }

  static updateCategoria(id: string, updates: Partial<Categoria>): void {
    const categorias = this.getCategorias().map((c) => (c.id === id ? { ...c, ...updates } : c))
    this.saveCategorias(categorias)
  }

  /** Reordena categorias conforme a lista de IDs (1-based). */
  static reorderCategorias(orderedIds: string[]): void {
    const byId = new Map(this.getCategorias().map((c) => [c.id, c]))
    const next: Categoria[] = []
    orderedIds.forEach((id, index) => {
      const cat = byId.get(id)
      if (cat) {
        next.push({ ...cat, ordem: index + 1 })
        byId.delete(id)
      }
    })
    // Mantém categorias não listadas no final
    byId.forEach((cat) => {
      next.push({ ...cat, ordem: next.length + 1 })
    })
    this.saveCategorias(next)
  }

  static moveCategoria(id: string, direction: 'up' | 'down'): void {
    const cats = this.getCategorias()
    const index = cats.findIndex((c) => c.id === id)
    if (index < 0) return
    const swapWith = direction === 'up' ? index - 1 : index + 1
    if (swapWith < 0 || swapWith >= cats.length) return
    const ordered = cats.map((c) => c.id)
    ;[ordered[index], ordered[swapWith]] = [ordered[swapWith], ordered[index]]
    this.reorderCategorias(ordered)
  }

  /**
   * Remove categoria. Se `moveProdutosParaId` for informado, reatribui os produtos
   * vinculados antes de excluir.
   */
  static deleteCategoria(id: string, moveProdutosParaId?: string): void {
    if (moveProdutosParaId) {
      const produtos = this.getProdutos().map((p) =>
        p.categoria_id === id ? { ...p, categoria_id: moveProdutosParaId } : p,
      )
      this.saveProdutos(produtos)
    }
    const categorias = this.getCategorias().filter((c) => c.id !== id)
    this.saveCategorias(categorias)
  }

  // PRODUTOS
  static getProdutos(): Produto[] {
    this.initDatabase()
    const item = storageGetItem(STORAGE_KEYS.PRODUTOS)
    if (!item) return [...INITIAL_PRODUTOS]
    return safeGetArray<Produto>(STORAGE_KEYS.PRODUTOS)
  }

  static saveProdutos(produtos: Produto[]): void {
    safeSet(STORAGE_KEYS.PRODUTOS, produtos)
  }

  static addProduto(entrada: Omit<ProdutoComImagem, 'id'>): Produto {
    const { imagem_base64, ...produto } = entrada
    const produtos = this.getProdutos()
    const saldoInicial = produto.estoque_atual ?? 0
    const newProd: Produto = {
      ...produto,
      id: `prod-${Date.now()}`,
      ...(produto.controla_estoque ? { estoque_atual: 0 } : {}),
    }
    produtos.push(newProd)
    ProductImageService.definir(newProd.id, imagem_base64)

    if (produto.controla_estoque && saldoInicial > 0) {
      const { produtos: comSaldo, movimentos } = StockService.definirSaldo(
        produtos,
        newProd.id,
        saldoInicial,
        { tipo: 'entrada', motivo: 'Estoque inicial (cadastro do produto)' },
      )
      this.saveProdutos(comSaldo)
      StockService.registrar(movimentos)
      return comSaldo.find((p) => p.id === newProd.id) as Produto
    }

    this.saveProdutos(produtos)
    return newProd
  }

  /** Atualiza o cadastro. Mudança de saldo pelo formulário vira um "ajuste" no histórico. */
  static updateProduto(id: string, alteracoes: Partial<ProdutoComImagem>): void {
    const { imagem_base64, ...updates } = alteracoes
    if ('imagem_base64' in alteracoes) ProductImageService.definir(id, imagem_base64)
    const { estoque_atual: novoSaldo, ...resto } = updates
    let produtos = this.getProdutos().map((p) => (p.id === id ? { ...p, ...resto } : p))
    const atual = produtos.find((p) => p.id === id)

    if (atual?.controla_estoque && typeof novoSaldo === 'number') {
      const result = StockService.definirSaldo(produtos, id, novoSaldo, {
        tipo: 'ajuste',
        motivo: 'Saldo alterado no cadastro do produto',
      })
      produtos = result.produtos
      StockService.registrar(result.movimentos)
    } else if ('estoque_atual' in updates) {
      produtos = produtos.map((p) => (p.id === id ? { ...p, estoque_atual: novoSaldo } : p))
    }

    this.saveProdutos(produtos)
  }

  /** Remove do catálogo. Recusa se o produto compõe algum combo (o combo quebraria). */
  static deleteProduto(id: string): void {
    const todos = this.getProdutos()
    const combosQueUsam = todos.filter(
      (p) => p.id !== id && p.is_combo && p.itens_combo?.some((it) => it.produto_id === id),
    )
    if (combosQueUsam.length > 0) {
      const nomes = combosQueUsam.map((c) => `"${c.nome}"`).join(', ')
      throw new Error(`Este produto faz parte do combo ${nomes}. Retire-o do combo antes de excluir.`)
    }
    this.saveProdutos(todos.filter((p) => p.id !== id))
    ProductImageService.definir(id, undefined)
  }

  /**
   * Movimentação manual de estoque.
   * entrada: soma · perda: subtrai · ajuste: define o saldo contado.
   */
  static movimentarEstoque(params: {
    produtoId: string
    tipo: 'entrada' | 'perda' | 'ajuste'
    quantidade: number
    motivo?: string
    operador?: string
  }): Produto {
    const quantidade = Math.floor(params.quantidade)
    if (!Number.isFinite(quantidade) || quantidade < 0) {
      throw new Error('Informe uma quantidade válida (número inteiro, zero ou maior).')
    }
    if (params.tipo !== 'ajuste' && quantidade === 0) {
      throw new Error('A quantidade precisa ser maior que zero.')
    }

    const produtos = this.getProdutos()
    const produto = produtos.find((p) => p.id === params.produtoId)
    if (!produto) throw new Error('Produto não encontrado no catálogo.')
    if (produto.is_combo) {
      throw new Error('Combos não têm estoque próprio: movimente os produtos que compõem o combo.')
    }

    const contexto = { tipo: params.tipo, motivo: params.motivo?.trim() || undefined, operador: params.operador }
    const saldoAtual = produto.estoque_atual ?? 0
    const novoSaldo =
      params.tipo === 'ajuste'
        ? quantidade
        : params.tipo === 'entrada'
          ? saldoAtual + quantidade
          : saldoAtual - quantidade

    if (novoSaldo < 0) {
      throw new Error(`Perda maior que o saldo atual (${saldoAtual} un) de "${produto.nome}".`)
    }

    const result = StockService.definirSaldo(produtos, produto.id, novoSaldo, contexto)
    this.saveProdutos(result.produtos)
    StockService.registrar(result.movimentos)
    return result.produtos.find((p) => p.id === produto.id) as Produto
  }

  // CAIXAS / TURNOS
  static getCaixas(): Caixa[] {
    this.initDatabase()
    return safeGetArray<Caixa>(STORAGE_KEYS.CAIXAS)
  }

  static getCaixaAtivo(): Caixa | null {
    const caixas = this.getCaixas()
    const activeId = safeGet<string | null>(STORAGE_KEYS.CAIXA_ATIVO_ID, null)
    if (activeId) {
      const found = caixas.find((c) => c.id === activeId && c.status === 'aberto')
      if (found) return found
    }
    const anyOpen = caixas.find((c) => c.status === 'aberto')
    if (anyOpen) {
      safeSet(STORAGE_KEYS.CAIXA_ATIVO_ID, anyOpen.id)
      return anyOpen
    }
    return null
  }

  static abrirCaixa(operador: string, saldoInicial: number, observacoes?: string): Caixa {
    const caixas = this.getCaixas().map((c) =>
      c.status === 'aberto'
        ? {
            ...c,
            status: 'fechado' as const,
            fechamento: c.fechamento || new Date().toISOString(),
            observacoes: c.observacoes
              ? `${c.observacoes} | Encerrado automaticamente ao abrir novo turno`
              : 'Encerrado automaticamente ao abrir novo turno',
          }
        : c,
    )
    const novoCaixa: Caixa = {
      id: `cx-${Date.now()}`,
      operador: operador || 'Operador',
      abertura: new Date().toISOString(),
      saldo_inicial: saldoInicial,
      status: 'aberto',
      observacoes,
    }
    caixas.unshift(novoCaixa)
    safeSet(STORAGE_KEYS.CAIXAS, caixas)
    safeSet(STORAGE_KEYS.CAIXA_ATIVO_ID, novoCaixa.id)
    return novoCaixa
  }

  static fecharCaixa(
    caixaId: string,
    valoresInformados: Caixa['valores_informados'],
    observacoes?: string,
  ): Caixa | null {
    const caixas = this.getCaixas()
    let fechado: Caixa | null = null
    const updated = caixas.map((c) => {
      if (c.id === caixaId) {
        fechado = {
          ...c,
          status: 'fechado',
          fechamento: new Date().toISOString(),
          valores_informados: valoresInformados,
          observacoes: observacoes ? `${c.observacoes || ''}\n${observacoes}` : c.observacoes,
        }
        return fechado
      }
      return c
    })
    safeSet(STORAGE_KEYS.CAIXAS, updated)
    if (safeGet(STORAGE_KEYS.CAIXA_ATIVO_ID, null) === caixaId) {
      safeSet(STORAGE_KEYS.CAIXA_ATIVO_ID, null)
    }
    return fechado
  }

  // MOVIMENTAÇÕES DE CAIXA (SANGRIA / SUPRIMENTO)
  static getMovimentacoes(caixaId?: string): MovimentacaoCaixa[] {
    const all = safeGetArray<MovimentacaoCaixa>(STORAGE_KEYS.MOVIMENTACOES)
    if (caixaId) {
      return all.filter((m) => m.caixa_id === caixaId)
    }
    return all
  }

  static addMovimentacao(
    caixaId: string,
    tipo: 'sangria' | 'suprimento',
    valor: number,
    motivo: string,
    operador: string,
  ): MovimentacaoCaixa {
    const all = this.getMovimentacoes()
    const nova: MovimentacaoCaixa = {
      id: `mov-${Date.now()}`,
      caixa_id: caixaId,
      tipo,
      valor,
      motivo,
      operador,
      data_hora: new Date().toISOString(),
    }
    all.unshift(nova)
    safeSet(STORAGE_KEYS.MOVIMENTACOES, all)
    return nova
  }

  // VENDAS E EMISSÃO DE FICHAS
  static getVendas(caixaId?: string): Venda[] {
    const all = safeGetArray<Venda>(STORAGE_KEYS.VENDAS)
    if (caixaId) {
      return all.filter((v) => v.caixa_id === caixaId)
    }
    return all
  }

  static getFichas(vendaId?: string): Ficha[] {
    const all = safeGetArray<Ficha>(STORAGE_KEYS.FICHAS)
    if (vendaId) {
      return all.filter((f) => f.venda_id === vendaId)
    }
    return all
  }

  static finalizarVenda(params: {
    caixaId: string
    operador: string
    itens: CartItem[]
    formaPagamento: FormaPagamento
    valorRecebido: number
    troco: number
    desconto?: number
  }): { venda: Venda; fichas: Ficha[] } {
    const config = this.getConfig()
    const produtos = this.getProdutos()
    const categorias = this.getCategorias()
    const catMap = new Map(categorias.map((c) => [c.id, c.nome]))
    const prodMap = new Map(produtos.map((p) => [p.id, p]))

    let seqVenda = safeGet<number>(STORAGE_KEYS.SEQUENCIAL_VENDA, 1)
    let seqFicha = safeGet<number>(STORAGE_KEYS.SEQUENCIAL_FICHA, 1)

    const vendaId = `vnd-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const nowIso = new Date().toISOString()

    const vendaItens = params.itens.map((item, index) => ({
      id: `item-${vendaId}-${index + 1}`,
      venda_id: vendaId,
      produto_id: item.produto.id,
      produto_nome: item.produto.nome,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      total_item: item.quantidade * item.preco_unitario,
      emite_ficha_individual: item.produto.emite_ficha_individual,
      is_combo: item.produto.is_combo,
      itens_combo: item.produto.itens_combo,
    }))

    const totalCalculado = vendaItens.reduce((acc, it) => acc + it.total_item, 0)
    const desconto = params.desconto || 0
    const totalFinal = Math.max(0, totalCalculado - desconto)

    const novaVenda: Venda = {
      id: vendaId,
      sequencial_venda: seqVenda,
      caixa_id: params.caixaId,
      operador: params.operador,
      data_hora: nowIso,
      subtotal: totalCalculado,
      desconto,
      total: totalFinal,
      forma_pagamento: params.formaPagamento,
      valor_recebido: params.valorRecebido,
      troco: params.troco,
      status: 'concluida',
      itens: vendaItens,
    }

    // Gerar Fichas
    const fichasEmitidas: Ficha[] = []

    params.itens.forEach((cartItem) => {
      const prod = cartItem.produto

      // Se for combo e tiver sub-itens desmembráveis
      if (prod.is_combo && prod.itens_combo && prod.itens_combo.length > 0) {
        for (let q = 0; q < cartItem.quantidade; q++) {
          prod.itens_combo.forEach((sub) => {
            const subProd = prodMap.get(sub.produto_id)
            const subNome = subProd ? subProd.nome : 'Item de Combo'
            const subCat = subProd ? catMap.get(subProd.categoria_id) || 'Combos' : 'Combos'
            for (let subQ = 0; subQ < sub.quantidade; subQ++) {
              const { codigoValidacao, hashCompleto } = generateSecurityHash(
                seqFicha,
                sub.produto_id,
                nowIso,
                config.salt_seguranca,
              )
              fichasEmitidas.push({
                id: `fch-${Date.now()}-${seqFicha}`,
                venda_id: vendaId,
                sequencial_venda: seqVenda,
                produto_id: sub.produto_id,
                produto_nome: subNome,
                categoria_nome: subCat,
                preco: 0,
                codigo_validacao: codigoValidacao,
                hash_seguranca: hashCompleto,
                sequencial: seqFicha,
                data_emissao: nowIso,
                operador: params.operador,
                caixa_id: params.caixaId,
                status: 'emitida',
              })
              seqFicha++
            }
          })
        }
      } else {
        // Sempre 1 ficha térmica por unidade (ex.: 10 Coca-Colas = 10 fichas)
        for (let i = 0; i < cartItem.quantidade; i++) {
          const { codigoValidacao, hashCompleto } = generateSecurityHash(
            seqFicha,
            prod.id,
            nowIso,
            config.salt_seguranca,
          )
          fichasEmitidas.push({
            id: `fch-${Date.now()}-${seqFicha}`,
            venda_id: vendaId,
            sequencial_venda: seqVenda,
            produto_id: prod.id,
            produto_nome: prod.nome,
            categoria_nome: catMap.get(prod.categoria_id) || 'Geral',
            preco: cartItem.preco_unitario,
            codigo_validacao: codigoValidacao,
            hash_seguranca: hashCompleto,
            sequencial: seqFicha,
            data_emissao: nowIso,
            operador: params.operador,
            caixa_id: params.caixaId,
            status: 'emitida',
          })
          seqFicha++
        }
      }
    })

    // Baixa automática de estoque — revalida no commit (estoque fresco do disco)
    const consumoEstoque = computeConsumoEstoque(vendaItens)

    for (const [produtoId, qtdNecessaria] of consumoEstoque) {
      const p = prodMap.get(produtoId)
      if (!p) {
        throw new Error(`Produto do carrinho não encontrado no catálogo (${produtoId}).`)
      }
      if (p.controla_estoque && p.estoque_atual !== undefined) {
        if (qtdNecessaria > p.estoque_atual) {
          throw new Error(
            `Estoque insuficiente para "${p.nome}". Disponível: ${p.estoque_atual} un, necessário: ${qtdNecessaria} un.`,
          )
        }
      }
    }

    const baixas = new Map<string, number>()
    consumoEstoque.forEach((qtd, produtoId) => baixas.set(produtoId, -qtd))
    const baixa = StockService.aplicarVariacoes(produtos, baixas, {
      tipo: 'venda',
      motivo: `Venda #${seqVenda}`,
      operador: params.operador,
      venda_id: vendaId,
      sequencial_venda: seqVenda,
    })
    this.saveProdutos(baixa.produtos)
    StockService.registrar(baixa.movimentos)

    // Salva tudo
    const vendas = this.getVendas()
    vendas.unshift(novaVenda)
    safeSet(STORAGE_KEYS.VENDAS, vendas)

    const allFichas = this.getFichas()
    allFichas.unshift(...fichasEmitidas)
    safeSet(STORAGE_KEYS.FICHAS, allFichas)

    safeSet(STORAGE_KEYS.SEQUENCIAL_VENDA, seqVenda + 1)
    safeSet(STORAGE_KEYS.SEQUENCIAL_FICHA, seqFicha)

    return { venda: novaVenda, fichas: fichasEmitidas }
  }

  // CANCELAMENTO DE VENDA E FICHAS
  static cancelarVenda(vendaId: string, motivo: string): boolean {
    const vendas = this.getVendas()
    const venda = vendas.find((v) => v.id === vendaId)
    if (!venda || venda.status === 'cancelada') return false
    if (venda.lote_id) {
      throw new Error(
        'Esta venda é a prestação de contas de um lote de fichas antecipadas e não pode ser cancelada aqui.',
      )
    }

    const updatedVendas = vendas.map((v) => {
      if (v.id === vendaId) {
        return {
          ...v,
          status: 'cancelada' as const,
          motivo_cancelamento: motivo,
        }
      }
      return v
    })

    safeSet(STORAGE_KEYS.VENDAS, updatedVendas)
    const allFichas = this.getFichas().map((f) => {
      if (f.venda_id === vendaId) {
        return { ...f, status: 'cancelada' as const }
      }
      return f
    })
    safeSet(STORAGE_KEYS.FICHAS, allFichas)

    // Repõe estoque consumido (mesma regra da baixa na finalização)
    const estorno = StockService.aplicarVariacoes(
      this.getProdutos(),
      computeConsumoEstoque(venda.itens),
      {
        tipo: 'estorno',
        motivo: `Cancelamento da venda #${venda.sequencial_venda}${motivo ? ` — ${motivo}` : ''}`,
        operador: venda.operador,
        venda_id: venda.id,
        sequencial_venda: venda.sequencial_venda,
      },
    )
    this.saveProdutos(estorno.produtos)
    StockService.registrar(estorno.movimentos)

    return true
  }

  // RESUMO E ESTATÍSTICAS DE UM CAIXA
  static getResumoCaixa(caixaId: string) {
    const caixas = this.getCaixas()
    const caixa = caixas.find((c) => c.id === caixaId)
    const vendas = this.getVendas(caixaId).filter((v) => v.status === 'concluida')
    const movimentacoes = this.getMovimentacoes(caixaId)
    const fichas = this.getFichas().filter(
      (f) => f.caixa_id === caixaId && f.status !== 'cancelada',
    )

    let totalDinheiro = 0
    let totalPix = 0
    let totalDebito = 0
    let totalCredito = 0
    let totalCortesia = 0

    vendas.forEach((v) => {
      switch (v.forma_pagamento) {
        case 'dinheiro':
          totalDinheiro += v.total
          break
        case 'pix':
          totalPix += v.total
          break
        case 'debito':
          totalDebito += v.total
          break
        case 'credito':
          totalCredito += v.total
          break
        case 'cortesia':
          totalCortesia += v.total
          break
      }
    })

    let totalSuprimento = 0
    let totalSangria = 0

    movimentacoes.forEach((m) => {
      if (m.tipo === 'suprimento') totalSuprimento += m.valor
      if (m.tipo === 'sangria') totalSangria += m.valor
    })

    const saldoInicial = caixa ? caixa.saldo_inicial : 0
    const saldoDinheiroEsperado = saldoInicial + totalDinheiro + totalSuprimento - totalSangria
    const totalFaturamento = totalDinheiro + totalPix + totalDebito + totalCredito

    return {
      caixa,
      totalVendasCount: vendas.length,
      totalFichasCount: fichas.length,
      totalFaturamento,
      totalDinheiro,
      totalPix,
      totalDebito,
      totalCredito,
      totalCortesia,
      saldoInicial,
      totalSuprimento,
      totalSangria,
      saldoDinheiroEsperado,
      vendas,
      movimentacoes,
    }
  }

  // BACKUP E RESTAURAÇÃO
  static exportBackup(): DatabaseBackup {
    return {
      versao: '1.0.0',
      data_backup: new Date().toISOString(),
      configuracoes: this.getConfig(),
      categorias: this.getCategorias(),
      produtos: ProductImageService.juntar(this.getProdutos()),
      caixas: this.getCaixas(),
      movimentacoes_caixa: this.getMovimentacoes(),
      vendas: this.getVendas(),
      fichas: this.getFichas(),
      movimentacoes_estoque: StockService.getMovimentacoes(),
      lotes_fichas: safeGetArray<LoteFichas>(STORAGE_KEYS.LOTES_FICHAS),
    }
  }

  /** Estrutura mínima para restaurar sem deixar o banco pela metade. */
  static isBackupValido(dados: unknown): dados is DatabaseBackup {
    if (!dados || typeof dados !== 'object') return false
    const b = dados as Partial<DatabaseBackup>
    const listaOpcional = (v: unknown) => v === undefined || Array.isArray(v)
    return (
      !!b.configuracoes &&
      typeof b.configuracoes === 'object' &&
      Array.isArray(b.categorias) &&
      Array.isArray(b.produtos) &&
      [b.caixas, b.movimentacoes_caixa, b.vendas, b.fichas, b.movimentacoes_estoque, b.lotes_fichas].every(
        listaOpcional,
      )
    )
  }

  static importBackup(backup: DatabaseBackup): boolean {
    try {
      if (!this.isBackupValido(backup)) {
        throw new Error('Arquivo de backup inválido.')
      }
      safeSet(STORAGE_KEYS.CONFIG, backup.configuracoes)
      safeSet(STORAGE_KEYS.CATEGORIAS, backup.categorias)
      const { produtos, imagens } = ProductImageService.separar(backup.produtos)
      safeSet(STORAGE_KEYS.PRODUTOS, produtos)
      ProductImageService.substituirTudo(imagens)
      safeSet(STORAGE_KEYS.CAIXAS, backup.caixas || [])
      safeSet(STORAGE_KEYS.CAIXA_ATIVO_ID, null)
      safeSet(STORAGE_KEYS.MOVIMENTACOES, backup.movimentacoes_caixa || [])
      safeSet(STORAGE_KEYS.VENDAS, backup.vendas || [])
      safeSet(STORAGE_KEYS.FICHAS, backup.fichas || [])
      StockService.substituirTudo(
        Array.isArray(backup.movimentacoes_estoque) ? backup.movimentacoes_estoque : [],
      )
      safeSet(STORAGE_KEYS.LOTES_FICHAS, Array.isArray(backup.lotes_fichas) ? backup.lotes_fichas : [])

      safeSet(STORAGE_KEYS.SEQUENCIAL_FICHA, maiorNumero(backup.fichas, (f) => f.sequencial) + 1)
      safeSet(STORAGE_KEYS.SEQUENCIAL_VENDA, maiorNumero(backup.vendas, (v) => v.sequencial_venda) + 1)

      return true
    } catch (e) {
      console.error('Falha ao restaurar backup:', e)
      return false
    }
  }

  /**
   * Apaga todos os dados operacionais e o catálogo (fica vazio, sem produtos de exemplo).
   * Mantém só as configurações (evento, impressora, senha).
   */
  static zerarBancoCompleto(): void {
    limparDadosDoEvento()
    for (const key of CATALOG_ARRAY_KEYS) safeSet(key, [])
    safeSet(STORAGE_KEYS.CAIXA_ATIVO_ID, null)
  }

  // ZERAR VENDAS PARA NOVO EVENTO
  static resetVendasParaNovoEvento(operador: string, fundoTroco: number): void {
    const lotesAbertos = safeGetArray<LoteFichas>(STORAGE_KEYS.LOTES_FICHAS).filter(
      (l) => l.status === 'aberto',
    )
    if (lotesAbertos.length > 0) {
      throw new Error(
        `Há ${lotesAbertos.length} lote(s) de fichas antecipadas em aberto. Preste contas ou cancele antes de iniciar um novo evento.`,
      )
    }

    const novoCaixa: Caixa = {
      id: `cx-${Date.now()}`,
      operador: operador || 'Operador',
      abertura: new Date().toISOString(),
      saldo_inicial: fundoTroco,
      status: 'aberto',
      observacoes: 'Abertura para novo evento limpo',
    }

    // Saldos dos produtos são mantidos; só o histórico do evento anterior é limpo
    limparDadosDoEvento()
    safeSet(STORAGE_KEYS.CAIXAS, [novoCaixa])
    safeSet(STORAGE_KEYS.CAIXA_ATIVO_ID, novoCaixa.id)
  }
}

/** Maior número válido da lista (0 se vazia) — ignora registros sem número. */
function maiorNumero<T>(itens: T[] | undefined, numero: (item: T) => unknown): number {
  let maior = 0
  for (const item of itens ?? []) {
    const n = numero(item)
    if (typeof n === 'number' && Number.isFinite(n) && n > maior) maior = n
  }
  return maior
}

function limparDadosDoEvento(): void {
  for (const key of EVENT_ARRAY_KEYS) safeSet(key, [])
  for (const key of SEQUENCE_KEYS) safeSet(key, 1)
}
