/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite'
import type { ExecutorSql } from '@/services/rowStore'

/** Mesmo esquema da migração 3 em src-tauri/src/lib.rs. */
const SQL_KV_ROWS = `CREATE TABLE kv_rows (
  key TEXT NOT NULL,
  pos INTEGER NOT NULL,
  json TEXT NOT NULL,
  PRIMARY KEY (key, pos)
)`

/**
 * SQLite real em memória com a interface do plugin SQL do Tauri.
 * `falharNoComando`: o N-ésimo `execute` falha (simula queda de energia / disco cheio).
 */
export function criarSqliteEmMemoria(opcoes: { falharNoComando?: number } = {}) {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(SQL_KV_ROWS)
  const comandos: string[] = []
  let executados = 0
  // O plugin liga `$1, $2...` por posição; no código eles aparecem sempre em ordem e sem repetir
  const preparar = (sql: string) => sqlite.prepare(sql.replace(/\$\d+/g, '?'))
  const db = {
    execute: async (sql: string, params: unknown[] = []) => {
      comandos.push(sql)
      if (opcoes.falharNoComando === ++executados) throw new Error('energia caiu')
      preparar(sql).run(...(params as (string | number)[]))
      return { rowsAffected: 0 }
    },
    select: async (sql: string, params: unknown[] = []) =>
      preparar(sql).all(...(params as (string | number)[])),
  } as unknown as ExecutorSql
  return { db, comandos, sqlite }
}
