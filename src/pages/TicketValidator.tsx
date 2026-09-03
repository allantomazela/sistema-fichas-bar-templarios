import React, { useState, useRef, useEffect } from 'react'
import { usePos } from '@/context/PosContext'
import { Ficha } from '@/types/pos'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck,
  QrCode,
  CheckCircle2,
  AlertOctagon,
  Clock,
  User,
  History,
  Scan,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

export default function TicketValidator() {
  const { validarFicha, fichas } = usePos()
  const [codigoInput, setCodigoInput] = useState('')
  const [lastValidation, setLastValidation] = useState<{
    sucesso: boolean
    mensagem: string
    ficha?: Ficha
  } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigoInput.trim()) return

    const result = validarFicha(codigoInput.trim())
    setLastValidation(result)
    setCodigoInput('')
    inputRef.current?.focus()
  }

  // Histórico recente de fichas utilizadas
  const fichasUtilizadas = fichas.filter((f) => f.status === 'utilizada').slice(0, 15)

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      {/* CABEÇALHO DO VALIDADOR */}
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-emerald-600" />
          Validador Anti-Fraude de Fichas (Balcão de Entrega)
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Faça a leitura do QR Code ou digite o código de validação / número sequencial para dar
          baixa na ficha entregue ao cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ÁREA DE ENTRADA DE CÓDIGO */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-2xl border-2 border-primary/30 bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <QrCode className="w-5 h-5" />
              <span>Validação via QR Code ou Código da Ficha</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Aponte a câmera pro QR Code ou digite o código (ex: 8B4A-12F0 ou 1)..."
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  className="h-16 text-lg md:text-xl font-mono font-bold px-4 border-2 border-primary focus-visible:ring-primary uppercase tracking-wider"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Dica: Digite o número da ficha (ex: 1) ou o código de autenticação impresso e
                  pressione Enter.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                VALIDAR E DAR BAIXA NA FICHA
              </Button>
            </form>
          </div>

          {/* CARD DE RESULTADO DA ÚLTIMA LEITURA */}
          {lastValidation && (
            <div
              className={`p-6 rounded-2xl border-2 transition-all shadow-md ${
                lastValidation.sucesso
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    lastValidation.sucesso ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {lastValidation.sucesso ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <AlertOctagon className="w-8 h-8" />
                  )}
                </div>

                <div className="flex-1">
                  <span className="text-xs uppercase font-extrabold tracking-wider block">
                    {lastValidation.sucesso
                      ? 'FICHA VÁLIDA - LIBERAR PRODUTO'
                      : 'ATENÇÃO - FICHA BLOQUEADA'}
                  </span>
                  <div className="text-lg font-black mt-0.5">{lastValidation.mensagem}</div>

                  {lastValidation.ficha && (
                    <div className="mt-4 pt-3 border-t border-black/10 dark:border-white/10 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="font-semibold">Produto:</span>
                        <span className="font-black text-base">
                          {lastValidation.ficha.produto_nome}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Ficha Sequencial:</span>
                        <span className="font-mono font-bold">
                          #{String(lastValidation.ficha.sequencial).padStart(5, '0')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Código Anti-fraude:</span>
                        <span className="font-mono font-bold bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">
                          {lastValidation.ficha.codigo_validacao}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Emitida em:</span>
                        <span>{formatDateTime(lastValidation.ficha.data_emissao)}</span>
                      </div>
                      {lastValidation.ficha.data_utilizacao && (
                        <div className="flex justify-between text-rose-700 dark:text-rose-300 font-bold">
                          <span>Baixa em:</span>
                          <span>{formatDateTime(lastValidation.ficha.data_utilizacao)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ÁREA DIREITA: HISTÓRICO DE FICHAS VALIDADAS */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                Últimas Fichas Entregues / Baixadas
              </h3>
              <Badge variant="outline" className="font-mono text-xs">
                {fichasUtilizadas.length} recentes
              </Badge>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              {fichasUtilizadas.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">
                  Nenhuma ficha foi validada ainda. Faça a leitura no balcão para iniciar o
                  controle.
                </p>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                    <tr>
                      <th className="p-2">Ficha</th>
                      <th className="p-2">Produto</th>
                      <th className="p-2">Hora Baixa</th>
                      <th className="p-2">Validador</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {fichasUtilizadas.map((f) => (
                      <tr key={f.id} className="hover:bg-muted/20">
                        <td className="p-2 font-mono font-black">
                          #{String(f.sequencial).padStart(5, '0')}
                        </td>
                        <td className="p-2 font-bold">{f.produto_nome}</td>
                        <td className="p-2 font-mono text-muted-foreground">
                          {formatDateTime(f.data_utilizacao)}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {f.operador_validacao || 'Balcão'}
                        </td>
                        <td className="p-2">
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] uppercase font-bold">
                            Entregue
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
