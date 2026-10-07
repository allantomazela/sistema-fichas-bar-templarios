import { useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn, parseValorMonetario } from '@/lib/utils'
import type { TipoMovimentacaoCaixa } from '@/types/pos'
import { CampoCaixa } from './caixaParts'

interface MovimentacaoDialogProps {
  tipo: TipoMovimentacaoCaixa
  onConfirmar: (tipo: TipoMovimentacaoCaixa, valor: number, motivo: string) => void
  onFechar: () => void
}

/** Registro de sangria ou suprimento (valor > 0 e motivo obrigatório). */
export function MovimentacaoDialog({ tipo, onConfirmar, onFechar }: MovimentacaoDialogProps) {
  const [valorTexto, setValorTexto] = useState('')
  const [motivo, setMotivo] = useState('')
  const textos = TEXTOS[tipo]
  const Icone = tipo === 'sangria' ? ArrowUpRight : ArrowDownLeft

  const confirmar = (e: FormEvent) => {
    e.preventDefault()
    const valor = parseValorMonetario(valorTexto)
    if (valor <= 0) {
      toast.error('Informe um valor válido maior que zero.')
      return
    }
    if (!motivo.trim()) {
      toast.error('Informe o motivo / justificativa da movimentação.')
      return
    }
    onConfirmar(tipo, valor, motivo.trim())
    onFechar()
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Icone className={cn('w-5 h-5', textos.corIcone)} />
            {textos.titulo}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={confirmar} className="space-y-4 py-2">
          <CampoCaixa rotulo="Valor da Movimentação (R$)" id="movimentacao-valor">
            <Input
              id="movimentacao-valor"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={valorTexto}
              onChange={(e) => setValorTexto(e.target.value)}
              required
              autoFocus
              className="h-12 text-2xl font-black font-mono"
            />
          </CampoCaixa>

          <CampoCaixa rotulo="Motivo / Justificativa Obrigatória" id="movimentacao-motivo">
            <Input
              id="movimentacao-motivo"
              placeholder={textos.exemplo}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              className="h-11 text-sm font-semibold"
            />
          </CampoCaixa>

          <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" className={cn('font-bold text-white', textos.corBotao)}>
              {textos.botao}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const TEXTOS: Record<TipoMovimentacaoCaixa, {
  titulo: string
  exemplo: string
  botao: string
  corIcone: string
  corBotao: string
}> = {
  sangria: {
    titulo: 'Registro de Sangria (Retirada de Gaveta)',
    exemplo: 'Ex: Recolhimento de cofre pela tesouraria',
    botao: 'Registrar Sangria',
    corIcone: 'text-rose-600',
    corBotao: 'bg-rose-600 hover:bg-rose-700',
  },
  suprimento: {
    titulo: 'Registro de Suprimento (Entrada de Troco)',
    exemplo: 'Ex: Troco extra fornecido pela coordenação',
    botao: 'Registrar Suprimento',
    corIcone: 'text-emerald-600',
    corBotao: 'bg-emerald-600 hover:bg-emerald-700',
  },
}
