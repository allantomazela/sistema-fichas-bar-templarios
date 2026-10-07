import { beforeEach, describe, expect, it } from 'vitest'
import { stubLocalStorage } from '@/test/stockFixtures'
import { safeGetArray, safeSet } from './kvStore'
import { serializarArray } from './parsedCache'

const CHAVE = 'templarios_pdv_vendas'

describe('cache de arrays e serialização incremental', () => {
  beforeEach(() => stubLocalStorage())

  it('serializarArray produz exatamente o mesmo texto que JSON.stringify', () => {
    const itens = [{ a: 1, b: 'x"y', c: [1, { d: null }] }, 2, 'texto', null, { vazio: undefined }]
    expect(serializarArray(itens)).toBe(JSON.stringify(itens))
    expect(serializarArray([])).toBe('[]')
  })

  it('reaproveita os itens já lidos e devolve sempre um array novo', () => {
    safeSet(CHAVE, [{ id: 'v1' }, { id: 'v2' }])
    const primeira = safeGetArray<{ id: string }>(CHAVE)
    const segunda = safeGetArray<{ id: string }>(CHAVE)
    expect(segunda).not.toBe(primeira)
    expect(segunda[0]).toBe(primeira[0])
    primeira.push({ id: 'v3' })
    expect(safeGetArray(CHAVE)).toHaveLength(2)
  })

  it('relê do armazenamento quando o texto gravado muda por fora do cache', () => {
    safeSet(CHAVE, [{ id: 'v1' }])
    localStorage.setItem(CHAVE, JSON.stringify([{ id: 'externo' }]))
    expect(safeGetArray<{ id: string }>(CHAVE)[0].id).toBe('externo')
  })

  it('congela os itens em teste para flagrar alteração no lugar', () => {
    safeSet(CHAVE, [{ id: 'v1', status: 'concluida' }])
    const [venda] = safeGetArray<{ id: string; status: string }>(CHAVE)
    expect(() => {
      venda.status = 'cancelada'
    }).toThrow(TypeError)
  })

  it('grava o mesmo conteúdo que a serialização tradicional após várias alterações', () => {
    safeSet(CHAVE, [{ id: 'v1' }])
    const atual = safeGetArray<{ id: string; total?: number }>(CHAVE)
    const proximo = [{ id: 'v0', total: 5 }, ...atual.map((v) => ({ ...v, total: 1 }))]
    safeSet(CHAVE, proximo)
    expect(localStorage.getItem(CHAVE)).toBe(JSON.stringify(proximo))
  })
})
