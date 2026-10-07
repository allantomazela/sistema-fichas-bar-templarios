import type { LucideIcon } from 'lucide-react'
import { DollarSign, Layers, Ticket, TrendingUp } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { MetricasDashboard } from './dashboardMetrics'

/** Os quatro totalizadores do topo do Dashboard. */
export function ResumoCards({ metricas }: { metricas: MetricasDashboard }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <CartaoIndicador
        titulo="Faturamento Total"
        icone={DollarSign}
        cor="emerald"
        valor={formatCurrency(metricas.valorTotalVendas)}
        detalhe={`${metricas.totalVendasCount} pedidos concluídos • Ticket Médio: ${formatCurrency(metricas.ticketMedio)}`}
      />
      <CartaoIndicador
        titulo="Fichas Emitidas"
        icone={Ticket}
        cor="blue"
        valor={String(metricas.totalFichasEmitidas)}
        detalhe="Fichas geradas nas compras do PDV"
      />
      <CartaoIndicador
        titulo="Pedidos"
        icone={Layers}
        cor="purple"
        valor={String(metricas.totalVendasCount)}
        detalhe={`${metricas.totalItensVendidos} item(ns) vendidos no período`}
      />
      <CartaoIndicador
        titulo="Ticket Médio"
        icone={TrendingUp}
        cor="amber"
        valor={formatCurrency(metricas.ticketMedio)}
        detalhe="Valor médio por pedido concluído"
      />
    </div>
  )
}

interface CartaoIndicadorProps {
  titulo: string
  icone: LucideIcon
  cor: keyof typeof CORES
  valor: string
  detalhe: string
}

function CartaoIndicador({ titulo, icone: Icone, cor, valor, detalhe }: CartaoIndicadorProps) {
  const estilo = CORES[cor]
  return (
    <div className="p-5 rounded-2xl border border-border bg-card shadow-xs">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-bold uppercase tracking-wider">{titulo}</span>
        <div className={cn('p-2 rounded-lg', estilo.fundo, estilo.texto)}>
          <Icone className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-2">
        <div className={cn('text-3xl font-black font-mono', estilo.texto)}>{valor}</div>
        <div className="text-xs text-muted-foreground mt-1">{detalhe}</div>
      </div>
    </div>
  )
}

/** Classes completas (o Tailwind não enxerga classes montadas por concatenação). */
const CORES = {
  emerald: { fundo: 'bg-emerald-500/10', texto: 'text-emerald-600 dark:text-emerald-400' },
  blue: { fundo: 'bg-blue-500/10', texto: 'text-blue-600 dark:text-blue-400' },
  purple: { fundo: 'bg-purple-500/10', texto: 'text-purple-600 dark:text-purple-400' },
  amber: { fundo: 'bg-amber-500/10', texto: 'text-amber-600 dark:text-amber-400' },
} as const
