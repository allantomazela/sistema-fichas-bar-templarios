import {
  Categoria,
  Produto,
  Configuracoes,
  Caixa,
  MovimentacaoCaixa,
  Venda,
  Ficha,
  DatabaseBackup,
  CartItem,
  FormaPagamento,
} from '@/types/pos'
import { INITIAL_CATEGORIAS, INITIAL_PRODUTOS, INITIAL_CONFIG, INITIAL_CAIXA } from './mockData'
import { storageGetItem, storageSetItem } from './storage'

const STORAGE_KEYS = {
  CONFIG: 'templarios_pdv_config',
  CATEGORIAS: 'templarios_pdv_categorias',
  PRODUTOS: 'templarios_pdv_produtos',
  CAIXAS: 'templarios_pdv_caixas',
  MOVIMENTACOES: 'templarios_pdv_movimentacoes',
  VENDAS: 'templarios_pdv_vendas',
  FICHAS: 'templarios_pdv_fichas',
  CAIXA_ATIVO_ID: 'templarios_pdv_caixa_ativo_id',
  SEQUENCIAL_FICHA: 'templarios_pdv_seq_ficha',
  SEQUENCIAL_VENDA: 'templarios_pdv_seq_venda',
}

/** Chaves de histórico: JSON inválido NÃO pode virar [] e sobrescrever o disco. */
const CRITICAL_ARRAY_KEYS = new Set([
  STORAGE_KEYS.VENDAS,
  STORAGE_KEYS.FICHAS,
  STORAGE_KEYS.PRODUTOS,
  STORAGE_KEYS.CATEGORIAS,
  STORAGE_KEYS.CAIXAS,
  STORAGE_KEYS.MOVIMENTACOES,
])

export class StorageCorruptionError extends Error {
  constructor(public readonly key: string) {
    super(
      `Dados locais corrompidos (${key}). Não continue vendendo — restaure um backup em Configurações.`,
    )
    this.name = 'StorageCorruptionError'
  }
}

// Persistência: SQLite (app nativo) ou localStorage (browser)
function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = storageGetItem(key)
    if (!item) return fallback
    return JSON.parse(item) as T
  } catch (err) {
    console.error(`Erro ao carregar chave ${key} do armazenamento local`, err)
    if (CRITICAL_ARRAY_KEYS.has(key)) {
      throw new StorageCorruptionError(key)
    }
    return fallback
  }
}

