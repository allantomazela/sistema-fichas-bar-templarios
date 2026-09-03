import React, { useMemo } from 'react'
import { usePos } from '@/context/PosContext'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Ticket,
  Clock,
  Layers,
  CreditCard,
  Banknote,
  QrCode,
  Gift,
  ArrowUpRight,
  Flame,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export default function Dashboard() {
  const { vendas, fichas, produtos, config, caixaAtivo } = usePos()

  // Processamento consolidado das métricas locais
  const metrics = useMemo(() => {
    const validVendas = vendas.filter((v) => v.status === 'concluida')
    const totalVendasCount = validVendas.length
    const valorTotalVendas = validVendas.reduce((acc, v) => acc + v.total, 0)
    const ticketMedio = totalVendasCount > 0 ? valorTotalVendas / totalVendasCount : 0

    // Resumo por Forma de Pagamento
    let dinheiro = 0
    let pix = 0
    let debito = 0
    let credito = 0
    let cortesia = 0

    let countDinheiro = 0
    let countPix = 0
    let countDebito = 0
    let countCredito = 0
    let countCortesia = 0

    validVendas.forEach((v) => {
      switch (v.forma_pagamento) {
        case 'dinheiro':
          dinheiro += v.total
          countDinheiro++
          break
        case 'pix':
          pix += v.total
          countPix++
          break
        case 'debito':
          debito += v.total
          countDebito++
          break
        case 'credito':
          credito += v.total
          countCredito++
          break
        case 'cortesia':
          cortesia += v.total
          countCortesia++
          break
      }
    })

    // Fichas: emitidas vs validadas (baixadas) vs restantes (estoque na mão do cliente)
    const fichasValidas = fichas.filter((f) => f.status !== 'cancelada')
    const totalFichasEmitidas = fichasValidas.length
    const totalFichasValidadas = fichasValidas.filter((f) => f.status === 'utilizada').length
    const fichasRestantes = Math.max(0, totalFichasEmitidas - totalFichasValidadas)
    const percentualConsumido =
      totalFichasEmitidas > 0 ? Math.round((totalFichasValidadas / totalFichasEmitidas) * 100) : 0

    // Vendas e Faturamento por Hora
    const hourlyMap = new Map<
      number,
      { hora: number; label: string; valor: number; quantidade: number; fichas: number }
    >()

    // Inicializar horas comuns do evento (ex: das 10h às 23h)
    for (let h = 10; h <= 23; h++) {
      hourlyMap.set(h, {
        hora: h,
        label: `${String(h).padStart(2, '0')}:00`,
        valor: 0,
        quantidade: 0,
        fichas: 0,
      })
    }

    validVendas.forEach((v) => {
      const d = new Date(v.data_hora)
      const h = d.getHours()
      if (!hourlyMap.has(h)) {
        hourlyMap.set(h, {
          hora: h,
          label: `${String(h).padStart(2, '0')}:00`,
          valor: 0,
          quantidade: 0,
          fichas: 0,
        })
      }
      const item = hourlyMap.get(h)!
      item.valor += v.total
      item.quantidade += 1
      item.fichas += v.itens.reduce((acc, it) => acc + it.quantidade, 0)
    })

    const hourlyData = Array.from(hourlyMap.values()).sort((a, b) => a.hora - b.hora)

    // Horários de Pico de Movimento (ordenar por valor e quantidade)
    const picosDeMovimento = [...hourlyData]
      .filter((h) => h.quantidade > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 3)

    // Dados de Pagamento para Gráfico em Donut
    const paymentData = [
      { name: 'Dinheiro', valor: dinheiro, qtd: countDinheiro, color: '#10B981' },
      { name: 'PIX', valor: pix, qtd: countPix, color: '#06B6D4' },
      { name: 'Débito', valor: debito, qtd: countDebito, color: '#3B82F6' },
      { name: 'Crédito', valor: credito, qtd: countCredito, color: '#8B5CF6' },
      { name: 'Cortesia', valor: cortesia, qtd: countCortesia, color: '#F59E0B' },
    ].filter((p) => p.valor > 0 || p.qtd > 0)

    // Top produtos por fichas emitidas
    const productStatsMap = new Map<
      string,
      { nome: string; emitidas: number; validadas: number; faturamento: number }
    >()

    fichasValidas.forEach((f) => {
      const cur = productStatsMap.get(f.produto_id) || {
        nome: f.produto_nome.replace(' (Combo)', ''),
        emitidas: 0,
        validadas: 0,
        faturamento: 0,
      }
      cur.emitidas += 1
      if (f.status === 'utilizada') cur.validadas += 1
      cur.faturamento += f.preco
      productStatsMap.set(f.produto_id, cur)
    })

    const topFichasPorProduto = Array.from(productStatsMap.values())
      .sort((a, b) => b.emitidas - a.emitidas)
      .slice(0, 6)

    return {
      totalVendasCount,
      valorTotalVendas,
      ticketMedio,
      dinheiro,
      pix,
      debito,
      credito,
      cortesia,
      countDinheiro,
      countPix,
      countDebito,
      countCredito,
      countCortesia,
      totalFichasEmitidas,
      totalFichasValidadas,
      fichasRestantes,
      percentualConsumido,
      hourlyData,
      picosDeMovimento,
      paymentData,
      topFichasPorProduto,
    }
  }, [vendas, fichas])

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">
                Dashboard & Resumo do Evento
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visão executiva em tempo real: vendas, fluxo por hora, picos de movimento e controle
                de estoque de fichas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="px-3 py-1 font-mono text-xs flex items-center gap-1.5 bg-card border-border"
          >
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{config.nome_evento || 'Evento Atual'}</span>
          </Badge>
          {caixaAtivo && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[11px] font-bold">
              Caixa Ativo: {caixaAtivo.operador}
            </Badge>
          )}
        </div>
      </div>

      {/* CARDS TOTALIZADORES PRINCIPAIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL DE VENDAS */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Faturamento Total</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(metrics.valorTotalVendas)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{metrics.totalVendasCount} pedidos concluídos</span>
              <span>•</span>
              <span>Ticket Médio: {formatCurrency(metrics.ticketMedio)}</span>
            </div>
          </div>
        </div>

        {/* FICHAS EMITIDAS */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Fichas Emitidas</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400">
              {metrics.totalFichasEmitidas}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Fichas geradas nas compras do PDV
            </div>
          </div>
        </div>

        {/* FICHAS VALIDADAS / BAIXADAS */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">
              Fichas Baixadas (Consumo)
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black font-mono text-purple-600 dark:text-purple-400">
              {metrics.totalFichasValidadas}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="font-bold text-foreground">{metrics.percentualConsumido}%</span>
              <span>do total entregue no balcão</span>
            </div>
          </div>
        </div>

        {/* ESTOQUE RESTANTE DE FICHAS */}
        <div className="p-5 rounded-2xl border border-border bg-card shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">
              Fichas Restantes (Em Aberto)
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
              {metrics.fichasRestantes}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Fichas pagas pendentes de retirada na entrega
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO DO MEIO: GRÁFICO DE VENDAS POR HORA & PICOS DE MOVIMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRÁFICO: VENDAS POR HORA */}
        <div className="lg:col-span-8 p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Vendas & Movimento por Hora
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Acompanhe o faturamento e volume de pedidos hora a hora durante o evento.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                <span>Faturamento (R$)</span>
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {metrics.totalVendasCount === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center">
                <Clock className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-sm font-semibold">Ainda não há vendas registradas no sistema.</p>
                <p className="text-xs mt-1">
                  O gráfico será atualizado automaticamente a cada venda efetuada.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={metrics.hourlyData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `R$ ${val}`} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
                    labelFormatter={(label) => `Horário: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="valor" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* PICOS DE MOVIMENTO & HORÁRIOS DE MAIOR FLUXO */}
        <div className="lg:col-span-4 p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Horários de Pico de Movimento
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faixas de horário com maior concentração de público e vendas.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {metrics.picosDeMovimento.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhum pico detectado ainda.
                </p>
              ) : (
                metrics.picosDeMovimento.map((pico, idx) => (
                  <div
                    key={pico.hora}
                    className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white ${
                          idx === 0
                            ? 'bg-amber-500 shadow-md shadow-amber-500/20'
                            : idx === 1
                              ? 'bg-slate-600'
                              : 'bg-slate-500'
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>
                            {pico.label} às {String(pico.hora + 1).padStart(2, '0')}:00
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pico.quantidade} vendas • {pico.fichas} fichas emitidas
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono font-bold text-sm text-foreground">
                      {formatCurrency(pico.valor)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dica operacional */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
            <span className="font-bold block mb-0.5">Dica para a Operação:</span>
            Reforce o atendimento no balcão e nos caixas 15 minutos antes dos horários de pico para
            evitar filas.
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: RESUMO POR FORMA DE PAGAMENTO & STATUS DE ESTOQUE DE FICHAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RESUMO POR FORMA DE PAGAMENTO */}
        <div className="lg:col-span-6 p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Resumo por Forma de Pagamento
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Consolidação detalhada dos recebimentos do evento.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* DINHEIRO */}
            <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">Dinheiro (Espécie)</div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.countDinheiro} pagamento(s)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-base text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(metrics.dinheiro)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {metrics.valorTotalVendas > 0
                    ? `${Math.round((metrics.dinheiro / metrics.valorTotalVendas) * 100)}% do total`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* PIX */}
            <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">PIX Instantâneo</div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.countPix} pagamento(s)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-base text-cyan-600 dark:text-cyan-400">
                  {formatCurrency(metrics.pix)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {metrics.valorTotalVendas > 0
                    ? `${Math.round((metrics.pix / metrics.valorTotalVendas) * 100)}% do total`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* DÉBITO */}
            <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">Cartão de Débito</div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.countDebito} pagamento(s)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-base text-blue-600 dark:text-blue-400">
                  {formatCurrency(metrics.debito)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {metrics.valorTotalVendas > 0
                    ? `${Math.round((metrics.debito / metrics.valorTotalVendas) * 100)}% do total`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* CRÉDITO */}
            <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">Cartão de Crédito</div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.countCredito} pagamento(s)
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-base text-purple-600 dark:text-purple-400">
                  {formatCurrency(metrics.credito)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {metrics.valorTotalVendas > 0
                    ? `${Math.round((metrics.credito / metrics.valorTotalVendas) * 100)}% do total`
                    : '0%'}
                </div>
              </div>
            </div>

            {/* CORTESIA */}
            {metrics.cortesia > 0 && (
              <div className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-foreground">Cortesia / Isenção</div>
                    <div className="text-xs text-muted-foreground">
                      {metrics.countCortesia} liberação(ões)
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono font-black text-base text-amber-600">
                  {formatCurrency(metrics.cortesia)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTROLE DE FICHAS: EMISSÃO VS BAIXA VS RESTANTE */}
        <div className="lg:col-span-6 p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Estoque de Fichas: Emitidas vs Baixadas vs Restantes
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Controle de consumo em tempo real para evitar desperdício e monitorar a produção da
              cozinha/bar.
            </p>
          </div>

          {/* BARRA DE PROGRESSO DO CONSUMO */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Progresso de Entrega Geral</span>
              <span className="font-mono text-primary font-black">
                {metrics.totalFichasValidadas} de {metrics.totalFichasEmitidas} fichas (
                {metrics.percentualConsumido}%)
              </span>
            </div>
            <Progress value={metrics.percentualConsumido} className="h-3" />
            <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
              <span>Baixadas (Entregues): {metrics.totalFichasValidadas}</span>
              <span>Restantes na mão do público: {metrics.fichasRestantes}</span>
            </div>
          </div>

          {/* LISTA DE PRODUTOS MAIS EMITIDOS COM STATUS DE BAIXA */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase text-muted-foreground block">
              Consumo por Produto Destaque
            </span>
            {metrics.topFichasPorProduto.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhuma ficha emitida ainda.
              </p>
            ) : (
              metrics.topFichasPorProduto.map((item, idx) => {
                const perc =
                  item.emitidas > 0 ? Math.round((item.validadas / item.emitidas) * 100) : 0
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border bg-background space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground truncate">{item.nome}</span>
                      <span className="font-mono text-muted-foreground">
                        <strong className="text-foreground">{item.validadas}</strong> /{' '}
                        {item.emitidas} entregues
                      </span>
                    </div>
                    <Progress value={perc} className="h-1.5" />
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
