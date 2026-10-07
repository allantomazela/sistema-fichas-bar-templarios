import React, { useState, useEffect, useRef } from 'react'
import { usePos } from '@/context/PosContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormaPagamento } from '@/types/pos'
import { formatCurrency, parseValorMonetario } from '@/lib/utils'
import {
  Banknote,
  Smartphone,
  CreditCard,
  Gift,
  CheckCircle,
  Calculator,
  AlertCircle,
} from 'lucide-react'

const FORMAS: {
  id: FormaPagamento
  label: string
  hint: string
  atalho: string
  icon: React.ReactNode
  activeClass: string
  iconClass: string
}[] = [
  {
    id: 'dinheiro',
    label: 'Dinheiro',
    hint: 'Espécie no caixa',
    atalho: 'F1',
    icon: <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />,
    activeClass:
      'border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm',
    iconClass: 'bg-emerald-600 text-white',
  },
  {
    id: 'pix',
    label: 'PIX',
    hint: 'Na maquininha',
    atalho: 'F2',
    icon: <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />,
    activeClass:
      'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold shadow-sm',
    iconClass: 'bg-teal-600 text-white',
  },
  {
    id: 'debito',
    label: 'Débito',
    hint: 'Na maquininha',
    atalho: 'F3',
    icon: <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />,
    activeClass:
      'border-blue-600 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold shadow-sm',
    iconClass: 'bg-blue-600 text-white',
  },
  {
    id: 'credito',
    label: 'Crédito',
    hint: 'Na maquininha',
    atalho: 'F4',
    icon: <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />,
    activeClass:
      'border-indigo-600 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm',
    iconClass: 'bg-indigo-600 text-white',
  },
  {
    id: 'cortesia',
    label: 'Cortesia',
    hint: 'Equipe / isento',
    atalho: 'F5',
    icon: <Gift className="w-4 h-4 sm:w-5 sm:h-5" />,
    activeClass:
      'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold shadow-sm',
    iconClass: 'bg-purple-600 text-white',
  },
]

