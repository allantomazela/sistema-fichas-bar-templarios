import React, { useEffect, useState } from 'react'
import { usePos } from '@/context/PosContext'
import type { Produto } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowRight, ClipboardCheck, PackageMinus, PackagePlus } from 'lucide-react'
import { MOTIVOS_SUGERIDOS } from './stockLabels'

export type TipoMovimentacaoManual = 'entrada' | 'ajuste' | 'perda'

interface StockMovementDialogProps {
  produto: Produto | null
  tipoInicial: TipoMovimentacaoManual
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Entrada (soma), contagem (define saldo) ou perda (subtrai) de um produto. */
export function StockMovementDialog({
  produto,
  tipoInicial,
  open,
  onOpenChange,
}: StockMovementDialogProps) {
  const { movimentarEstoque } = usePos()
  const [tipo, setTipo] = useState<TipoMovimentacaoManual>(tipoInicial)
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (!open) return
    setTipo(tipoInicial)
    setQuantidade(tipoInicial === 'ajuste' ? String(produto?.estoque_atual ?? 0) : '')
    setMotivo('')
  }, [open, tipoInicial, produto?.id, produto?.estoque_atual])

  if (!produto) return null

  const saldoAtual = produto.controla_estoque ? (produto.estoque_atual ?? 0) : 0
  const validacao = validarQuantidade(tipo, quantidade, saldoAtual)
  const novoSaldo = validacao.ok ? calcularNovoSaldo(tipo, validacao.valor, saldoAtual) : null

  const handleTrocarTipo = (novo: TipoMovimentacaoManual) => {
    setTipo(novo)
    setQuantidade(novo === 'ajuste' ? String(saldoAtual) : '')
    setMotivo('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validacao.ok) return
    const ok = movimentarEstoque({
      produtoId: produto.id,
      tipo,
      quantidade: validacao.valor,
      motivo: motivo.trim() || undefined,
    })
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Movimentar estoque</DialogTitle>
          <DialogDescription className="text-xs">
            {produto.nome} · #{produto.codigo_rapido}
            {!produto.controla_estoque && ' · o controle de estoque será ativado'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de movimentação">
            {TIPOS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={tipo === id}
                onClick={() => handleTrocarTipo(id)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-xs font-bold transition-colors ${
                  tipo === id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>

          <div>
            <Label htmlFor="estoque-qtd" className="text-xs font-bold uppercase text-muted-foreground">
              {tipo === 'ajuste' ? 'Quantidade contada (saldo real)' : 'Quantidade'}
            </Label>
            <Input
              id="estoque-qtd"
              type="number"
              inputMode="numeric"
              min={tipo === 'ajuste' ? 0 : 1}
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              autoFocus
              aria-invalid={!validacao.ok && quantidade !== ''}
              className="h-12 text-2xl font-black font-mono mt-1"
            />
            {tipo !== 'ajuste' && (
              <div className="flex gap-2 mt-2">
                {ATALHOS_QUANTIDADE.map((val) => (
                  <Button
                    key={val}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantidade(String(val))}
                    className="text-xs font-mono font-bold"
                  >
                    {val}
                  </Button>
                ))}
              </div>
            )}
            {!validacao.ok && quantidade !== '' && (
              <p className="text-xs text-destructive font-semibold mt-1.5">{validacao.erro}</p>
            )}
          </div>

          <div>
            <Label htmlFor="estoque-motivo" className="text-xs font-bold uppercase text-muted-foreground">
              Motivo (opcional)
            </Label>
            <Input
              id="estoque-motivo"
              value={motivo}
              maxLength={120}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: compra no atacadista"
              className="mt-1"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {MOTIVOS_SUGERIDOS[tipo].map((sugestao) => (
                <button
                  key={sugestao}
                  type="button"
                  onClick={() => setMotivo(sugestao)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-border hover:bg-muted"
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
            <Badge variant="outline" className="font-mono text-sm">
              {saldoAtual} un
            </Badge>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <Badge className="font-mono text-sm">{novoSaldo ?? '—'} un</Badge>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!validacao.ok} className="font-bold">
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface ValidacaoQuantidade {
  ok: boolean
  valor: number
  erro?: string
}

function invalido(erro: string): ValidacaoQuantidade {
  return { ok: false, valor: 0, erro }
}

function validarQuantidade(
  tipo: TipoMovimentacaoManual,
  bruto: string,
  saldoAtual: number,
): ValidacaoQuantidade {
  if (bruto.trim() === '') return invalido('Informe a quantidade.')
  const valor = Number(bruto)
  if (!Number.isInteger(valor) || valor < 0) {
    return invalido('Use apenas números inteiros (sem vírgula).')
  }
  if (tipo !== 'ajuste' && valor === 0) return invalido('A quantidade precisa ser maior que zero.')
  if (tipo === 'perda' && valor > saldoAtual) {
    return invalido(`A perda não pode ser maior que o saldo atual (${saldoAtual} un).`)
  }
  if (valor > 1_000_000) return invalido('Quantidade muito alta. Confira o valor digitado.')
  return { ok: true, valor }
}

function calcularNovoSaldo(tipo: TipoMovimentacaoManual, valor: number, saldoAtual: number): number {
  if (tipo === 'ajuste') return valor
  if (tipo === 'entrada') return saldoAtual + valor
  return saldoAtual - valor
}

const TIPOS: { id: TipoMovimentacaoManual; label: string; icon: typeof PackagePlus }[] = [
  { id: 'entrada', label: 'Entrada', icon: PackagePlus },
  { id: 'ajuste', label: 'Contagem', icon: ClipboardCheck },
  { id: 'perda', label: 'Perda', icon: PackageMinus },
]

const ATALHOS_QUANTIDADE = [6, 12, 24, 50, 100]
