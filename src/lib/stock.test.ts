import { describe, expect, it } from 'vitest'
import type { CartItem, Produto, Venda } from '@/types/pos'
import {
  computeConsumoEstoque,
  computeResumoEstoque,
  computeSaidasPorVendas,
  getDisponibilidade,
  getStatusEstoque,
  validarEstoqueCarrinho,
} from './stock'

function produto(overrides: Partial<Produto> & { id: string }): Produto {
  return {
    categoria_id: 'cat-1',
    nome: overrides.id,
    preco: 10,
    codigo_rapido: overrides.id,
    emite_ficha_individual: true,
    ativo: true,
    ...overrides,
  }
}

const cerveja = produto({ id: 'cerveja', controla_estoque: true, estoque_atual: 10, estoque_minimo: 3 })
const refri = produto({ id: 'refri', controla_estoque: true, estoque_atual: 2, estoque_minimo: 5 })
const espetinho = produto({ id: 'espetinho' })
const combo = produto({
  id: 'combo',
  is_combo: true,
  itens_combo: [
    { produto_id: 'cerveja', quantidade: 2 },
    { produto_id: 'espetinho', quantidade: 1 },
  ],
})
const todos = [cerveja, refri, espetinho, combo]
const porId = new Map(todos.map((p) => [p.id, p]))

function item(p: Produto, quantidade: number): CartItem {
  return { produto: p, quantidade, preco_unitario: p.preco }
}

describe('computeConsumoEstoque', () => {
  it('soma produtos simples e desmembra combos nos componentes', () => {
    const consumo = computeConsumoEstoque([
      { produto_id: 'cerveja', quantidade: 1 },
      { produto_id: 'combo', quantidade: 3, is_combo: true, itens_combo: combo.itens_combo },
    ])
    expect(consumo.get('cerveja')).toBe(7)
    expect(consumo.get('espetinho')).toBe(3)
    expect(consumo.has('combo')).toBe(false)
  })

  it('combo sem componentes consome o próprio produto', () => {
    const consumo = computeConsumoEstoque([
      { produto_id: 'combo-vazio', quantidade: 2, is_combo: true, itens_combo: [] },
    ])
    expect(consumo.get('combo-vazio')).toBe(2)
  })
})

describe('getStatusEstoque / getDisponibilidade', () => {
  it('classifica ok, baixo, esgotado e sem controle', () => {
    expect(getStatusEstoque(cerveja)).toBe('ok')
    expect(getStatusEstoque(refri)).toBe('baixo')
    expect(getStatusEstoque({ ...cerveja, estoque_atual: 0 })).toBe('esgotado')
    expect(getStatusEstoque(espetinho)).toBe('sem_controle')
  })

  it('combo fica limitado pelo componente com menor saldo proporcional', () => {
    const disp = getDisponibilidade(combo, porId)
    expect(disp.disponivel).toBe(5)
    expect(disp.limitadoPor).toBe('cerveja')
    expect(disp.status).toBe('ok')
  })

  it('combo fica esgotado quando falta um componente', () => {
    const semCerveja = new Map(porId)
    semCerveja.set('cerveja', { ...cerveja, estoque_atual: 1 })
    expect(getDisponibilidade(combo, semCerveja).status).toBe('esgotado')
  })
})

describe('validarEstoqueCarrinho', () => {
  it('aceita carrinho dentro do estoque', () => {
    expect(validarEstoqueCarrinho([item(cerveja, 4), item(combo, 3)], todos).ok).toBe(true)
  })

  it('bloqueia quando produto avulso + combo passam do saldo', () => {
    const result = validarEstoqueCarrinho([item(cerveja, 5), item(combo, 3)], todos)
    expect(result.ok).toBe(false)
    expect(result.motivo).toContain('cerveja')
  })

  it('usa o catálogo atualizado, não o snapshot guardado no carrinho', () => {
    const snapshotAntigo = { ...refri, estoque_atual: 100 }
    expect(validarEstoqueCarrinho([item(snapshotAntigo, 3)], todos).ok).toBe(false)
  })

  it('ignora produtos sem controle de estoque', () => {
    expect(validarEstoqueCarrinho([item(espetinho, 999)], todos).ok).toBe(true)
  })
})

describe('relatórios', () => {
  const venda = (status: Venda['status'], caixa_id: string, quantidade: number): Venda => ({
    id: `v-${Math.random()}`,
    sequencial_venda: 1,
    caixa_id,
    operador: 'op',
    data_hora: new Date().toISOString(),
    total: 0,
    subtotal: 0,
    desconto: 0,
    forma_pagamento: 'dinheiro',
    valor_recebido: 0,
    troco: 0,
    status,
    itens: [
      {
        id: 'i',
        venda_id: 'v',
        produto_id: 'cerveja',
        produto_nome: 'cerveja',
        quantidade,
        preco_unitario: 10,
        total_item: 10 * quantidade,
        emite_ficha_individual: true,
      },
    ],
  })

  it('conta só vendas concluídas e respeita o filtro de caixa', () => {
    const vendas = [venda('concluida', 'cx1', 2), venda('cancelada', 'cx1', 5), venda('concluida', 'cx2', 3)]
    expect(computeSaidasPorVendas(vendas).get('cerveja')).toBe(5)
    expect(computeSaidasPorVendas(vendas, 'cx1').get('cerveja')).toBe(2)
  })

  it('resume controlados, baixos e esgotados', () => {
    const resumo = computeResumoEstoque([...todos, { ...cerveja, id: 'zerada', estoque_atual: 0 }])
    expect(resumo).toEqual({ controlados: 3, esgotados: 1, baixos: 1, unidadesEmEstoque: 12 })
  })
})
