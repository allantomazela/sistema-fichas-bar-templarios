import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { Configuracoes } from '@/types/pos'

/** Props comuns das seções que editam o formulário de configurações. */
export interface ConfigSectionProps {
  formData: Configuracoes
  onChange: (patch: Partial<Configuracoes>) => void
}

interface SettingsCardProps {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
}

export function SettingsCard({ title, icon, children, className }: SettingsCardProps) {
  return (
    <div className={cn('p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4', className)}>
      <h3 className="font-bold text-base text-foreground flex items-center gap-2 border-b border-border pb-2">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-bold uppercase text-muted-foreground block mb-1">
      {children}
    </Label>
  )
}

interface ToggleRowProps {
  title: string
  description: ReactNode
  checked: boolean
  onCheckedChange: (value: boolean) => void
}

export function ToggleRow({ title, description, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/20">
      <div>
        <div className="font-bold text-xs">{title}</div>
        <div className="text-[11px] text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </div>
  )
}

export const SELECT_CLASS =
  'w-full h-11 px-3 rounded-md border border-input bg-background text-sm font-bold disabled:opacity-60'
