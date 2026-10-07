/**
 * Último array interpretado de cada chave, validado pelo texto bruto que o gerou.
 * Evita reinterpretar megabytes de JSON (vendas, fichas, estoque) a cada venda.
 *
 * Contrato: os objetos guardados são compartilhados entre leituras, estado do React e o
 * espelho SQLite — nunca altere um item no lugar; crie uma cópia ({ ...item, campo }).
 * Nos testes os itens são congelados para que qualquer violação quebre na hora.
 */
interface EntradaCache {
  raw: string
  itens: readonly unknown[]
}

const cache = new Map<string, EntradaCache>()
const CONGELAR_ITENS = import.meta.env.MODE === 'test'

/** JSON de cada item já serializado: itens imutáveis não precisam ser serializados de novo. */
const jsonPorItem = new WeakMap<object, string>()

/** Igual a JSON.stringify(item), reaproveitando o texto de itens já serializados. */
export function jsonDoItem(item: unknown): string {
  if (item === null || typeof item !== 'object') return JSON.stringify(item) ?? 'null'
  let json = jsonPorItem.get(item)
  if (json === undefined) {
    json = JSON.stringify(item)
    jsonPorItem.set(item, json)
  }
  return json
}

/** Registra o JSON de onde o item foi lido, para não serializá-lo de novo ao gravar. */
export function registrarJsonDoItem(item: unknown, json: string): void {
  if (item !== null && typeof item === 'object') jsonPorItem.set(item, json)
}

/** Igual a JSON.stringify(array): só serializa os itens novos (custo cai de O(n) para O(novos)). */
export function serializarArray(itens: readonly unknown[]): string {
  return `[${itens.map(jsonDoItem).join(',')}]`
}

/** Devolve o array em cache se ele ainda corresponde exatamente ao texto gravado. */
export function lerArrayEmCache(key: string, raw: string): readonly unknown[] | undefined {
  const entrada = cache.get(key)
  return entrada && entrada.raw === raw ? entrada.itens : undefined
}

export function guardarArrayEmCache(key: string, raw: string, itens: unknown[]): void {
  if (CONGELAR_ITENS) itens.forEach(congelarProfundo)
  cache.set(key, { raw, itens })
}

export function esquecerCache(key: string): void {
  cache.delete(key)
}

export function limparCacheInteiro(): void {
  cache.clear()
}

function congelarProfundo(valor: unknown): void {
  if (valor === null || typeof valor !== 'object' || Object.isFrozen(valor)) return
  Object.freeze(valor)
  for (const filho of Object.values(valor)) congelarProfundo(filho)
}
