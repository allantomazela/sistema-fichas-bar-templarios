import { Ticket } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { formatCurrency } from '@/lib/utils'
import type { ProdutoRanking } from './dashboardMetrics'
import { SecaoDashboard, percentual } from './SecaoDashboard'

/** Ranking dos produtos com mais fichas emitidas (barra relativa ao 1º colocado). */
export function TopProdutos({ ranking, className }: { ranking: ProdutoRanking[]; className?: string }) {
  const maximo = ranking[0]?.emitidas || 1
  return (
    <SecaoDashboard
      icone={Ticket}
      titulo="Top Produtos por Fichas Emitidas"
      descricao="Ranking dos itens com mais fichas geradas no período selecionado."
      className={className}
    >
      <div className="space-y-2.5">
        {ranking.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma ficha emitida ainda.</p>
        ) : (
          ranking.map((item) => (
            <div key={item.produtoId} className="p-3 rounded-xl border border-border bg-background space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-foreground truncate">{item.nome}</span>
                <span className="font-mono text-muted-foreground shrink-0">
                  <strong className="text-foreground">{item.emitidas}</strong> fichas ·{' '}
                  {formatCurrency(item.faturamento)}
                </span>
              </div>
              <Progress
                value={percentual(item.emitidas, maximo)}
                className="h-1.5"
                aria-label={`${item.nome}: ${item.emitidas} fichas`}
              />
            </div>
          ))
        )}
      </div>
    </SecaoDashboard>
  )
}
