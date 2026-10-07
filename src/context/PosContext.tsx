import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  Categoria,
  Produto,
  ProdutoComImagem,
  Configuracoes,
  Caixa,
  CartItem,
  Venda,
  Ficha,
  FormaPagamento,
  MovimentacaoCaixa,
  MovimentacaoEstoque,
} from '@/types/pos'
import { initPersistentStorage, getStorageBackend, flushStorageWrites } from '@/services/storage'
import { INITIAL_CONFIG } from '@/services/mockData'
import { criarAcoesDeManutencao, type AcoesManutencao } from './maintenanceActions'
import { printFichasDireto } from '@/components/common/ThermalTickets'
import { LocalDatabaseService, StorageCorruptionError } from '@/services/db'
import { StockService } from '@/services/stockService'
import { ProductImageService } from '@/services/productImages'
import { StockLedger } from '@/services/stockLedger'
import { validarEstoqueCarrinho } from '@/lib/stock'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export interface DadosEstoqueProduto {
  controla_estoque: boolean
  estoque_atual?: number
  estoque_minimo?: number
}

export interface MovimentarEstoqueParams {
  produtoId: string
  tipo: 'entrada' | 'perda' | 'ajuste'
  quantidade: number
  motivo?: string
}

/** Backup/restauração/resets vêm de AcoesManutencao (maintenanceActions.ts). */
interface PosContextType extends AcoesManutencao {
  // Configurações e Tema
  config: Configuracoes
  updateConfig: (updates: Partial<Configuracoes>) => void
  tema: 'light' | 'dark'
  toggleTema: () => void

  // Categorias e Produtos
  categorias: Categoria[]
  produtos: Produto[]
  /** produto_id → foto (data URL). Fica fora de `produtos` para a venda não regravar fotos. */
  imagensProdutos: Record<string, string>
  refreshCatalog: () => void
  addCategoria: (cat: Omit<Categoria, 'id'>) => Categoria
  updateCategoria: (id: string, updates: Partial<Categoria>, opts?: { silent?: boolean }) => void
  deleteCategoria: (id: string, moveProdutosParaId?: string) => void
  moveCategoria: (id: string, direction: 'up' | 'down') => void
  addProduto: (prod: Omit<ProdutoComImagem, 'id'>) => Produto
  updateProduto: (id: string, updates: Partial<ProdutoComImagem>) => void
  /** Retorna false se não puder excluir (ex.: produto faz parte de um combo). */
  deleteProduto: (id: string) => boolean
  reporEstoque: (id: string, quantidade: number) => void
  movimentarEstoque: (params: MovimentarEstoqueParams) => boolean
  atualizarEstoqueProduto: (id: string, dados: DadosEstoqueProduto) => boolean
  editarLancamentoEstoque: (movimentoId: string, informado: number, motivo?: string) => boolean
  excluirLancamentoEstoque: (movimentoId: string) => boolean
  movimentacoesEstoque: MovimentacaoEstoque[]

  // Caixa e Turno
  caixaAtivo: Caixa | null
  caixas: Caixa[]
  abrirCaixa: (operador: string, saldoInicial: number, obs?: string) => void
  fecharCaixa: (valores: Caixa['valores_informados'], obs?: string) => Caixa | null
  addMovimentacao: (tipo: 'sangria' | 'suprimento', valor: number, motivo: string) => void
  movimentacoes: MovimentacaoCaixa[]
  refreshCaixa: () => void

  // Carrinho e Vendas
  carrinho: CartItem[]
  /** Retorna false quando o item não pôde ser adicionado (inativo ou sem estoque). */
  addToCart: (produto: Produto, quantidade?: number) => boolean
  removeFromCart: (produtoId: string) => void
  updateCartQuantity: (produtoId: string, quantidade: number) => void
  clearCart: () => void
  cartTotal: number
  cartTotalItems: number

