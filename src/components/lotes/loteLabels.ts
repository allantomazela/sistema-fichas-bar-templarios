import type { FormaPagamento, StatusLoteFichas } from '@/types/pos'

export const STATUS_LOTE_LABEL: Record<StatusLoteFichas, string> = {
  aberto: 'Em aberto',
  prestado: 'Prestado contas',
  cancelado: 'Cancelado',
}

export const STATUS_LOTE_CLASS: Record<StatusLoteFichas, string> = {
  aberto: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
  prestado: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30',
  cancelado: 'bg-muted text-muted-foreground border-border',
}

/** Cortesia fica de fora: ficha antecipada que não voltou é cobrada do responsável. */
export const FORMAS_PAGAMENTO_LOTE: { value: FormaPagamento; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
]

export const MOTIVOS_LOTE = ['Talão reserva (contingência)', 'Ambulante', 'Barraca externa', 'Agilizar fila']
