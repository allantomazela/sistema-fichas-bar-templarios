import type { ResumoEstoque } from '@/lib/stock'
import { AlertTriangle, Boxes, PackageCheck, PackageX } from 'lucide-react'

interface StockSummaryCardsProps {
  resumo: ResumoEstoque
  totalVendido: number
  periodoLabel: string
}

export function StockSummaryCards({ resumo, totalVendido, periodoLabel }: StockSummaryCardsProps) {
  const cards = [
    {
      label: 'Produtos controlados',
      value: resumo.controlados,
      hint: `${resumo.unidadesEmEstoque} un em estoque`,
      icon: Boxes,
      className: 'text-primary bg-primary/10',
    },
    {
      label: 'Estoque baixo',
      value: resumo.baixos,
      hint: 'no mínimo ou abaixo',
      icon: AlertTriangle,
      className: 'text-amber-600 bg-amber-500/15',
    },
    {
      label: 'Esgotados',
      value: resumo.esgotados,
      hint: 'bloqueados no PDV',
      icon: PackageX,
      className: 'text-destructive bg-destructive/10',
    },
    {
      label: 'Unidades vendidas',
      value: totalVendido,
      hint: periodoLabel,
      icon: PackageCheck,
      className: 'text-emerald-600 bg-emerald-500/15',
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map(({ label, value, hint, icon: Icon, className }) => (
        <div key={label} className="p-3 sm:p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${className}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-black font-mono leading-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
