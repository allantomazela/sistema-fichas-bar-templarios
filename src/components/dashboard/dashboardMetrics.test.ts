import { describe, expect, it } from 'vitest'
import type { Ficha, MovimentacaoCaixa, Venda } from '@/types/pos'
import { calcularMetricas, filtrarPorPeriodo, intervaloDoPeriodo, paraInputDataHora } from './dashboardMetrics'

function venda(parcial: Partial<Venda>): Venda {
  return {
    id: 'v',
    sequencial_venda: 1,
    caixa_id: 'c',
    operador: 'op',
    data_hora: new Date(2026, 9, 6, 20, 15).toISOString(),
    total: 10,
    subtotal: 10,
    desconto: 0,
    forma_pagamento: 'pix',
    valor_recebido: 10,
    troco: 0,
    status: 'concluida',
    itens: [],
    ...parcial,
  }
}

function ficha(produto_id: string, parcial: Partial<Ficha> = {}): Ficha {
  return {
    id: Math.random().toString(36),
    venda_id: 'v',
    sequencial_venda: 1,
    produto_id,
    produto_nome: produto_id,
    categoria_nome: 'cat',
    preco: 5,
    codigo_validacao: 'x',
    hash_seguranca: 'x',
    sequencial: 1,
    data_emissao: new Date(2026, 9, 6, 20).toISOString(),
    operador: 'op',
    caixa_id: 'c',
    status: 'valida',
    ...parcial,
  } as Ficha
}

function mov(tipo: MovimentacaoCaixa['tipo'], valor: number): MovimentacaoCaixa {
  return { id: tipo + valor, caixa_id: 'c', tipo, valor, motivo: '', operador: 'op', data_hora: new Date().toISOString() }
}

const item = (quantidade: number) => ({ quantidade }) as Venda['itens'][number]

describe('métricas do Dashboard', () => {
  it('soma só vendas concluídas, por forma de pagamento e por hora', () => {
    const m = calcularMetricas({
      vendas: [
        venda({ total: 30, forma_pagamento: 'dinheiro', itens: [item(2), item(1)] }),
        venda({ total: 10, forma_pagamento: 'pix', itens: [item(1)] }),
        venda({ total: 99, status: 'cancelada' }),
      ],
      fichas: [],
      movimentacoes: [],
    })
    expect(m.totalVendasCount).toBe(2)
    expect(m.valorTotalVendas).toBe(40)
    expect(m.ticketMedio).toBe(20)
    expect(m.totalItensVendidos).toBe(4)
    expect(m.pagamentos.dinheiro).toEqual({ valor: 30, quantidade: 1 })
    expect(m.pagamentos.pix).toEqual({ valor: 10, quantidade: 1 })
    expect(m.picosDeMovimento).toEqual([{ hora: 20, label: '20:00', valor: 40, quantidade: 2, fichas: 4 }])
    expect(m.hourlyData.map((h) => h.hora)).toEqual(Array.from({ length: 14 }, (_, i) => i + 10))
  })

  it('cria a faixa de madrugada quando há venda fora do horário padrão', () => {
    const m = calcularMetricas({
      vendas: [venda({ data_hora: new Date(2026, 9, 7, 2, 30).toISOString() })],
      fichas: [],
      movimentacoes: [],
    })
    expect(m.hourlyData[0]).toMatchObject({ hora: 2, quantidade: 1 })
  })

  it('ranking de fichas ignora canceladas e agrupa por produto', () => {
    const m = calcularMetricas({
      vendas: [],
      fichas: [ficha('a'), ficha('a'), ficha('b'), ficha('b', { status: 'cancelada' }), ficha('a', { produto_nome: 'a (Combo)' })],
      movimentacoes: [],
    })
    expect(m.totalFichasEmitidas).toBe(4)
    expect(m.topFichasPorProduto).toEqual([
      { produtoId: 'a', nome: 'a', emitidas: 3, faturamento: 15 },
      { produtoId: 'b', nome: 'b', emitidas: 1, faturamento: 5 },
    ])
  })

  it('saldo de sangrias e suprimentos', () => {
    const m = calcularMetricas({
      vendas: [],
      fichas: [],
      movimentacoes: [mov('suprimento', 100), mov('sangria', 30), mov('sangria', 20)],
    })
    expect(m.suprimentos).toEqual({ valor: 100, quantidade: 1 })
    expect(m.sangrias).toEqual({ valor: 50, quantidade: 2 })
    expect(m.saldoLiquidoMovimentacoes).toBe(50)
  })
})

describe('filtro de período', () => {
  it('"evento" devolve os mesmos arrays sem copiar', () => {
    const dados = { vendas: [venda({})], fichas: [], movimentacoes: [] }
    expect(filtrarPorPeriodo(dados, { tipo: 'evento', inicio: '', fim: '' })).toBe(dados)
  })

  it('intervalo personalizado usa hora local e inclui o último minuto inteiro', () => {
    const inicio = paraInputDataHora(new Date(2026, 9, 6, 18, 0))
    const fim = paraInputDataHora(new Date(2026, 9, 6, 23, 59))
    expect(inicio).toBe('2026-10-06T18:00')
    const dados = {
      vendas: [
        venda({ id: 'antes', data_hora: new Date(2026, 9, 6, 17, 59).toISOString() }),
        venda({ id: 'limite', data_hora: new Date(2026, 9, 6, 23, 59, 45).toISOString() }),
        venda({ id: 'depois', data_hora: new Date(2026, 9, 7, 0, 0).toISOString() }),
      ],
      fichas: [],
      movimentacoes: [],
    }
    const filtrado = filtrarPorPeriodo(dados, { tipo: 'custom', inicio, fim })
    expect(filtrado.vendas.map((v) => v.id)).toEqual(['limite'])
  })

  it('campos vazios no intervalo personalizado não limitam', () => {
    expect(intervaloDoPeriodo({ tipo: 'custom', inicio: '', fim: '' })).toEqual([-Infinity, Infinity])
  })
})
