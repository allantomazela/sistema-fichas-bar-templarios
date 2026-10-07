import { beforeEach, describe, expect, it } from 'vitest'
import { LocalDatabaseService } from './db'
import { StockLedger } from './stockLedger'
import { StockService } from './stockService'
import { prepararBancoDeTeste, produto, vender } from '@/test/stockFixtures'

beforeEach(prepararBancoDeTeste)

function lancar(tipo: 'entrada' | 'perda' | 'ajuste', quantidade: number) {
  LocalDatabaseService.movimentarEstoque({ produtoId: 'cerveja', tipo, quantidade })
  return StockService.getMovimentacoes('cerveja')[0]
}

describe('corrigir lançamento', () => {
  it('entrada digitada errada: corrige e o saldo acompanha a diferença', () => {
    const mov = lancar('entrada', 240)
    expect(produto('cerveja').estoque_atual).toBe(250)

    const corrigido = StockLedger.editar({ movimentoId: mov.id, informado: 24, operador: 'Ana' })
    expect(produto('cerveja').estoque_atual).toBe(34)
    expect(corrigido).toMatchObject({ quantidade: 24, estoque_anterior: 10, estoque_posterior: 34, editado_por: 'Ana' })
    expect(corrigido.editado_em).toBeTruthy()
  })

  it('preserva as vendas feitas depois do lançamento', () => {
    const mov = lancar('entrada', 20)
    vender([['cerveja', 5]])
    expect(produto('cerveja').estoque_atual).toBe(25)

    StockLedger.editar({ movimentoId: mov.id, informado: 12 })
    expect(produto('cerveja').estoque_atual).toBe(17)
  })

  it('perda e contagem recalculam pelo valor informado', () => {
    const perda = lancar('perda', 2)
    StockLedger.editar({ movimentoId: perda.id, informado: 3 })
    expect(produto('cerveja').estoque_atual).toBe(7)

    const contagem = lancar('ajuste', 5)
    StockLedger.editar({ movimentoId: contagem.id, informado: 6 })
    expect(produto('cerveja').estoque_atual).toBe(6)
  })

  it('recusa correção que deixaria o saldo negativo', () => {
    const mov = lancar('entrada', 20)
    vender([['cerveja', 28]])
    expect(() => StockLedger.editar({ movimentoId: mov.id, informado: 5 })).toThrow(/negativo/)
    expect(produto('cerveja').estoque_atual).toBe(2)
    expect(StockService.getMovimentacoes('cerveja')[1].quantidade).toBe(20)
  })

  it('lançamentos de venda não podem ser corrigidos', () => {
    vender([['cerveja', 1]])
    const venda = StockService.getMovimentacoes('cerveja')[0]
    expect(() => StockLedger.editar({ movimentoId: venda.id, informado: 3 })).toThrow(/Relatórios/)
    expect(() => StockLedger.excluir(venda.id)).toThrow(/Relatórios/)
  })
})

describe('excluir lançamento', () => {
  it('desfaz o efeito no saldo e remove do histórico', () => {
    const entrada = lancar('entrada', 12)
    const perda = lancar('perda', 2)
    expect(produto('cerveja').estoque_atual).toBe(20)

    StockLedger.excluir(perda.id)
    expect(produto('cerveja').estoque_atual).toBe(22)
    StockLedger.excluir(entrada.id)
    expect(produto('cerveja').estoque_atual).toBe(10)
    expect(StockService.getMovimentacoes('cerveja')).toHaveLength(0)
  })

  it('recusa se o saldo ficaria negativo', () => {
    const mov = lancar('entrada', 10)
    vender([['cerveja', 15]])
    expect(() => StockLedger.excluir(mov.id)).toThrow(/negativo/)
    expect(StockService.getMovimentacoes('cerveja')).toHaveLength(2)
  })

  it('produto já excluído: remove só o registro', () => {
    const mov = lancar('entrada', 5)
    LocalDatabaseService.saveProdutos(LocalDatabaseService.getProdutos().filter((p) => p.id !== 'cerveja'))
    StockLedger.excluir(mov.id)
    expect(StockService.getMovimentacoes()).toHaveLength(0)
  })
})

describe('excluir produto', () => {
  it('bloqueia produto que faz parte de combo', () => {
    expect(() => LocalDatabaseService.deleteProduto('cerveja')).toThrow(/combo "Combo"/)
    expect(produto('cerveja')).toBeDefined()
  })

  it('exclui produto livre e o combo em si', () => {
    LocalDatabaseService.deleteProduto('combo')
    LocalDatabaseService.deleteProduto('cerveja')
    expect(LocalDatabaseService.getProdutos().map((p) => p.id)).toEqual(['espetinho'])
  })
})
