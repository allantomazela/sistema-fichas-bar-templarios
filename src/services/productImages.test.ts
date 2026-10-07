import { beforeEach, describe, expect, it } from 'vitest'
import { LocalDatabaseService } from './db'
import { ProductImageService } from './productImages'
import { safeSet } from './kvStore'
import { STORAGE_KEYS } from './storageKeys'
import { PRODUTO_BASE, prepararBancoDeTeste, produto, vender } from '@/test/stockFixtures'

const FOTO = 'data:image/jpeg;base64,AAAA'

beforeEach(prepararBancoDeTeste)

describe('fotos dos produtos fora da lista de produtos', () => {
  it('cadastro e edição guardam a foto à parte; a venda não mexe nas fotos', () => {
    const novo = LocalDatabaseService.addProduto({ ...PRODUTO_BASE, nome: 'Suco', codigo_rapido: '09', imagem_base64: FOTO })
    expect(produto(novo.id)).not.toHaveProperty('imagem_base64')
    expect(ProductImageService.mapa()[novo.id]).toBe(FOTO)

    const fotosAntes = ProductImageService.listar()
    vender([['cerveja', 1]])
    expect(ProductImageService.listar()).toEqual(fotosAntes)

    LocalDatabaseService.updateProduto(novo.id, { preco: 12 }) // sem o campo: foto mantida
    expect(ProductImageService.mapa()[novo.id]).toBe(FOTO)
    LocalDatabaseService.updateProduto(novo.id, { imagem_base64: undefined }) // campo vazio: remove
    expect(ProductImageService.mapa()[novo.id]).toBeUndefined()
  })

  it('excluir o produto apaga a foto', () => {
    LocalDatabaseService.updateProduto('combo', { imagem_base64: FOTO })
    LocalDatabaseService.deleteProduto('combo')
    expect(ProductImageService.listar()).toEqual([])
  })

  it('migra fotos guardadas dentro dos produtos (versões antigas)', () => {
    const antigos = LocalDatabaseService.getProdutos().map((p) => (p.id === 'cerveja' ? { ...p, imagem_base64: FOTO } : p))
    safeSet(STORAGE_KEYS.PRODUTOS, antigos)

    ProductImageService.migrarFotosAntigas()
    expect(produto('cerveja')).not.toHaveProperty('imagem_base64')
    expect(ProductImageService.mapa()).toEqual({ cerveja: FOTO })
  })

  it('backup leva a foto dentro do produto (compatível) e a restauração separa de novo', () => {
    LocalDatabaseService.updateProduto('cerveja', { imagem_base64: FOTO })
    const backup = LocalDatabaseService.exportBackup()
    expect(backup.produtos.find((p) => p.id === 'cerveja')?.imagem_base64).toBe(FOTO)

    LocalDatabaseService.zerarBancoCompleto()
    expect(ProductImageService.listar()).toEqual([])

    expect(LocalDatabaseService.importBackup(backup)).toBe(true)
    expect(produto('cerveja')).not.toHaveProperty('imagem_base64')
    expect(ProductImageService.mapa()).toEqual({ cerveja: FOTO })
  })
})
