import type { LucideIcon } from 'lucide-react'
import { ArrowDownLeft, ArrowUpRight, DollarSign, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import type { MovimentacaoCaixa } from '@/types/pos'
import type { MetricasDashboard } from './dashboardMetrics'
import { SecaoDashboard } from './SecaoDashboard'

const LIMITE_LISTA = 10

interface MovimentacoesPeriodoProps {
  metricas: MetricasDashboard
  movimentacoes: MovimentacaoCaixa[]
}

/** Totais de sangrias/suprimentos do período + as últimas movimentações. */
export function MovimentacoesPeriodo({ metricas, movimentacoes }: MovimentacoesPeriodoProps) {
  const saldo = metricas.saldoLiquidoMovimentacoes
  return (
    <SecaoDashboard
      icone={History}
      corIcone="text-amber-500"
      titulo="Sangrias e Suprimentos de Caixa no Período"
      descricao="Movimentações em dinheiro físico realizadas pelos caixas (entradas de troco e retiradas da gaveta)."
      extra={
        <Badge variant="outline" className="font-mono text-xs w-fit">
          {movimentacoes.length} movimentação(ões)
        </Badge>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TotalMovimento
          titulo="Total Suprimentos (+Troco)"
          valor={`+${formatCurrency(metricas.suprimentos.valor)}`}
          detalhe={`${metricas.suprimentos.quantidade} entrada(s) de troco`}
          icone={ArrowDownLeft}
          estilo={ESTILOS.suprimento}
        />
        <TotalMovimento
          titulo="Total Sangrias (-Retiradas)"
          valor={`-${formatCurrency(metricas.sangrias.valor)}`}
          detalhe={`${metricas.sangrias.quantidade} recolhimento(s) para cofre`}
          icone={ArrowUpRight}
          estilo={ESTILOS.sangria}
        />
        <TotalMovimento
          titulo="Saldo Líquido Movimentado"
          valor={`${saldo >= 0 ? '+' : ''}${formatCurrency(saldo)}`}
          detalhe="Impacto líquido na gaveta"
          icone={DollarSign}
          estilo={saldo >= 0 ? ESTILOS.saldo : { ...ESTILOS.saldo, valor: ESTILOS.sangria.valor }}
        />
      </div>

      <div className="overflow-x-auto max-h-60 rounded-xl border border-border">
        {movimentacoes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Nenhuma movimentação de sangria ou suprimento no período selecionado.
          </p>
        ) : (
          <TabelaMovimentacoes movimentacoes={movimentacoes.slice(0, LIMITE_LISTA)} />
        )}
      </div>
    </SecaoDashboard>
  )
}

interface EstiloMovimento {
  caixa: string
  titulo: string
  valor: string
  icone: string
}

function TotalMovimento(props: {
  titulo: string
  valor: string
  detalhe: string
  icone: LucideIcon
  estilo: EstiloMovimento
}) {
  const { titulo, valor, detalhe, icone: Icone, estilo } = props
  return (
    <div className={cn('p-4 rounded-xl border flex items-center justify-between', estilo.caixa)}>
      <div>
        <span className={cn('text-[11px] font-bold uppercase block', estilo.titulo)}>{titulo}</span>
        <span className={cn('text-2xl font-black font-mono mt-1 block', estilo.valor)}>{valor}</span>
        <span className="text-[11px] text-muted-foreground mt-0.5 block">{detalhe}</span>
      </div>
      <div className={cn('p-2.5 rounded-xl', estilo.icone)}>
        <Icone className="w-5 h-5" />
      </div>
    </div>
  )
}

function TabelaMovimentacoes({ movimentacoes }: { movimentacoes: MovimentacaoCaixa[] }) {
  return (
    <table className="w-full text-xs text-left">
      <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
        <tr>
          <th className="p-2.5">Data / Hora</th>
          <th className="p-2.5">Tipo</th>
          <th className="p-2.5">Valor</th>
          <th className="p-2.5">Motivo / Justificativa</th>
          <th className="p-2.5">Operador</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {movimentacoes.map((mov) => (
          <tr key={mov.id} className="hover:bg-muted/20">
            <td className="p-2.5 font-mono text-muted-foreground">{formatDateTime(mov.data_hora)}</td>
            <td className="p-2.5">
              {mov.tipo === 'sangria' ? (
                <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                  Sangria
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] uppercase font-bold">
                  Suprimento
                </Badge>
              )}
            </td>
            <td className="p-2.5 font-mono font-bold">
              {mov.tipo === 'sangria' ? '-' : '+'}
              {formatCurrency(mov.valor)}
            </td>
            <td className="p-2.5 text-foreground max-w-[200px] truncate">{mov.motivo}</td>
            <td className="p-2.5 text-muted-foreground">{mov.operador}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const ESTILOS: Record<'suprimento' | 'sangria' | 'saldo', EstiloMovimento> = {
  suprimento: {
    caixa: 'border-emerald-500/20 bg-emerald-500/10',
    titulo: 'text-emerald-700 dark:text-emerald-300',
    valor: 'text-emerald-600 dark:text-emerald-400',
    icone: 'bg-emerald-500/20 text-emerald-600',
  },
  sangria: {
    caixa: 'border-rose-500/20 bg-rose-500/10',
    titulo: 'text-rose-700 dark:text-rose-300',
    valor: 'text-rose-600 dark:text-rose-400',
    icone: 'bg-rose-500/20 text-rose-600',
  },
  saldo: {
    caixa: 'border-border bg-muted/30',
    titulo: 'text-muted-foreground',
    valor: 'text-foreground',
    icone: 'bg-muted text-foreground',
  },
}
