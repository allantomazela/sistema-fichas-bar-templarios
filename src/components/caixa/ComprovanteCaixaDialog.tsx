import { Printer, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ThermalFechamentoTicket, triggerBrowserPrint } from '@/components/common/ThermalTickets'
import type { Caixa, Configuracoes } from '@/types/pos'
import type { ResumoCaixa } from './caixaParts'

const AREA_IMPRESSAO = 'printable-fechamento-area'

interface ComprovanteCaixaDialogProps {
  caixa: Caixa
  resumo: ResumoCaixa
  config: Configuracoes
  onFechar: () => void
}

/** Pré-visualização e impressão do comprovante térmico de um turno (parcial ou fechado). */
export function ComprovanteCaixaDialog({ caixa, resumo, config, onFechar }: ComprovanteCaixaDialogProps) {
  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader className="p-4 border-b border-border bg-muted/40 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Comprovante de Fechamento de Caixa
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-200 dark:bg-slate-950 flex flex-col items-center">
          <div id={AREA_IMPRESSAO}>
            <ThermalFechamentoTicket caixa={caixa} config={config} resumo={resumo} />
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex sm:justify-between items-center gap-2">
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
          <Button
            onClick={() => triggerBrowserPrint(AREA_IMPRESSAO)}
            className="bg-primary hover:bg-primary/90 font-bold gap-2"
          >
            <Printer className="w-4 h-4" />
            Imprimir Comprovante Térmico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
