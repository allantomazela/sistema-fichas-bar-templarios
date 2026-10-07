import { FileText, History, Receipt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { Caixa, MovimentacaoCaixa } from '@/types/pos'
import { BadgeMovimentacao, PainelCaixa } from './caixaParts'

/** Todas as sangrias e suprimentos registrados no evento. */
export function HistoricoMovimentacoes({ movimentacoes }: { movimentacoes: MovimentacaoCaixa[] }) {
  return (
    <PainelCaixa
      icone={<History className="w-5 h-5 text-muted-foreground" />}
      titulo="Histórico de Sangrias & Suprimentos"
      contador={`${movimentacoes.length} registros`}
    >
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
                  <BadgeMovimentacao tipo={mov.tipo} />
                </td>
                <td className="p-2 font-mono font-bold">{formatCurrency(mov.valor)}</td>
                <td className="p-2 text-muted-foreground max-w-[150px] truncate" title={mov.motivo}>
                  {mov.motivo}
                </td>
                <td className="p-2 text-muted-foreground">{mov.operador}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PainelCaixa>
  )
}

/** Turnos do evento com acesso ao comprovante de cada um. */
export function HistoricoTurnos({ caixas, onVerComprovante }: {
  caixas: Caixa[]
  onVerComprovante: (caixa: Caixa) => void
}) {
  return (
    <PainelCaixa
      icone={<FileText className="w-5 h-5 text-muted-foreground" />}
      titulo="Histórico de Caixas & Turnos"
      contador={`${caixas.length} turnos`}
    >
      {caixas.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8">Nenhum turno registrado.</p>
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
                    onClick={() => onVerComprovante(c)}
                    className="h-8 px-2 text-primary hover:bg-primary/10 gap-1 font-semibold"
                    aria-label={`Ver comprovante do turno de ${c.operador}`}
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
    </PainelCaixa>
  )
}
