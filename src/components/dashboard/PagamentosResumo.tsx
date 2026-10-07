import type { LucideIcon } from 'lucide-react'
import { Banknote, CreditCard, Gift, QrCode } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { FormaPagamento } from '@/types/pos'
import type { MetricasDashboard } from './dashboardMetrics'
import { SecaoDashboard, percentual } from './SecaoDashboard'

/** Recebimentos por forma de pagamento (cortesia só aparece quando houver). */
export function PagamentosResumo({ metricas, className }: { metricas: MetricasDashboard; className?: string }) {
  const visiveis = FORMAS.filter((f) => !f.soQuandoHouver || metricas.pagamentos[f.forma].valor > 0)
  return (
    <SecaoDashboard
      icone={CreditCard}
      titulo="Resumo por Forma de Pagamento"
      descricao="Consolidação detalhada dos recebimentos do evento."
      className={className}
    >
      <div className="space-y-3">
        {visiveis.map((f) => {
          const { valor, quantidade } = metricas.pagamentos[f.forma]
          const Icone = f.icone
          return (
            <div
              key={f.forma}
              className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', f.corIcone)}>
                  <Icone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">{f.rotulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {quantidade} {f.unidade}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={cn('font-mono font-black text-base', f.corValor)}>{formatCurrency(valor)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {percentual(valor, metricas.valorTotalVendas)}% do total
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </SecaoDashboard>
  )
}

interface FormaExibida {
  forma: FormaPagamento
  rotulo: string
  unidade: string
  icone: LucideIcon
  corIcone: string
  corValor: string
  soQuandoHouver?: boolean
}

const FORMAS: FormaExibida[] = [
  {
    forma: 'dinheiro',
    rotulo: 'Dinheiro (Espécie)',
    unidade: 'pagamento(s)',
    icone: Banknote,
    corIcone: 'bg-emerald-500/10 text-emerald-600',
    corValor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    forma: 'pix',
    rotulo: 'PIX Instantâneo',
    unidade: 'pagamento(s)',
    icone: QrCode,
    corIcone: 'bg-cyan-500/10 text-cyan-600',
    corValor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    forma: 'debito',
    rotulo: 'Cartão de Débito',
    unidade: 'pagamento(s)',
    icone: CreditCard,
    corIcone: 'bg-blue-500/10 text-blue-600',
    corValor: 'text-blue-600 dark:text-blue-400',
  },
  {
    forma: 'credito',
    rotulo: 'Cartão de Crédito',
    unidade: 'pagamento(s)',
    icone: CreditCard,
    corIcone: 'bg-purple-500/10 text-purple-600',
    corValor: 'text-purple-600 dark:text-purple-400',
  },
  {
    forma: 'cortesia',
    rotulo: 'Cortesia / Isenção',
    unidade: 'liberação(ões)',
    icone: Gift,
    corIcone: 'bg-amber-500/10 text-amber-600',
    corValor: 'text-amber-600',
    soQuandoHouver: true,
  },
]
