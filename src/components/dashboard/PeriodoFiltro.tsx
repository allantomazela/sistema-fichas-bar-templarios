import { Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { FiltroPeriodo, PeriodoTipo } from './dashboardMetrics'

interface PeriodoFiltroProps {
  filtro: FiltroPeriodo
  onChange: (filtro: FiltroPeriodo) => void
}

/** Seletor de período do Dashboard (botões grandes para toque + intervalo personalizado). */
export function PeriodoFiltro({ filtro, onChange }: PeriodoFiltroProps) {
  const alterar = (parcial: Partial<FiltroPeriodo>) => onChange({ ...filtro, ...parcial })

  return (
    <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Período de Análise:
        </span>
        <div role="group" aria-label="Período de análise" className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
          {OPCOES_PERIODO.map((opcao) => (
            <button
              key={opcao.tipo}
              type="button"
              aria-pressed={filtro.tipo === opcao.tipo}
              onClick={() => alterar({ tipo: opcao.tipo })}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                filtro.tipo === opcao.tipo
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      {filtro.tipo === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
          <CampoData rotulo="De:" valor={filtro.inicio} onChange={(inicio) => alterar({ inicio })} />
          <CampoData rotulo="Até:" valor={filtro.fim} onChange={(fim) => alterar({ fim })} />
        </div>
      )}
    </div>
  )
}

function CampoData({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string
  valor: string
  onChange: (valor: string) => void
}) {
  return (
    <label className="flex items-center gap-1 text-xs">
      <span className="text-muted-foreground font-semibold">{rotulo}</span>
      <Input
        type="datetime-local"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs font-mono w-44"
      />
    </label>
  )
}

const OPCOES_PERIODO: { tipo: PeriodoTipo; rotulo: string }[] = [
  { tipo: 'evento', rotulo: 'Evento inteiro' },
  { tipo: 'hoje', rotulo: 'Hoje' },
  { tipo: 'custom', rotulo: 'Intervalo personalizado' },
]
