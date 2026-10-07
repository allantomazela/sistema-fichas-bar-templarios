import { useState, type FormEvent } from 'react'
import { History, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatCurrency, parseValorMonetario } from '@/lib/utils'
import type { Caixa } from '@/types/pos'
import { BadgeMovimentacao, CampoCaixa, type ResumoCaixa } from './caixaParts'

type ValoresContados = Required<Omit<NonNullable<Caixa['valores_informados']>, 'cortesia'>>
type CampoContado = keyof ValoresContados

interface FecharCaixaDialogProps {
  resumo: ResumoCaixa | null
  onConfirmar: (valores: ValoresContados, obs: string) => void
  onFechar: () => void
}

/** Fechamento às cegas: o operador informa o que contou, sem ver o valor esperado. */
export function FecharCaixaDialog({ resumo, onConfirmar, onFechar }: FecharCaixaDialogProps) {
  const [contados, setContados] = useState<Record<CampoContado, string>>(CONTADOS_VAZIOS)
  const [obs, setObs] = useState('')

  const confirmar = (e: FormEvent) => {
    e.preventDefault()
    const valores = {} as ValoresContados
    for (const campo of CAMPOS) valores[campo.chave] = parseValorMonetario(contados[campo.chave])
    onConfirmar(valores, obs.trim())
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-w-lg bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
            <Lock className="w-5 h-5" />
            Fechamento de Turno (Conferência de Gaveta)
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Para segurança do caixa, insira os valores contados fisicamente pelo operador.
          </p>
        </DialogHeader>

        <form onSubmit={confirmar} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            {CAMPOS.map((campo, idx) => (
              <CampoCaixa key={campo.chave} rotulo={campo.rotulo} id={`fechamento-${campo.chave}`}>
                <Input
                  id={`fechamento-${campo.chave}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={contados[campo.chave]}
                  onChange={(e) => setContados((atual) => ({ ...atual, [campo.chave]: e.target.value }))}
                  className="h-11 font-mono font-bold text-base"
                  required={campo.obrigatorio}
                  autoFocus={idx === 0}
                />
              </CampoCaixa>
            ))}
          </div>

          {resumo && <MovimentacoesDoTurno resumo={resumo} />}

          <CampoCaixa rotulo="Observações de Fechamento (Opcional)" id="fechamento-obs">
            <Input
              id="fechamento-obs"
              placeholder="Ex: Turno encerrado sem divergências aparentes"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="h-10 text-sm"
            />
          </CampoCaixa>

          <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              Finalizar e Gerar Relatório Térmico
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MovimentacoesDoTurno({ resumo }: { resumo: ResumoCaixa }) {
  const liquido = resumo.totalSuprimento - resumo.totalSangria
  return (
    <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary" />
          Movimentações Registradas no Turno ({resumo.movimentacoes.length})
        </span>
        <span className="font-mono text-muted-foreground">
          Líquido: {liquido >= 0 ? '+' : ''}
          {formatCurrency(liquido)}
        </span>
      </div>

      {resumo.movimentacoes.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">Nenhuma sangria ou suprimento registrado neste turno.</p>
      ) : (
        <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
          {resumo.movimentacoes.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-background border border-border"
            >
              <div className="flex items-center gap-2 truncate">
                <BadgeMovimentacao tipo={m.tipo} compacto />
                <span className="truncate max-w-[150px] font-medium" title={m.motivo}>
                  {m.motivo}
                </span>
              </div>
              <span className="font-mono font-bold shrink-0">
                {m.tipo === 'sangria' ? '-' : '+'}
                {formatCurrency(m.valor)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const CAMPOS: { chave: CampoContado; rotulo: string; obrigatorio?: boolean }[] = [
  { chave: 'dinheiro', rotulo: 'Dinheiro Contado (R$)', obrigatorio: true },
  { chave: 'pix', rotulo: 'PIX Total (Comprovantes)' },
  { chave: 'debito', rotulo: 'Cartão Débito (POS)' },
  { chave: 'credito', rotulo: 'Cartão Crédito (POS)' },
]

const CONTADOS_VAZIOS: Record<CampoContado, string> = { dinheiro: '', pix: '', debito: '', credito: '' }
