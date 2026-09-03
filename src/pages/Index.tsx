import React, { useState, useMemo, useRef, useEffect } from 'react'
import { usePos } from '@/context/PosContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  Printer,
  X,
  CreditCard,
  AlertTriangle,
  Package,
  Layers,
  CheckCircle,
  Tag,
  ArrowRight,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

export default function Index() {
  const {
    categorias,
    produtos,
    caixaAtivo,
    carrinho,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartTotal,
    cartTotalItems,
    setIsPaymentModalOpen,
    setPreviewFichas,
    lastSaleResult,
  } = usePos()

  const [selectedCategoriaId, setSelectedCategoriaId] = useState<string>('todas')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Filtragem de produtos por categoria e busca por nome ou código rápido
  const filteredProdutos = useMemo(() => {
    return produtos.filter((prod) => {
      if (!prod.ativo) return false
      const matchCat = selectedCategoriaId === 'todas' || prod.categoria_id === selectedCategoriaId
      const query = searchQuery.trim().toLowerCase()
      if (!query) return matchCat

      const matchName = prod.nome.toLowerCase().includes(query)
      const matchCode = prod.codigo_rapido.toLowerCase().includes(query)
      return matchCat && (matchName || matchCode)
    })
  }, [produtos, selectedCategoriaId, searchQuery])

  // Teclado no PDV (Enter para finalizar, Esc para limpar, etc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se pressionar Enter e carrinho tiver itens, abre modal de pagamento
      if (e.key === 'Enter' && carrinho.length > 0 && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        if (!caixaAtivo) {
          toast.error('Abra o Caixa antes de vender!')
          return
        }
        setIsPaymentModalOpen(true)
      } else if (e.key === 'Escape' && carrinho.length > 0) {
        if (confirm('Deseja limpar todos os itens do carrinho?')) {
          clearCart()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [carrinho, caixaAtivo, setIsPaymentModalOpen, clearCart])

  // Adicionar produto pelo código rápido caso digite no campo e aperte Enter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchQuery.trim().toLowerCase()
    if (!query) return

    // Busca exata pelo código rápido
    const exactCode = produtos.find((p) => p.ativo && p.codigo_rapido.toLowerCase() === query)
    if (exactCode) {
      addToCart(exactCode)
      toast.success(`+1 ${exactCode.nome}`)
      setSearchQuery('')
      return
    }

    // Se houver apenas 1 resultado na lista filtrada
    if (filteredProdutos.length === 1) {
      addToCart(filteredProdutos[0])
      toast.success(`+1 ${filteredProdutos[0].nome}`)
      setSearchQuery('')
    }
  }

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* ALERTA DE CAIXA FECHADO */}
      {!caixaAtivo && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-card border-2 border-amber-500/50 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground">O Caixa está Fechado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Para iniciar as vendas e emitir fichas no balcão, é obrigatório abrir um turno de
                caixa com o saldo inicial.
              </p>
            </div>
            <Button
              onClick={() => (window.location.href = '/caixa')}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base"
            >
              Abrir Caixa Agora (F2)
            </Button>
          </div>
        </div>
      )}

      {/* ÁREA ESQUERDA: CATEGORIAS & GRADE DE PRODUTOS */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden">
        {/* BARRA SUPERIOR: BUSCA RÁPIDA & FILTROS */}
        <div className="p-3 border-b border-border bg-card flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* CAMPO DE BUSCA */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar por nome ou código rápido (ex: 101)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-11 text-sm bg-muted/40 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* ÚLTIMA VENDA: REIMPRESSÃO RÁPIDA */}
          {lastSaleResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewFichas(lastSaleResult.fichas)}
              className="h-11 border-primary/30 text-primary hover:bg-primary/10 gap-1.5 shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span className="font-semibold text-xs">
                Reimprimir Venda #{lastSaleResult.venda.sequencial_venda}
              </span>
            </Button>
          )}
        </div>

        {/* BARRA DE CATEGORIAS (TOUCH FRIENDLY / BOTÕES LARGOS) */}
        <div className="p-3 bg-muted/30 border-b border-border overflow-x-auto flex items-center gap-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategoriaId('todas')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0 transition-all ${
              selectedCategoriaId === 'todas'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border'
            }`}
          >
            Todos ({produtos.filter((p) => p.ativo).length})
          </button>
          {categorias.map((cat) => {
            const isSelected = selectedCategoriaId === cat.id
            const count = produtos.filter((p) => p.categoria_id === cat.id && p.ativo).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoriaId(cat.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0 transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'text-white shadow-md scale-105 border-transparent'
                    : 'bg-card text-foreground hover:bg-muted border-border'
                }`}
                style={{
                  backgroundColor: isSelected ? cat.cor : undefined,
                  borderColor: isSelected ? cat.cor : undefined,
                }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: isSelected ? '#FFFFFF' : cat.cor }}
                />
                <span>{cat.nome}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* GRADE DE PRODUTOS (BOTÕES GRANDES TOUCH & CLIQUE RÁPIDO) */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProdutos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <Package className="w-12 h-12 mb-3 stroke-[1.5] text-muted-foreground/60" />
              <h4 className="font-bold text-base text-foreground">Nenhum produto encontrado</h4>
              <p className="text-xs max-w-sm mt-1">
                Tente buscar por outro termo ou selecione uma categoria diferente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredProdutos.map((prod) => {
                const cat = categorias.find((c) => c.id === prod.categoria_id)
                const itemInCart = carrinho.find((it) => it.produto.id === prod.id)

                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addToCart(prod)}
                    className={`relative group text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between select-none active:scale-95 bg-card hover:shadow-lg ${
                      itemInCart
                        ? 'border-primary shadow-sm ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {/* TOPO DO CARD: CÓDIGO RÁPIDO & BADGE DE COMBO/INDIVIDUAL */}
                    <div className="flex items-start justify-between gap-1 w-full mb-2">
                      <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        #{prod.codigo_rapido}
                      </span>
                      {prod.is_combo ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] uppercase font-extrabold gap-1 py-0 px-1.5">
                          <Sparkles className="w-3 h-3" /> COMBO
                        </Badge>
                      ) : (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat?.cor || '#3B82F6' }}
                          title={cat?.nome}
                        />
                      )}
                    </div>

                    {/* CORPO DO CARD: NOME DO PRODUTO */}
                    <div className="w-full my-1">
                      <div className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {prod.nome}
                      </div>
                      {prod.descricao && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {prod.descricao}
                        </div>
                      )}
                    </div>

                    {/* RODAPÉ DO CARD: PREÇO E CONTADOR DE ITENS NO CARRINHO */}
                    <div className="flex items-center justify-between w-full mt-3 pt-2 border-t border-border/60">
                      <span className="font-black text-base text-foreground font-mono">
                        {formatCurrency(prod.preco)}
                      </span>
                      {itemInCart ? (
                        <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-md animate-scale-up">
                          {itemInCart.quantidade}
                        </span>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center text-muted-foreground">
                          <Plus className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ÁREA DIREITA: CARRINHO LATERAL / PAINEL TOTALIZADOR */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-card border-l border-border flex flex-col h-auto lg:h-full shrink-0 shadow-lg z-10">
        {/* CABEÇALHO DO CARRINHO */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Comanda / Carrinho</h3>
              <p className="text-xs text-muted-foreground">
                {cartTotalItems} item(ns) selecionado(s)
              </p>
            </div>
          </div>
          {carrinho.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs"
              title="Limpar comanda (Esc)"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* LISTA DE ITENS NO CARRINHO */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[220px]">
          {carrinho.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-2 stroke-[1.5] text-muted-foreground/40" />
              <p className="text-sm font-semibold">Nenhum item na comanda</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Clique nos produtos da grade ou digite o código rápido para adicionar.
              </p>
            </div>
          ) : (
            carrinho.map((item) => (
              <div
                key={item.produto.id}
                className="p-3 rounded-xl border border-border bg-background flex items-center justify-between gap-2 shadow-xs hover:border-primary/40 transition-all"
              >
                {/* INFORMAÇÕES DO PRODUTO */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">
                      #{item.produto.codigo_rapido}
                    </span>
                    <span className="font-bold text-xs text-foreground truncate">
                      {item.produto.nome}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    {item.quantidade}x {formatCurrency(item.preco_unitario)} ={' '}
                    <strong className="text-foreground">
                      {formatCurrency(item.quantidade * item.preco_unitario)}
                    </strong>
                  </div>
                </div>

                {/* CONTROLES DE QUANTIDADE (+ / - / LIXEIRA) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.produto.id, item.quantidade - 1)}
                    className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors font-bold"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-bold text-sm font-mono">
                    {item.quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(item.produto.id, item.quantidade + 1)}
                    className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.produto.id)}
                    className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PAINEL TOTALIZADOR E BOTÃO DE FINALIZAÇÃO */}
        <div className="p-4 border-t border-border bg-muted/30 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
              Total a Pagar
            </span>
            <span className="text-3xl font-black font-mono text-primary tracking-tight">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          <Button
            type="button"
            disabled={carrinho.length === 0 || !caixaAtivo}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg tracking-wide rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <span>PAGAMENTO (ENTER)</span>
            <ArrowRight className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <span className="text-[11px] text-muted-foreground">
              Atalhos: <kbd className="px-1 bg-muted rounded font-mono">Enter</kbd> Pagar •{' '}
              <kbd className="px-1 bg-muted rounded font-mono">Esc</kbd> Limpar
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
