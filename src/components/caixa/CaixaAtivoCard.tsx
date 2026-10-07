import { Printer, Unlock, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import type { Caixa } from '@/types/pos'
import type { ResumoCaixa } from './caixaParts'

interface CaixaAtivoCardProps {
  caixa: Caixa
  resumo: ResumoCaixa
  onImprimirParcial: () => void
}

/** Turno em andamento: operador, horário e o que deve haver na gaveta agora. */
export function CaixaAtivoCard({ caixa, resumo, onImprimirParcial }: CaixaAtivoCardProps) {
  const totais = [
    { rotulo: 'Fundo Inicial', valor: formatCurrency(resumo.saldoInicial), cor: 'neutro' },
    { rotulo: 'Vendas em Dinheiro', valor: formatCurrency(resumo.totalDinheiro), cor: 'emerald' },
    { rotulo: 'Vendas PIX', valor: formatCurrency(resumo.totalPix), cor: 'teal' },
    {
      rotulo: 'Cartões (Déb/Créd)',
      valor: formatCurrency(resumo.totalDebito + resumo.totalCredito),
      cor: 'blue',
    },
    {
      rotulo: 'Suprimentos / Sangrias',
      valor: `+${formatCurrency(resumo.totalSuprimento)} / -${formatCurrency(resumo.totalSangria)}`,
      cor: 'amber',
    },
  ] as const

  return (
    <section className="p-6 rounded-2xl border-2 border-primary/40 bg-card shadow-sm space-y-6">
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
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>
                Operador: <strong>{caixa.operador}</strong>
              </span>
              <span>•</span>
              <span>Aberto em: {formatDateTime(caixa.abertura)}</span>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={onImprimirParcial} className="gap-1.5 font-bold">
          <Printer className="w-4 h-4" />
          Imprimir Parcial do Caixa
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {totais.map((t) => (
          <div key={t.rotulo} className={cn('p-4 rounded-xl border', CORES[t.cor].caixa)}>
            <span className={cn('text-[11px] font-bold uppercase block', CORES[t.cor].rotulo)}>{t.rotulo}</span>
            <span className={cn('text-lg font-black font-mono mt-1 block', CORES[t.cor].valor)}>{t.valor}</span>
          </div>
        ))}
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
          <span className="text-[11px] font-extrabold text-primary uppercase block">Saldo na Gaveta (Dinheiro)</span>
          <span className="text-xl font-black font-mono text-primary mt-1 block">
            {formatCurrency(resumo.saldoDinheiroEsperado)}
          </span>
        </div>
      </div>
    </section>
  )
}

const CORES = {
  neutro: { caixa: 'bg-muted/40 border-border', rotulo: 'text-muted-foreground', valor: 'text-foreground' },
  emerald: {
    caixa: 'bg-emerald-500/10 border-emerald-500/20',
    rotulo: 'text-emerald-600 dark:text-emerald-400',
    valor: 'text-emerald-700 dark:text-emerald-300',
  },
  teal: {
    caixa: 'bg-teal-500/10 border-teal-500/20',
    rotulo: 'text-teal-600 dark:text-teal-400',
    valor: 'text-teal-700 dark:text-teal-300',
  },
  blue: {
    caixa: 'bg-blue-500/10 border-blue-500/20',
    rotulo: 'text-blue-600 dark:text-blue-400',
    valor: 'text-blue-700 dark:text-blue-300',
  },
  amber: {
    caixa: 'bg-amber-500/10 border-amber-500/20',
    rotulo: 'text-amber-600 dark:text-amber-400',
    valor: 'text-amber-700 dark:text-amber-300',
  },
} as const
