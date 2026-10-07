import type { FormaPagamento, Ficha, MovimentacaoCaixa, Venda } from '@/types/pos'

export type PeriodoTipo = 'evento' | 'hoje' | 'custom'

/** `inicio`/`fim` no formato do input datetime-local (YYYY-MM-DDTHH:mm, hora local). */
export interface FiltroPeriodo {
  tipo: PeriodoTipo
  inicio: string
  fim: string
}

export interface Contagem {
  valor: number
  quantidade: number
}

export interface HoraMovimento extends Contagem {
  hora: number
  label: string
  fichas: number
}

export interface ProdutoRanking {
  produtoId: string
  nome: string
  emitidas: number
  faturamento: number
}

export interface MetricasDashboard {
  totalVendasCount: number
  valorTotalVendas: number
  ticketMedio: number
  totalItensVendidos: number
  totalFichasEmitidas: number
  pagamentos: Record<FormaPagamento, Contagem>
  hourlyData: HoraMovimento[]
  picosDeMovimento: HoraMovimento[]
  topFichasPorProduto: ProdutoRanking[]
  suprimentos: Contagem
  sangrias: Contagem
  saldoLiquidoMovimentacoes: number
}

export interface DadosDoPeriodo {
  vendas: Venda[]
  fichas: Ficha[]
  movimentacoes: MovimentacaoCaixa[]
}

/** Formata uma data para o input datetime-local respeitando o fuso do computador. */
export function paraInputDataHora(data: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}T${p(data.getHours())}:${p(data.getMinutes())}`
}

/** O input datetime-local só tem minutos: "até 23:59" deve incluir 23:59:59.999. */
const FIM_DO_MINUTO_MS = 59_999

/** Intervalo [início, fim] em ms do filtro; `null` = sem filtro (evento inteiro). */
export function intervaloDoPeriodo(
  filtro: FiltroPeriodo,
  agora = new Date(),
): [number, number] | null {
  if (filtro.tipo === 'hoje') {
    const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999)
    return [inicio.getTime(), fim.getTime()]
  }
  if (filtro.tipo === 'custom') {
    const inicio = filtro.inicio ? new Date(filtro.inicio).getTime() : NaN
    const fim = filtro.fim ? new Date(filtro.fim).getTime() + FIM_DO_MINUTO_MS : NaN
    return [isNaN(inicio) ? -Infinity : inicio, isNaN(fim) ? Infinity : fim]
  }
  return null
}

export function filtrarPorPeriodo(dados: DadosDoPeriodo, filtro: FiltroPeriodo): DadosDoPeriodo {
  const intervalo = intervaloDoPeriodo(filtro)
  if (!intervalo) return dados
  const [inicio, fim] = intervalo
  const dentro = (iso: string) => {
    const t = Date.parse(iso)
    return t >= inicio && t <= fim
  }
  return {
    vendas: dados.vendas.filter((v) => dentro(v.data_hora)),
    fichas: dados.fichas.filter((f) => dentro(f.data_emissao)),
    movimentacoes: dados.movimentacoes.filter((m) => dentro(m.data_hora)),
  }
}

const HORA_INICIAL_PADRAO = 10
const HORA_FINAL_PADRAO = 23

function novaHora(hora: number): HoraMovimento {
  return { hora, label: `${String(hora).padStart(2, '0')}:00`, valor: 0, quantidade: 0, fichas: 0 }
}

function contagemVazia(): Contagem {
  return { valor: 0, quantidade: 0 }
}

function somar(contagem: Contagem, valor: number) {
  contagem.valor += valor
  contagem.quantidade += 1
}

function resumirVendas(vendas: Venda[]) {
  const pagamentos: Record<FormaPagamento, Contagem> = {
    dinheiro: contagemVazia(),
    pix: contagemVazia(),
    debito: contagemVazia(),
    credito: contagemVazia(),
    cortesia: contagemVazia(),
  }
  const porHora = new Map<number, HoraMovimento>()
  for (let h = HORA_INICIAL_PADRAO; h <= HORA_FINAL_PADRAO; h++) porHora.set(h, novaHora(h))

  let concluidas = 0
  let valorTotal = 0
  let itensVendidos = 0
  for (const venda of vendas) {
    if (venda.status !== 'concluida') continue
    concluidas += 1
    valorTotal += venda.total
    const itens = venda.itens.reduce((acc, it) => acc + it.quantidade, 0)
    itensVendidos += itens
    const pagamento = pagamentos[venda.forma_pagamento]
    if (pagamento) somar(pagamento, venda.total)

    const hora = new Date(venda.data_hora).getHours()
    if (isNaN(hora)) continue
    let faixa = porHora.get(hora)
    if (!faixa) porHora.set(hora, (faixa = novaHora(hora)))
    somar(faixa, venda.total)
    faixa.fichas += itens
  }

  const hourlyData = [...porHora.values()].sort((a, b) => a.hora - b.hora)
  const picosDeMovimento = hourlyData
    .filter((h) => h.quantidade > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 3)

  return { concluidas, valorTotal, itensVendidos, pagamentos, hourlyData, picosDeMovimento }
}

function rankingDeFichas(fichas: Ficha[]) {
  const porProduto = new Map<string, ProdutoRanking>()
  let emitidas = 0
  for (const ficha of fichas) {
    if (ficha.status === 'cancelada') continue
    emitidas += 1
    let item = porProduto.get(ficha.produto_id)
    if (!item) {
      item = {
        produtoId: ficha.produto_id,
        nome: ficha.produto_nome.replace(' (Combo)', ''),
        emitidas: 0,
        faturamento: 0,
      }
      porProduto.set(ficha.produto_id, item)
    }
    item.emitidas += 1
    item.faturamento += ficha.preco
  }
  const top = [...porProduto.values()].sort((a, b) => b.emitidas - a.emitidas).slice(0, 6)
  return { emitidas, top }
}

function resumirMovimentacoes(movimentacoes: MovimentacaoCaixa[]) {
  const sangrias = contagemVazia()
  const suprimentos = contagemVazia()
  for (const mov of movimentacoes) {
    if (mov.tipo === 'sangria') somar(sangrias, mov.valor)
    else if (mov.tipo === 'suprimento') somar(suprimentos, mov.valor)
  }
  return { sangrias, suprimentos }
}

/** Consolida os indicadores do Dashboard em uma passada por lista. */
export function calcularMetricas(dados: DadosDoPeriodo): MetricasDashboard {
  const vendas = resumirVendas(dados.vendas)
  const fichas = rankingDeFichas(dados.fichas)
  const { sangrias, suprimentos } = resumirMovimentacoes(dados.movimentacoes)
  return {
    totalVendasCount: vendas.concluidas,
    valorTotalVendas: vendas.valorTotal,
    ticketMedio: vendas.concluidas > 0 ? vendas.valorTotal / vendas.concluidas : 0,
    totalItensVendidos: vendas.itensVendidos,
    totalFichasEmitidas: fichas.emitidas,
    pagamentos: vendas.pagamentos,
    hourlyData: vendas.hourlyData,
    picosDeMovimento: vendas.picosDeMovimento,
    topFichasPorProduto: fichas.top,
    suprimentos,
    sangrias,
    saldoLiquidoMovimentacoes: suprimentos.valor - sangrias.valor,
  }
}
