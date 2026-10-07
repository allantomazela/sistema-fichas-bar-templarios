import { useState } from 'react'
import { toast } from 'sonner'
import { usePos } from '@/context/PosContext'
import type { FormaPagamento, LoteFichas } from '@/types/pos'
import { FichaLoteService, type NovoLoteParams } from '@/services/fichaLoteService'
import { flushStorageWrites } from '@/services/storage'
import { formatNumeroLote } from '@/lib/fichaLote'
import { formatCurrency } from '@/lib/utils'

/** Estado e ações da tela de lotes; recarrega caixa e estoque após cada operação. */
export function useFichaLotes() {
  const { caixaAtivo, refreshCaixa, refreshCatalog, setPreviewFichas } = usePos()
  const [lotes, setLotes] = useState<LoteFichas[]>(() => FichaLoteService.getLotes())
  const operador = caixaAtivo?.operador || 'Administrador'

  const executar = <T,>(operacao: () => T, sucesso: (resultado: T) => string): T | null => {
    let resultado: T
    try {
      resultado = operacao()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível concluir a operação do lote.')
      return null
    }
    setLotes(FichaLoteService.getLotes())
    refreshCatalog()
    refreshCaixa()
    toast.success(sucesso(resultado))
    void flushStorageWrites().catch((err) => {
      console.error(err)
      toast.error('Operação feita, mas falhou gravar no disco. Exporte um backup.')
    })
    return resultado
  }

  const criarLote = (dados: Omit<NovoLoteParams, 'operador'>): boolean => {
    const lote = executar(
      () => FichaLoteService.criar({ ...dados, operador }),
      (l) => `Lote ${formatNumeroLote(l.numero)} criado com ${l.fichas.length} fichas. Imprimindo…`,
    )
    if (lote) setPreviewFichas(lote.fichas)
    return !!lote
  }

  const reimprimir = (lote: LoteFichas) => setPreviewFichas(lote.fichas)

  const prestarContas = (
    loteId: string,
    devolvidas: Record<string, number>,
    formaPagamento: FormaPagamento,
  ): boolean =>
    !!executar(
      () => FichaLoteService.prestarContas({ loteId, devolvidas, formaPagamento, operador }),
      ({ lote, venda }) =>
        venda
          ? `Lote ${formatNumeroLote(lote.numero)} encerrado: venda #${venda.sequencial_venda} de ${formatCurrency(venda.total)} no caixa.`
          : `Lote ${formatNumeroLote(lote.numero)} encerrado: todas as fichas voltaram.`,
    )

  const cancelarLote = (loteId: string, motivo: string): boolean =>
    !!executar(
      () => FichaLoteService.cancelar(loteId, motivo, operador),
      (l) => `Lote ${formatNumeroLote(l.numero)} cancelado e estoque devolvido. Rasgue as fichas impressas.`,
    )

  return { lotes, caixaAberto: !!caixaAtivo, criarLote, reimprimir, prestarContas, cancelarLote }
}
