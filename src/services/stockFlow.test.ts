import { beforeEach, describe, expect, it } from 'vitest'
import { LocalDatabaseService } from './db'
import { StockService } from './stockService'
import { PRODUTO_BASE as base, prepararBancoDeTeste, produto, vender } from '@/test/stockFixtures'
import type { Ficha } from '@/types/pos'

beforeEach(prepararBancoDeTeste)

describe('fluxo de estoque na venda', () => {
  it('baixa o estoque e registra a saída no histórico', () => {
    const { venda } = vender([['cerveja', 3]])
    expect(produto('cerveja').estoque_atual).toBe(7)

    const [mov] = StockService.getMovimentacoes('cerveja')
    expect(mov).toMatchObject({
      tipo: 'venda',
      quantidade: -3,
      estoque_anterior: 10,
      estoque_posterior: 7,
      venda_id: venda.id,
    })
  })

  it('combo baixa os componentes e emite uma ficha por componente', () => {
    const { fichas } = vender([['combo', 2]])
    expect(produto('cerveja').estoque_atual).toBe(6)
    expect(fichas).toHaveLength(6)
  })

  it('venda sem estoque é recusada sem gravar nada', () => {
    expect(() => vender([['cerveja', 4], ['combo', 4]])).toThrow(/Estoque insuficiente/)
    expect(produto('cerveja').estoque_atual).toBe(10)
    expect(LocalDatabaseService.getVendas()).toHaveLength(0)
    expect(StockService.getMovimentacoes()).toHaveLength(0)
  })

  it('cancelamento devolve o estoque e registra o estorno', () => {
    const { venda } = vender([['cerveja', 2], ['combo', 1]])
    expect(produto('cerveja').estoque_atual).toBe(6)

    expect(LocalDatabaseService.cancelarVenda(venda.id, 'teste')).toBe(true)
    expect(produto('cerveja').estoque_atual).toBe(10)
    expect(StockService.getMovimentacoes('cerveja')[0]).toMatchObject({ tipo: 'estorno', quantidade: 4 })

    expect(LocalDatabaseService.cancelarVenda(venda.id, 'de novo')).toBe(false)
    expect(produto('cerveja').estoque_atual).toBe(10)
  })
})

describe('movimentação manual', () => {
  it('entrada soma, perda subtrai e contagem define o saldo', () => {
    LocalDatabaseService.movimentarEstoque({ produtoId: 'cerveja', tipo: 'entrada', quantidade: 24 })
    expect(produto('cerveja').estoque_atual).toBe(34)
    LocalDatabaseService.movimentarEstoque({ produtoId: 'cerveja', tipo: 'perda', quantidade: 4 })
    expect(produto('cerveja').estoque_atual).toBe(30)
    LocalDatabaseService.movimentarEstoque({ produtoId: 'cerveja', tipo: 'ajuste', quantidade: 28 })
    expect(produto('cerveja').estoque_atual).toBe(28)

    const tipos = StockService.getMovimentacoes('cerveja').map((m) => m.tipo)
    expect(tipos).toEqual(['ajuste', 'perda', 'entrada'])
  })

  it('recusa perda maior que o saldo, quantidade inválida e combos', () => {
    expect(() =>
      LocalDatabaseService.movimentarEstoque({ produtoId: 'cerveja', tipo: 'perda', quantidade: 11 }),
    ).toThrow(/maior que o saldo/)
    expect(() =>
      LocalDatabaseService.movimentarEstoque({ produtoId: 'cerveja', tipo: 'entrada', quantidade: 0 }),
    ).toThrow()
    expect(() =>
      LocalDatabaseService.movimentarEstoque({ produtoId: 'combo', tipo: 'entrada', quantidade: 5 }),
    ).toThrow(/Combos/)
    expect(produto('cerveja').estoque_atual).toBe(10)
  })

  it('contagem em produto sem controle ativa o controle', () => {
    LocalDatabaseService.movimentarEstoque({ produtoId: 'espetinho', tipo: 'ajuste', quantidade: 50 })
    expect(produto('espetinho')).toMatchObject({ controla_estoque: true, estoque_atual: 50 })
  })
})

