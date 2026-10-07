import { useMemo, useState } from 'react'
import type { LoteFichas } from '@/types/pos'
import { useFichaLotes } from '@/hooks/useFichaLotes'
import { formatNumeroLote, totalFichasLote, valorTotalLote } from '@/lib/fichaLote'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import { LotesTable, type AcaoLote } from '@/components/lotes/LotesTable'
import { NovoLoteDialog } from '@/components/lotes/NovoLoteDialog'
import { PrestarContasDialog } from '@/components/lotes/PrestarContasDialog'
import { CancelarLoteDialog } from '@/components/lotes/CancelarLoteDialog'
import { Plus, Ticket } from 'lucide-react'

type Acao = AcaoLote | 'novo'

interface Pedido {
  acao: Acao
  lote?: LoteFichas
}

export default function FichaLotes() {
  const { lotes, caixaAberto, criarLote, reimprimir, prestarContas, cancelarLote } = useFichaLotes()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [autorizado, setAutorizado] = useState<Pedido | null>(null)

  const abertos = useMemo(() => lotes.filter((l) => l.status === 'aberto'), [lotes])
  const fichasNaRua = abertos.reduce((acc, l) => acc + totalFichasLote(l), 0)
  const valorNaRua = abertos.reduce((acc, l) => acc + valorTotalLote(l), 0)

  const fecharAutorizado = () => setAutorizado(null)

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 sm:p-5 space-y-4 max-w-7xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Ticket className="w-6 h-6 text-primary" />
              Fichas Antecipadas
            </h1>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Imprima fichas antes da venda (talão reserva, ambulantes, barracas). O estoque fica
              reservado e o dinheiro só entra no caixa na prestação de contas — fichas que não
              voltarem contam como vendidas.
            </p>
          </div>
          <Button type="button" className="font-bold" onClick={() => setPedido({ acao: 'novo' })}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo lote
          </Button>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <Resumo label="Lotes em aberto" valor={String(abertos.length)} />
          <Resumo label="Fichas na rua" valor={String(fichasNaRua)} />
          <Resumo label="Valor a receber" valor={formatCurrency(valorNaRua)} />
        </div>

        <LotesTable
          lotes={lotes}
          onReimprimir={reimprimir}
          onAcao={(acao, lote) => setPedido({ acao, lote })}
        />
      </div>

      <AdminPasswordModal
        isOpen={!!pedido}
        onClose={() => setPedido(null)}
        onSuccess={() => setAutorizado(pedido)}
        title={pedido ? TITULO_ACAO[pedido.acao] : undefined}
        description={
          pedido?.lote
            ? `Lote ${formatNumeroLote(pedido.lote.numero)} — ${pedido.lote.responsavel}. Digite a senha de administrador.`
            : 'Fichas antecipadas valem como dinheiro. Digite a senha de administrador.'
        }
      />

      <NovoLoteDialog open={autorizado?.acao === 'novo'} onClose={fecharAutorizado} onConfirm={criarLote} />

      {autorizado?.acao === 'prestar' && autorizado.lote && (
        <PrestarContasDialog
          key={autorizado.lote.id}
          lote={autorizado.lote}
          caixaAberto={caixaAberto}
          onClose={fecharAutorizado}
          onConfirm={(devolvidas, forma) => prestarContas(autorizado.lote!.id, devolvidas, forma)}
        />
      )}

      {autorizado?.acao === 'cancelar' && autorizado.lote && (
        <CancelarLoteDialog
          key={autorizado.lote.id}
          lote={autorizado.lote}
          onClose={fecharAutorizado}
          onConfirm={(motivo) => cancelarLote(autorizado.lote!.id, motivo)}
        />
      )}
    </div>
  )
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="p-3 sm:p-4 rounded-2xl border border-border bg-card">
      <p className="text-[11px] font-bold uppercase text-muted-foreground truncate">{label}</p>
      <p className="text-xl sm:text-2xl font-black font-mono leading-tight truncate">{valor}</p>
    </div>
  )
}

const TITULO_ACAO: Record<Acao, string> = {
  novo: 'Criar lote de fichas',
  prestar: 'Prestar contas do lote',
  cancelar: 'Cancelar lote',
}
