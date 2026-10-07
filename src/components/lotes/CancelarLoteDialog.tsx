import { useState } from 'react'
import type { LoteFichas } from '@/types/pos'
import { formatNumeroLote, totalFichasLote } from '@/lib/fichaLote'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CancelarLoteDialogProps {
  lote: LoteFichas
  onClose: () => void
  onConfirm: (motivo: string) => boolean
}

export function CancelarLoteDialog({ lote, onClose, onConfirm }: CancelarLoteDialogProps) {
  const [motivo, setMotivo] = useState('')

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Cancelar lote {formatNumeroLote(lote.numero)}?
          </DialogTitle>
          <DialogDescription className="text-xs">
            As {totalFichasLote(lote)} fichas deixam de valer e todo o estoque reservado volta. Use só se
            as fichas estão com você — <strong>rasgue-as</strong>. Se alguma já foi entregue, use
            “Prestar contas”.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="lote-cancel-motivo" className="text-xs font-bold uppercase text-muted-foreground">
            Motivo
          </Label>
          <Input
            id="lote-cancel-motivo"
            value={motivo}
            maxLength={120}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: impresso com quantidade errada"
            className="mt-1"
            autoFocus
          />
        </div>
        <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="font-bold"
            onClick={() => onConfirm(motivo) && onClose()}
          >
            Cancelar lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
