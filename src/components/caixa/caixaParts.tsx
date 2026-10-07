import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { LocalDatabaseService } from '@/services/db'
import type { TipoMovimentacaoCaixa } from '@/types/pos'

export type ResumoCaixa = ReturnType<typeof LocalDatabaseService.getResumoCaixa>

/** Rótulo em caixa-alta + campo, padrão dos formulários do caixa. */
export function CampoCaixa({ rotulo, id, ajuda, children }: {
  rotulo: string
  id: string
  ajuda?: string
  children: ReactNode
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-bold uppercase text-muted-foreground block mb-1">
        {rotulo}
      </Label>
      {children}
      {ajuda && <p className="text-[11px] text-muted-foreground mt-1">{ajuda}</p>}
    </div>
  )
}

/** Selo Sangria/Suprimento usado nas listas de movimentação. */
export function BadgeMovimentacao({ tipo, compacto }: { tipo: TipoMovimentacaoCaixa; compacto?: boolean }) {
  const tamanho = compacto ? 'text-[9px] py-0 px-1' : 'text-[10px]'
  return tipo === 'sangria' ? (
    <Badge variant="destructive" className={cn(tamanho, 'uppercase font-bold')}>
      Sangria
    </Badge>
  ) : (
    <Badge className={cn(tamanho, 'bg-emerald-600 hover:bg-emerald-600 text-white uppercase font-bold')}>
      Suprimento
    </Badge>
  )
}

/** Moldura dos cartões de histórico (título, contador e conteúdo rolável). */
export function PainelCaixa({ icone, titulo, contador, children }: {
  icone: ReactNode
  titulo: string
  contador: string
  children: ReactNode
}) {
  return (
    <section className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
          {icone}
          {titulo}
        </h3>
        <Badge variant="outline" className="font-mono text-xs shrink-0">
          {contador}
        </Badge>
      </div>
      <div className="overflow-x-auto max-h-72">{children}</div>
    </section>
  )
}
