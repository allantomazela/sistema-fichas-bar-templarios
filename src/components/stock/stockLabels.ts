import type { TipoMovimentacaoEstoque } from '@/types/pos'
import type { StatusEstoque } from '@/lib/stock'

export const STATUS_ESTOQUE_LABEL: Record<StatusEstoque, string> = {
  ok: 'OK',
  baixo: 'Baixo',
  esgotado: 'Esgotado',
  sem_controle: 'Sem controle',
}

export const STATUS_ESTOQUE_CLASS: Record<StatusEstoque, string> = {
  ok: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30',
  baixo: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40',
  esgotado: 'bg-destructive/15 text-destructive border-destructive/40',
  sem_controle: 'bg-muted text-muted-foreground border-border',
}

export const TIPO_MOVIMENTACAO_LABEL: Record<TipoMovimentacaoEstoque, string> = {
  entrada: 'Entrada',
  ajuste: 'Contagem / ajuste',
  perda: 'Perda',
  venda: 'Venda',
  estorno: 'Estorno (cancelamento)',
  lote: 'Lote de fichas',
}

export const TIPO_MOVIMENTACAO_CLASS: Record<TipoMovimentacaoEstoque, string> = {
  entrada: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30',
  ajuste: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  perda: 'bg-destructive/15 text-destructive border-destructive/40',
  venda: 'bg-muted text-foreground border-border',
  estorno: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40',
  lote: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
}

export const MOTIVOS_SUGERIDOS: Record<'entrada' | 'ajuste' | 'perda', string[]> = {
  entrada: ['Compra / recebimento', 'Transferência do depósito', 'Doação'],
  ajuste: ['Contagem física', 'Conferência de abertura', 'Conferência de fechamento'],
  perda: ['Quebra / avaria', 'Vencido', 'Consumo interno', 'Cortesia fora do PDV'],
}
