import { memo } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { StatusEstoque } from '@/lib/stock'
import type { Produto } from '@/types/pos'

export interface ProductCardProps {
  produto: Produto
  imagem?: string
  corCategoria: string
  nomeCategoria?: string
  quantidadeNoCarrinho: number
  controlado: boolean
  disponivel: number
  status: StatusEstoque
  limitadoPor?: string
  onAdd: (produto: Produto) => void
}

/**
 * Botão de produto do PDV. Memoizado com props primitivas: ao adicionar um item,
 * só o cartão daquele produto é redesenhado (e não a grade inteira com as fotos).
 */
export const ProductCard = memo(function ProductCard(props: ProductCardProps) {
  const { produto, corCategoria, nomeCategoria, quantidadeNoCarrinho, controlado, disponivel } = props
  const esgotado = props.status === 'esgotado'
  const baixo = props.status === 'baixo'

  return (
    <button
      type="button"
      disabled={esgotado}
      title={esgotado && props.limitadoPor ? `Esgotado: falta "${props.limitadoPor}"` : undefined}
      onClick={() => props.onAdd(produto)}
      className={`relative group text-left p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between select-none active:scale-95 bg-card hover:shadow-lg ${
        esgotado
          ? 'opacity-60 cursor-not-allowed border-dashed border-destructive/40 bg-muted/40'
          : quantidadeNoCarrinho > 0
            ? 'border-primary shadow-sm ring-2 ring-primary/20'
            : 'border-border hover:border-primary/40'
      }`}
    >
      <div className="flex items-start justify-between gap-1 w-full mb-2">
        <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded bg-muted text-muted-foreground">
          #{produto.codigo_rapido}
        </span>
        <div className="flex items-center gap-1">
          {controlado && (
            <span
              className={`font-mono text-[10px] font-black px-1.5 py-0.5 rounded ${
                esgotado
                  ? 'bg-destructive text-destructive-foreground'
                  : baixo
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {esgotado ? 'ESGOTADO' : `${disponivel} un`}
            </span>
          )}
          {produto.is_combo ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] uppercase font-extrabold gap-1 py-0 px-1.5">
              <Sparkles className="w-3 h-3" /> COMBO
            </Badge>
          ) : (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: corCategoria }}
              title={nomeCategoria}
            />
          )}
        </div>
      </div>

      <div className="w-full h-16 sm:h-20 lg:h-24 mb-2 overflow-hidden rounded-xl border border-border/60 bg-muted/30 flex items-center justify-center">
        {props.imagem ? (
          <img
            src={props.imagem}
            alt={produto.nome}
            decoding="async"
            loading="lazy"
            draggable={false}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${corCategoria}18` }}
          >
            <span className="text-2xl font-black opacity-40" style={{ color: corCategoria }}>
              {produto.nome.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="w-full my-1">
        <div className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {produto.nome}
        </div>
        {produto.descricao && (
          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{produto.descricao}</div>
        )}
      </div>

      <div className="flex items-center justify-between w-full mt-3 pt-2 border-t border-border/60">
        <span className="font-black text-base text-foreground font-mono">{formatCurrency(produto.preco)}</span>
        {quantidadeNoCarrinho > 0 ? (
          <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-md animate-scale-up">
            {quantidadeNoCarrinho}
          </span>
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex items-center justify-center text-muted-foreground">
            <Plus className="w-4 h-4" />
          </div>
        )}
      </div>
    </button>
  )
})