  // Operação de Venda
  finalizarVenda: (
    formaPagamento: FormaPagamento,
    valorRecebido: number,
    desconto?: number,
  ) => { venda: Venda; fichas: Ficha[] } | null
  cancelarVenda: (vendaId: string, motivo: string) => boolean

  // Fichas & Impressão
  vendas: Venda[]
  fichas: Ficha[]
  lastSaleResult: { venda: Venda; fichas: Ficha[] } | null
  setLastSaleResult: (val: { venda: Venda; fichas: Ficha[] } | null) => void
  previewFichas: Ficha[] | null
  setPreviewFichas: (fichas: Ficha[] | null) => void

  // Modal State Helpers (Atalhos)
  isPaymentModalOpen: boolean
  setIsPaymentModalOpen: (open: boolean) => void
  isQuickSearchOpen: boolean
  setIsQuickSearchOpen: (open: boolean) => void
}

const PosContext = createContext<PosContextType | undefined>(undefined)

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Configurações
  const [config, setConfigState] = useState<Configuracoes>(INITIAL_CONFIG)
  const [tema, setTemaState] = useState<'light' | 'dark'>('light')

  // Catálogo
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [imagensProdutos, setImagensProdutos] = useState<Record<string, string>>({})
  const [movimentacoesEstoque, setMovimentacoesEstoque] = useState<MovimentacaoEstoque[]>([])

  // Caixa
  const [caixas, setCaixas] = useState<Caixa[]>([])
  const [caixaAtivo, setCaixaAtivo] = useState<Caixa | null>(null)
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([])

  // Vendas e Fichas
  const [vendas, setVendas] = useState<Venda[]>([])
  const [fichas, setFichas] = useState<Ficha[]>([])

  // Carrinho
  const [carrinho, setCarrinho] = useState<CartItem[]>([])

  // Modais e Impressão
  const [lastSaleResult, setLastSaleResult] = useState<{ venda: Venda; fichas: Ficha[] } | null>(
    null,
  )
  const [previewFichas, setPreviewFichas] = useState<Ficha[] | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false)

  const [storageReady, setStorageReady] = useState(false)
  const [storageFatalError, setStorageFatalError] = useState<string | null>(null)
  const [vendaEmAndamento, setVendaEmAndamento] = useState(false)

  // Bootstrap: SQLite (nativo) ou localStorage (browser)
  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const { backend } = await initPersistentStorage()
        if (cancelled) return

        LocalDatabaseService.initDatabase()
        ProductImageService.migrarFotosAntigas()
        const loadedConfig = LocalDatabaseService.getConfig()
        setConfigState(loadedConfig)
        setTemaState(loadedConfig.tema || 'light')
        setCategorias(LocalDatabaseService.getCategorias())
        setProdutos(LocalDatabaseService.getProdutos())
        setImagensProdutos(ProductImageService.mapa())
        setMovimentacoesEstoque(StockService.getMovimentacoes())
        setCaixas(LocalDatabaseService.getCaixas())
        setCaixaAtivo(LocalDatabaseService.getCaixaAtivo())
        const ativoBoot = LocalDatabaseService.getCaixaAtivo()
        setMovimentacoes(
          ativoBoot ? LocalDatabaseService.getMovimentacoes(ativoBoot.id) : [],
        )
        setVendas(LocalDatabaseService.getVendas())
        setFichas(LocalDatabaseService.getFichas())
        setStorageFatalError(null)
        setStorageReady(true)

        if (import.meta.env.DEV) {
          console.info(`[PDV] Persistência: ${backend} (${getStorageBackend()})`)
        }
      } catch (err) {
        console.error('Falha ao inicializar armazenamento local', err)
        const message =
          err instanceof StorageCorruptionError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Não foi possível abrir o banco de dados local.'
        if (!cancelled) {
          setStorageFatalError(message)
          toast.error(message)
          // Não libera o PDV em modo “só memória” — evita turno fantasma
          setStorageReady(true)
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  // Sincronizar tema no DOM
  useEffect(() => {
    if (!storageReady || storageFatalError) return
    const root = document.documentElement
    if (tema === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [tema, storageReady, storageFatalError])

  if (!storageReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="space-y-2 text-center">
          <p className="text-lg font-semibold">Show de Prêmios</p>
          <p className="text-sm text-muted-foreground">Carregando banco de dados local…</p>
        </div>
      </div>
    )
  }

  if (storageFatalError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md space-y-3 text-center border border-destructive/40 rounded-2xl p-6 bg-card">
          <p className="text-lg font-black text-destructive">Banco local indisponível</p>
          <p className="text-sm text-muted-foreground">{storageFatalError}</p>
          <p className="text-xs text-muted-foreground">
            Feche o aplicativo, reinstale se necessário ou restaure um backup. Não continue vendendo
            sem persistência.
          </p>
        </div>
      </div>
    )
  }

  const toggleTema = () => {
    const next: 'light' | 'dark' = tema === 'light' ? 'dark' : 'light'
    setTemaState(next)
    const updated: Configuracoes = { ...config, tema: next }
    setConfigState(updated)
    LocalDatabaseService.saveConfig(updated)
  }

  const updateConfig = (updates: Partial<Configuracoes>) => {
    const updated = { ...config, ...updates }
    setConfigState(updated)
    LocalDatabaseService.saveConfig(updated)
    toast.success('Configurações salvas com sucesso!')
  }

  /** Recarrega saldos e histórico de estoque (após qualquer operação que mexa em estoque). */
  const refreshEstoque = () => {
    setProdutos(LocalDatabaseService.getProdutos())
    setMovimentacoesEstoque(StockService.getMovimentacoes())
  }

  const persistirAgora = (mensagemFalha: string) => {
    void flushStorageWrites().catch((err) => {
      console.error(err)
      toast.error(mensagemFalha)
    })
  }

  const refreshCatalog = () => {
    setCategorias(LocalDatabaseService.getCategorias())
    setImagensProdutos(ProductImageService.mapa())
    refreshEstoque()
  }

  const refreshCaixa = () => {
    setCaixas(LocalDatabaseService.getCaixas())
    const ativo = LocalDatabaseService.getCaixaAtivo()
    setCaixaAtivo(ativo)
    setMovimentacoes(
      ativo
        ? LocalDatabaseService.getMovimentacoes(ativo.id)
        : [],
    )
    setVendas(LocalDatabaseService.getVendas())
    setFichas(LocalDatabaseService.getFichas())
    setMovimentacoesEstoque(StockService.getMovimentacoes())
  }

  // CRUD Categorias
  const addCategoria = (cat: Omit<Categoria, 'id'>) => {
    const nova = LocalDatabaseService.addCategoria(cat)
    setCategorias(LocalDatabaseService.getCategorias())
    toast.success(`Categoria "${nova.nome}" criada.`)
    return nova
  }

  const updateCategoria = (
    id: string,
    updates: Partial<Categoria>,
    opts?: { silent?: boolean },
  ) => {
    LocalDatabaseService.updateCategoria(id, updates)
    setCategorias(LocalDatabaseService.getCategorias())
    if (!opts?.silent) toast.success('Categoria atualizada.')
  }

  const deleteCategoria = (id: string, moveProdutosParaId?: string) => {
    LocalDatabaseService.deleteCategoria(id, moveProdutosParaId)
    setCategorias(LocalDatabaseService.getCategorias())
    if (moveProdutosParaId) {
      setProdutos(LocalDatabaseService.getProdutos())
    }
    toast.success('Categoria removida.')
  }

  const moveCategoria = (id: string, direction: 'up' | 'down') => {
    LocalDatabaseService.moveCategoria(id, direction)
    setCategorias(LocalDatabaseService.getCategorias())
  }

  // CRUD Produtos
  const addProduto = (prod: Omit<ProdutoComImagem, 'id'>) => {
    const novo = LocalDatabaseService.addProduto(prod)
    setImagensProdutos(ProductImageService.mapa())
    refreshEstoque()
    toast.success(`Produto "${novo.nome}" cadastrado.`)
    return novo
  }

  const updateProduto = (id: string, updates: Partial<ProdutoComImagem>) => {
    LocalDatabaseService.updateProduto(id, updates)
    if ('imagem_base64' in updates) setImagensProdutos(ProductImageService.mapa())
    refreshEstoque()
    toast.success('Produto atualizado.')
  }

  const deleteProduto = (id: string): boolean => {
    try {
      LocalDatabaseService.deleteProduto(id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível excluir o produto.')
      return false
    }
    setProdutos(LocalDatabaseService.getProdutos())
    setImagensProdutos(ProductImageService.mapa())
    setCarrinho((prev) => prev.filter((item) => item.produto.id !== id))
    toast.success('Produto removido.')
    return true
  }

  /** Executa uma operação de estoque com toast de erro amigável e gravação imediata. */
  const executarOperacaoEstoque = (operacao: () => void, mensagemSucesso: string): boolean => {
    try {
      operacao()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível alterar o estoque.')
      return false
    }
    refreshEstoque()
    toast.success(mensagemSucesso)
    persistirAgora('Estoque alterado, mas falhou gravar no disco. Exporte um backup.')
    return true
  }

  const atualizarEstoqueProduto = (id: string, dados: DadosEstoqueProduto) =>
    executarOperacaoEstoque(
      () => LocalDatabaseService.updateProduto(id, dados),
      'Estoque do produto atualizado.',
    )

  const editarLancamentoEstoque = (movimentoId: string, informado: number, motivo?: string) =>
    executarOperacaoEstoque(
      () =>
        StockLedger.editar({ movimentoId, informado, motivo, operador: caixaAtivo?.operador }),
      'Lançamento corrigido e saldo recalculado.',
    )

  const excluirLancamentoEstoque = (movimentoId: string) =>
    executarOperacaoEstoque(
      () => StockLedger.excluir(movimentoId),
      'Lançamento excluído e saldo recalculado.',
    )

  const movimentarEstoque = (params: MovimentarEstoqueParams): boolean => {
    try {
      const updated = LocalDatabaseService.movimentarEstoque({
        ...params,
        operador: caixaAtivo?.operador,
      })
      refreshEstoque()
      toast.success(`Estoque de "${updated.nome}": ${updated.estoque_atual} un.`)
      persistirAgora('Estoque alterado, mas falhou gravar no disco. Exporte um backup.')
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível movimentar o estoque.')
      return false
    }
  }

  const reporEstoque = (id: string, quantidade: number) => {
    movimentarEstoque({ produtoId: id, tipo: 'entrada', quantidade, motivo: 'Reposição rápida' })
  }

  // Caixa Operations
  const abrirCaixa = (operador: string, saldoInicial: number, obs?: string) => {
    const novo = LocalDatabaseService.abrirCaixa(operador, saldoInicial, obs)
    setCaixas(LocalDatabaseService.getCaixas())
    setCaixaAtivo(novo)
    setMovimentacoes([])
    toast.success(
      `Caixa aberto por ${novo.operador} com saldo inicial de R$ ${saldoInicial.toFixed(2)}`,
    )
  }

  const fecharCaixa = (valores: Caixa['valores_informados'], obs?: string) => {
    if (!caixaAtivo) return null
    const fechado = LocalDatabaseService.fecharCaixa(caixaAtivo.id, valores, obs)
    setCaixas(LocalDatabaseService.getCaixas())
    setCaixaAtivo(null)
    setMovimentacoes([])
    toast.success('Caixa fechado com sucesso!')
    return fechado
  }

  const addMovimentacao = (tipo: 'sangria' | 'suprimento', valor: number, motivo: string) => {
    if (!caixaAtivo) {
      toast.error('Nenhum caixa aberto para registrar movimentação!')
      return
    }
    LocalDatabaseService.addMovimentacao(caixaAtivo.id, tipo, valor, motivo, caixaAtivo.operador)
    setMovimentacoes(LocalDatabaseService.getMovimentacoes(caixaAtivo.id))
    toast.success(
      tipo === 'sangria'
        ? `Sangria de ${formatCurrency(valor)} registrada!`
        : `Suprimento de ${formatCurrency(valor)} registrado!`,
    )
  }

  /** Carrinho resultante se a quantidade do produto mudar para `novaQtd`. */
  const simularCarrinho = (produto: Produto, novaQtd: number): CartItem[] => {
    const existe = carrinho.some((it) => it.produto.id === produto.id)
    if (!existe) return [...carrinho, { produto, quantidade: novaQtd, preco_unitario: produto.preco }]
    return carrinho.map((it) => (it.produto.id === produto.id ? { ...it, quantidade: novaQtd } : it))
  }

  /** Bloqueia aumento de quantidade sem estoque (considera combos e todo o carrinho). */
  const estoqueSuportaCarrinho = (carrinhoSimulado: CartItem[]): boolean => {
    const checagem = validarEstoqueCarrinho(carrinhoSimulado, produtos)
    if (!checagem.ok) {
      toast.error(checagem.motivo || 'Estoque insuficiente!')
      return false
    }
    return true
  }

  // Carrinho
  const addToCart = (produto: Produto, quantidade = 1): boolean => {
    if (!produto.ativo) {
      toast.error('Este produto está inativo.')
      return false
    }

    const existing = carrinho.find((item) => item.produto.id === produto.id)
    const novaQtd = (existing ? existing.quantidade : 0) + quantidade
    if (!estoqueSuportaCarrinho(simularCarrinho(produto, novaQtd))) return false

    setCarrinho((prev) => {
      const hasExisting = prev.find((item) => item.produto.id === produto.id)
      if (hasExisting) {
        return prev.map((item) =>
          item.produto.id === produto.id
            ? { ...item, quantidade: item.quantidade + quantidade }
            : item,
        )
      }
      return [...prev, { produto, quantidade, preco_unitario: produto.preco }]
    })
    return true
  }

  const removeFromCart = (produtoId: string) => {
    setCarrinho((prev) => prev.filter((item) => item.produto.id !== produtoId))
  }

  const updateCartQuantity = (produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removeFromCart(produtoId)
      return
    }

    const item = carrinho.find((it) => it.produto.id === produtoId)
    const aumentou = item ? quantidade > item.quantidade : false
    if (item && aumentou && !estoqueSuportaCarrinho(simularCarrinho(item.produto, quantidade))) {
      return
    }

    setCarrinho((prev) =>
      prev.map((it) => (it.produto.id === produtoId ? { ...it, quantidade } : it)),
    )
  }

  const clearCart = () => {
    setCarrinho([])
  }

  const cartTotal = carrinho.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0)

  const cartTotalItems = carrinho.reduce((acc, item) => acc + item.quantidade, 0)

  // Finalização de Venda
  const finalizarVenda = (formaPagamento: FormaPagamento, valorRecebido: number, desconto = 0) => {
    if (vendaEmAndamento) {
      toast.error('Aguarde: já existe uma venda sendo finalizada.')
      return null
    }
    if (!caixaAtivo) {
      toast.error('É necessário abrir um Caixa antes de realizar vendas!')
      return null
    }
    if (carrinho.length === 0) {
      toast.error('Carrinho vazio!')
      return null
    }

    setVendaEmAndamento(true)
    try {
      const totalCalculado = Math.max(0, cartTotal - desconto)
      const troco = formaPagamento === 'dinheiro' ? Math.max(0, valorRecebido - totalCalculado) : 0

      const result = LocalDatabaseService.finalizarVenda({
        caixaId: caixaAtivo.id,
        operador: caixaAtivo.operador,
        itens: carrinho,
        formaPagamento,
        valorRecebido,
        troco,
        desconto,
      })

      // Atualizar produtos para refletir a baixa de estoque na UI imediatamente
      refreshEstoque()
      setVendas(LocalDatabaseService.getVendas())
      setFichas(LocalDatabaseService.getFichas())
      setLastSaleResult(result)
      clearCart()
      setIsPaymentModalOpen(false)

      toast.success(
        `Venda #${result.venda.sequencial_venda} finalizada! ${result.fichas.length} ficha(s) gerada(s).`,
      )

      void flushStorageWrites().catch((err) => {
        console.error(err)
        toast.error('Venda registrada, mas houve falha ao gravar no disco. Não desligue o PC e tente exportar backup.')
      })

      // Impressão direta (sem painel de pré-visualização)
      if (config.auto_imprimir_ao_finalizar !== false && result.fichas.length > 0) {
        window.setTimeout(() => {
          void printFichasDireto(result.fichas, config)
        }, 120)
      }

      return result
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível finalizar a venda.'
      toast.error(message)
      return null
    } finally {
      setVendaEmAndamento(false)
    }
  }

  const cancelarVenda = (vendaId: string, motivo: string) => {
    try {
      const ok = LocalDatabaseService.cancelarVenda(vendaId, motivo)
      if (ok) {
        setVendas(LocalDatabaseService.getVendas())
        setFichas(LocalDatabaseService.getFichas())
        refreshEstoque()
        toast.success('Venda cancelada e estoque reposto.')
        void flushStorageWrites().catch((err) => {
          console.error(err)
          toast.error('Cancelamento feito, mas falhou gravar no disco. Exporte um backup.')
        })
      } else {
        toast.error('Não foi possível cancelar a venda.')
      }
      return ok
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar a venda.')
      return false
    }
  }

  const manutencao = criarAcoesDeManutencao({
    recarregarTudo: () => {
      const configAtual = LocalDatabaseService.getConfig()
      setConfigState(configAtual)
      setTemaState(configAtual.tema || 'light')
      refreshCatalog()
      refreshCaixa()
    },
    limparTelaDeVenda: () => {
      clearCart()
      setLastSaleResult(null)
      setPreviewFichas(null)
    },
    persistirAgora,
  })

  return (
    <PosContext.Provider
      value={{
        config,
        updateConfig,
        tema,
        toggleTema,
        categorias,
        produtos,
        imagensProdutos,
        refreshCatalog,
        addCategoria,
        updateCategoria,
        deleteCategoria,
        moveCategoria,
        addProduto,
        updateProduto,
        deleteProduto,
        reporEstoque,
        movimentarEstoque,
        atualizarEstoqueProduto,
        editarLancamentoEstoque,
        excluirLancamentoEstoque,
        movimentacoesEstoque,
        caixaAtivo,
        caixas,
        abrirCaixa,
        fecharCaixa,
        addMovimentacao,
        movimentacoes,
        refreshCaixa,
        carrinho,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        cartTotal,
        cartTotalItems,
        finalizarVenda,
        cancelarVenda,
        vendas,
        fichas,
        lastSaleResult,
        setLastSaleResult,
        previewFichas,
        setPreviewFichas,
        ...manutencao,
        isPaymentModalOpen,
        setIsPaymentModalOpen,
        isQuickSearchOpen,
        setIsQuickSearchOpen,
      }}
    >
      {children}
    </PosContext.Provider>
  )
}

export const usePos = () => {
  const context = useContext(PosContext)
  if (!context) {
    throw new Error('usePos deve ser utilizado dentro de um PosProvider')
  }
  return context
}
