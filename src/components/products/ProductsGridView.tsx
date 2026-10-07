import { Badge } from '@/components/ui/badge'
import { getStatusEstoque } from '@/lib/stock'
import { formatCurrency } from '@/lib/utils'
import {
  BadgeCategoria,
  BadgeCombo,
  BotoesProduto,
  MiniaturaProduto,
  type AcoesProduto,
  type ProdutoListado,
} from './ProductRowParts'

interface ProductsGridViewProps {
  itens: ProdutoListado[]
  acoes: AcoesProduto
}

/** Catálogo em grade, com foto grande. */
export function ProductsGridView({ itens, acoes }: ProductsGridViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {itens.map(({ produto, categoria, imagem }) => (
        <div
          key={produto.id}
          className="group rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col"
        >
          <div className="relative aspect-square bg-muted/40 overflow-hidden">
            <MiniaturaProduto
              imagem={imagem}
              nome={produto.nome}
              className="w-full h-full group-hover:scale-105 transition-transform duration-300"
            />
            <span className="absolute top-2 left-2 font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-background/90 text-muted-foreground border border-border">
              #{produto.codigo_rapido}
            </span>
            {!produto.ativo && (
              <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Inativo
              </span>
            )}
          </div>
          <div className="p-3 flex flex-col flex-1 gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">{produto.nome}</h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <BadgeCategoria categoria={categoria} vazio="—" />
                {produto.is_combo && <BadgeCombo texto="Combo" />}
                {getStatusEstoque(produto) === 'esgotado' && (
                  <Badge variant="destructive" className="text-[9px] font-bold py-0">
                    Esgotado
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/60">
              <span className="font-mono font-black text-sm">{formatCurrency(produto.preco)}</span>
              <div className="flex items-center gap-0.5">
                <BotoesProduto produto={produto} acoes={acoes} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
