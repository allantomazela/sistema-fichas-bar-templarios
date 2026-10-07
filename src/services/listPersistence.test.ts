import { describe, expect, it } from 'vitest'
import { criarSqliteEmMemoria } from '@/test/sqliteEmMemoria'
import { executarPedido, pedirGravacao, prepararListas } from './listPersistence'
import { lerArrayEmCache } from './parsedCache'
import { STORAGE_KEYS } from './storageKeys'

const VENDAS = STORAGE_KEYS.VENDAS

describe('listas no boot e na gravação', () => {
  it('migra a lista guardada como texto único para linhas e libera o texto antigo', async () => {
    const { db } = criarSqliteEmMemoria()
    const textos = new Map([
      [VENDAS, '[{"id":"v1"},{"id":"v2"}]'],
      [STORAGE_KEYS.CONFIG, '{"tema":"dark"}'],
    ])
    expect(await prepararListas(db, textos)).toEqual([VENDAS])

    // Novo boot: lê das linhas e entrega o mesmo texto (e os itens prontos no cache)
    const reaberto = new Map([[STORAGE_KEYS.CONFIG, '{"tema":"dark"}']])
    expect(await prepararListas(db, reaberto)).toEqual([])
    const texto = reaberto.get(VENDAS)!
    expect(texto).toBe('[{"id":"v1"},{"id":"v2"}]')
    expect(lerArrayEmCache(VENDAS, texto)).toEqual([{ id: 'v1' }, { id: 'v2' }])
  })

  it('texto antigo corrompido não é migrado (o kvStore acusa ao ler)', async () => {
    const { db } = criarSqliteEmMemoria()
    const textos = new Map([[VENDAS, '[{"id":']])
    expect(await prepararListas(db, textos)).toEqual([])
    expect(textos.get(VENDAS)).toBe('[{"id":')
  })

  it('pedidos repetidos viram uma gravação só; após erro, a próxima reescreve a lista inteira', async () => {
    const { db, comandos } = criarSqliteEmMemoria({ falharNoComando: 2 })
    await prepararListas(db, new Map())

    pedirGravacao(VENDAS, [{ id: 'a' }])
    pedirGravacao(VENDAS, [{ id: 'b' }, { id: 'a' }])
    await expect(executarPedido(db, VENDAS)).rejects.toThrow('energia caiu')
    expect(await executarPedido(db, VENDAS)).toBe(false)

    const final = [{ id: 'c' }, { id: 'b' }, { id: 'a' }]
    pedirGravacao(VENDAS, final)
    comandos.length = 0
    await executarPedido(db, VENDAS)
    // Reescrita completa: as 3 linhas numa faixa nova, depois a linha de controle, depois a limpeza
    expect(comandos).toHaveLength(3)
    expect(comandos[0]).toContain('($7, $8, $9)')

    const reaberto = new Map<string, string>()
    await prepararListas(db, reaberto)
    expect(JSON.parse(reaberto.get(VENDAS)!)).toEqual(final)
  })
})