describe('cadastro de produto', () => {
  it('alterar o saldo no formulário vira ajuste; editar só o nome não mexe no histórico', () => {
    LocalDatabaseService.updateProduto('cerveja', { nome: 'Cerveja Lata', estoque_atual: 10 })
    expect(StockService.getMovimentacoes()).toHaveLength(0)

    LocalDatabaseService.updateProduto('cerveja', { estoque_atual: 15 })
    expect(produto('cerveja').estoque_atual).toBe(15)
    expect(StockService.getMovimentacoes('cerveja')[0]).toMatchObject({ tipo: 'ajuste', quantidade: 5 })
  })

  it('novo produto com saldo inicial registra entrada', () => {
    const novo = LocalDatabaseService.addProduto({
      ...base,
      nome: 'Água',
      codigo_rapido: '09',
      controla_estoque: true,
      estoque_atual: 48,
    })
    expect(novo.estoque_atual).toBe(48)
    expect(StockService.getMovimentacoes(novo.id)[0]).toMatchObject({ tipo: 'entrada', quantidade: 48 })
  })
})

describe('backup e novo evento', () => {
  it('backup leva o histórico de estoque e a restauração o devolve', () => {
    vender([['cerveja', 1]])
    const backup = LocalDatabaseService.exportBackup()
    expect(backup.movimentacoes_estoque).toHaveLength(1)

    StockService.substituirTudo([])
    expect(LocalDatabaseService.importBackup(backup)).toBe(true)
    expect(StockService.getMovimentacoes()).toHaveLength(1)
  })

  it('zerar banco completo apaga tudo, mantém configurações e não recria produtos de exemplo', () => {
    LocalDatabaseService.saveConfig({ ...LocalDatabaseService.getConfig(), nome_evento: 'Festa X' })
    LocalDatabaseService.abrirCaixa('Op', 50)
    vender([['cerveja', 2]])

    LocalDatabaseService.zerarBancoCompleto()
    LocalDatabaseService.initDatabase()

    expect(LocalDatabaseService.getProdutos()).toHaveLength(0)
    expect(LocalDatabaseService.getCategorias()).toHaveLength(0)
    expect(LocalDatabaseService.getVendas()).toHaveLength(0)
    expect(LocalDatabaseService.getFichas()).toHaveLength(0)
    expect(LocalDatabaseService.getCaixas()).toHaveLength(0)
    expect(LocalDatabaseService.getCaixaAtivo()).toBeNull()
    expect(StockService.getMovimentacoes()).toHaveLength(0)
    expect(LocalDatabaseService.getConfig().nome_evento).toBe('Festa X')
  })

  it('restaurar backup sem caixas não cria caixa de exemplo e ignora fichas sem número', () => {
    const backup = {
      ...LocalDatabaseService.exportBackup(),
      caixas: undefined,
      fichas: [{ id: 'f1', sequencial: 7 }, { id: 'f2' }] as unknown as Ficha[],
      vendas: [],
    }
    expect(LocalDatabaseService.importBackup(backup)).toBe(true)
    expect(LocalDatabaseService.getCaixas()).toEqual([])
    expect(LocalDatabaseService.getCaixaAtivo()).toBeNull()
    vender([['espetinho', 1]])
    expect(LocalDatabaseService.getFichas()[0].sequencial).toBe(8)
  })

  it('rejeita backup com estrutura inválida sem alterar nada', () => {
    const antes = LocalDatabaseService.getProdutos()
    expect(LocalDatabaseService.isBackupValido({ configuracoes: {}, categorias: [], produtos: 'x' })).toBe(false)
    expect(LocalDatabaseService.isBackupValido({ configuracoes: {}, categorias: [], produtos: [], vendas: {} })).toBe(false)
    expect(LocalDatabaseService.importBackup({ produtos: [] } as never)).toBe(false)
    expect(LocalDatabaseService.getProdutos()).toEqual(antes)
  })

  it('zerar para novo evento mantém saldos e limpa o histórico', () => {
    vender([['cerveja', 2]])
    LocalDatabaseService.resetVendasParaNovoEvento('Op', 50)
    expect(produto('cerveja').estoque_atual).toBe(8)
    expect(StockService.getMovimentacoes()).toHaveLength(0)
  })
})
