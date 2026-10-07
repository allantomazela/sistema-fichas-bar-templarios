import Database from '@tauri-apps/plugin-sql'
import { isTauri } from '@tauri-apps/api/core'
import { isDomainKey, syncDomainKeys, syncDomainTablesFromKv } from './domainSync'
import {
  executarPedido,
  interpretarTexto,
  isListKey,
  pedirGravacao,
  prepararListas,
} from './listPersistence'

/** Nome do arquivo SQLite (AppConfig do SO — Windows/Linux). */
export const SQLITE_DB_NAME = 'sqlite:templarios_pdv.db'

type StorageBackend = 'sqlite' | 'localStorage'

let backend: StorageBackend = 'localStorage'
let db: Database | null = null
let ready = false
const memoryCache = new Map<string, string>()

/** Espelho relacional: agrupa alterações e sincroniza só as tabelas que mudaram. */
const DOMAIN_SYNC_DELAY_MS = 1500
const dirtyDomainKeys = new Set<string>()
let domainSyncTimer: ReturnType<typeof setTimeout> | null = null

/** Fila serial de gravações no SQLite — evita perda se o processo fechar cedo. */
let writeChain: Promise<void> = Promise.resolve()
let lastWriteError: Error | null = null

/** Chaves legadas do browser usadas na migração para SQLite. */
const LEGACY_LOCAL_PREFIX = 'templarios_pdv_'

const SQL_UPSERT_KV = `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, $3)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`

function isLegacyKey(key: string): boolean {
  return key.startsWith(LEGACY_LOCAL_PREFIX)
}

function assertSqliteDb(): Database {
  if (!db) {
    throw new Error(
      'Banco SQLite indisponível. Reinicie o aplicativo. Se o problema continuar, restaure um backup.',
    )
  }
  return db
}

/** Põe a tarefa na fila serial; erro fica guardado para o próximo `flushStorageWrites`. */
function enfileirar(descricaoErro: string, tarefa: () => Promise<void>): void {
  writeChain = writeChain
    .catch(() => undefined)
    .then(tarefa)
    .catch((err) => {
      const error = err instanceof Error ? err : new Error(String(err))
      lastWriteError = error
      console.error(descricaoErro, error)
    })
}

async function migrateLocalStorageIntoSqlite(database: Database): Promise<void> {
  if (typeof localStorage === 'undefined') return

  const now = new Date().toISOString()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !isLegacyKey(key)) continue
    const value = localStorage.getItem(key)
    if (value == null) continue
    memoryCache.set(key, value)
    await database.execute(SQL_UPSERT_KV, [key, value, now])
  }
}

function scheduleDomainSync(key: string): void {
  if (!db || backend !== 'sqlite') return
  dirtyDomainKeys.add(key)
  if (domainSyncTimer) clearTimeout(domainSyncTimer)
  domainSyncTimer = setTimeout(runDomainSync, DOMAIN_SYNC_DELAY_MS)
}

/**
 * Roda na mesma fila serial das gravações (sem disputa de lock no SQLite).
 * Falha aqui não afeta vendas: as listas são a fonte de verdade e o espelho é refeito no boot.
 */
function runDomainSync(): void {
  domainSyncTimer = null
  const database = db
  if (!database || dirtyDomainKeys.size === 0) return
  const keys = [...dirtyDomainKeys]
  dirtyDomainKeys.clear()

  writeChain = writeChain
    .catch(() => undefined)
    .then(async () => {
      try {
        await syncDomainKeys(database, keys, (k) => memoryCache.get(k) ?? null)
      } catch (err) {
        console.error('Falha ao sincronizar tabelas de domínio no SQLite', err)
      }
    })
}

/**
 * Inicializa a persistência:
 * - App nativo (Tauri): SQLite em disco (AppData / ~/.config). Valores simples ficam no
 *   kv_store; listas ficam uma linha por item em kv_rows (ver rowStore).
 * - Browser (`pnpm dev`): localStorage (dev rápido)
 */
export async function initPersistentStorage(): Promise<{ backend: StorageBackend }> {
  if (ready) return { backend }

  if (isTauri()) {
    backend = 'sqlite'
    db = await Database.load(SQLITE_DB_NAME)
    if (!db) {
      throw new Error('Falha ao carregar o banco SQLite local.')
    }

    const rows = await db.select<{ key: string; value: string }[]>('SELECT key, value FROM kv_store')
    memoryCache.clear()
    for (const row of rows) {
      memoryCache.set(row.key, row.value)
    }

    const temLinhas = await db.select<unknown[]>('SELECT 1 FROM kv_rows LIMIT 1')
    if (rows.length === 0 && temLinhas.length === 0) {
      await migrateLocalStorageIntoSqlite(db)
    }

    const textosObsoletos = await prepararListas(db, memoryCache)
    for (const key of textosObsoletos) {
      await db.execute('DELETE FROM kv_store WHERE key = $1', [key])
    }

    await syncDomainTablesFromKv(db, (key) => memoryCache.get(key) ?? null)
  } else {
    backend = 'localStorage'
  }

  ready = true
  return { backend }
}

export function isStorageReady(): boolean {
  return ready
}

export function getStorageBackend(): StorageBackend {
  return backend
}

export function getSqliteDatabase(): Database | null {
  return db
}

export function storageGetItem(key: string): string | null {
  if (!ready) {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
    return null
  }

  if (backend === 'sqlite') {
    return memoryCache.has(key) ? (memoryCache.get(key) as string) : null
  }

  return localStorage.getItem(key)
}

/**
 * Grava no cache imediato e enfileira persistência durável no SQLite.
 * `itens` (listas): o array já interpretado — permite gravar só os itens que mudaram.
 * Use `flushStorageWrites()` após operações críticas (venda, cancelamento).
 */
export function storageSetItem(key: string, value: string, itens?: readonly unknown[]): void {
  if (backend !== 'sqlite') {
    localStorage.setItem(key, value)
    return
  }

  const database = assertSqliteDb()
  if (isListKey(key)) {
    const lista = itens ?? interpretarTexto(value)
    if (!lista) throw new Error(`A chave ${key} só aceita listas.`)
    memoryCache.set(key, value)
    pedirGravacao(key, lista)
    enfileirar(`Erro ao gravar a lista ${key} no SQLite`, async () => {
      if ((await executarPedido(database, key)) && isDomainKey(key)) scheduleDomainSync(key)
    })
    return
  }

  memoryCache.set(key, value)
  const now = new Date().toISOString()
  enfileirar(`Erro ao gravar chave ${key} no SQLite`, async () => {
    await database.execute(SQL_UPSERT_KV, [key, value, now])
  })
}

export function storageRemoveItem(key: string): void {
  if (backend !== 'sqlite') {
    localStorage.removeItem(key)
    return
  }

  const database = assertSqliteDb()
  memoryCache.delete(key)
  if (isListKey(key)) {
    pedirGravacao(key, null)
    enfileirar(`Erro ao remover a lista ${key} do SQLite`, async () => {
      if ((await executarPedido(database, key)) && isDomainKey(key)) scheduleDomainSync(key)
    })
    return
  }

  enfileirar(`Erro ao remover chave ${key} do SQLite`, async () => {
    await database.execute('DELETE FROM kv_store WHERE key = $1', [key])
  })
}

/** Aguarda todas as gravações SQLite pendentes e propaga falha se houver. */
export async function flushStorageWrites(): Promise<void> {
  if (backend !== 'sqlite') return
  await writeChain
  if (lastWriteError) {
    const err = lastWriteError
    lastWriteError = null
    throw err
  }
}
