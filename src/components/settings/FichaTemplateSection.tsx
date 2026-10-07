import { Eye, Sliders } from 'lucide-react'
import { ThermalFichaTicket } from '@/components/common/ThermalTickets'
import type { Configuracoes, Ficha } from '@/types/pos'

interface FichaTemplateSectionProps {
  config: Configuracoes
  operador?: string
  caixaId?: string
}

/** Modelo fixo da ficha térmica com pré-visualização ao vivo das configurações em edição. */
export function FichaTemplateSection({ config, operador, caixaId }: FichaTemplateSectionProps) {
  const fichaExemplo: Ficha = {
    ...FICHA_EXEMPLO,
    data_emissao: new Date().toISOString(),
    operador: operador ?? 'Operador 01',
    caixa_id: caixaId ?? 'cx-01',
  }

  return (
    <div className="p-6 rounded-2xl border-2 border-primary/20 bg-card shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            Modelo das Fichas Térmicas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cada unidade vendida gera 1 ficha. Layout: nome do evento, data/hora e item em destaque
            para troca no bar — impressão direta, sem QR Code.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs px-2.5 py-1 rounded bg-muted">
          <span>Bobina:</span>
          <strong className="text-foreground">{config.largura_bobina}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 p-4 rounded-xl border border-border bg-muted/10 space-y-2 text-sm">
          <p className="font-bold text-foreground">Conteúdo impresso</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
            <li>
              <strong className="text-foreground">Nome do evento</strong> no topo
            </li>
            <li>
              <strong className="text-foreground">Data e hora</strong> da emissão
            </li>
            <li>
              <strong className="text-foreground">Item</strong> em caixa preta, bem legível para o bar
            </li>
          </ul>
          <p className="text-[11px] text-muted-foreground pt-2 border-t border-border">
            Após a venda, as fichas vão direto para a impressora (10 unidades = 10 fichas).
          </p>
        </div>

        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-primary" />
            Pré-visualização
          </div>
          <div className="p-4 rounded-2xl bg-slate-200 dark:bg-slate-900 border border-border flex justify-center w-full overflow-hidden shadow-inner">
            <ThermalFichaTicket ficha={fichaExemplo} config={config} />
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Simulação para bobina {config.largura_bobina}.
          </p>
        </div>
      </div>
    </div>
  )
}

const FICHA_EXEMPLO: Omit<Ficha, 'data_emissao' | 'operador' | 'caixa_id'> = {
  id: 'fch-demo-preview',
  venda_id: 'vnd-demo',
  sequencial_venda: 142,
  produto_id: 'prod-demo',
  produto_nome: 'Cerveja Lata 350ml',
  categoria_nome: 'Cervejas',
  preco: 12.0,
  codigo_validacao: '9A7B-3C2F',
  hash_seguranca: 'AUTH:9A7B-3C2F:SEQ:00142:PID:prod-dem',
  sequencial: 345,
  status: 'emitida',
}
