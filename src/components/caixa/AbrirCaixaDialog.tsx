import { useState, type FormEvent } from 'react'
import { Unlock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { parseValorMonetario } from '@/lib/utils'
import { CampoCaixa } from './caixaParts'

const FUNDO_PADRAO = '150.00'

interface AbrirCaixaDialogProps {
  onConfirmar: (operador: string, saldoInicial: number, obs: string) => void
  onFechar: () => void
}

/** Abertura de turno. Montado só quando aberto, então sempre começa com o formulário limpo. */
export function AbrirCaixaDialog({ onConfirmar, onFechar }: AbrirCaixaDialogProps) {
  const [operador, setOperador] = useState('')
  const [fundo, setFundo] = useState(FUNDO_PADRAO)
  const [obs, setObs] = useState('')

  const confirmar = (e: FormEvent) => {
    e.preventDefault()
    const saldo = parseValorMonetario(fundo)
    if (saldo < 0) {
      toast.error('O fundo de troco não pode ser negativo.')
      return
    }
    onConfirmar(operador.trim() || 'Operador', saldo, obs.trim())
    onFechar()
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Unlock className="w-5 h-5 text-emerald-600" />
            Abertura de Caixa (Novo Turno)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={confirmar} className="space-y-4 py-2">
          <CampoCaixa rotulo="Nome do Operador" id="abertura-operador">
            <Input
              id="abertura-operador"
              placeholder="Ex: Maria Balcão 1"
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              required
              autoFocus
              className="h-11 text-sm font-semibold"
            />
          </CampoCaixa>

          <CampoCaixa
            rotulo="Fundo de Troco Inicial (R$)"
            id="abertura-fundo"
            ajuda="Valor em dinheiro físico colocado na gaveta no início do turno."
          >
            <Input
              id="abertura-fundo"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={fundo}
              onChange={(e) => setFundo(e.target.value)}
              required
              className="h-12 text-2xl font-black font-mono"
            />
          </CampoCaixa>

          <CampoCaixa rotulo="Observações Iniciais (Opcional)" id="abertura-obs">
            <Input
              id="abertura-obs"
              placeholder="Ex: Turno da Noite - Festa Junina"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="h-10 text-sm"
            />
          </CampoCaixa>

          <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              Confirmar Abertura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
