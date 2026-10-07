import React, { useMemo, useState } from 'react'
import { usePos } from '@/context/PosContext'
import type { Produto } from '@/types/pos'
import type { NovoLoteParams } from '@/services/fichaLoteService'
import { parseQuantidadeInteira } from '@/lib/stock'
import { formatCurrency } from '@/lib/utils'
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
import { Trash2 } from 'lucide-react'
import { MOTIVOS_LOTE } from './loteLabels'

interface NovoLoteDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (dados: Omit<NovoLoteParams, 'operador'>) => boolean
}

interface Linha {
  produtoId: string
  quantidade: string
}

/** Monta o lote: responsável, motivo e produtos/quantidades a imprimir. */
export function NovoLoteDialog({ open, onClose, onConfirm }: NovoLoteDialogProps) {
  const { produtos } = usePos()
  const [responsavel, setResponsavel] = useState('')
  const [motivo, setMotivo] = useState('')
  const [linhas, setLinhas] = useState<Linha[]>([])

  const disponiveis = useMemo(
    () =>
      produtos
        .filter((p) => p.ativo && !p.is_combo)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos],
  )
  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])

  const analise = linhas.map((l) => analisarLinha(l, porId.get(l.produtoId)))
  const totalFichas = analise.reduce((acc, a) => acc + (a.quantidade ?? 0), 0)
  const valorTotal = analise.reduce((acc, a) => acc + (a.quantidade ?? 0) * (a.produto?.preco ?? 0), 0)
  const erroGeral = !responsavel.trim()
    ? 'Informe o responsável.'
    : linhas.length === 0
      ? 'Adicione pelo menos um produto.'
      : null
  const valido = !erroGeral && analise.every((a) => !a.erro)

  const resetar = () => {
    setResponsavel('')
    setMotivo('')
    setLinhas([])
  }

  const fechar = () => {
    resetar()
    onClose()
  }

  const adicionar = (produtoId: string) => {
    if (!produtoId || linhas.some((l) => l.produtoId === produtoId)) return
    setLinhas((prev) => [...prev, { produtoId, quantidade: '10' }])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valido) return
    const ok = onConfirm({
      responsavel,
      motivo,
      itens: analise.map((a, i) => ({ produtoId: linhas[i].produtoId, quantidade: a.quantidade as number })),
    })
    if (ok) fechar()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Novo lote de fichas antecipadas</DialogTitle>
          <DialogDescription className="text-xs">
            As fichas são impressas agora, mas o valor só entra no caixa na prestação de contas. O
            estoque fica reservado até lá.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lote-resp" className="text-xs font-bold uppercase text-muted-foreground">
                Responsável *
              </Label>
              <Input
                id="lote-resp"
                value={responsavel}
                maxLength={60}
                onChange={(e) => setResponsavel(e.target.value)}
                placeholder="Ex.: João (ambulante)"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="lote-motivo" className="text-xs font-bold uppercase text-muted-foreground">
                Motivo
              </Label>
              <Input
                id="lote-motivo"
                list="lote-motivos"
                value={motivo}
                maxLength={80}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: Talão reserva"
                className="mt-1"
              />
              <datalist id="lote-motivos">
                {MOTIVOS_LOTE.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex flex-col text-xs font-bold uppercase text-muted-foreground gap-1">
              Adicionar produto
              <select
                value=""
                onChange={(e) => adicionar(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm font-normal normal-case text-foreground"
              >
                <option value="">Escolha um produto…</option>
                {disponiveis.map((p) => (
                  <option key={p.id} value={p.id} disabled={linhas.some((l) => l.produtoId === p.id)}>
                    {p.nome} — {formatCurrency(p.preco)}
                    {p.controla_estoque ? ` (estoque: ${p.estoque_atual ?? 0})` : ''}
                  </option>
                ))}
              </select>
            </label>

            {linhas.map((linha, i) => (
              <LinhaLote
                key={linha.produtoId}
                nome={analise[i].produto?.nome ?? 'Produto removido'}
                quantidade={linha.quantidade}
                erro={analise[i].erro}
                onChange={(quantidade) =>
                  setLinhas((prev) => prev.map((l, j) => (j === i ? { ...l, quantidade } : l)))
                }
                onRemove={() => setLinhas((prev) => prev.filter((_, j) => j !== i))}
              />
            ))}
          </div>

          <div className="flex justify-between text-sm p-3 rounded-xl bg-muted/40 border border-border">
            <span>
              <strong className="font-mono">{totalFichas}</strong> fichas
            </span>
            <span>
              Valor do lote: <strong className="font-mono">{formatCurrency(valorTotal)}</strong>
            </span>
          </div>
          {erroGeral && <p className="text-[11px] text-muted-foreground">{erroGeral}</p>}

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valido} className="font-bold">
              Criar lote e imprimir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface LinhaLoteProps {
  nome: string
  quantidade: string
  erro?: string
  onChange: (valor: string) => void
  onRemove: () => void
}

function LinhaLote({ nome, quantidade, erro, onChange, onRemove }: LinhaLoteProps) {
  return (
    <div className="p-2 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-semibold text-sm truncate">{nome}</span>
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          step="1"
          value={quantidade}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Quantidade de ${nome}`}
          aria-invalid={!!erro}
          className="w-24 h-9 font-mono font-bold text-right"
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-destructive"
          onClick={onRemove}
          aria-label={`Remover ${nome}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      {erro && <p className="text-[11px] text-destructive mt-1">{erro}</p>}
    </div>
  )
}

function analisarLinha(linha: Linha, produto: Produto | undefined) {
  const quantidade = parseQuantidadeInteira(linha.quantidade)
  let erro: string | undefined
  if (!produto) erro = 'Produto não existe mais.'
  else if (quantidade === null || quantidade === 0) erro = 'Quantidade inteira maior que zero.'
  else if (produto.controla_estoque && quantidade > (produto.estoque_atual ?? 0)) {
    erro = `Estoque disponível: ${produto.estoque_atual ?? 0} un.`
  }
  return { produto, quantidade, erro }
}
