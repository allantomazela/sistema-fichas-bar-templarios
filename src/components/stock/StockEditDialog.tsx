import React, { useEffect, useState } from 'react'
import { usePos } from '@/context/PosContext'
import type { Produto } from '@/types/pos'
import { ESTOQUE_MINIMO_PADRAO, parseQuantidadeInteira } from '@/lib/stock'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface StockEditDialogProps {
  produto: Produto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Edita a configuração de estoque do produto (controle, saldo e mínimo). */
export function StockEditDialog({ produto, open, onOpenChange }: StockEditDialogProps) {
  const { atualizarEstoqueProduto } = usePos()
  const [controla, setControla] = useState(false)
  const [saldo, setSaldo] = useState('')
  const [minimo, setMinimo] = useState('')

  useEffect(() => {
    if (!open || !produto) return
    setControla(!!produto.controla_estoque)
    setSaldo(String(produto.estoque_atual ?? 0))
    setMinimo(String(produto.estoque_minimo ?? ESTOQUE_MINIMO_PADRAO))
  }, [open, produto])

  if (!produto) return null

  const saldoNum = parseQuantidadeInteira(saldo)
  const minimoNum = parseQuantidadeInteira(minimo)
  const valido = !controla || (saldoNum !== null && minimoNum !== null)
  const saldoAnterior = produto.controla_estoque ? (produto.estoque_atual ?? 0) : null
  const mudouSaldo = controla && saldoNum !== null && saldoNum !== saldoAnterior

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const ok = atualizarEstoqueProduto(
      produto.id,
      controla
        ? { controla_estoque: true, estoque_atual: saldoNum as number, estoque_minimo: minimoNum as number }
        : { controla_estoque: false },
    )
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Editar estoque</DialogTitle>
          <DialogDescription className="text-xs">
            {produto.nome} · #{produto.codigo_rapido}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-muted/30">
            <div>
              <Label htmlFor="edit-controla" className="font-bold">Controlar estoque</Label>
              <p className="text-[11px] text-muted-foreground">
                Desligado: o produto vende sem limite e não aparece nos alertas.
              </p>
            </div>
            <Switch id="edit-controla" checked={controla} onCheckedChange={setControla} />
          </div>

          {controla && (
            <div className="grid grid-cols-2 gap-3">
              <CampoNumero
                id="edit-saldo"
                label="Saldo atual"
                value={saldo}
                onChange={setSaldo}
                invalido={saldoNum === null}
              />
              <CampoNumero
                id="edit-minimo"
                label="Estoque mínimo"
                value={minimo}
                onChange={setMinimo}
                invalido={minimoNum === null}
              />
            </div>
          )}

          {mudouSaldo && (
            <p className="text-xs p-2.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">
              O saldo vai de {saldoAnterior ?? 0} para {saldoNum} un. A diferença fica registrada no
              histórico como “Contagem / ajuste”.
            </p>
          )}

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valido} className="font-bold">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CampoNumeroProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  invalido: boolean
}

function CampoNumero({ id, label, value, onChange, invalido }: CampoNumeroProps) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalido}
        className="h-11 text-xl font-black font-mono mt-1"
      />
      {invalido && <p className="text-[11px] text-destructive mt-1">Número inteiro, 0 ou maior.</p>}
    </div>
  )
}
