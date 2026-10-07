import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SecaoDashboardProps {
  icone: LucideIcon
  corIcone?: string
  titulo: string
  descricao: string
  extra?: ReactNode
  className?: string
  children: ReactNode
}

/** Cartão padrão das seções do Dashboard (título com ícone + descrição + conteúdo). */
export function SecaoDashboard({
  icone: Icone,
  corIcone = 'text-primary',
  titulo,
  descricao,
  extra,
  className,
  children,
}: SecaoDashboardProps) {
  return (
    <section className={cn('p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Icone className={cn('w-5 h-5', corIcone)} />
            {titulo}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
        </div>
        {extra}
      </div>
      {children}
    </section>
  )
}

/** Percentual inteiro de `parte` sobre `total` (0 quando não há total). */
export function percentual(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0
}
