import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  Categoria,
  Produto,
  Configuracoes,
  Caixa,
  CartItem,
  Venda,
  Ficha,
  FormaPagamento,
  MovimentacaoCaixa,
} from '@/types/pos'
import { LocalDatabaseService } from '@/services/db'
import { toast } from 'sonner'

interface PosContextType {
  // Configurações e Tema
  config: Configuracoes
  updateConfig: (updates: Partial<Configuracoes>) => void
  tema: 'light' | 'dark'
  toggleTema: () => void

  // Categorias e Produtos
  categorias: Categoria[]
  produtos: Produto[]
  refreshCatalog: () => void
  addCategoria: (cat: Omit<Categoria, 'id'>) => Categoria
  updateCategoria: (id: string, updates: Partial<Categoria>) => void
  deleteCategoria: (id: string) => void
  addProduto: (prod: Omit<Produto, 'id'>) => Produto
  updateProduto: (id: string, updates: Partial<Produto>) => void
  deleteProduto: (id: string) => void
  reporEstoque: (id: string, quantidade: number) => void

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
  addToCart: (produto: Produto, quantidade?: number) => void
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
  validarFicha: (codigo: string) => { sucesso: boolean; mensagem: string; ficha?: Ficha }

  // Administração e Manutenção
  zerarVendas: (fundoTroco: number, operador: string) => void
  importarBackup: (jsonContent: string) => boolean
  exportarBackup: () => void

  // Modal State Helpers (Atalhos)
  isPaymentModalOpen: boolean
  setIsPaymentModalOpen: (open: boolean) => void
  isQuickSearchOpen: boolean
  setIsQuickSearchOpen: (open: boolean) => void
}

