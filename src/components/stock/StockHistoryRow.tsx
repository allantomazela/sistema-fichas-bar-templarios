import type { MovimentacaoEstoque } from '@/types/pos'
import { isLancamentoManual } from '@/lib/stock'
import { Button } from '@/components/ui/button'
import { Lock, Pencil, Trash2 } from 'lucide-react'
import { TIPO_MOVIMENTACAO_CLASS, TIPO_MOVIMENTACAO_LABEL } from './stockLabels'

export type AcaoLancamento = 'editar' | 'excluir'

interface StockHistoryRowProps {
  movimento: MovimentacaoEstoque
  onAcao: (acao: AcaoLancamento, movimento: MovimentacaoEstoque) => void
}

export function StockHistoryRow({ movimento: m, onAcao }: StockHistoryRowProps) {
  const editavel = isLancamentoManual(m.tipo)

  return (
    <tr>
      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{formatarDataHora(m.data_hora)}</td>
      <td className="px-3 py-2 font-semibold">{m.produto_nome}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${TIPO_MOVIMENTACAO_CLASS[m.tipo]}`}
        >
          {TIPO_MOVIMENTACAO_LABEL[m.tipo]}
        </span>
        {m.editado_em && (
          <span
            className="ml-1 text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400"
            title={`Corrigido em ${formatarDataHora(m.editado_em)}${m.editado_por ? ` por ${m.editado_por}` : ''}`}
          >
            editado
          </span>
        )}
      </td>
      <td
        className={`px-3 py-2 text-right font-mono font-black ${
          m.quantidade > 0 ? 'text-emerald-600' : 'text-destructive'
        }`}
      >
        {m.quantidade > 0 ? `+${m.quantidade}` : m.quantidade}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground hidden md:table-cell whitespace-nowrap">
        {m.estoque_anterior} → {m.estoque_posterior}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground hidden lg:table-cell">
        {m.motivo || '—'}
        {m.operador && <span className="block text-[10px]">por {m.operador}</span>}
      </td>
      <td className="px-3 py-1.5">
        {editavel ? (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => onAcao('editar', m)}
              title="Corrigir lançamento (pede senha de administrador)"
              aria-label={`Corrigir lançamento de ${m.produto_nome}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive"
              onClick={() => onAcao('excluir', m)}
              title="Excluir lançamento (pede senha de administrador)"
              aria-label={`Excluir lançamento de ${m.produto_nome}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <span
            className="flex justify-end text-muted-foreground/60"
            title="Lançamento automático. Para desfazer, cancele a venda em Relatórios."
          >
            <Lock className="w-3.5 h-3.5" aria-label="Lançamento automático" />
          </span>
        )}
      </td>
    </tr>
  )
}

function formatarDataHora(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
