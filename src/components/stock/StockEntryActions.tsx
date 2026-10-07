import { useState } from 'react'
import { usePos } from '@/context/PosContext'
import type { MovimentacaoEstoque, Produto } from '@/types/pos'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import { StockEntryEditDialog } from './StockEntryEditDialog'
import type { AcaoLancamento } from './StockHistoryRow'
import { TIPO_MOVIMENTACAO_LABEL } from './stockLabels'

export interface PedidoAcaoLancamento {
  acao: AcaoLancamento
  movimento: MovimentacaoEstoque
}

interface StockEntryActionsProps {
  pedido: PedidoAcaoLancamento | null
  produtos: Produto[]
  onFinalizar: () => void
}

/** Pede a senha de administrador e então corrige ou exclui o lançamento. */
export function StockEntryActions({ pedido, produtos, onFinalizar }: StockEntryActionsProps) {
  const { excluirLancamentoEstoque } = usePos()
  const [editando, setEditando] = useState<MovimentacaoEstoque | null>(null)

  const produtoDe = (m: MovimentacaoEstoque) => produtos.find((p) => p.id === m.produto_id)

  const handleAutorizado = () => {
    if (!pedido) return
    if (pedido.acao === 'editar') setEditando(pedido.movimento)
    else excluirLancamentoEstoque(pedido.movimento.id)
  }

  return (
    <>
      <AdminPasswordModal
        isOpen={!!pedido}
        onClose={onFinalizar}
        onSuccess={handleAutorizado}
        title={pedido?.acao === 'editar' ? 'Corrigir lançamento' : 'Excluir lançamento'}
        description={pedido ? descreverPedido(pedido, produtoDe(pedido.movimento)) : undefined}
      />
      {editando && (
        <StockEntryEditDialog
          key={editando.id}
          movimento={editando}
          produto={produtoDe(editando)}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  )
}

function descreverPedido({ acao, movimento: m }: PedidoAcaoLancamento, produto?: Produto): string {
  const tipo = TIPO_MOVIMENTACAO_LABEL[m.tipo].toLowerCase()
  if (acao === 'editar') {
    return `Digite a senha de administrador para corrigir a ${tipo} de "${m.produto_nome}". O saldo será recalculado.`
  }
  const base = `Excluir a ${tipo} de "${m.produto_nome}" (${m.quantidade > 0 ? '+' : ''}${m.quantidade} un)?`
  if (!produto?.controla_estoque) return `${base} Só o registro do histórico será removido.`
  const atual = produto.estoque_atual ?? 0
  return `${base} O saldo atual passará de ${atual} para ${atual - m.quantidade} un.`
}
