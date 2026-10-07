import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROTA_POR_ATALHO } from '@/components/layout/navItems'
import { useStableCallback } from './useStableCallback'

const CAMPOS_DE_TEXTO = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Teclas F1–F12 navegam entre telas (fora de campos de texto); F9/Ctrl+K abre a busca. */
export function useGlobalShortcuts(onBuscaRapida: () => void) {
  const navigate = useNavigate()

  const handleKeyDown = useStableCallback((e: KeyboardEvent) => {
    if (e.key === 'F9' || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault()
      onBuscaRapida()
      return
    }
    const rota = ROTA_POR_ATALHO.get(e.key)
    const emCampoDeTexto = CAMPOS_DE_TEXTO.has(document.activeElement?.tagName ?? '')
    if (rota && !emCampoDeTexto) {
      e.preventDefault()
      navigate(rota)
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
