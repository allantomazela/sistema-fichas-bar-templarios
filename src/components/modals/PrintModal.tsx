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
import { Printer } from 'lucide-react'
import { printFichasDireto, ThermalFichaTicket } from '@/components/common/ThermalTickets'

/** Modal só para reimpressão manual (quando simular_impressao_tela estiver ativo). */
export const PrintModal: React.FC = () => {
  const { previewFichas, setPreviewFichas, config } = usePos()
  const [activeFichas, setActiveFichas] = useState(previewFichas)

  useEffect(() => {
    // Só abre painel se a config pedir simulação; senão imprime direto
    if (previewFichas && previewFichas.length > 0) {
      if (config.simular_impressao_tela) {
        setActiveFichas(previewFichas)
      } else {
        void printFichasDireto(previewFichas, config)
        setPreviewFichas(null)
        setActiveFichas(null)
      }
    } else {
      setActiveFichas(null)
    }
  }, [previewFichas, config, setPreviewFichas])

  if (!activeFichas || activeFichas.length === 0) return null

  const handlePrint = () => {
    void printFichasDireto(activeFichas, config)
  }

  const handleClose = () => {
    setPreviewFichas(null)
    setActiveFichas(null)
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader className="p-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Pré-visualização ({activeFichas.length}{' '}
                {activeFichas.length === 1 ? 'ficha' : 'fichas'})
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Bobina {config.largura_bobina} • 1 ficha por unidade
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-200 dark:bg-slate-950 flex flex-col items-center space-y-4">
            {activeFichas.map((ficha, idx) => (
            <ThermalFichaTicket key={ficha.id || idx} ficha={ficha} config={config} />
          ))}
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex gap-2 sm:justify-end">
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 font-bold gap-2"
            autoFocus
          >
            <Printer className="w-4 h-4" />
            Imprimir ({activeFichas.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
