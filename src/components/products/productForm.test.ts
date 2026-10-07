import { describe, expect, it } from 'vitest'
import type { Produto } from '@/types/pos'
import { adicionarAoCombo, formularioDoProduto, formularioVazio, validarFormulario } from './productForm'

const existente: Produto = {
  id: 'p1',
  categoria_id: 'cat',
  nome: 'Cerveja',
  preco: 8,
  codigo_rapido: '101',
  emite_ficha_individual: true,
  ativo: true,
}

function formValido() {
  return { ...formularioVazio('cat', '102'), nome: ' Refri ', preco: '6,50' }
}

describe('formulário de produto', () => {
  it('monta o produto com preço em vírgula, nome aparado e 1 ficha por unidade', () => {
    const resultado = validarFormulario(formValido(), [existente], null)
    expect(resultado).toMatchObject({
      ok: true,
      produto: { nome: 'Refri', preco: 6.5, codigo_rapido: '102', emite_ficha_individual: true },
    })
  })

  it('recusa código repetido (exceto o do próprio produto em edição)', () => {
    const repetido = { ...formValido(), codigo_rapido: '101' }
    expect(validarFormulario(repetido, [existente], null)).toEqual({
      ok: false,
      erro: 'Já existe um produto com o código #101.',
    })
    expect(validarFormulario(repetido, [existente], 'p1')).toMatchObject({ ok: true })
  })

  it('combo sem itens e preço zerado são recusados', () => {
    expect(validarFormulario({ ...formValido(), is_combo: true }, [], null)).toMatchObject({ ok: false })
    expect(validarFormulario({ ...formValido(), preco: '0' }, [], null)).toMatchObject({ ok: false })
  })

  it('estoque só é enviado quando o controle está ligado', () => {
    const semControle = validarFormulario({ ...formValido(), estoque_atual: '5' }, [], null)
    expect(semControle).toMatchObject({ produto: { estoque_atual: undefined } })
    const comControle = validarFormulario({ ...formValido(), controla_estoque: true, estoque_atual: '5' }, [], null)
    expect(comControle).toMatchObject({ produto: { estoque_atual: 5, estoque_minimo: 10 } })
  })

  it('duplicar gera cópia ativa com código novo; combo soma unidades do mesmo item', () => {
    const copia = formularioDoProduto({ ...existente, ativo: false }, 'foto', { codigo: '150' })
    expect(copia).toMatchObject({ nome: 'Cerveja (cópia)', codigo_rapido: '150', ativo: true, imagem_base64: 'foto' })
    expect(adicionarAoCombo(adicionarAoCombo([], 'p1'), 'p1')).toEqual([{ produto_id: 'p1', quantidade: 2 }])
  })
})
