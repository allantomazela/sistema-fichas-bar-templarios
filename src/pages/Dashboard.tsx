import { useMemo, useState } from 'react'
import { Calendar, LayoutDashboard } from 'lucide-react'
import { usePos } from '@/context/PosContext'
import { Badge } from '@/components/ui/badge'
import {
  calcularMetricas,
  filtrarPorPeriodo,
  paraInputDataHora,
  type FiltroPeriodo,
} from '@/components/dashboard/dashboardMetrics'
import { PeriodoFiltro } from '@/components/dashboard/PeriodoFiltro'
import { ResumoCards } from '@/components/dashboard/ResumoCards'
import { VendasPorHoraChart } from '@/components/dashboard/VendasPorHoraChart'
import { PicosMovimento } from '@/components/dashboard/PicosMovimento'
import { MovimentacoesPeriodo } from '@/components/dashboard/MovimentacoesPeriodo'
import { PagamentosResumo } from '@/components/dashboard/PagamentosResumo'
import { TopProdutos } from '@/components/dashboard/TopProdutos'

export default function Dashboard() {
  const { vendas, fichas, config, caixaAtivo, movimentacoes } = usePos()
  const [filtro, setFiltro] = useState<FiltroPeriodo>(filtroInicial)

  const doPeriodo = useMemo(
    () => filtrarPorPeriodo({ vendas, fichas, movimentacoes }, filtro),
    [vendas, fichas, movimentacoes, filtro],
  )
  const metricas = useMemo(() => calcularMetricas(doPeriodo), [doPeriodo])

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-foreground">Dashboard & Resumo do Evento</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visão executiva em tempo real: vendas, fluxo por hora, picos de movimento e fichas emitidas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="px-3 py-1 font-mono text-xs flex items-center gap-1.5 bg-card border-border shrink-0"
          >
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{config.nome_evento || 'Evento Atual'}</span>
          </Badge>
          {caixaAtivo && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[11px] font-bold shrink-0">
              Caixa Ativo: {caixaAtivo.operador}
            </Badge>
          )}
        </div>
      </div>

      <PeriodoFiltro filtro={filtro} onChange={setFiltro} />
      <ResumoCards metricas={metricas} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <VendasPorHoraChart
          className="lg:col-span-8"
          dados={metricas.hourlyData}
          semVendas={metricas.totalVendasCount === 0}
        />
        <PicosMovimento className="lg:col-span-4" picos={metricas.picosDeMovimento} />
      </div>

      <MovimentacoesPeriodo metricas={metricas} movimentacoes={doPeriodo.movimentacoes} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <PagamentosResumo className="lg:col-span-6" metricas={metricas} />
        <TopProdutos className="lg:col-span-6" ranking={metricas.topFichasPorProduto} />
      </div>
    </div>
  )
}

/** Intervalo personalizado começa no dia de hoje (00:00 até 23:59, hora local). */
function filtroInicial(): FiltroPeriodo {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const fim = new Date()
  fim.setHours(23, 59, 0, 0)
  return { tipo: 'evento', inicio: paraInputDataHora(inicio), fim: paraInputDataHora(fim) }
}
