import { LIST_KEYS } from './storageKeys'
import { guardarArrayEmCache, registrarJsonDoItem } from './parsedCache'
import { apagarLista, gravarLista, lerListas, type EstadoGravado, type ExecutorSql } from './rowStore'

/**
 * Ponte entre o storage (texto por chave, em memória) e o rowStore (uma linha por item).
 * O storage continua entregando o texto da lista para o kvStore; aqui só se decide o que
 * vai para o disco e quando.
 */

/** O que está no disco por chave. `null` = desconhecido (após erro): próxima gravação reescreve tudo. */
const gravados = new Map<string, EstadoGravado | null>()
/** Último pedido por chave (`null` = apagar). Vários pedidos na fila viram uma gravação só. */
const pedidos = new Map<string, readonly unknown[] | null>()

/** Texto que faz o kvStore acusar corrupção (em vez de recriar a lista vazia por cima). */
const TEXTO_LISTA_CORROMPIDA = '{"erro":"lista incompleta no banco"}'

export function isListKey(key: string): boolean {
  return LIST_KEYS.has(key)
}

/**
 * Boot: coloca no `textos` (cache do storage) o texto de cada lista gravada em linhas e
 * migra para linhas as listas que ainda estão como texto único no kv_store.
 * Devolve as chaves cujo texto antigo no kv_store já pode ser apagado.
 */
export async function prepararListas(db: ExecutorSql, textos: Map<string, string>): Promise<string[]> {
  gravados.clear()
  pedidos.clear()
  const lidas = await lerListas(db)
  const textosObsoletos: string[] = []

  for (const key of LIST_KEYS) {
    const lida = lidas.get(key)
    const textoAntigo = textos.get(key)
    if (lida) {
      textos.set(key, montarLista(key, lida.inicio, lida.jsons))
      if (textoAntigo !== undefined) textosObsoletos.push(key)
    } else if (textoAntigo !== undefined) {
      const itens = interpretarTexto(textoAntigo)
      if (!itens) continue // texto corrompido fica como está: o kvStore acusa ao ler
      gravados.set(key, await gravarLista(db, key, null, itens))
      guardarArrayEmCache(key, textoAntigo, itens)
      textosObsoletos.push(key)
    }
  }
  return textosObsoletos
}

function montarLista(key: string, inicio: number, jsons: string[] | null): string {
  const itens = jsons && interpretarItens(jsons)
  if (!jsons || !itens) {
    gravados.set(key, null)
    return TEXTO_LISTA_CORROMPIDA
  }
  const texto = `[${jsons.join(',')}]`
  itens.forEach((item, i) => registrarJsonDoItem(item, jsons[i]))
  guardarArrayEmCache(key, texto, itens)
  gravados.set(key, { inicio, itens })
  return texto
}

function interpretarItens(jsons: string[]): unknown[] | null {
  try {
    return jsons.map((json) => JSON.parse(json) as unknown)
  } catch {
    return null
  }
}

export function interpretarTexto(texto: string): unknown[] | null {
  try {
    const valor: unknown = JSON.parse(texto)
    return Array.isArray(valor) ? valor : null
  } catch {
    return null
  }
}

export function pedirGravacao(key: string, itens: readonly unknown[] | null): void {
  pedidos.set(key, itens)
}

/** Executa o pedido mais recente da chave. Devolve false se outro já o executou. */
export async function executarPedido(db: ExecutorSql, key: string): Promise<boolean> {
  if (!pedidos.has(key)) return false
  const itens = pedidos.get(key) ?? null
  pedidos.delete(key)
  try {
    if (itens === null) {
      await apagarLista(db, key)
      gravados.set(key, null)
    } else {
      gravados.set(key, await gravarLista(db, key, gravados.get(key) ?? null, itens))
    }
  } catch (err) {
    gravados.set(key, null)
    throw err
  }
  return true
}
