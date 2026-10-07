import { beforeEach, describe, expect, it } from 'vitest'
import { LocalDatabaseService } from './db'
import { FichaLoteService } from './fichaLoteService'
import { StockService } from './stockService'
import { calcularPrestacao, formatNumeroFicha } from '@/lib/fichaLote'
import { prepararBancoDeTeste, produto } from '@/test/stockFixtures'

beforeEach(prepararBancoDeTeste)

function criarLote(itens: [string, number][] = [['cerveja', 6], ['espetinho', 4]]) {
  return FichaLoteService.criar({
    responsavel: 'João',
    motivo: 'Ambulante',
    itens: itens.map(([produtoId, quantidade]) => ({ produtoId, quantidade })),
    operador: 'Admin',
  })
}

describe('criar lote', () => {
  it('gera fichas numeradas do lote, reserva estoque e não mexe no caixa', () => {
    const lote = criarLote()
    expect(lote.numero).toBe(1)
    expect(lote.fichas).toHaveLength(10)
    expect(formatNumeroFicha(lote.fichas[0])).toBe('L01-0001')
    expect(formatNumeroFicha(lote.fichas[9])).toBe('L01-0010')

    expect(produto('cerveja').estoque_atual).toBe(4)
    expect(StockService.getMovimentacoes('cerveja')[0]).toMatchObject({ tipo: 'lote', quantidade: -6 })
    expect(LocalDatabaseService.getVendas()).toHaveLength(0)
    expect(LocalDatabaseService.getFichas()).toHaveLength(0)
    expect(criarLote([['espetinho', 1]]).numero).toBe(2)
  })

  it('recusa estoque insuficiente, combo, quantidade inválida e sem responsável', () => {
    expect(() => criarLote([['cerveja', 11]])).toThrow(/Estoque insuficiente/)
    expect(() => criarLote([['combo', 1]])).toThrow(/combo/)
    expect(() => criarLote([['cerveja', 0]])).toThrow(/inteiros/)
    expect(() =>
      FichaLoteService.criar({ responsavel: ' ', itens: [{ produtoId: 'cerveja', quantidade: 1 }], operador: 'A' }),
    ).toThrow(/responsável/)
    expect(produto('cerveja').estoque_atual).toBe(10)
    expect(FichaLoteService.getLotes()).toHaveLength(0)
  })
})

describe('prestar contas', () => {
  it('devolvidas voltam ao estoque e as demais viram venda no caixa aberto', () => {
    const caixa = LocalDatabaseService.abrirCaixa('Maria', 100)
    const lote = criarLote()

    const { lote: fechado, venda } = FichaLoteService.prestarContas({
      loteId: lote.id,
      devolvidas: { cerveja: 2, espetinho: 4 },
      formaPagamento: 'pix',
      operador: 'Maria',
    })

    expect(produto('cerveja').estoque_atual).toBe(6)
    expect(venda).toMatchObject({ caixa_id: caixa.id, total: 40, forma_pagamento: 'pix', lote_numero: 1 })
    expect(venda?.itens).toEqual([expect.objectContaining({ produto_id: 'cerveja', quantidade: 4 })])
    expect(fechado).toMatchObject({ status: 'prestado', total_recebido: 40 })
    expect(LocalDatabaseService.getResumoCaixa(caixa.id).totalPix).toBe(40)
    expect(StockService.getMovimentacoes('cerveja').filter((m) => m.tipo === 'venda')).toHaveLength(0)
  })

  it('todas devolvidas: encerra sem venda', () => {
    LocalDatabaseService.abrirCaixa('Maria', 0)
    const lote = criarLote([['cerveja', 3]])
    const { venda } = FichaLoteService.prestarContas({
      loteId: lote.id,
      devolvidas: { cerveja: 3 },
      formaPagamento: 'dinheiro',
      operador: 'Maria',
    })
    expect(venda).toBeNull()
    expect(produto('cerveja').estoque_atual).toBe(10)
  })

  it('exige caixa aberto, devolução válida e lote ainda aberto', () => {
    const lote = criarLote()
    const params = { loteId: lote.id, devolvidas: {}, formaPagamento: 'dinheiro' as const, operador: 'M' }
    expect(() => FichaLoteService.prestarContas(params)).toThrow(/Abra o caixa/)

    LocalDatabaseService.abrirCaixa('M', 0)
    expect(() => FichaLoteService.prestarContas({ ...params, devolvidas: { cerveja: 7 } })).toThrow(/entre 0 e 6/)

    FichaLoteService.prestarContas(params)
    expect(() => FichaLoteService.prestarContas(params)).toThrow(/encerrado/)
  })

  it('a venda do lote não pode ser cancelada em Relatórios', () => {
    LocalDatabaseService.abrirCaixa('M', 0)
    const lote = criarLote([['cerveja', 2]])
    const { venda } = FichaLoteService.prestarContas({
      loteId: lote.id,
      devolvidas: {},
      formaPagamento: 'dinheiro',
      operador: 'M',
    })
    expect(() => LocalDatabaseService.cancelarVenda(venda!.id, 'x')).toThrow(/lote/)
  })
})

describe('cancelar lote e novo evento', () => {
  it('cancelar devolve todo o estoque e invalida as fichas', () => {
    const lote = criarLote()
    const cancelado = FichaLoteService.cancelar(lote.id, 'impresso errado', 'Admin')
    expect(produto('cerveja').estoque_atual).toBe(10)
    expect(cancelado.status).toBe('cancelado')
    expect(cancelado.fichas.every((f) => f.status === 'cancelada')).toBe(true)
  })

  it('novo evento é bloqueado com lote aberto e limpa os lotes encerrados', () => {
    const lote = criarLote()
    expect(() => LocalDatabaseService.resetVendasParaNovoEvento('Op', 0)).toThrow(/lote/)
    FichaLoteService.cancelar(lote.id, '', 'Admin')
    LocalDatabaseService.resetVendasParaNovoEvento('Op', 0)
    expect(FichaLoteService.getLotes()).toHaveLength(0)
  })
})

describe('calcularPrestacao', () => {
  it('soma vendidas e valor; aponta devolução fora do intervalo', () => {
    const itens = [{ produto_id: 'a', produto_nome: 'A', preco_unitario: 5, quantidade: 10 }]
    expect(calcularPrestacao(itens, { a: 3 })).toMatchObject({ totalVendidas: 7, valorAReceber: 35 })
    expect(calcularPrestacao(itens, { a: 11 }).erro).toMatch(/entre 0 e 10/)
    expect(calcularPrestacao(itens, { a: -1 }).erro).toBeTruthy()
  })
})