export function PaymentModal() {
  const { isPaymentModalOpen, setIsPaymentModalOpen, cartTotal, finalizarVenda } = usePos()

  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro')
  const [valorRecebidoStr, setValorRecebidoStr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRecebidoRef = useRef<HTMLInputElement>(null)

  const totalAPagar = Math.max(0, cartTotal)
  const valorRecebido = parseValorMonetario(valorRecebidoStr)
  const troco = formaPagamento === 'dinheiro' ? Math.max(0, valorRecebido - totalAPagar) : 0
  const faltaPagar = formaPagamento === 'dinheiro' ? Math.max(0, totalAPagar - valorRecebido) : 0
  const podeConfirmar = !(formaPagamento === 'dinheiro' && valorRecebido < totalAPagar)

  useEffect(() => {
    if (!isPaymentModalOpen) return
    setFormaPagamento('dinheiro')
    setValorRecebidoStr(totalAPagar.toFixed(2))
    setSubmitting(false)
    setTimeout(() => {
      inputRecebidoRef.current?.focus()
      inputRecebidoRef.current?.select()
    }, 100)
  }, [isPaymentModalOpen, totalAPagar])

  if (!isPaymentModalOpen) return null

  function handleSelectForma(forma: FormaPagamento) {
    if (submitting) return
    setFormaPagamento(forma)
    if (forma !== 'dinheiro') {
      setValorRecebidoStr(totalAPagar.toFixed(2))
    }
  }

  function handleConfirmar() {
    if (submitting || !podeConfirmar) return
    setSubmitting(true)
    const result = finalizarVenda(formaPagamento, valorRecebido, 0)
    if (!result) setSubmitting(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (submitting) return
    const map: Record<string, FormaPagamento> = {
      F1: 'dinheiro',
      F2: 'pix',
      F3: 'debito',
      F4: 'credito',
      F5: 'cortesia',
    }
    if (map[e.key]) {
      e.preventDefault()
      handleSelectForma(map[e.key])
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirmar()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsPaymentModalOpen(false)
    }
  }

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
        className="w-[calc(100vw-1rem)] sm:w-full max-w-3xl p-0 gap-0 overflow-hidden flex flex-col max-h-[min(92dvh,900px)] bg-background text-foreground border border-border shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* Cabeçalho fixo */}
        <DialogHeader className="shrink-0 p-3 sm:p-4 border-b border-border bg-slate-900 text-white flex flex-row items-center justify-between gap-3 pr-12">
          <div className="min-w-0">
            <DialogTitle className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 shrink-0" />
              <span className="truncate">FINALIZAR VENDA</span>
            </DialogTitle>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 hidden xs:block sm:block">
              Marque a forma de pagamento para o fechamento de caixa.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] sm:text-xs uppercase font-medium text-slate-400 block">
              Total
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">
              {formatCurrency(totalAPagar)}
            </span>
          </div>
        </DialogHeader>

        {/* Corpo rolável */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-12">
            <div className="md:col-span-5 p-3 sm:p-4 md:border-r border-border bg-muted/20">
              <Label className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Forma de pagamento
              </Label>

              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-1 gap-2">
                {FORMAS.map((forma) => {
                  const selected = formaPagamento === forma.id
                  return (
                    <button
                      key={forma.id}
                      type="button"
                      onClick={() => handleSelectForma(forma.id)}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-lg border-2 transition-all flex items-center justify-between gap-2 ${
                        selected
                          ? forma.activeClass
                          : 'border-border hover:border-muted-foreground/30 bg-card text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div
                          className={`p-1.5 sm:p-2 rounded-md shrink-0 ${selected ? forma.iconClass : 'bg-muted text-foreground'}`}
                        >
                          {forma.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm truncate">{forma.label}</div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {forma.hint}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-muted font-mono border shrink-0">
                        {forma.atalho}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="md:col-span-7 p-3 sm:p-5 space-y-3 sm:space-y-4">
              {formaPagamento === 'dinheiro' && (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <Label className="text-xs sm:text-sm font-bold text-foreground block mb-1">
                      Valor recebido (R$)
                    </Label>
                    <Input
                      ref={inputRecebidoRef}
                      type="number"
                      step="0.01"
                      value={valorRecebidoStr}
                      onChange={(e) => setValorRecebidoStr(e.target.value)}
                      placeholder="0,00"
                      className="text-2xl sm:text-3xl font-black h-12 sm:h-14 px-3 sm:px-4 font-mono text-foreground border-2 border-primary/50 focus:border-primary"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] sm:text-xs text-muted-foreground font-semibold block mb-1.5">
                      Valores rápidos
                    </Label>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {notasSugeridas.map((valor) => (
                        <Button
                          key={valor}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setValorRecebidoStr(valor.toFixed(2))}
                          className="font-mono font-bold text-xs h-8 hover:bg-primary/10 hover:border-primary"
                        >
                          {formatCurrency(valor)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 rounded-xl border-2 bg-muted/40 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground block">
                        {faltaPagar > 0 ? 'Falta receber' : 'Troco'}
                      </span>
                      <span
                        className={`text-2xl sm:text-3xl font-black font-mono ${
                          faltaPagar > 0
                            ? 'text-rose-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {formatCurrency(faltaPagar > 0 ? faltaPagar : troco)}
                      </span>
                    </div>
                    {faltaPagar === 0 ? (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-rose-500 font-semibold shrink-0">
                        <AlertCircle className="w-4 h-4" />
                        Insuficiente
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(formaPagamento === 'pix' ||
                formaPagamento === 'debito' ||
                formaPagamento === 'credito') && (
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 border rounded-xl bg-muted/30 space-y-2 sm:space-y-3 text-center min-h-[140px]">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    {formaPagamento === 'pix' ? (
                      <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
                    ) : (
                      <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
                    )}
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold">
                      Cobrar{' '}
                      <span className="text-primary font-extrabold">
                        {formatCurrency(totalAPagar)}
                      </span>{' '}
                      na maquininha
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                      {formaPagamento === 'pix'
                        ? 'PIX na maquininha. Após aprovar, confirme para emitir as fichas.'
                        : `Modalidade: ${formaPagamento === 'debito' ? 'DÉBITO' : 'CRÉDITO'}. Após aprovar, confirme.`}
                    </p>
                  </div>
                </div>
              )}

              {formaPagamento === 'cortesia' && (
                <div className="flex flex-col items-center justify-center p-4 sm:p-6 border rounded-xl bg-purple-500/5 space-y-2 text-center min-h-[120px]">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-600 flex items-center justify-center">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div className="text-sm sm:text-base font-bold text-purple-700 dark:text-purple-300">
                    Cortesia / sem cobrança
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Entra no relatório como Cortesia (não soma no caixa).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé fixo — botão nunca fica cortado */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-border bg-card flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 safe-area-pb">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPaymentModalOpen(false)}
            className="h-11 sm:h-12 px-4 sm:px-6 shrink-0"
          >
            Voltar (Esc)
          </Button>
              <Button
                type="button"
                onClick={handleConfirmar}
                disabled={!podeConfirmar || submitting}
                className="h-12 sm:h-14 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base tracking-wide gap-2 shadow-lg disabled:opacity-60"
              >
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span className="truncate">
                  {submitting ? 'FINALIZANDO…' : 'CONFIRMAR E IMPRIMIR'}
                </span>
                {!submitting && (
                  <span className="hidden sm:inline font-mono text-xs opacity-80">(ENTER)</span>
                )}
              </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
