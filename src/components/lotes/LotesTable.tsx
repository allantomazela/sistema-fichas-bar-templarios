import type { LoteFichas } from '@/types/pos'
import { formatNumeroLote, totalFichasLote, valorTotalLote } from '@/lib/fichaLote'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Ban, HandCoins, Printer, Ticket } from 'lucide-react'
import { STATUS_LOTE_CLASS, STATUS_LOTE_LABEL } from './loteLabels'

export type AcaoLote = 'prestar' | 'cancelar'

interface LotesTableProps {
  lotes: LoteFichas[]
  onReimprimir: (lote: LoteFichas) => void
  onAcao: (acao: AcaoLote, lote: LoteFichas) => void
}

export function LotesTable({ lotes, onReimprimir, onAcao }: LotesTableProps) {
  if (lotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10 text-muted-foreground rounded-2xl border border-dashed border-border">
        <Ticket className="w-12 h-12 mb-3 stroke-[1.5]" />
        <p className="font-bold text-foreground">Nenhum lote criado</p>
        <p className="text-xs mt-1 max-w-sm">
          Use “Novo lote” para imprimir fichas antes da venda — talão reserva para contingência ou
          fichas para ambulantes e barracas.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="bg-muted/60 text-[11px] uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="text-left font-bold px-3 py-2.5">Lote</th>
            <th scope="col" className="text-left font-bold px-3 py-2.5">Responsável</th>
            <th scope="col" className="text-left font-bold px-3 py-2.5">Itens</th>
            <th scope="col" className="text-right font-bold px-3 py-2.5">Valor</th>
            <th scope="col" className="text-center font-bold px-3 py-2.5">Situação</th>
            <th scope="col" className="text-right font-bold px-3 py-2.5">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lotes.map((lote) => (
            <LoteRow key={lote.id} lote={lote} onReimprimir={onReimprimir} onAcao={onAcao} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface LoteRowProps {
  lote: LoteFichas
  onReimprimir: LotesTableProps['onReimprimir']
  onAcao: LotesTableProps['onAcao']
}

function LoteRow({ lote, onReimprimir, onAcao }: LoteRowProps) {
  const aberto = lote.status === 'aberto'
  const rotulo = formatNumeroLote(lote.numero)

  return (
    <tr className={aberto ? 'bg-violet-500/5' : ''}>
      <td className="px-3 py-2.5">
        <p className="font-mono font-black">{rotulo}</p>
        <p className="text-[11px] text-muted-foreground font-mono">{formatDateTime(lote.criado_em)}</p>
      </td>
      <td className="px-3 py-2.5">
        <p className="font-semibold">{lote.responsavel}</p>
        {lote.motivo && <p className="text-[11px] text-muted-foreground">{lote.motivo}</p>}
      </td>
      <td className="px-3 py-2.5 text-xs">
        {lote.itens.map((it) => (
          <p key={it.produto_id}>
            <span className="font-mono font-bold">{it.quantidade}x</span> {it.produto_nome}
            {it.devolvidas ? <span className="text-muted-foreground"> ({it.devolvidas} devolvidas)</span> : null}
          </p>
        ))}
        <p className="text-[11px] text-muted-foreground mt-0.5">{totalFichasLote(lote)} fichas</p>
      </td>
      <td className="px-3 py-2.5 text-right font-mono">
        <p className="font-bold">{formatCurrency(valorTotalLote(lote))}</p>
        {lote.status === 'prestado' && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            recebido {formatCurrency(lote.total_recebido ?? 0)}
            {lote.sequencial_venda ? ` · venda #${lote.sequencial_venda}` : ''}
          </p>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        <span
          className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_LOTE_CLASS[lote.status]}`}
        >
          {STATUS_LOTE_LABEL[lote.status]}
        </span>
      </td>
      <td className="px-3 py-2">
        {aberto && (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 font-bold"
              onClick={() => onAcao('prestar', lote)}
              title="Registrar devoluções e receber o valor das fichas vendidas"
            >
              <HandCoins className="w-4 h-4" />
              <span className="hidden lg:inline">Prestar contas</span>
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onReimprimir(lote)}
              title="Reimprimir as fichas do lote"
              aria-label={`Reimprimir lote ${rotulo}`}
            >
              <Printer className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              onClick={() => onAcao('cancelar', lote)}
              title="Cancelar o lote (impresso errado) e devolver o estoque"
              aria-label={`Cancelar lote ${rotulo}`}
            >
              <Ban className="w-4 h-4" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}