const PosContext = createContext<PosContextType | undefined>(undefined)

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Configurações
  const [config, setConfigState] = useState<Configuracoes>(() => LocalDatabaseService.getConfig())
  const [tema, setTemaState] = useState<'light' | 'dark'>(() => {
    const saved = LocalDatabaseService.getConfig().tema
    return saved || 'light'
  })

  // Catálogo
  const [categorias, setCategorias] = useState<Categoria[]>(() =>
    LocalDatabaseService.getCategorias(),
  )
  const [produtos, setProdutos] = useState<Produto[]>(() => LocalDatabaseService.getProdutos())

  // Caixa
  const [caixas, setCaixas] = useState<Caixa[]>(() => LocalDatabaseService.getCaixas())
  const [caixaAtivo, setCaixaAtivo] = useState<Caixa | null>(() =>
    LocalDatabaseService.getCaixaAtivo(),
  )
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>(() =>
    LocalDatabaseService.getMovimentacoes(),
  )

  // Vendas e Fichas
  const [vendas, setVendas] = useState<Venda[]>(() => LocalDatabaseService.getVendas())
  const [fichas, setFichas] = useState<Ficha[]>(() => LocalDatabaseService.getFichas())

  // Carrinho
  const [carrinho, setCarrinho] = useState<CartItem[]>([])

  // Modais e Impressão
  const [lastSaleResult, setLastSaleResult] = useState<{ venda: Venda; fichas: Ficha[] } | null>(
    null,
  )
  const [previewFichas, setPreviewFichas] = useState<Ficha[] | null>(null)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false)

  // Sincronizar tema no DOM
  useEffect(() => {
    const root = document.documentElement
    if (tema === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [tema])

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

  const refreshCatalog = () => {
    setCategorias(LocalDatabaseService.getCategorias())
    setProdutos(LocalDatabaseService.getProdutos())
  }

  const refreshCaixa = () => {
    setCaixas(LocalDatabaseService.getCaixas())
    setCaixaAtivo(LocalDatabaseService.getCaixaAtivo())
    setMovimentacoes(LocalDatabaseService.getMovimentacoes())
    setVendas(LocalDatabaseService.getVendas())
    setFichas(LocalDatabaseService.getFichas())
  }

  // CRUD Categorias
  const addCategoria = (cat: Omit<Categoria, 'id'>) => {
    const nova = LocalDatabaseService.addCategoria(cat)
    setCategorias(LocalDatabaseService.getCategorias())
    toast.success(`Categoria "${nova.nome}" criada.`)
    return nova
  }

  const updateCategoria = (id: string, updates: Partial<Categoria>) => {
    LocalDatabaseService.updateCategoria(id, updates)
    setCategorias(LocalDatabaseService.getCategorias())
    toast.success('Categoria atualizada.')
  }

  const deleteCategoria = (id: string) => {
    LocalDatabaseService.deleteCategoria(id)
    setCategorias(LocalDatabaseService.getCategorias())
    toast.success('Categoria removida.')
  }

  // CRUD Produtos
  const addProduto = (prod: Omit<Produto, 'id'>) => {
    const novo = LocalDatabaseService.addProduto(prod)
    setProdutos(LocalDatabaseService.getProdutos())
    toast.success(`Produto "${novo.nome}" cadastrado.`)
    return novo
  }

  const updateProduto = (id: string, updates: Partial<Produto>) => {
    LocalDatabaseService.updateProduto(id, updates)
    setProdutos(LocalDatabaseService.getProdutos())
    toast.success('Produto atualizado.')
  }

  const deleteProduto = (id: string) => {
    LocalDatabaseService.deleteProduto(id)
    setProdutos(LocalDatabaseService.getProdutos())
    toast.success('Produto removido.')
  }

  const reporEstoque = (id: string, quantidade: number) => {
    const updated = LocalDatabaseService.reporEstoque(id, quantidade)
    if (updated) {
      setProdutos(LocalDatabaseService.getProdutos())
      toast.success(`Estoque de "${updated.nome}" atualizado para ${updated.estoque_atual} un.`)
    }
  }

  // Caixa Operations
  const abrirCaixa = (operador: string, saldoInicial: number, obs?: string) => {
    const novo = LocalDatabaseService.abrirCaixa(operador, saldoInicial, obs)
    setCaixas(LocalDatabaseService.getCaixas())
    setCaixaAtivo(novo)
    toast.success(
      `Caixa aberto por ${novo.operador} com saldo inicial de R$ ${saldoInicial.toFixed(2)}`,
    )
  }

  const fecharCaixa = (valores: Caixa['valores_informados'], obs?: string) => {
    if (!caixaAtivo) return null
    const fechado = LocalDatabaseService.fecharCaixa(caixaAtivo.id, valores, obs)
    setCaixas(LocalDatabaseService.getCaixas())
    setCaixaAtivo(null)
    toast.success('Caixa fechado com sucesso!')
    return fechado
  }

  const addMovimentacao = (tipo: 'sangria' | 'suprimento', valor: number, motivo: string) => {
    if (!caixaAtivo) {
      toast.error('Nenhum caixa aberto para registrar movimentação!')
      return
    }
    LocalDatabaseService.addMovimentacao(caixaAtivo.id, tipo, valor, motivo, caixaAtivo.operador)
    setMovimentacoes(LocalDatabaseService.getMovimentacoes())
    toast.success(
      `${tipo === 'sangria' ? 'Sangria' : 'Suprimento'} de R$ ${valor.toFixed(2)} registrada!`,
    )
  }

  // Validador de estoque para um item/produto antes de adicionar ou alterar carrinho
  const checkEstoqueDisponivel = (
    produto: Produto,
    quantidadeDesejadaTotal: number,
    currentCart: CartItem[],
  ): { ok: boolean; motivo?: string } => {
    // 1. Se for produto simples com controle de estoque
    if (produto.controla_estoque && produto.estoque_atual !== undefined) {
      // Outros itens no carrinho que possam consumir esse mesmo produto (ex: outros combos)
      let consumoOutrosItens = 0
      currentCart.forEach((ci) => {
        if (ci.produto.id !== produto.id && ci.produto.is_combo && ci.produto.itens_combo) {
          const sub = ci.produto.itens_combo.find((s) => s.produto_id === produto.id)
          if (sub) {
            consumoOutrosItens += ci.quantidade * sub.quantidade
          }
        }
      })
      const estoqueLivre = Math.max(0, produto.estoque_atual - consumoOutrosItens)
      if (quantidadeDesejadaTotal > estoqueLivre) {
        return {
          ok: false,
          motivo: `Estoque insuficiente para "${produto.nome}". Disponível: ${estoqueLivre} un.`,
        }
      }
    }

    // 2. Se for combo, verificar todos os seus componentes desmembrados
    if (produto.is_combo && produto.itens_combo && produto.itens_combo.length > 0) {
      const prodMap = new Map(produtos.map((p) => [p.id, p]))
      for (const sub of produto.itens_combo) {
        const subProd = prodMap.get(sub.produto_id)
        if (subProd && subProd.controla_estoque && subProd.estoque_atual !== undefined) {
          // Quantidade necessária para esta quantidade do combo
          const qtdNecessariaSub = quantidadeDesejadaTotal * sub.quantidade
          // Calcular consumo desse subProd por outros itens no carrinho
          let consumoOutros = 0
          currentCart.forEach((ci) => {
            if (ci.produto.id !== produto.id) {
              if (ci.produto.id === subProd.id) {
                consumoOutros += ci.quantidade
              } else if (ci.produto.is_combo && ci.produto.itens_combo) {
                const outSub = ci.produto.itens_combo.find((s) => s.produto_id === subProd.id)
                if (outSub) {
                  consumoOutros += ci.quantidade * outSub.quantidade
                }
              }
            }
          })
          const estoqueLivreSub = Math.max(0, subProd.estoque_atual - consumoOutros)
          if (qtdNecessariaSub > estoqueLivreSub) {
            return {
              ok: false,
              motivo: `Estoque insuficiente do componente "${subProd.nome}" do combo. Necessário: ${qtdNecessariaSub} un, disponível: ${estoqueLivreSub} un.`,
            }
          }
        }
      }
    }

    return { ok: true }
  }

  // Carrinho
  const addToCart = (produto: Produto, quantidade = 1) => {
    if (!produto.ativo) {
      toast.error('Este produto está inativo.')
      return
    }

    // Calcular quantidade total que ficaria no carrinho
    const existing = carrinho.find((item) => item.produto.id === produto.id)
    const novaQtd = (existing ? existing.quantidade : 0) + quantidade

    // Checar estoque
    const checagem = checkEstoqueDisponivel(produto, novaQtd, carrinho)
    if (!checagem.ok) {
      toast.error(checagem.motivo || 'Estoque insuficiente!')
      return
    }

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
    if (item) {
      const checagem = checkEstoqueDisponivel(item.produto, quantidade, carrinho)
      if (!checagem.ok) {
        toast.error(checagem.motivo || 'Estoque insuficiente!')
        return
      }
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
    if (!caixaAtivo) {
      toast.error('É necessário abrir um Caixa antes de realizar vendas!')
      return null
    }
    if (carrinho.length === 0) {
      toast.error('Carrinho vazio!')
      return null
    }

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
    setProdutos(LocalDatabaseService.getProdutos())
    setVendas(LocalDatabaseService.getVendas())
    setFichas(LocalDatabaseService.getFichas())
    setLastSaleResult(result)
    clearCart()
    setIsPaymentModalOpen(false)

    toast.success(
      `Venda #${result.venda.sequencial_venda} finalizada! ${result.fichas.length} ficha(s) gerada(s).`,
    )

    return result
  }

  const cancelarVenda = (vendaId: string, motivo: string) => {
    const ok = LocalDatabaseService.cancelarVenda(vendaId, motivo)
    if (ok) {
      setVendas(LocalDatabaseService.getVendas())
      setFichas(LocalDatabaseService.getFichas())
      toast.success(`Venda cancelada com sucesso.`)
    } else {
      toast.error('Não foi possível cancelar a venda.')
    }
    return ok
  }

  const validarFicha = (codigo: string) => {
    const operador = caixaAtivo ? caixaAtivo.operador : 'Balcão'
    const result = LocalDatabaseService.validarFicha(codigo, operador)
    if (result.sucesso) {
      setFichas(LocalDatabaseService.getFichas())
      toast.success(result.mensagem)
    } else {
      toast.error(result.mensagem)
    }
    return result
  }

  const zerarVendas = (fundoTroco: number, operador: string) => {
    LocalDatabaseService.resetVendasParaNovoEvento(operador, fundoTroco)
    refreshCaixa()
    clearCart()
    setLastSaleResult(null)
    setPreviewFichas(null)
    toast.success('Base de vendas reiniciada para um novo evento!')
  }

  const exportarBackup = () => {
    const backup = LocalDatabaseService.exportBackup()
    const jsonStr = JSON.stringify(backup, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup_pdv_fichas_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Backup exportado com sucesso!')
  }

  const importarBackup = (jsonContent: string): boolean => {
    try {
      const data = JSON.parse(jsonContent)
      const ok = LocalDatabaseService.importBackup(data)
      if (ok) {
        setConfigState(LocalDatabaseService.getConfig())
        setTemaState(LocalDatabaseService.getConfig().tema)
        refreshCatalog()
        refreshCaixa()
        clearCart()
        toast.success('Backup restaurado com sucesso!')
        return true
      }
      toast.error('Estrutura de backup inválida.')
      return false
    } catch {
      toast.error('Erro ao ler arquivo JSON de backup.')
      return false
    }
  }

  return (
    <PosContext.Provider
      value={{
        config,
        updateConfig,
        tema,
        toggleTema,
        categorias,
        produtos,
        refreshCatalog,
        addCategoria,
        updateCategoria,
        deleteCategoria,
        addProduto,
        updateProduto,
        deleteProduto,
        reporEstoque,
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
        validarFicha,
        zerarVendas,
        importarBackup,
        exportarBackup,
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
