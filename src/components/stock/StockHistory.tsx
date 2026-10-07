import { useMemo, useState } from 'react'
import type { MovimentacaoEstoque, Produto, TipoMovimentacaoEstoque } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { History } from 'lucide-react'
import { TIPO_MOVIMENTACAO_LABEL } from './stockLabels'
import { StockHistoryRow } from './StockHistoryRow'
import { StockEntryActions, type PedidoAcaoLancamento } from './StockEntryActions'

interface StockHistoryProps {
  movimentos: MovimentacaoEstoque[]
  produtos: Produto[]
  produtoFiltroId: string
  onProdutoFiltroChange: (produtoId: string) => void
}

export function StockHistory({
  movimentos,
  produtos,
  produtoFiltroId,
  onProdutoFiltroChange,
}: StockHistoryProps) {
  const [tipoFiltro, setTipoFiltro] = useState<TipoMovimentacaoEstoque | 'todos'>('todos')
  const [limite, setLimite] = useState(TAMANHO_PAGINA)
  const [pedido, setPedido] = useState<PedidoAcaoLancamento | null>(null)

  const filtrados = useMemo(
    () =>
      movimentos.filter(
        (m) =>
          (produtoFiltroId === 'todos' || m.produto_id === produtoFiltroId) &&
          (tipoFiltro === 'todos' || m.tipo === tipoFiltro),
      ),
    [movimentos, produtoFiltroId, tipoFiltro],
  )

  const produtosOrdenados = useMemo(
    () =>
      produtos
        .filter((p) => !p.is_combo)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [produtos],
  )

  const visiveis = filtrados.slice(0, limite)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col text-[11px] font-bold uppercase text-muted-foreground gap-1">
          Produto
          <select
            value={produtoFiltroId}
            onChange={(e) => {
              onProdutoFiltroChange(e.target.value)
              setLimite(TAMANHO_PAGINA)
            }}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal normal-case text-foreground min-w-[12rem]"
          >
            <option value="todos">Todos os produtos</option>
            {produtosOrdenados.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-[11px] font-bold uppercase text-muted-foreground gap-1">
          Tipo
          <select
            value={tipoFiltro}
            onChange={(e) => {
              setTipoFiltro(e.target.value as TipoMovimentacaoEstoque | 'todos')
              setLimite(TAMANHO_PAGINA)
            }}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm font-normal normal-case text-foreground"
          >
            <option value="todos">Todos os tipos</option>
            {(Object.keys(TIPO_MOVIMENTACAO_LABEL) as TipoMovimentacaoEstoque[]).map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPO_MOVIMENTACAO_LABEL[tipo]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visiveis.length === 0 ? (
        <div className="flex flex-col items-center text-center p-10 text-muted-foreground">
          <History className="w-12 h-12 mb-3 stroke-[1.5]" />
          <p className="font-bold text-foreground">Nenhuma movimentação registrada</p>
          <p className="text-xs mt-1">Vendas, cancelamentos, entradas e contagens aparecem aqui.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="bg-muted/60 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="text-left font-bold px-3 py-2.5">Data / hora</th>
                <th scope="col" className="text-left font-bold px-3 py-2.5">Produto</th>
                <th scope="col" className="text-left font-bold px-3 py-2.5">Tipo</th>
                <th scope="col" className="text-right font-bold px-3 py-2.5">Qtd</th>
                <th scope="col" className="text-right font-bold px-3 py-2.5 hidden md:table-cell">Saldo</th>
                <th scope="col" className="text-left font-bold px-3 py-2.5 hidden lg:table-cell">Motivo</th>
                <th scope="col" className="text-right font-bold px-3 py-2.5">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visiveis.map((m) => (
                <StockHistoryRow
                  key={m.id}
                  movimento={m}
                  onAcao={(acao, movimento) => setPedido({ acao, movimento })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtrados.length > limite && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={() => setLimite((l) => l + TAMANHO_PAGINA)}>
            Mostrar mais ({filtrados.length - limite} restantes)
          </Button>
        </div>
      )}

      <StockEntryActions pedido={pedido} produtos={produtos} onFinalizar={() => setPedido(null)} />
    </div>
  )
}

const TAMANHO_PAGINA = 100
