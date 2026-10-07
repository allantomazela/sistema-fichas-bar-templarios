import Database from '@tauri-apps/plugin-sql'
import { isTauri } from '@tauri-apps/api/core'
import { isDomainKey, syncDomainTablesFromKv } from './domainSync'

/** Nome do arquivo SQLite (AppConfig do SO — Windows/Linux). */
export const SQLITE_DB_NAME = 'sqlite:templarios_pdv.db'

type StorageBackend = 'sqlite' | 'localStorage'

let backend: StorageBackend = 'localStorage'
let db: Database | null = null
let ready = false
let syncQueued = false
const memoryCache = new Map<string, string>()

/** Fila serial de gravações no SQLite — evita perda se o processo fechar cedo. */
let writeChain: Promise<void> = Promise.resolve()
let lastWriteError: Error | null = null

/** Chaves legadas do browser usadas na migração para SQLite. */
const LEGACY_LOCAL_PREFIX = 'templarios_pdv_'

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

async function migrateLocalStorageIntoSqlite(database: Database): Promise<void> {
  if (typeof localStorage === 'undefined') return

  const now = new Date().toISOString()
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !isLegacyKey(key)) continue
    const value = localStorage.getItem(key)
    if (value == null) continue
    memoryCache.set(key, value)
    await database.execute(
      `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, now],
    )
  }
}

function scheduleDomainSync(): void {
  if (!db || backend !== 'sqlite' || syncQueued) return
  syncQueued = true
  queueMicrotask(() => {
    void (async () => {
      try {
        if (!db) return
        await syncDomainTablesFromKv(db, (key) => memoryCache.get(key) ?? null)
      } catch (err) {
        console.error('Falha ao sincronizar tabelas de domínio no SQLite', err)
      } finally {
        syncQueued = false
      }
    })()
  })
}

/**
 * Inicializa a persistência:
 * - App nativo (Tauri): SQLite em disco (AppData / ~/.config)
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

    const rows = await db.select<{ key: string; value: string }[]>(
      'SELECT key, value FROM kv_store',
    )

    memoryCache.clear()
    for (const row of rows) {
      memoryCache.set(row.key, row.value)
    }

    if (rows.length === 0) {
      await migrateLocalStorageIntoSqlite(db)
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
 * Use `flushStorageWrites()` após operações críticas (venda, cancelamento).
 */
export function storageSetItem(key: string, value: string): void {
  if (backend === 'sqlite') {
    const database = assertSqliteDb()
    memoryCache.set(key, value)
    const now = new Date().toISOString()

    writeChain = writeChain
      .catch(() => undefined)
      .then(async () => {
        await database.execute(
          `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, $3)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          [key, value, now],
        )
        if (isDomainKey(key)) scheduleDomainSync()
      })
      .catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err))
        lastWriteError = error
        console.error(`Erro ao gravar chave ${key} no SQLite`, error)
      })
    return
  }

  localStorage.setItem(key, value)
}

export function storageRemoveItem(key: string): void {
  if (backend === 'sqlite') {
    const database = assertSqliteDb()
    memoryCache.delete(key)

    writeChain = writeChain
      .catch(() => undefined)
      .then(async () => {
        await database.execute('DELETE FROM kv_store WHERE key = $1', [key])
        if (isDomainKey(key)) scheduleDomainSync()
      })
      .catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err))
        lastWriteError = error
        console.error(`Erro ao remover chave ${key} do SQLite`, error)
      })
    return
  }

  localStorage.removeItem(key)
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
