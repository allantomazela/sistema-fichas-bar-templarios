import { describe, expect, it } from 'vitest'
import type Database from '@tauri-apps/plugin-sql'
import { syncDomainKeys, syncDomainTablesFromKv } from './domainSync'
import { guardarArrayEmCache, serializarArray } from './parsedCache'

const CHAVE_VENDAS = 'templarios_pdv_vendas'

function bancoFalso() {
  const comandos: { sql: string; params: unknown[] }[] = []
  const db = {
    execute: async (sql: string, params: unknown[] = []) => {
      comandos.push({ sql, params })
      return { rowsAffected: 0 }
    },
  } as unknown as Database
  return { db, comandos }
}

function venda(id: string, status = 'concluida') {
  return { id, sequencial_venda: 1, caixa_id: 'cx', operador: 'Op', data_hora: '', total: 10, forma_pagamento: 'pix', status, itens: [] }
}

/** Simula o kvStore: grava o texto e o array interpretado no cache compartilhado. */
function kv(itens: unknown[]) {
  const raw = serializarArray(itens)
  guardarArrayEmCache(CHAVE_VENDAS, raw, itens)
  return (key: string) => (key === CHAVE_VENDAS ? raw : null)
}

describe('espelho SQLite incremental', () => {
  it('recria a tabela no boot e depois grava só as linhas novas, alteradas ou removidas', async () => {
    const { db, comandos } = bancoFalso()
    const v1 = venda('v1')
    const v2 = venda('v2')
    await syncDomainTablesFromKv(db, kv([v1, v2]))
    expect(comandos.some((c) => c.sql === 'DELETE FROM vendas')).toBe(true)

    comandos.length = 0
    const v3 = venda('v3')
    await syncDomainKeys(db, [CHAVE_VENDAS], kv([v3, v1, v2]))
    expect(comandos).toHaveLength(1)
    expect(comandos[0].sql).toContain('INSERT OR REPLACE INTO vendas')
    expect(comandos[0].params[0]).toBe('v3')

    comandos.length = 0
    const v1Cancelada = { ...v1, status: 'cancelada' }
    await syncDomainKeys(db, [CHAVE_VENDAS], kv([v3, v1Cancelada]))
    const sqls = comandos.map((c) => c.sql)
    expect(sqls.some((s) => s.startsWith('DELETE FROM vendas WHERE id IN'))).toBe(true)
    expect(comandos.find((c) => c.sql.startsWith('DELETE'))?.params).toEqual(['v2'])
    expect(comandos.find((c) => c.sql.startsWith('INSERT'))?.params[0]).toBe('v1')
  })

  it('após uma falha, a próxima sincronização recria a tabela inteira', async () => {
    const { db, comandos } = bancoFalso()
    await syncDomainTablesFromKv(db, kv([venda('a')]))
    const falha = { execute: async () => Promise.reject(new Error('disco cheio')) } as unknown as Database
    await expect(syncDomainKeys(falha, [CHAVE_VENDAS], kv([venda('b')]))).rejects.toThrow('disco cheio')

    comandos.length = 0
    await syncDomainKeys(db, [CHAVE_VENDAS], kv([venda('b')]))
    expect(comandos[0].sql).toBe('DELETE FROM vendas')
  })
})
