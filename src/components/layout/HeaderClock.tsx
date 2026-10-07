import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

/**
 * Relógio isolado: o tique de 1 s redesenha só este componente,
 * e não o layout inteiro (menu, modais de pagamento e impressão).
 */
export function HeaderClock() {
  const [hora, setHora] = useState(formatarHora)

  useEffect(() => {
    const timer = setInterval(() => setHora(formatarHora()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md bg-muted/70 text-foreground font-mono font-bold text-xs sm:text-sm">
      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
      <time>{hora}</time>
    </div>
  )
}

function formatarHora(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
