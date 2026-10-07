import { Clock, Flame } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { HoraMovimento } from './dashboardMetrics'
import { SecaoDashboard } from './SecaoDashboard'

/** Ranking das 3 faixas de horário com maior faturamento + dica operacional. */
export function PicosMovimento({ picos, className }: { picos: HoraMovimento[]; className?: string }) {
  return (
    <SecaoDashboard
      icone={Flame}
      corIcone="text-amber-500"
      titulo="Horários de Pico de Movimento"
      descricao="Faixas de horário com maior concentração de público e vendas."
      className={cn('flex flex-col', className)}
    >
      <div className="flex-1 space-y-3">
        {picos.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum pico detectado ainda.</p>
        ) : (
          picos.map((pico, idx) => (
            <div
              key={pico.hora}
              className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white',
                    CORES_POSICAO[idx] ?? 'bg-slate-500',
                  )}
                >
                  #{idx + 1}
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>
                      {pico.label} às {String((pico.hora + 1) % 24).padStart(2, '0')}:00
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pico.quantidade} vendas • {pico.fichas} fichas emitidas
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-sm text-foreground">
                {formatCurrency(pico.valor)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
        <span className="font-bold block mb-0.5">Dica para a Operação:</span>
        Reforce o atendimento no balcão e nos caixas 15 minutos antes dos horários de pico para evitar filas.
      </div>
    </SecaoDashboard>
  )
}

const CORES_POSICAO = ['bg-amber-500 shadow-md shadow-amber-500/20', 'bg-slate-600']
