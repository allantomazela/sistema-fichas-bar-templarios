import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { usePos } from '@/context/PosContext'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { CartItem } from '@/types/pos'

/** Comanda lateral: itens, quantidades, total e botão de pagamento. */
export function CartPanel() {
  const {
    carrinho,
    cartTotal,
    cartTotalItems,
    caixaAtivo,
    clearCart,
    setIsPaymentModalOpen,
  } = usePos()

  return (
    <div className="w-full lg:w-80 xl:w-96 2xl:w-[420px] bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col h-[min(42vh,380px)] lg:h-full shrink-0 shadow-lg z-10 min-h-0">
      <div className="p-3 lg:p-4 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Comanda / Carrinho</h3>
            <p className="text-xs text-muted-foreground">{cartTotalItems} item(ns) selecionado(s)</p>
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

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {carrinho.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-2 stroke-[1.5] text-muted-foreground/40" />
            <p className="text-sm font-semibold">Nenhum item na comanda</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Clique nos produtos da grade ou digite o código rápido para adicionar.
            </p>
          </div>
        ) : (
          carrinho.map((item) => <CartLine key={item.produto.id} item={item} />)
        )}
      </div>

      <div className="p-3 lg:p-4 border-t border-border bg-muted/30 space-y-2 lg:space-y-3 shrink-0">
        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Total a Pagar</span>
          <span className="text-2xl lg:text-3xl font-black font-mono text-primary tracking-tight">
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

        <div className="text-center hidden lg:block">
          <span className="text-[11px] text-muted-foreground">
            Atalhos: <kbd className="px-1 bg-muted rounded font-mono">Enter</kbd> Pagar •{' '}
            <kbd className="px-1 bg-muted rounded font-mono">Esc</kbd> Limpar
          </span>
        </div>
      </div>
    </div>
  )
}

function CartLine({ item }: { item: CartItem }) {
  const { updateCartQuantity, removeFromCart } = usePos()
  const id = item.produto.id

  return (
    <div className="p-3 rounded-xl border border-border bg-background flex items-center justify-between gap-2 shadow-xs hover:border-primary/40 transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-bold text-muted-foreground">#{item.produto.codigo_rapido}</span>
          <span className="font-bold text-xs text-foreground truncate">{item.produto.nome}</span>
        </div>
        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
          {item.quantidade}x {formatCurrency(item.preco_unitario)} ={' '}
          <strong className="text-foreground">{formatCurrency(item.quantidade * item.preco_unitario)}</strong>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <QuantityButton label={`Diminuir ${item.produto.nome}`} onClick={() => updateCartQuantity(id, item.quantidade - 1)}>
          <Minus className="w-3.5 h-3.5" />
        </QuantityButton>
        <span className="w-7 text-center font-bold text-sm font-mono">{item.quantidade}</span>
        <QuantityButton label={`Aumentar ${item.produto.nome}`} onClick={() => updateCartQuantity(id, item.quantidade + 1)}>
          <Plus className="w-3.5 h-3.5" />
        </QuantityButton>
        <button
          type="button"
          aria-label={`Remover ${item.produto.nome}`}
          onClick={() => removeFromCart(id)}
          className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors ml-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

interface QuantityButtonProps {
  label: string
  onClick: () => void
  children: React.ReactNode
}

function QuantityButton({ label, onClick, children }: QuantityButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center transition-colors font-bold"
    >
      {children}
    </button>
  )
}
