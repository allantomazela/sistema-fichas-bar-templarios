import { Clock, TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { HoraMovimento } from './dashboardMetrics'
import { SecaoDashboard } from './SecaoDashboard'

interface VendasPorHoraChartProps {
  dados: HoraMovimento[]
  semVendas: boolean
  className?: string
}

/** Gráfico de faturamento por hora (recharts fica só no pedaço do Dashboard). */
export function VendasPorHoraChart({ dados, semVendas, className }: VendasPorHoraChartProps) {
  return (
    <SecaoDashboard
      icone={TrendingUp}
      titulo="Vendas & Movimento por Hora"
      descricao="Acompanhe o faturamento e volume de pedidos hora a hora durante o evento."
      className={className}
      extra={
        <span className="flex items-center gap-1.5 text-xs">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
          <span>Faturamento (R$)</span>
        </span>
      }
    >
      <div className="h-72 w-full pt-2">
        {semVendas ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center">
            <Clock className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm font-semibold">Ainda não há vendas registradas no período.</p>
            <p className="text-xs mt-1">O gráfico será atualizado automaticamente a cada venda efetuada.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `R$ ${val}`} />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value)), 'Faturamento']}
                labelFormatter={(label) => `Horário: ${label}`}
                contentStyle={ESTILO_TOOLTIP}
              />
              <Bar dataKey="valor" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </SecaoDashboard>
  )
}

const ESTILO_TOOLTIP = {
  backgroundColor: 'hsl(var(--card))',
  borderColor: 'hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
  fontSize: '12px',
}
