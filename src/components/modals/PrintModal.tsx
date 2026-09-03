import React, { useState, useEffect } from 'react'
import { usePos } from '@/context/PosContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Printer, Eye, CheckCircle2, QrCode, Scissors } from 'lucide-react'
import { ThermalFichaTicket, triggerBrowserPrint } from '@/components/common/ThermalTickets'

export const PrintModal: React.FC = () => {
  const { previewFichas, setPreviewFichas, config, lastSaleResult, setLastSaleResult } = usePos()
  const [activeFichas, setActiveFichas] = useState(
    previewFichas || (lastSaleResult ? lastSaleResult.fichas : null),
  )

  useEffect(() => {
    if (previewFichas) {
      setActiveFichas(previewFichas)
    } else if (lastSaleResult && config.simular_impressao_tela) {
      setActiveFichas(lastSaleResult.fichas)
    } else {
      setActiveFichas(null)
    }
  }, [previewFichas, lastSaleResult, config.simular_impressao_tela])

  if (!activeFichas || activeFichas.length === 0) return null

  const handlePrint = () => {
    triggerBrowserPrint('printable-thermal-area')
  }

  const handleClose = () => {
    setPreviewFichas(null)
    setLastSaleResult(null)
    setActiveFichas(null)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader className="p-4 border-b border-border bg-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Emissão de Fichas ({activeFichas.length} un)
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Bobina {config.largura_bobina} • Modo{' '}
                  {config.modo_impressao_padrao === 'individual'
                    ? 'Individual (1 por item)'
                    : 'Agrupado'}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ÁREA DE ROLAGEM COM PRÉ-VISUALIZAÇÃO DAS FICHAS */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-200 dark:bg-slate-950 flex flex-col items-center">
          <div id="printable-thermal-area" className="flex flex-col items-center space-y-4 py-2">
            {activeFichas.map((ficha, idx) => (
              <div key={ficha.id || idx} className="relative group">
                <div className="absolute -left-8 top-4 text-[10px] font-bold text-slate-500 hidden sm:block">
                  #{idx + 1}
                </div>
                <ThermalFichaTicket
                  ficha={ficha}
                  config={config}
                  showCutLine={idx < activeFichas.length - 1}
                />
              </div>
            ))}
          </div>
        </div>

        {/* RODAPÉ DO MODAL COM AÇÕES */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex sm:justify-between items-center gap-2">
          <div className="text-xs text-muted-foreground hidden sm:block">
            Pressione{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-foreground font-mono">
              Enter
            </kbd>{' '}
            para Imprimir ou{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-muted border text-foreground font-mono">
              Esc
            </kbd>{' '}
            para Fechar
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">
              Fechar
            </Button>
            <Button
              onClick={handlePrint}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 font-bold gap-2"
              autoFocus
            >
              <Printer className="w-4 h-4" />
              Imprimir Agora ({activeFichas.length})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
