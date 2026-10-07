import { storageGetItem, storageSetItem } from './storage'
import {
  esquecerCache,
  guardarArrayEmCache,
  lerArrayEmCache,
  serializarArray,
} from './parsedCache'
import { LIST_KEYS } from './storageKeys'

export {
  STORAGE_KEYS,
  EVENT_ARRAY_KEYS,
  CATALOG_ARRAY_KEYS,
  SEQUENCE_KEYS,
} from './storageKeys'

/** Chaves de histórico: JSON inválido NÃO pode virar [] e sobrescrever o disco. */
const CRITICAL_ARRAY_KEYS = LIST_KEYS

export class StorageCorruptionError extends Error {
  constructor(public readonly key: string) {
    super(
      `Dados locais corrompidos (${key}). Não continue vendendo — restaure um backup em Configurações.`,
    )
    this.name = 'StorageCorruptionError'
  }
}

// Persistência: SQLite (app nativo) ou localStorage (browser)
export function safeGet<T>(key: string, fallback: T): T {
  try {
    const item = storageGetItem(key)
    if (!item) return fallback
    return JSON.parse(item) as T
  } catch (err) {
    console.error(`Erro ao carregar chave ${key} do armazenamento local`, err)
    if (CRITICAL_ARRAY_KEYS.has(key)) {
      throw new StorageCorruptionError(key)
    }
    return fallback
  }
}

/**
 * Lê um array da chave. Devolve sempre um array novo (pode dar push/sort à vontade),
 * mas os itens são compartilhados com o cache: não altere itens no lugar.
 */
export function safeGetArray<T>(key: string): T[] {
  const item = storageGetItem(key)
  if (!item) return []
  const emCache = lerArrayEmCache(key, item)
  if (emCache) return emCache.slice() as T[]
  let parsed: unknown
  try {
    parsed = JSON.parse(item)
  } catch (err) {
    console.error(`Erro ao carregar array ${key}`, err)
    throw new StorageCorruptionError(key)
  }
  if (!Array.isArray(parsed)) throw new StorageCorruptionError(key)
  guardarArrayEmCache(key, item, parsed)
  return parsed.slice() as T[]
}

export function safeSet<T>(key: string, value: T): void {
  // Cópia: quem chamou pode continuar mexendo no próprio array depois de salvar
  const itens = Array.isArray(value) ? value.slice() : undefined
  const raw = itens ? serializarArray(itens) : JSON.stringify(value)
  try {
    storageSetItem(key, raw, itens)
  } catch (err) {
    esquecerCache(key)
    console.error(`Erro ao gravar chave ${key} no armazenamento local`, err)
    throw err
  }
  if (itens) guardarArrayEmCache(key, raw, itens)
  else esquecerCache(key)
}

/** ID único local (timestamp + aleatório) — evita colisão em operações no mesmo milissegundo. */
export function generateLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