function safeGetArray<T>(key: string): T[] {
  const item = storageGetItem(key)
  if (!item) return []
  try {
    const parsed = JSON.parse(item) as unknown
    if (!Array.isArray(parsed)) {
      throw new StorageCorruptionError(key)
    }
    return parsed as T[]
  } catch (err) {
    if (err instanceof StorageCorruptionError) throw err
    console.error(`Erro ao carregar array ${key}`, err)
    throw new StorageCorruptionError(key)
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    storageSetItem(key, JSON.stringify(value))
  } catch (err) {
    console.error(`Erro ao gravar chave ${key} no armazenamento local`, err)
    throw err
  }
}

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

  static addProduto(produto: Omit<Produto, 'id'>): Produto {
    const produtos = this.getProdutos()
    const newProd: Produto = {
      ...produto,
      id: `prod-${Date.now()}`,
    }
    produtos.push(newProd)
    this.saveProdutos(produtos)
    return newProd
  }

  static updateProduto(id: string, updates: Partial<Produto>): void {
    const produtos = this.getProdutos().map((p) => (p.id === id ? { ...p, ...updates } : p))
    this.saveProdutos(produtos)
  }

  static deleteProduto(id: string): void {
    const produtos = this.getProdutos().filter((p) => p.id !== id)
    this.saveProdutos(produtos)
  }

  // Reposição rápida de estoque (+quantidade)
  static reporEstoque(id: string, quantidadeAdicional: number): Produto | null {
    const produtos = this.getProdutos()
    let updated: Produto | null = null
    const novosProdutos = produtos.map((p) => {
      if (p.id === id) {
        const estoqueAtual = p.estoque_atual ?? 0
        const novoEstoque = Math.max(0, estoqueAtual + quantidadeAdicional)
        updated = {
          ...p,
          controla_estoque: true,
          estoque_atual: novoEstoque,
        }
        return updated
      }
      return p
    })
    this.saveProdutos(novosProdutos)
    return updated
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
    const consumoEstoque = new Map<string, number>()
    params.itens.forEach((cartItem) => {
      const prod = cartItem.produto
      if (prod.is_combo && prod.itens_combo && prod.itens_combo.length > 0) {
        prod.itens_combo.forEach((sub) => {
          const totalQtdSub = cartItem.quantidade * sub.quantidade
          consumoEstoque.set(
            sub.produto_id,
            (consumoEstoque.get(sub.produto_id) || 0) + totalQtdSub,
          )
        })
      } else {
        consumoEstoque.set(prod.id, (consumoEstoque.get(prod.id) || 0) + cartItem.quantidade)
      }
    })

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

    const updatedProdutos = produtos.map((p) => {
      const qtdConsumida = consumoEstoque.get(p.id)
      if (qtdConsumida && p.controla_estoque && p.estoque_atual !== undefined) {
        return {
          ...p,
          estoque_atual: Math.max(0, p.estoque_atual - qtdConsumida),
        }
      }
      return p
    })
    this.saveProdutos(updatedProdutos)

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
    const produtos = this.getProdutos()
    const reposicao = new Map<string, number>()

    venda.itens.forEach((item) => {
      if (item.is_combo && item.itens_combo && item.itens_combo.length > 0) {
        item.itens_combo.forEach((sub) => {
          const qtd = item.quantidade * sub.quantidade
          reposicao.set(sub.produto_id, (reposicao.get(sub.produto_id) || 0) + qtd)
        })
      } else {
        reposicao.set(item.produto_id, (reposicao.get(item.produto_id) || 0) + item.quantidade)
      }
    })

    const updatedProdutos = produtos.map((p) => {
      const qtd = reposicao.get(p.id)
      if (qtd && p.controla_estoque) {
        return {
          ...p,
          estoque_atual: Math.max(0, (p.estoque_atual ?? 0) + qtd),
        }
      }
      return p
    })
    this.saveProdutos(updatedProdutos)

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
      produtos: this.getProdutos(),
      caixas: this.getCaixas(),
      movimentacoes_caixa: this.getMovimentacoes(),
      vendas: this.getVendas(),
      fichas: this.getFichas(),
    }
  }

  static importBackup(backup: DatabaseBackup): boolean {
    try {
      if (!backup.configuracoes || !backup.categorias || !backup.produtos) {
        throw new Error('Arquivo de backup inválido.')
      }
      safeSet(STORAGE_KEYS.CONFIG, backup.configuracoes)
      safeSet(STORAGE_KEYS.CATEGORIAS, backup.categorias)
      safeSet(STORAGE_KEYS.PRODUTOS, backup.produtos)
      safeSet(STORAGE_KEYS.CAIXAS, backup.caixas || [INITIAL_CAIXA])
      safeSet(STORAGE_KEYS.MOVIMENTACOES, backup.movimentacoes_caixa || [])
      safeSet(STORAGE_KEYS.VENDAS, backup.vendas || [])
      safeSet(STORAGE_KEYS.FICHAS, backup.fichas || [])

      const maxFichaSeq = (backup.fichas || []).reduce((max, f) => Math.max(max, f.sequencial), 0)
      const maxVendaSeq = (backup.vendas || []).reduce(
        (max, v) => Math.max(max, v.sequencial_venda),
        0,
      )
      safeSet(STORAGE_KEYS.SEQUENCIAL_FICHA, maxFichaSeq + 1)
      safeSet(STORAGE_KEYS.SEQUENCIAL_VENDA, maxVendaSeq + 1)

      return true
    } catch (e) {
      console.error('Falha ao restaurar backup:', e)
      return false
    }
  }

  // ZERAR VENDAS PARA NOVO EVENTO
  static resetVendasParaNovoEvento(operador: string, fundoTroco: number): void {
    const novoCaixa: Caixa = {
      id: `cx-${Date.now()}`,
      operador: operador || 'Operador',
      abertura: new Date().toISOString(),
      saldo_inicial: fundoTroco,
      status: 'aberto',
      observacoes: 'Abertura para novo evento limpo',
    }

    safeSet(STORAGE_KEYS.CAIXAS, [novoCaixa])
    safeSet(STORAGE_KEYS.CAIXA_ATIVO_ID, novoCaixa.id)
    safeSet(STORAGE_KEYS.MOVIMENTACOES, [])
    safeSet(STORAGE_KEYS.VENDAS, [])
    safeSet(STORAGE_KEYS.FICHAS, [])
    safeSet(STORAGE_KEYS.SEQUENCIAL_FICHA, 1)
    safeSet(STORAGE_KEYS.SEQUENCIAL_VENDA, 1)
  }
}
