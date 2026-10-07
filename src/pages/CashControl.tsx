import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, DollarSign, Lock, Unlock } from 'lucide-react'
import { usePos } from '@/context/PosContext'
import { LocalDatabaseService } from '@/services/db'
import type { Caixa, TipoMovimentacaoCaixa } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import type { ResumoCaixa } from '@/components/caixa/caixaParts'
import { CaixaAtivoCard } from '@/components/caixa/CaixaAtivoCard'
import { HistoricoMovimentacoes, HistoricoTurnos } from '@/components/caixa/CaixaHistoricos'
import { AbrirCaixaDialog } from '@/components/caixa/AbrirCaixaDialog'
import { MovimentacaoDialog } from '@/components/caixa/MovimentacaoDialog'
import { FecharCaixaDialog } from '@/components/caixa/FecharCaixaDialog'
import { ComprovanteCaixaDialog } from '@/components/caixa/ComprovanteCaixaDialog'

type ModalCaixa =
  | { tipo: 'abrir' }
  | { tipo: 'movimentacao'; movimento: TipoMovimentacaoCaixa }
  | { tipo: 'fechar' }
  | { tipo: 'comprovante'; caixa: Caixa; resumo: ResumoCaixa }

export default function CashControl() {
  const { caixaAtivo, caixas, abrirCaixa, fecharCaixa, addMovimentacao, movimentacoes, config } = usePos()
  const [modal, setModal] = useState<ModalCaixa | null>(null)
  const [pedindoSenhaSangria, setPedindoSenhaSangria] = useState(false)
  const fecharModal = () => setModal(null)

  const resumoAtivo = caixaAtivo ? LocalDatabaseService.getResumoCaixa(caixaAtivo.id) : null

  const verComprovante = (caixa: Caixa) =>
    setModal({ tipo: 'comprovante', caixa, resumo: LocalDatabaseService.getResumoCaixa(caixa.id) })

  const confirmarFechamento = (valores: Caixa['valores_informados'], obs: string) => {
    const caixaFechado = fecharCaixa(valores, obs)
    if (caixaFechado) verComprovante(caixaFechado)
    else fecharModal()
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" />
            Controle de Caixa & Turnos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie a abertura de turnos, suprimentos de troco, sangrias e fechamento com conferência às cegas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {caixaAtivo ? (
            <>
              <Button
                variant="outline"
                onClick={() => setModal({ tipo: 'movimentacao', movimento: 'suprimento' })}
                className="font-bold gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Suprimento (+Troco)
              </Button>
              <Button
                variant="outline"
                onClick={() => setPedindoSenhaSangria(true)}
                className="font-bold gap-1.5 border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
              >
                <ArrowUpRight className="w-4 h-4" />
                Sangria (Retirada)
              </Button>
              <Button
                onClick={() => setModal({ tipo: 'fechar' })}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5 shadow-md"
              >
                <Lock className="w-4 h-4" />
                Fechar Caixa (Turno)
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setModal({ tipo: 'abrir' })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-6 h-11 gap-2 shadow-lg"
            >
              <Unlock className="w-5 h-5" />
              ABRIR NOVO TURNO DE CAIXA
            </Button>
          )}
        </div>
      </div>

      {caixaAtivo && resumoAtivo && (
        <CaixaAtivoCard
          caixa={caixaAtivo}
          resumo={resumoAtivo}
          onImprimirParcial={() => verComprovante(caixaAtivo)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HistoricoMovimentacoes movimentacoes={movimentacoes} />
        <HistoricoTurnos caixas={caixas} onVerComprovante={verComprovante} />
      </div>

      {modal?.tipo === 'abrir' && <AbrirCaixaDialog onConfirmar={abrirCaixa} onFechar={fecharModal} />}
      {modal?.tipo === 'movimentacao' && (
        <MovimentacaoDialog tipo={modal.movimento} onConfirmar={addMovimentacao} onFechar={fecharModal} />
      )}
      {modal?.tipo === 'fechar' && (
        <FecharCaixaDialog resumo={resumoAtivo} onConfirmar={confirmarFechamento} onFechar={fecharModal} />
      )}
      {modal?.tipo === 'comprovante' && (
        <ComprovanteCaixaDialog
          caixa={modal.caixa}
          resumo={modal.resumo}
          config={config}
          onFechar={fecharModal}
        />
      )}

      <AdminPasswordModal
        isOpen={pedindoSenhaSangria}
        onClose={() => setPedindoSenhaSangria(false)}
        onSuccess={() => setModal({ tipo: 'movimentacao', movimento: 'sangria' })}
        title="Autorização para Sangria"
        description="A retirada de valores da gaveta exige validação da gerência."
      />
    </div>
  )
}
