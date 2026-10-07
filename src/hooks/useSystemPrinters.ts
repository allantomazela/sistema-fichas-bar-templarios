import { useEffect, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import type { PrinterInfo } from '@/services/escposElgin'

/** Lista as impressoras do sistema operacional (só no app nativo). */
export function useSystemPrinters() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    setLoading(true)
    void import('@/services/escposElgin')
      .then(({ listSystemPrinters }) => listSystemPrinters())
      .then((list) => {
        if (!cancelled) setPrinters(list)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) toast.error('Não foi possível listar impressoras do Windows.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { printers, loading }
}
