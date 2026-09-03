import React, { useState, useEffect, useRef } from 'react'
import { usePos } from '@/context/PosContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormaPagamento } from '@/types/pos'
import { formatCurrency } from '@/lib/utils'
import {
  Banknote,
  QrCode,
  CreditCard,
  Gift,
  CheckCircle,
  ArrowRight,
  Calculator,
  AlertCircle,
} from 'lucide-react'
import { QRCodeSVG } from '@/components/common/QRCodeSVG'

export const PaymentModal: React.FC = () => {
  const { isPaymentModalOpen, setIsPaymentModalOpen, cartTotal, finalizarVenda, config, carrinho } =
    usePos()

  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro')
  const [valorRecebidoStr, setValorRecebidoStr] = useState<string>('')
  const [descontoStr, setDescontoStr] = useState<string>('')
  const inputRecebidoRef = useRef<HTMLInputElement>(null)

  // Valores calculados
  const desconto = parseFloat(descontoStr.replace(',', '.')) || 0
  const totalAPagar = Math.max(0, cartTotal - desconto)
  const valorRecebido = parseFloat(valorRecebidoStr.replace(',', '.')) || 0
  const troco = formaPagamento === 'dinheiro' ? Math.max(0, valorRecebido - totalAPagar) : 0
  const faltaPagar = formaPagamento === 'dinheiro' ? Math.max(0, totalAPagar - valorRecebido) : 0

  // Resetar campos ao abrir modal
  useEffect(() => {
    if (isPaymentModalOpen) {
      setFormaPagamento('dinheiro')
      setValorRecebidoStr(totalAPagar.toFixed(2))
      setDescontoStr('')
      setTimeout(() => {
        if (inputRecebidoRef.current) {
          inputRecebidoRef.current.focus()
          inputRecebidoRef.current.select()
        }
      }, 100)
    }
  }, [isPaymentModalOpen, cartTotal, totalAPagar])

  if (!isPaymentModalOpen) return null

  const handleSelectForma = (forma: FormaPagamento) => {
    setFormaPagamento(forma)
    if (forma !== 'dinheiro') {
      setValorRecebidoStr(totalAPagar.toFixed(2))
    }
  }

  const handleSetValorRapido = (valor: number) => {
    setValorRecebidoStr(valor.toFixed(2))
  }

  const handleConfirmar = () => {
    if (formaPagamento === 'dinheiro' && valorRecebido < totalAPagar) {
      return
    }
    finalizarVenda(formaPagamento, valorRecebido, desconto)
  }

  // Atalhos de teclado no modal de pagamento
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'F1') {
      e.preventDefault()
      handleSelectForma('dinheiro')
    } else if (e.key === 'F2') {
      e.preventDefault()
      handleSelectForma('pix')
    } else if (e.key === 'F3') {
      e.preventDefault()
      handleSelectForma('debito')
    } else if (e.key === 'F4') {
      e.preventDefault()
      handleSelectForma('credito')
    } else if (e.key === 'F5') {
      e.preventDefault()
      handleSelectForma('cortesia')
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirmar()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsPaymentModalOpen(false)
    }
  }

  // Sugestões de notas rápidas
  const notasSugeridas = [
    totalAPagar,
    Math.ceil(totalAPagar / 5) * 5,
    Math.ceil(totalAPagar / 10) * 10,
    Math.ceil(totalAPagar / 20) * 20,
    Math.ceil(totalAPagar / 50) * 50,
    100,
  ]
    .filter((v, i, arr) => v >= totalAPagar && arr.indexOf(v) === i)
    .slice(0, 5)

  return (
    <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
      <DialogContent
        className="max-w-3xl p-0 overflow-hidden bg-background text-foreground border border-border shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader className="p-4 border-b border-border bg-slate-900 text-white flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Calculator className="w-6 h-6 text-blue-400" />
              FINALIZAR VENDA
            </DialogTitle>
            <p className="text-xs text-slate-300 mt-0.5">
              Selecione a forma de pagamento e confirme para emitir as fichas
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase font-medium text-slate-400 block">
              Total a Pagar
            </span>
            <span className="text-2xl font-black text-emerald-400">
              {formatCurrency(totalAPagar)}
            </span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
          {/* COLUNA ESQUERDA: FORMAS DE PAGAMENTO */}
          <div className="md:col-span-5 p-4 border-r border-border bg-muted/20 space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Forma de Pagamento (Atalhos)
            </Label>

            <button
              type="button"
              onClick={() => handleSelectForma('dinheiro')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                formaPagamento === 'dinheiro'
                  ? 'border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm'
                  : 'border-border hover:border-muted-foreground/30 bg-card text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-md ${formaPagamento === 'dinheiro' ? 'bg-emerald-600 text-white' : 'bg-muted text-foreground'}`}
                >
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Dinheiro</div>
                  <div className="text-xs text-muted-foreground">Com cálculo de troco</div>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono border">F1</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectForma('pix')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                formaPagamento === 'pix'
                  ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold shadow-sm'
                  : 'border-border hover:border-muted-foreground/30 bg-card text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-md ${formaPagamento === 'pix' ? 'bg-teal-600 text-white' : 'bg-muted text-foreground'}`}
                >
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">PIX</div>
                  <div className="text-xs text-muted-foreground">QR Code em tela</div>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono border">F2</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectForma('debito')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                formaPagamento === 'debito'
                  ? 'border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-sm'
                  : 'border-border hover:border-muted-foreground/30 bg-card text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-md ${formaPagamento === 'debito' ? 'bg-blue-600 text-white' : 'bg-muted text-foreground'}`}
                >
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Cartão Débito</div>
                  <div className="text-xs text-muted-foreground">Máquina POS</div>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono border">F3</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectForma('credito')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                formaPagamento === 'credito'
                  ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm'
                  : 'border-border hover:border-muted-foreground/30 bg-card text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-md ${formaPagamento === 'credito' ? 'bg-indigo-600 text-white' : 'bg-muted text-foreground'}`}
                >
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Cartão Crédito</div>
                  <div className="text-xs text-muted-foreground">Máquina POS</div>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono border">F4</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectForma('cortesia')}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-center justify-between ${
                formaPagamento === 'cortesia'
                  ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shadow-sm'
                  : 'border-border hover:border-muted-foreground/30 bg-card text-foreground'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-md ${formaPagamento === 'cortesia' ? 'bg-purple-600 text-white' : 'bg-muted text-foreground'}`}
                >
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">Ficha Cortesia</div>
                  <div className="text-xs text-muted-foreground">Equipe / Staff / Isento</div>
                </div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-muted font-mono border">F5</span>
            </button>
          </div>

          {/* COLUNA DIREITA: DETALHES, VALOR RECEBIDO E TROCO */}
          <div className="md:col-span-7 p-6 flex flex-col justify-between space-y-4">
            {formaPagamento === 'dinheiro' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-bold text-foreground block mb-1">
                    Valor Recebido em Dinheiro (R$)
                  </Label>
                  <div className="relative">
                    <Input
                      ref={inputRecebidoRef}
                      type="number"
                      step="0.01"
                      value={valorRecebidoStr}
                      onChange={(e) => setValorRecebidoStr(e.target.value)}
                      placeholder="0,00"
                      className="text-3xl font-black h-16 px-4 font-mono text-foreground border-2 border-primary/50 focus:border-primary"
                    />
                  </div>
                </div>

                {/* Sugestões de notas rápidas */}
                <div>
                  <Label className="text-xs text-muted-foreground font-semibold block mb-1.5">
                    Sugestões de Notas / Valores Rápidos:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {notasSugeridas.map((valor) => (
                      <Button
                        key={valor}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetValorRapido(valor)}
                        className="font-mono font-bold hover:bg-primary/10 hover:border-primary"
                      >
                        {formatCurrency(valor)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* DESTAQUE DO TROCO OU FALTA */}
                <div className="p-4 rounded-xl border-2 bg-muted/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-bold text-muted-foreground block">
                      {faltaPagar > 0 ? 'Falta Receber' : 'Troco a Devolver'}
                    </span>
                    <span
                      className={`text-3xl font-black font-mono ${
                        faltaPagar > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatCurrency(faltaPagar > 0 ? faltaPagar : troco)}
                    </span>
                  </div>
                  {faltaPagar === 0 && (
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                  )}
                  {faltaPagar > 0 && (
                    <div className="flex items-center gap-1 text-xs text-rose-500 font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      Valor insuficiente
                    </div>
                  )}
                </div>
              </div>
            )}

            {formaPagamento === 'pix' && (
              <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-teal-500/5 space-y-3 text-center">
                <div className="p-2 bg-white rounded-lg shadow-sm border">
                  <QRCodeSVG
                    value={`PIX-STATIC:${config.chave_pix_estatica || 'EVENTO'}:VAL:${totalAPagar.toFixed(2)}`}
                    size={140}
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Chave PIX do Evento:</div>
                  <div className="font-mono font-bold text-sm text-teal-700 dark:text-teal-300">
                    {config.chave_pix_estatica || 'Chave não cadastrada nas configurações'}
                  </div>
                  {config.nome_beneficiario_pix && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {config.nome_beneficiario_pix}
                    </div>
                  )}
                </div>
                <div className="text-xs bg-teal-100 dark:bg-teal-950/50 text-teal-800 dark:text-teal-200 px-3 py-1.5 rounded font-medium">
                  Confirme o comprovante no celular do cliente antes de liberar as fichas.
                </div>
              </div>
            )}

            {(formaPagamento === 'debito' || formaPagamento === 'credito') && (
              <div className="flex flex-col items-center justify-center p-8 border rounded-xl bg-blue-500/5 space-y-3 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-lg font-bold">
                    Passe o valor de{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                      {formatCurrency(totalAPagar)}
                    </span>{' '}
                    na Maquininha POS
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Modalidade:{' '}
                    <strong>{formaPagamento === 'debito' ? 'DÉBITO' : 'CRÉDITO'}</strong>. Pressione
                    Enter após a aprovação da transação.
                  </p>
                </div>
              </div>
            )}

            {formaPagamento === 'cortesia' && (
              <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-purple-500/5 space-y-3 text-center">
                <div className="w-14 h-14 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center">
                  <Gift className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-base font-bold text-purple-700 dark:text-purple-300">
                    Emissão Cortesia / Sem Cobrança
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    As fichas serão emitidas com valor R$ 0,00 e identificadas no relatório como
                    Cortesia.
                  </p>
                </div>
              </div>
            )}

            {/* BOTÕES DE FINALIZAÇÃO */}
            <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="h-12 px-6"
              >
                Voltar (Esc)
              </Button>
              <Button
                type="button"
                onClick={handleConfirmar}
                disabled={formaPagamento === 'dinheiro' && valorRecebido < totalAPagar}
                className="h-12 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base tracking-wide gap-2 shadow-lg"
              >
                <CheckCircle className="w-5 h-5" />
                CONFIRMAR E IMPRIMIR (ENTER)
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
