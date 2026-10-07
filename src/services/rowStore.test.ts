import { describe, expect, it } from 'vitest'
import { criarSqliteEmMemoria as bancoReal } from '@/test/sqliteEmMemoria'
import { gravarLista, lerListas, planejarGravacao, type EstadoGravado, type ExecutorSql } from './rowStore'

const CHAVE = 'templarios_pdv_vendas'

async function lerItens(db: ExecutorSql) {
  const lida = (await lerListas(db)).get(CHAVE)
  return lida?.jsons?.map((j) => JSON.parse(j))
}

const item = (id: string, extra = {}) => ({ id, ...extra })

describe('planejarGravacao', () => {
  const a = item('a')
  const b = item('b')
  const anterior: EstadoGravado = { inicio: 0, itens: [a, b] }

  it('item novo no começo (vendas/fichas) grava só a linha nova', () => {
    const c = item('c')
    expect(planejarGravacao(anterior, [c, a, b])).toEqual({ tipo: 'parcial', inicio: -1, linhas: [[-1, c]] })
  })

  it('item novo no fim grava só a linha nova', () => {
    const c = item('c')
    expect(planejarGravacao(anterior, [a, b, c])).toEqual({ tipo: 'parcial', inicio: 0, linhas: [[2, c]] })
  })

  it('item alterado no lugar grava só ele; nada mudou = nada a gravar', () => {
    const b2 = item('b', { status: 'cancelada' })
    expect(planejarGravacao(anterior, [a, b2])).toEqual({ tipo: 'parcial', inicio: 0, linhas: [[1, b2]] })
    expect(planejarGravacao(anterior, [a, b])).toEqual({ tipo: 'nada' })
  })

  it('estado desconhecido ou alteração grande demais reescreve tudo', () => {
    expect(planejarGravacao(null, [a])).toEqual({ tipo: 'completa' })
    const muitos = Array.from({ length: 400 }, (_, i) => item(`n${i}`))
    expect(planejarGravacao(anterior, muitos)).toEqual({ tipo: 'completa' })
  })
})

describe('gravação linha a linha no SQLite', () => {
  it('mantém a lista idêntica após inclusões, alterações e remoções', async () => {
    const { db } = bancoReal()
    const v1 = item('v1')
    const v2 = item('v2')
    let estado = await gravarLista(db, CHAVE, null, [v1, v2])
    const v3 = item('v3')
    estado = await gravarLista(db, CHAVE, estado, [v3, v1, v2])
    const v1Cancelada = item('v1', { status: 'cancelada' })
    estado = await gravarLista(db, CHAVE, estado, [v3, v1Cancelada, v2])
    estado = await gravarLista(db, CHAVE, estado, [v1Cancelada, v2])
    expect(await lerItens(db)).toEqual([v1Cancelada, v2])

    await gravarLista(db, CHAVE, estado, [])
    expect(await lerItens(db)).toEqual([])
  })

  it('uma venda nova envia ao banco um único comando, com só a linha nova', async () => {
    const { db, comandos } = bancoReal()
    const antigas = Array.from({ length: 1000 }, (_, i) => item(`v${i}`))
    const estado = await gravarLista(db, CHAVE, null, antigas)
    comandos.length = 0
    await gravarLista(db, CHAVE, estado, [item('nova'), ...antigas])
    expect(comandos).toHaveLength(1)
    expect((await lerItens(db))?.[0]).toEqual({ id: 'nova' })
  })

  it('reescrita interrompida antes da linha de controle preserva a lista anterior', async () => {
    // 1ª gravação: linhas, controle e limpeza (comandos 1–3); a 2ª grava as linhas (4) e cai no controle (5)
    const { db } = bancoReal({ falharNoComando: 5 })
    const original = [item('a'), item('b')]
    await gravarLista(db, CHAVE, null, original)
    const novaLista = Array.from({ length: 5 }, (_, i) => item(`x${i}`))
    await expect(gravarLista(db, CHAVE, null, novaLista)).rejects.toThrow('energia caiu')
    expect(await lerItens(db)).toEqual(original)
  })

  it('linhas faltando são detectadas como corrupção (nunca viram lista menor)', async () => {
    const { db, sqlite } = bancoReal()
    await gravarLista(db, CHAVE, null, [item('a'), item('b')])
    sqlite.exec(`DELETE FROM kv_rows WHERE key = '${CHAVE}' AND pos = 1`)
    expect((await lerListas(db)).get(CHAVE)?.jsons).toBeNull()
  })

  it('a leitura descarta sobras de gravações interrompidas', async () => {
    const { db, sqlite } = bancoReal()
    await gravarLista(db, CHAVE, null, [item('a')])
    sqlite.exec(`INSERT INTO kv_rows VALUES ('${CHAVE}', 50, '{"id":"lixo"}'), ('orfa', 0, '{}')`)
    expect(await lerItens(db)).toEqual([{ id: 'a' }])
    const restantes = sqlite.prepare('SELECT key, pos FROM kv_rows ORDER BY key, pos').all()
    expect(restantes).toEqual([
      { key: CHAVE, pos: 0 },
      { key: `${CHAVE}#meta`, pos: 0 },
    ])
  })
})
