import { useMemo, useState } from 'react'
import { usePos } from '@/context/PosContext'
import type { Produto } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { computeResumoEstoque, computeSaidasPorVendas, type StatusEstoque } from '@/lib/stock'
import { buildLinhasEstoque, linhasEstoqueToCsv } from '@/lib/stockReport'
import { saveTextFile } from '@/services/backupFiles'
import { StockSummaryCards } from '@/components/stock/StockSummaryCards'
import { StockTable } from '@/components/stock/StockTable'
import { StockHistory } from '@/components/stock/StockHistory'
import {
  StockMovementDialog,
  type TipoMovimentacaoManual,
} from '@/components/stock/StockMovementDialog'
import { StockEditDialog } from '@/components/stock/StockEditDialog'
import { FiltroSelect } from '@/components/stock/FiltroSelect'
import { DeleteProductDialog } from '@/components/products/DeleteProductDialog'
import { STATUS_ESTOQUE_LABEL } from '@/components/stock/stockLabels'
import { Boxes, Download, History, Search } from 'lucide-react'
import { toast } from 'sonner'

type Aba = 'posicao' | 'historico'
type Periodo = 'caixa' | 'evento'
type FiltroStatus = StatusEstoque | 'todos' | 'alertas' | 'controlados'

export default function StockControl() {
  const { produtos, categorias, vendas, caixaAtivo, movimentacoesEstoque } = usePos()

  const [aba, setAba] = useState<Aba>('posicao')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('controlados')
  const [periodo, setPeriodo] = useState<Periodo>(caixaAtivo ? 'caixa' : 'evento')
  const [produtoHistoricoId, setProdutoHistoricoId] = useState('todos')
  const [movimento, setMovimento] = useState<{ produtoId: string; tipo: TipoMovimentacaoManual } | null>(
    null,
  )
  const [editarId, setEditarId] = useState<string | null>(null)
  const [produtoExcluir, setProdutoExcluir] = useState<Produto | null>(null)

  const periodoCaixaId = periodo === 'caixa' ? caixaAtivo?.id : undefined
  const periodoLabel = periodoCaixaId ? 'no caixa atual' : 'no evento (todas as vendas)'

  const saidas = useMemo(
    () => computeSaidasPorVendas(vendas, periodoCaixaId),
    [vendas, periodoCaixaId],
  )
  const linhas = useMemo(
    () => buildLinhasEstoque(produtos, categorias, saidas),
    [produtos, categorias, saidas],
  )
  const resumo = useMemo(() => computeResumoEstoque(produtos), [produtos])
  const totalVendido = useMemo(() => linhas.reduce((acc, l) => acc + l.vendido, 0), [linhas])

  const linhasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return linhas.filter((l) => {
      if (!passaFiltroStatus(l.status, filtroStatus)) return false
      if (!q) return true
      return (
        l.produto.nome.toLowerCase().includes(q) ||
        l.produto.codigo_rapido.toLowerCase().includes(q) ||
        l.categoriaNome.toLowerCase().includes(q)
      )
    })
  }, [linhas, busca, filtroStatus])

  const produtoMovimento = movimento ? produtos.find((p) => p.id === movimento.produtoId) || null : null
  const produtoEditar = editarId ? produtos.find((p) => p.id === editarId) || null : null

  const handleVerHistorico = (produto: Produto) => {
    setProdutoHistoricoId(produto.id)
    setAba('historico')
  }

  const handleExportarCsv = async () => {
    try {
      const ok = await saveTextFile({
        content: linhasEstoqueToCsv(linhasFiltradas, STATUS_ESTOQUE_LABEL),
        defaultName: `estoque_${new Date().toISOString().slice(0, 10)}.csv`,
        filterName: 'Planilha CSV',
        extensions: ['csv'],
        title: 'Exportar posição de estoque',
        mimeType: 'text/csv;charset=utf-8',
      })
      if (ok) toast.success('Posição de estoque exportada.')
    } catch (err) {
      console.error('Falha ao exportar estoque', err)
      toast.error('Não foi possível salvar o arquivo. Tente outra pasta.')
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-3 sm:p-5 space-y-4 max-w-7xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Boxes className="w-6 h-6 text-primary" />
              Controle de Estoque
            </h1>
            <p className="text-xs text-muted-foreground">
              Baixa automática a cada venda · estorno ao cancelar · entradas, contagens e perdas
              ficam no histórico.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant={aba === 'posicao' ? 'default' : 'outline'} onClick={() => setAba('posicao')}>
              <Boxes className="w-4 h-4 mr-1.5" /> Posição atual
            </Button>
            <Button type="button" variant={aba === 'historico' ? 'default' : 'outline'} onClick={() => setAba('historico')}>
              <History className="w-4 h-4 mr-1.5" /> Histórico
            </Button>
          </div>
        </header>

        <StockSummaryCards resumo={resumo} totalVendido={totalVendido} periodoLabel={periodoLabel} />

        {aba === 'posicao' ? (
          <section className="space-y-3" aria-label="Posição de estoque">
            <div className="flex flex-wrap items-end gap-2">
              <div className="relative flex-1 min-w-[14rem]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, código ou categoria…"
                  className="pl-9 h-10"
                  aria-label="Buscar produto no estoque"
                />
              </div>
              <FiltroSelect
                label="Mostrar"
                value={filtroStatus}
                onChange={(v) => setFiltroStatus(v as FiltroStatus)}
                options={FILTRO_STATUS_OPTIONS}
              />
              <FiltroSelect
                label="Vendido"
                value={periodo}
                onChange={(v) => setPeriodo(v as Periodo)}
                options={[
                  { value: 'caixa', label: caixaAtivo ? 'No caixa atual' : 'Caixa atual (fechado)' },
                  { value: 'evento', label: 'No evento inteiro' },
                ]}
              />
              <Button type="button" variant="outline" className="h-10" onClick={() => void handleExportarCsv()}>
                <Download className="w-4 h-4 mr-1.5" /> Exportar CSV
              </Button>
            </div>

            <StockTable
              linhas={linhasFiltradas}
              acoes={{
                onMovimentar: (produto, tipo) => setMovimento({ produtoId: produto.id, tipo }),
                onVerHistorico: handleVerHistorico,
                onEditar: (produto) => setEditarId(produto.id),
                onExcluir: setProdutoExcluir,
              }}
            />
          </section>
        ) : (
          <section aria-label="Histórico de movimentações de estoque">
            <StockHistory
              movimentos={movimentacoesEstoque}
              produtos={produtos}
              produtoFiltroId={produtoHistoricoId}
              onProdutoFiltroChange={setProdutoHistoricoId}
            />
          </section>
        )}
      </div>

      <StockMovementDialog
        produto={produtoMovimento}
        tipoInicial={movimento?.tipo ?? 'entrada'}
        open={!!movimento && !!produtoMovimento}
        onOpenChange={(open) => !open && setMovimento(null)}
      />

      <StockEditDialog
        produto={produtoEditar}
        open={!!produtoEditar}
        onOpenChange={(open) => !open && setEditarId(null)}
      />

      <DeleteProductDialog produto={produtoExcluir} onClose={() => setProdutoExcluir(null)} />
    </div>
  )
}

function passaFiltroStatus(status: StatusEstoque, filtro: FiltroStatus): boolean {
  if (filtro === 'todos') return true
  if (filtro === 'controlados') return status !== 'sem_controle'
  if (filtro === 'alertas') return status === 'baixo' || status === 'esgotado'
  return status === filtro
}

const FILTRO_STATUS_OPTIONS = [
  { value: 'controlados', label: 'Com controle de estoque' },
  { value: 'alertas', label: 'Só alertas (baixo + esgotado)' },
  { value: 'esgotado', label: 'Esgotados' },
  { value: 'baixo', label: 'Estoque baixo' },
  { value: 'ok', label: 'Estoque OK' },
  { value: 'sem_controle', label: 'Sem controle' },
  { value: 'todos', label: 'Todos os produtos' },
]
