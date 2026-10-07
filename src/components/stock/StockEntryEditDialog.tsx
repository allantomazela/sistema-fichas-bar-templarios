import React, { useState } from 'react'
import { usePos } from '@/context/PosContext'
import type { MovimentacaoEstoque, Produto } from '@/types/pos'
import {
  calcularVariacaoLancamento,
  isLancamentoManual,
  parseQuantidadeInteira,
  valorInformadoDoLancamento,
} from '@/lib/stock'
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
import { TIPO_MOVIMENTACAO_LABEL } from './stockLabels'

interface StockEntryEditDialogProps {
  movimento: MovimentacaoEstoque
  produto: Produto | undefined
  onClose: () => void
}

/**
 * Corrige a quantidade/motivo de uma entrada, contagem ou perda já registrada.
 * Montar só quando houver lançamento (com `key={movimento.id}`) para o estado iniciar preenchido.
 */
export function StockEntryEditDialog({ movimento, produto, onClose }: StockEntryEditDialogProps) {
  const { editarLancamentoEstoque } = usePos()
  const [valor, setValor] = useState(() => String(valorInformadoDoLancamento(movimento)))
  const [motivo, setMotivo] = useState(movimento.motivo ?? '')

  if (!isLancamentoManual(movimento.tipo)) return null

  const ehContagem = movimento.tipo === 'ajuste'
  const informado = parseQuantidadeInteira(valor)
  const erro = validar(informado, ehContagem)
  const novaVariacao =
    informado === null ? null : calcularVariacaoLancamento(movimento.tipo, informado, movimento.estoque_anterior)
  const saldoAtual = produto?.controla_estoque ? (produto.estoque_atual ?? 0) : null
  const novoSaldo =
    saldoAtual === null || novaVariacao === null ? null : saldoAtual + novaVariacao - movimento.quantidade
  const bloqueado = !!erro || (novoSaldo !== null && novoSaldo < 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (bloqueado || informado === null) return
    if (editarLancamentoEstoque(movimento.id, informado, motivo)) onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Corrigir {TIPO_MOVIMENTACAO_LABEL[movimento.tipo].toLowerCase()}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {movimento.produto_nome} · saldo antes do lançamento: {movimento.estoque_anterior} un
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div>
            <Label htmlFor="lanc-valor" className="text-xs font-bold uppercase text-muted-foreground">
              {ehContagem ? 'Quantidade contada' : 'Quantidade'}
            </Label>
            <Input
              id="lanc-valor"
              type="number"
              inputMode="numeric"
              min={0}
              step="1"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              aria-invalid={!!erro}
              autoFocus
              className="h-12 text-2xl font-black font-mono mt-1"
            />
            {erro && <p className="text-[11px] text-destructive mt-1">{erro}</p>}
          </div>

          <div>
            <Label htmlFor="lanc-motivo" className="text-xs font-bold uppercase text-muted-foreground">
              Motivo (opcional)
            </Label>
            <Input
              id="lanc-motivo"
              value={motivo}
              maxLength={120}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1"
            />
          </div>

          <PrevisaoSaldo saldoAtual={saldoAtual} novoSaldo={novoSaldo} />

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={bloqueado} className="font-bold">
              Salvar correção
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function validar(informado: number | null, ehContagem: boolean): string | null {
  if (informado === null) return 'Informe um número inteiro, 0 ou maior.'
  if (!ehContagem && informado === 0) return 'Use um valor maior que zero. Para anular, exclua o lançamento.'
  return null
}

interface PrevisaoSaldoProps {
  saldoAtual: number | null
  novoSaldo: number | null
}

function PrevisaoSaldo({ saldoAtual, novoSaldo }: PrevisaoSaldoProps) {
  if (saldoAtual === null) {
    return (
      <p className="text-xs text-muted-foreground">
        Este produto não está com controle de estoque ativo (ou foi excluído); só o histórico será
        corrigido.
      </p>
    )
  }
  if (novoSaldo === null) return null

  const negativo = novoSaldo < 0
  return (
    <p
      className={`text-xs p-2.5 rounded-lg border ${
        negativo
          ? 'bg-destructive/10 text-destructive border-destructive/30'
          : 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30'
      }`}
    >
      {negativo
        ? `O saldo atual (${saldoAtual}) ficaria negativo (${novoSaldo}). Parte dessas unidades já foi vendida — faça uma contagem em vez disso.`
        : `Saldo atual: ${saldoAtual} → depois da correção: ${novoSaldo} un.`}
    </p>
  )
}
