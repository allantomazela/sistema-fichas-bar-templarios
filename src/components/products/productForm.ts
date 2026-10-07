import type { ComboItem, Produto, ProdutoComImagem } from '@/types/pos'
import { parseValorMonetario } from '@/lib/utils'

/** Estado do formulário de produto (campos numéricos como texto, como digitados). */
export interface ProductFormState {
  nome: string
  categoria_id: string
  preco: string
  codigo_rapido: string
  ativo: boolean
  descricao: string
  is_combo: boolean
  itens_combo: ComboItem[]
  imagem_base64?: string
  controla_estoque: boolean
  estoque_atual: string
  estoque_minimo: string
}

export type ResultadoFormulario =
  | { ok: true; produto: Omit<ProdutoComImagem, 'id'> }
  | { ok: false; erro: string }

/** Código sugerido para um produto novo (101, 102...). */
export function sugerirCodigo(produtos: Produto[]): string {
  return String(produtos.length + 101)
}

export function formularioVazio(categoriaId: string, codigo: string): ProductFormState {
  return {
    nome: '',
    categoria_id: categoriaId,
    preco: '',
    codigo_rapido: codigo,
    ativo: true,
    descricao: '',
    is_combo: false,
    itens_combo: [],
    imagem_base64: undefined,
    controla_estoque: false,
    estoque_atual: '',
    estoque_minimo: '10',
  }
}

/** Formulário preenchido com um produto existente (edição) ou como cópia (duplicar). */
export function formularioDoProduto(
  prod: Produto,
  imagem: string | undefined,
  copia?: { codigo: string },
): ProductFormState {
  return {
    nome: copia ? `${prod.nome} (cópia)` : prod.nome,
    categoria_id: prod.categoria_id,
    preco: prod.preco.toString(),
    codigo_rapido: copia ? copia.codigo : prod.codigo_rapido,
    ativo: copia ? true : prod.ativo,
    descricao: prod.descricao || '',
    is_combo: !!prod.is_combo,
    itens_combo: prod.itens_combo ? [...prod.itens_combo] : [],
    imagem_base64: imagem,
    controla_estoque: !!prod.controla_estoque,
    estoque_atual: prod.estoque_atual !== undefined ? String(prod.estoque_atual) : '',
    estoque_minimo: prod.estoque_minimo !== undefined ? String(prod.estoque_minimo) : '10',
  }
}

/** Valida o formulário e monta o produto a gravar (com mensagens prontas para o operador). */
export function validarFormulario(
  form: ProductFormState,
  produtos: Produto[],
  editandoId: string | null,
): ResultadoFormulario {
  const preco = parseValorMonetario(form.preco)
  const codigo = form.codigo_rapido.trim()

  if (!form.nome.trim()) return { ok: false, erro: 'Informe o nome do produto.' }
  if (!codigo) return { ok: false, erro: 'Informe o código rápido.' }
  if (preco <= 0) return { ok: false, erro: 'Informe um preço válido maior que zero.' }
  if (!form.categoria_id) {
    return { ok: false, erro: 'Selecione uma categoria. Cadastre uma categoria antes, se necessário.' }
  }
  if (produtos.some((p) => p.codigo_rapido === codigo && p.id !== editandoId)) {
    return { ok: false, erro: `Já existe um produto com o código #${codigo}.` }
  }
  if (form.is_combo && form.itens_combo.length === 0) {
    return { ok: false, erro: 'Adicione ao menos um item na composição do combo.' }
  }

  const inteiroOuNada = (valor: string) =>
    form.controla_estoque && valor !== '' ? Math.max(0, parseInt(valor, 10) || 0) : undefined

  return {
    ok: true,
    produto: {
      nome: form.nome.trim(),
      categoria_id: form.categoria_id,
      preco,
      codigo_rapido: codigo,
      // Sempre 1 ficha térmica por unidade; a foto nunca sai na ficha
      emite_ficha_individual: true,
      imprimir_imagem_ficha: false,
      ativo: form.ativo,
      descricao: form.descricao,
      is_combo: form.is_combo,
      itens_combo: form.itens_combo,
      imagem_base64: form.imagem_base64,
      controla_estoque: form.controla_estoque,
      estoque_atual: inteiroOuNada(form.estoque_atual),
      estoque_minimo: inteiroOuNada(form.estoque_minimo),
    },
  }
}

/** Soma 1 unidade do produto na composição do combo (ou inclui com 1). */
export function adicionarAoCombo(itens: ComboItem[], produtoId: string): ComboItem[] {
  const existente = itens.find((it) => it.produto_id === produtoId)
  if (!existente) return [...itens, { produto_id: produtoId, quantidade: 1 }]
  return itens.map((it) => (it.produto_id === produtoId ? { ...it, quantidade: it.quantidade + 1 } : it))
}
