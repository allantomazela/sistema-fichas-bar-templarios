import React, { useState } from 'react'
import { usePos } from '@/context/PosContext'
import { LocalDatabaseService } from '@/services/db'
import { Caixa, MovimentacaoCaixa } from '@/types/pos'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  Printer,
  History,
  AlertCircle,
  FileText,
  CheckCircle2,
  Receipt,
  User,
} from 'lucide-react'
import { ThermalFechamentoTicket, triggerBrowserPrint } from '@/components/common/ThermalTickets'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import { toast } from 'sonner'

export default function CashControl() {
  const { caixaAtivo, caixas, abrirCaixa, fecharCaixa, addMovimentacao, movimentacoes, config } =
    usePos()

  // Estados de Modais
  const [isAbrirOpen, setIsAbrirOpen] = useState(false)
  const [isFecharOpen, setIsFecharOpen] = useState(false)
  const [isMovimentacaoOpen, setIsMovimentacaoOpen] = useState(false)
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'sangria' | 'suprimento'>('sangria')
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [pendingAdminAction, setPendingAdminAction] = useState<(() => void) | null>(null)

  // Modal de Comprovante de Fechamento Térmico
  const [comprovanteCaixa, setComprovanteCaixa] = useState<{
    caixa: Caixa
    resumo: ReturnType<typeof LocalDatabaseService.getResumoCaixa>
  } | null>(null)

  // Formulário Abertura
  const [operadorAbertura, setOperadorAbertura] = useState('')
  const [fundoAbertura, setFundoAbertura] = useState('150.00')
  const [obsAbertura, setObsAbertura] = useState('')

  // Formulário Sangria / Suprimento
  const [valorMovimentacao, setValorMovimentacao] = useState('')
  const [motivoMovimentacao, setMotivoMovimentacao] = useState('')

  // Formulário Fechamento às Cegas (Conferência de gaveta)
  const [dinheiroContado, setDinheiroContado] = useState('')
  const [pixContado, setPixContado] = useState('')
  const [debitoContado, setDebitoContado] = useState('')
  const [creditoContado, setCreditoContado] = useState('')
  const [obsFechamento, setObsFechamento] = useState('')

  // Resumo do caixa ativo em tempo real
  const resumoAtivo = caixaAtivo ? LocalDatabaseService.getResumoCaixa(caixaAtivo.id) : null

  // Handler de Abertura
  const handleConfirmAbrir = (e: React.FormEvent) => {
    e.preventDefault()
    const saldo = parseFloat(fundoAbertura.replace(',', '.')) || 0
    abrirCaixa(operadorAbertura || 'Operador', saldo, obsAbertura)
    setIsAbrirOpen(false)
    setOperadorAbertura('')
    setFundoAbertura('150.00')
    setObsAbertura('')
  }

  // Handler de Movimentação (com proteção por senha se for Sangria)
  const handleOpenMovimentacao = (tipo: 'sangria' | 'suprimento') => {
    setTipoMovimentacao(tipo)
    setValorMovimentacao('')
    setMotivoMovimentacao('')

    if (tipo === 'sangria') {
      setPendingAdminAction(() => () => setIsMovimentacaoOpen(true))
      setIsAdminModalOpen(true)
    } else {
      setIsMovimentacaoOpen(true)
    }
  }

  const handleConfirmMovimentacao = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseFloat(valorMovimentacao.replace(',', '.')) || 0
    if (valor <= 0) {
      toast.error('Informe um valor válido maior que zero.')
      return
    }
    if (!motivoMovimentacao.trim()) {
      toast.error('Informe o motivo / justificativa da movimentação.')
      return
    }
    addMovimentacao(tipoMovimentacao, valor, motivoMovimentacao)
    setIsMovimentacaoOpen(false)
  }

  // Handler de Fechamento de Caixa
  const handleConfirmFechar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!caixaAtivo) return

    const valoresInformados = {
      dinheiro: parseFloat(dinheiroContado.replace(',', '.')) || 0,
      pix: parseFloat(pixContado.replace(',', '.')) || 0,
      debito: parseFloat(debitoContado.replace(',', '.')) || 0,
      credito: parseFloat(creditoContado.replace(',', '.')) || 0,
    }

    const caixaFechado = fecharCaixa(valoresInformados, obsFechamento)
    setIsFecharOpen(false)

    if (caixaFechado) {
      const resumo = LocalDatabaseService.getResumoCaixa(caixaFechado.id)
      setComprovanteCaixa({ caixa: caixaFechado, resumo })
    }
  }

  // Ver comprovante de um caixa histórico
  const handleVerComprovante = (caixa: Caixa) => {
    const resumo = LocalDatabaseService.getResumoCaixa(caixa.id)
    setComprovanteCaixa({ caixa, resumo })
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      {/* CABEÇALHO DO MÓDULO DE CAIXA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary" />
            Controle de Caixa & Turnos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie a abertura de turnos, suprimentos de troco, sangrias e fechamento com
            conferência às cegas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {caixaAtivo ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenMovimentacao('suprimento')}
                className="font-bold gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Suprimento (+Troco)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOpenMovimentacao('sangria')}
                className="font-bold gap-1.5 border-rose-500/40 text-rose-600 hover:bg-rose-500/10"
              >
                <ArrowUpRight className="w-4 h-4" />
                Sangria (Retirada)
              </Button>
              <Button
                onClick={() => setIsFecharOpen(true)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5 shadow-md"
              >
                <Lock className="w-4 h-4" />
                Fechar Caixa (Turno)
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsAbrirOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm px-6 h-11 gap-2 shadow-lg"
            >
              <Unlock className="w-5 h-5" />
              ABRIR NOVO TURNO DE CAIXA
            </Button>
          )}
        </div>
      </div>

      {/* CARD DO CAIXA ATIVO (SE ESTIVER ABERTO) */}
      {caixaAtivo && resumoAtivo && (
        <div className="p-6 rounded-2xl border-2 border-primary/40 bg-card shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-foreground">Turno em Andamento</span>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 font-bold">ABERTO</Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>
                    Operador: <strong>{caixaAtivo.operador}</strong>
                  </span>
                  <span>•</span>
                  <span>Aberto em: {formatDateTime(caixaAtivo.abertura)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const resumo = LocalDatabaseService.getResumoCaixa(caixaAtivo.id)
                setComprovanteCaixa({ caixa: caixaAtivo, resumo })
              }}
              className="gap-1.5 font-bold"
            >
              <Printer className="w-4 h-4" />
              Imprimir Parcial do Caixa
            </Button>
          </div>

          {/* GRID DE VALORES / GAVETA ATUAL */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-muted/40 border border-border">
              <span className="text-[11px] font-bold text-muted-foreground uppercase block">
                Fundo Inicial
              </span>
              <span className="text-lg font-black font-mono text-foreground mt-1 block">
                {formatCurrency(resumoAtivo.saldoInicial)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">
                Vendas em Dinheiro
              </span>
              <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-1 block">
                {formatCurrency(resumoAtivo.totalDinheiro)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase block">
                Vendas PIX
              </span>
              <span className="text-lg font-black font-mono text-teal-700 dark:text-teal-300 mt-1 block">
                {formatCurrency(resumoAtivo.totalPix)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase block">
                Cartões (Déb/Créd)
              </span>
              <span className="text-lg font-black font-mono text-blue-700 dark:text-blue-300 mt-1 block">
                {formatCurrency(resumoAtivo.totalDebito + resumoAtivo.totalCredito)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase block">
                Suprimentos / Sangrias
              </span>
              <span className="text-lg font-black font-mono text-amber-700 dark:text-amber-300 mt-1 block">
                +{formatCurrency(resumoAtivo.totalSuprimento)} / -
                {formatCurrency(resumoAtivo.totalSangria)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
              <span className="text-[11px] font-extrabold text-primary uppercase block">
                Saldo na Gaveta (Dinheiro)
              </span>
              <span className="text-xl font-black font-mono text-primary mt-1 block">
                {formatCurrency(resumoAtivo.saldoDinheiroEsperado)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MOVIMENTAÇÕES DESTE CAIXA (SANGRIA / SUPRIMENTO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TABELA DE MOVIMENTAÇÕES */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              Histórico de Sangrias & Suprimentos
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              {movimentacoes.length} registros
            </Badge>
          </div>

          <div className="overflow-x-auto max-h-72">
            {movimentacoes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhuma sangria ou suprimento registrado até o momento.
              </p>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-2">Hora</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Valor</th>
                    <th className="p-2">Motivo</th>
                    <th className="p-2">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movimentacoes.map((mov) => (
                    <tr key={mov.id} className="hover:bg-muted/20">
                      <td className="p-2 font-mono">{formatDateTime(mov.data_hora)}</td>
                      <td className="p-2">
                        {mov.tipo === 'sangria' ? (
                          <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                            Sangria
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] uppercase font-bold">
                            Suprimento
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-mono font-bold">{formatCurrency(mov.valor)}</td>
                      <td className="p-2 text-muted-foreground max-w-[150px] truncate">
                        {mov.motivo}
                      </td>
                      <td className="p-2 text-muted-foreground">{mov.operador}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* HISTÓRICO DE TURNOS ANTERIORES */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-muted-foreground" />
              Histórico de Caixas & Turnos
            </h3>
            <Badge variant="outline" className="font-mono text-xs">
              {caixas.length} turnos
            </Badge>
          </div>

          <div className="overflow-x-auto max-h-72">
            {caixas.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                Nenhum turno registrado.
              </p>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-2">Operador</th>
                    <th className="p-2">Abertura / Fechamento</th>
                    <th className="p-2">Fundo</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Comprovante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {caixas.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="p-2 font-bold">{c.operador}</td>
                      <td className="p-2 font-mono text-muted-foreground">
                        <div>A: {formatDateTime(c.abertura)}</div>
                        <div>F: {c.fechamento ? formatDateTime(c.fechamento) : 'Em Aberto'}</div>
                      </td>
                      <td className="p-2 font-mono">{formatCurrency(c.saldo_inicial)}</td>
                      <td className="p-2">
                        {c.status === 'aberto' ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] font-bold uppercase">
                            Aberto
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase">
                            Fechado
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerComprovante(c)}
                          className="h-8 px-2 text-primary hover:bg-primary/10 gap-1 font-semibold"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ABERTURA DE CAIXA */}
      <Dialog open={isAbrirOpen} onOpenChange={setIsAbrirOpen}>
        <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" />
              Abertura de Caixa (Novo Turno)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmAbrir} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Nome do Operador
              </Label>
              <Input
                type="text"
                placeholder="Ex: Maria Balcão 1"
                value={operadorAbertura}
                onChange={(e) => setOperadorAbertura(e.target.value)}
                required
                className="h-11 text-sm font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Fundo de Troco Inicial (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={fundoAbertura}
                onChange={(e) => setFundoAbertura(e.target.value)}
                required
                className="h-12 text-2xl font-black font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Valor em dinheiro físico colocado na gaveta no início do turno.
              </p>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Observações Iniciais (Opcional)
              </Label>
              <Input
                type="text"
                placeholder="Ex: Turno da Noite - Festa Junina"
                value={obsAbertura}
                onChange={(e) => setObsAbertura(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAbrirOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Confirmar Abertura
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: MOVIMENTAÇÃO (SANGRIA / SUPRIMENTO) */}
      <Dialog open={isMovimentacaoOpen} onOpenChange={setIsMovimentacaoOpen}>
        <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {tipoMovimentacao === 'sangria' ? (
                <>
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                  Registro de Sangria (Retirada de Gaveta)
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  Registro de Suprimento (Entrada de Troco)
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleConfirmMovimentacao} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Valor da Movimentação (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valorMovimentacao}
                onChange={(e) => setValorMovimentacao(e.target.value)}
                required
                autoFocus
                className="h-12 text-2xl font-black font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Motivo / Justificativa Obrigatória
              </Label>
              <Input
                type="text"
                placeholder={
                  tipoMovimentacao === 'sangria'
                    ? 'Ex: Recolhimento de cofre pela tesouraria'
                    : 'Ex: Troco extra fornecido pela coordenação'
                }
                value={motivoMovimentacao}
                onChange={(e) => setMotivoMovimentacao(e.target.value)}
                required
                className="h-11 text-sm font-semibold"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsMovimentacaoOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className={`font-bold text-white ${
                  tipoMovimentacao === 'sangria'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Registrar {tipoMovimentacao === 'sangria' ? 'Sangria' : 'Suprimento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: FECHAMENTO DE CAIXA (CONFERÊNCIA ÀS CEGAS) */}
      <Dialog open={isFecharOpen} onOpenChange={setIsFecharOpen}>
        <DialogContent className="max-w-lg bg-background text-foreground border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
              <Lock className="w-5 h-5" />
              Fechamento de Turno (Conferência de Gaveta)
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Para segurança do caixa, insira os valores contados fisicamente pelo operador.
            </p>
          </DialogHeader>

          <form onSubmit={handleConfirmFechar} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Dinheiro Contado (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={dinheiroContado}
                  onChange={(e) => setDinheiroContado(e.target.value)}
                  className="h-11 font-mono font-bold text-base"
                  required
                  autoFocus
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  PIX Total (Comprovantes)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={pixContado}
                  onChange={(e) => setPixContado(e.target.value)}
                  className="h-11 font-mono font-bold text-base"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Cartão Débito (POS)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={debitoContado}
                  onChange={(e) => setDebitoContado(e.target.value)}
                  className="h-11 font-mono font-bold text-base"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Cartão Crédito (POS)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={creditoContado}
                  onChange={(e) => setCreditoContado(e.target.value)}
                  className="h-11 font-mono font-bold text-base"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Observações de Fechamento (Opcional)
              </Label>
              <Input
                type="text"
                placeholder="Ex: Turno encerrado sem divergências aparentes"
                value={obsFechamento}
                onChange={(e) => setObsFechamento(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFecharOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
                Finalizar e Gerar Relatório Térmico
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: PRÉ-VISUALIZAÇÃO E IMPRESSÃO DO COMPROVANTE DE FECHAMENTO */}
      {comprovanteCaixa && (
        <Dialog open={true} onOpenChange={() => setComprovanteCaixa(null)}>
          <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl">
            <DialogHeader className="p-4 border-b border-border bg-muted/40 flex flex-row items-center justify-between">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Comprovante de Fechamento de Caixa
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-200 dark:bg-slate-950 flex flex-col items-center">
              <div id="printable-fechamento-area">
                <ThermalFechamentoTicket
                  caixa={comprovanteCaixa.caixa}
                  config={config}
                  resumo={comprovanteCaixa.resumo}
                />
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border bg-muted/20 flex sm:justify-between items-center gap-2">
              <Button variant="outline" onClick={() => setComprovanteCaixa(null)}>
                Fechar
              </Button>
              <Button
                onClick={() => triggerBrowserPrint('printable-fechamento-area')}
                className="bg-primary hover:bg-primary/90 font-bold gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir Comprovante Térmico
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL SENHA DE ADMIN */}
      <AdminPasswordModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSuccess={() => {
          if (pendingAdminAction) {
            pendingAdminAction()
            setPendingAdminAction(null)
          }
        }}
        title="Autorização para Sangria"
        description="A retirada de valores da gaveta exige validação da gerência."
      />
    </div>
  )
}
