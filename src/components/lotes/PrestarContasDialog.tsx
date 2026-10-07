import React, { useState } from 'react'
import type { FormaPagamento, LoteFichas } from '@/types/pos'
import { calcularPrestacao, formatNumeroLote } from '@/lib/fichaLote'
import { parseQuantidadeInteira } from '@/lib/stock'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FORMAS_PAGAMENTO_LOTE } from './loteLabels'

interface PrestarContasDialogProps {
  lote: LoteFichas
  caixaAberto: boolean
  onClose: () => void
  onConfirm: (devolvidas: Record<string, number>, forma: FormaPagamento) => boolean
}

/**
 * Informa quantas fichas voltaram por produto; as que não voltaram são cobradas.
 * Montar com `key={lote.id}` para o formulário iniciar zerado.
 */
export function PrestarContasDialog({ lote, caixaAberto, onClose, onConfirm }: PrestarContasDialogProps) {
  const [brutos, setBrutos] = useState<Record<string, string>>(() =>
    Object.fromEntries(lote.itens.map((it) => [it.produto_id, '0'])),
  )
  const [forma, setForma] = useState<FormaPagamento>('dinheiro')

  const devolvidas = Object.fromEntries(
    Object.entries(brutos).map(([id, bruto]) => [id, parseQuantidadeInteira(bruto) ?? -1]),
  )
  const resumo = calcularPrestacao(lote.itens, devolvidas)
  const podeConfirmar = caixaAberto && !resumo.erro

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (podeConfirmar && onConfirm(devolvidas, forma)) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Prestar contas — lote {formatNumeroLote(lote.numero)}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {lote.responsavel}. Conte as fichas devolvidas e rasgue-as. As que não voltaram contam
            como vendidas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left font-bold py-1">Produto</th>
                <th className="text-right font-bold py-1">Impressas</th>
                <th className="text-right font-bold py-1">Devolvidas</th>
                <th className="text-right font-bold py-1">Vendidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resumo.linhas.map(({ item, vendidas }) => (
                <tr key={item.produto_id}>
                  <td className="py-2 font-semibold">{item.produto_nome}</td>
                  <td className="py-2 text-right font-mono">{item.quantidade}</td>
                  <td className="py-2 text-right">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={item.quantidade}
                      step="1"
                      value={brutos[item.produto_id]}
                      onChange={(e) => setBrutos((prev) => ({ ...prev, [item.produto_id]: e.target.value }))}
                      aria-label={`Fichas devolvidas de ${item.produto_nome}`}
                      className="w-20 h-9 ml-auto font-mono font-bold text-right"
                    />
                  </td>
                  <td className="py-2 text-right font-mono font-black">{vendidas}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {resumo.erro && <p className="text-[11px] text-destructive">{resumo.erro}</p>}

          <label className="flex flex-col text-xs font-bold uppercase text-muted-foreground gap-1">
            Forma de pagamento recebida
            <select
              value={forma}
              onChange={(e) => setForma(e.target.value as FormaPagamento)}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm font-normal normal-case text-foreground"
            >
              {FORMAS_PAGAMENTO_LOTE.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <div className="p-3 rounded-xl border border-emerald-600/30 bg-emerald-600/10 flex justify-between items-center">
            <span className="text-sm">
              {resumo.totalVendidas} vendidas · {resumo.totalDevolvidas} devolvidas
            </span>
            <span className="text-lg font-black font-mono">{formatCurrency(resumo.valorAReceber)}</span>
          </div>
          {!caixaAberto && (
            <p className="text-xs p-2.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
              Abra o caixa (F2) antes: o valor recebido entra no caixa aberto.
            </p>
          )}

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!podeConfirmar} className="font-bold">
              Confirmar e receber
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
