import { vi } from 'vitest'
import type { CartItem, Produto } from '@/types/pos'
import { LocalDatabaseService } from '@/services/db'

/** localStorage em memória: o serviço usa esse backend fora do app nativo. */
export function stubLocalStorage() {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (data.has(k) ? (data.get(k) as string) : null),
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size
    },
  })
}

export const PRODUTO_BASE = { categoria_id: 'cat-1', preco: 10, emite_ficha_individual: true, ativo: true }

const CATALOGO: Produto[] = [
  { ...PRODUTO_BASE, id: 'cerveja', nome: 'Cerveja', codigo_rapido: '01', controla_estoque: true, estoque_atual: 10, estoque_minimo: 3 },
  { ...PRODUTO_BASE, id: 'espetinho', nome: 'Espetinho', codigo_rapido: '02' },
  {
    ...PRODUTO_BASE,
    id: 'combo',
    nome: 'Combo',
    codigo_rapido: '03',
    is_combo: true,
    itens_combo: [
      { produto_id: 'cerveja', quantidade: 2 },
      { produto_id: 'espetinho', quantidade: 1 },
    ],
  },
]

/** Banco limpo com Cerveja (10 un, controlada), Espetinho (sem controle) e um Combo dos dois. */
export function prepararBancoDeTeste() {
  stubLocalStorage()
  LocalDatabaseService.initDatabase()
  LocalDatabaseService.saveProdutos(structuredClone(CATALOGO))
}

export function produto(id: string): Produto {
  return LocalDatabaseService.getProdutos().find((p) => p.id === id) as Produto
}

export function vender(itens: [string, number][]) {
  const carrinho: CartItem[] = itens.map(([id, quantidade]) => ({
    produto: produto(id),
    quantidade,
    preco_unitario: 10,
  }))
  return LocalDatabaseService.finalizarVenda({
    caixaId: 'cx-teste',
    operador: 'Teste',
    itens: carrinho,
    formaPagamento: 'dinheiro',
    valorRecebido: 100,
    troco: 0,
  })
}
