import type { Produto, ProdutoComImagem } from '@/types/pos'
import { STORAGE_KEYS } from './storageKeys'
import { safeGetArray, safeSet } from './kvStore'

/** Foto de um produto. `id` = id do produto (vira uma linha própria no SQLite). */
export interface ImagemProduto {
  id: string
  imagem: string
}

const CHAVE = STORAGE_KEYS.IMAGENS_PRODUTOS

/**
 * Fotos ficam fora da lista de produtos: toda venda altera o saldo de estoque dos produtos e,
 * com a foto junto, cada alteração regravaria dezenas de KB por produto.
 */
export class ProductImageService {
  static listar(): ImagemProduto[] {
    return safeGetArray<ImagemProduto>(CHAVE)
  }

  /** produto_id → foto (data URL). */
  static mapa(): Record<string, string> {
    return Object.fromEntries(this.listar().map((i) => [i.id, i.imagem]))
  }

  /** Define a foto do produto; vazia remove. Não grava nada se a foto não mudou. */
  static definir(produtoId: string, imagem: string | undefined): void {
    const imagens = this.listar()
    const indice = imagens.findIndex((i) => i.id === produtoId)
    if ((imagens[indice]?.imagem || undefined) === (imagem || undefined)) return

    if (!imagem) imagens.splice(indice, 1)
    else if (indice >= 0) imagens[indice] = { id: produtoId, imagem }
    else imagens.push({ id: produtoId, imagem })
    safeSet(CHAVE, imagens)
  }

  static substituirTudo(imagens: ImagemProduto[]): void {
    safeSet(CHAVE, imagens)
  }

  /** Tira as fotos de dentro dos produtos (vindos do formulário, de backup ou de versões antigas). */
  static separar(produtos: ProdutoComImagem[]): { produtos: Produto[]; imagens: ImagemProduto[] } {
    const imagens: ImagemProduto[] = []
    const semFoto = produtos.map((p) => {
      if (!('imagem_base64' in p)) return p
      const { imagem_base64, ...resto } = p
      if (imagem_base64) imagens.push({ id: p.id, imagem: imagem_base64 })
      return resto
    })
    return { produtos: semFoto, imagens }
  }

  /** Produtos com a foto embutida — formato do backup, legível também por versões antigas. */
  static juntar(produtos: Produto[]): ProdutoComImagem[] {
    const fotos = this.mapa()
    return produtos.map((p) => (fotos[p.id] ? { ...p, imagem_base64: fotos[p.id] } : p))
  }

  /**
   * Versões antigas guardavam a foto dentro do produto: move para a lista própria.
   * Fotos primeiro, produtos depois — se o app fechar no meio, a migração roda de novo.
   */
  static migrarFotosAntigas(): void {
    const produtos = safeGetArray<ProdutoComImagem>(STORAGE_KEYS.PRODUTOS)
    if (!produtos.some((p) => 'imagem_base64' in p)) return
    const { produtos: semFoto, imagens } = this.separar(produtos)
    const migradas = new Set(imagens.map((i) => i.id))
    this.substituirTudo([...this.listar().filter((i) => !migradas.has(i.id)), ...imagens])
    safeSet(STORAGE_KEYS.PRODUTOS, semFoto)
  }
}
