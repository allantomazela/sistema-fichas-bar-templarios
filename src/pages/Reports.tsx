import React, { useState, useMemo } from 'react'
import { usePos } from '@/context/PosContext'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  XCircle,
  Ban,
  Layers,
  BarChart3,
} from 'lucide-react'
import { AdminPasswordModal } from '@/components/modals/AdminPasswordModal'
import { toast } from 'sonner'

export default function Reports() {
  const { vendas, fichas, caixas, cancelarVenda, setPreviewFichas } = usePos()
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'concluida' | 'cancelada'>('todas')
  const [filtroForma, setFiltroForma] = useState<string>('todas')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal de Cancelamento de Venda com Senha de Admin
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false)
  const [vendaToCancel, setVendaToCancel] = useState<string | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  // Estatísticas Gerais
  const stats = useMemo(() => {
    const validVendas = vendas.filter((v) => v.status === 'concluida')
    const totalFaturado = validVendas.reduce((acc, v) => acc + v.total, 0)
    const totalItensVendidos = validVendas.reduce(
      (acc, v) => acc + v.itens.reduce((sub, it) => sub + it.quantidade, 0),
      0,
    )

    let totalDinheiro = 0
    let totalPix = 0
    let totalDebito = 0
    let totalCredito = 0
    let totalCortesia = 0

    validVendas.forEach((v) => {
      if (v.forma_pagamento === 'dinheiro') totalDinheiro += v.total
      if (v.forma_pagamento === 'pix') totalPix += v.total
      if (v.forma_pagamento === 'debito') totalDebito += v.total
      if (v.forma_pagamento === 'credito') totalCredito += v.total
      if (v.forma_pagamento === 'cortesia') totalCortesia += v.total
    })

    // Fichas estatísticas
    const totalFichasEmitidas = fichas.filter((f) => f.status !== 'cancelada').length
    const totalFichasBaixadas = fichas.filter((f) => f.status === 'utilizada').length

    return {
      totalVendasCount: validVendas.length,
      totalFaturado,
      totalItensVendidos,
      totalDinheiro,
      totalPix,
      totalDebito,
      totalCredito,
      totalCortesia,
      totalFichasEmitidas,
      totalFichasBaixadas,
    }
  }, [vendas, fichas])

  // Ranking dos produtos mais vendidos
  const rankingProdutos = useMemo(() => {
    const validVendas = vendas.filter((v) => v.status === 'concluida')
    const map = new Map<string, { nome: string; quantidade: number; faturamento: number }>()

    validVendas.forEach((v) => {
      v.itens.forEach((it) => {
        const current = map.get(it.produto_id) || {
          nome: it.produto_nome,
          quantidade: 0,
          faturamento: 0,
        }
        current.quantidade += it.quantidade
        current.faturamento += it.total_item
        map.set(it.produto_id, current)
      })
    })

    return Array.from(map.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 8)
  }, [vendas])

  // Vendas filtradas
  const filteredVendas = useMemo(() => {
    return vendas.filter((v) => {
      const matchStatus = filtroStatus === 'todas' || v.status === filtroStatus
      const matchForma = filtroForma === 'todas' || v.forma_pagamento === filtroForma
      const q = searchQuery.toLowerCase()
      const matchQuery =
        !q ||
        String(v.sequencial_venda).includes(q) ||
        v.operador.toLowerCase().includes(q) ||
        v.itens.some((it) => it.produto_nome.toLowerCase().includes(q))

      return matchStatus && matchForma && matchQuery
    })
  }, [vendas, filtroStatus, filtroForma, searchQuery])

  // Exportar Relatório para CSV
  const handleExportCSV = () => {
    const headers = [
      'Sequencial Venda',
      'Data/Hora',
      'Operador',
      'Forma Pagamento',
      'Subtotal',
      'Desconto',
      'Total',
      'Troco',
      'Status',
      'Itens',
    ]

    const rows = vendas.map((v) => [
      `#${v.sequencial_venda}`,
      `"${formatDateTime(v.data_hora)}"`,
      `"${v.operador}"`,
      `"${v.forma_pagamento.toUpperCase()}"`,
      v.subtotal.toFixed(2),
      v.desconto.toFixed(2),
      v.total.toFixed(2),
      v.troco.toFixed(2),
      `"${v.status.toUpperCase()}"`,
      `"${v.itens.map((it) => `${it.quantidade}x ${it.produto_nome}`).join('; ')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio_vendas_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Relatório CSV exportado com sucesso!')
  }

  const handlePromptCancelVenda = (vendaId: string) => {
    setVendaToCancel(vendaId)
    setMotivoCancelamento('')
    setIsAdminModalOpen(true)
  }

  const handleConfirmCancelVenda = () => {
    if (!vendaToCancel) return
    cancelarVenda(vendaToCancel, motivoCancelamento || 'Cancelado pela gerência')
    setVendaToCancel(null)
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-primary" />
            Relatórios de Vendas & Desempenho
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe o faturamento consolidado por forma de pagamento, produtos mais vendidos e
            histórico completo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="font-bold gap-2 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* CARDS DE RESUMO TOTALIZADORES */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase">Faturamento Total</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.totalFaturado)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {stats.totalVendasCount} vendas registradas
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase">Dinheiro em Caixa</span>
            <span className="text-[10px] font-mono font-bold bg-muted px-1.5 py-0.5 rounded">
              GAVETA
            </span>
          </div>
          <div className="text-2xl font-black font-mono text-foreground">
            {formatCurrency(stats.totalDinheiro)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {stats.totalFaturado > 0
              ? `${Math.round((stats.totalDinheiro / stats.totalFaturado) * 100)}% do faturamento`
              : '0%'}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase">PIX & Cartões</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {formatCurrency(stats.totalPix + stats.totalDebito + stats.totalCredito)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            PIX: {formatCurrency(stats.totalPix)} • Cartão:{' '}
            {formatCurrency(stats.totalDebito + stats.totalCredito)}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-bold uppercase">Fichas de Consumo</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {stats.totalFichasBaixadas} / {stats.totalFichasEmitidas}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {stats.totalFichasEmitidas > 0
              ? `${Math.round((stats.totalFichasBaixadas / stats.totalFichasEmitidas) * 100)}% fichas entregues`
              : 'Nenhuma ficha'}
          </div>
        </div>
      </div>

      {/* RANKING DE PRODUTOS MAIS VENDIDOS */}
      <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Top Produtos Mais Vendidos
          </h3>
          <span className="text-xs text-muted-foreground">Volume de fichas emitidas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {rankingProdutos.map((p, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-border bg-background flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                  #{idx + 1}
                </span>
                <span className="font-mono font-black text-sm text-foreground">
                  {p.quantidade} un
                </span>
              </div>
              <div className="mt-2">
                <div className="font-bold text-xs truncate text-foreground">{p.nome}</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {formatCurrency(p.faturamento)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HISTÓRICO COMPLETO DE VENDAS */}
      <div className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Histórico de Transações ({filteredVendas.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="Buscar venda / produto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-48 text-xs"
            />

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="h-9 px-2 rounded-md border border-input bg-background text-xs font-medium"
            >
              <option value="todas">Todos Status</option>
              <option value="concluida">Concluídas</option>
              <option value="cancelada">Canceladas</option>
            </select>

            <select
              value={filtroForma}
              onChange={(e) => setFiltroForma(e.target.value)}
              className="h-9 px-2 rounded-md border border-input bg-background text-xs font-medium"
            >
              <option value="todas">Todas as Formas</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="cortesia">Cortesia</option>
            </select>
          </div>
        </div>

        <div className="border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="p-3">Venda</th>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Operador</th>
                <th className="p-3">Itens Comprados</th>
                <th className="p-3">Pagamento</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredVendas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    Nenhuma venda encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredVendas.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/20">
                    <td className="p-3 font-mono font-bold text-foreground">
                      #{String(v.sequencial_venda).padStart(4, '0')}
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {formatDateTime(v.data_hora)}
                    </td>
                    <td className="p-3 text-muted-foreground">{v.operador}</td>
                    <td className="p-3 max-w-[220px]">
                      <div className="truncate font-semibold text-foreground">
                        {v.itens.map((it) => `${it.quantidade}x ${it.produto_nome}`).join(', ')}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {v.forma_pagamento}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono font-bold text-sm">{formatCurrency(v.total)}</td>
                    <td className="p-3">
                      {v.status === 'concluida' ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] uppercase font-bold">
                          Concluída
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                          Cancelada
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {v.status === 'concluida' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const fchs = fichas.filter((f) => f.venda_id === v.id)
                              setPreviewFichas(fchs)
                            }}
                            className="h-8 px-2 text-primary hover:bg-primary/10 gap-1 font-semibold"
                            title="Reimprimir fichas desta venda"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Fichas
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePromptCancelVenda(v.id)}
                            className="h-8 px-2 text-destructive hover:bg-destructive/10 gap-1 font-semibold"
                            title="Cancelar venda e invalidar fichas"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Cancelar
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE AUTORIZAÇÃO DE CANCELAMENTO */}
      <AdminPasswordModal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false)
          setVendaToCancel(null)
        }}
        onSuccess={handleConfirmCancelVenda}
        title="Cancelar Venda e Fichas"
        description="Esta operação cancelará permanentemente a venda e tornará as fichas associadas inválidas para entrega."
      />
    </div>
  )
}
