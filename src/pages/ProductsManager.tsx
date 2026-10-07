import { useMemo, useState } from 'react'
import { Layers, Package, Palette, Plus } from 'lucide-react'
import { usePos } from '@/context/PosContext'
import type { Categoria, Produto } from '@/types/pos'
import { Button } from '@/components/ui/button'
import { CategoriesPanel } from '@/components/products/CategoriesPanel'
import { DeleteProductDialog } from '@/components/products/DeleteProductDialog'
import { ProductFormDialog } from '@/components/products/ProductFormDialog'
import { ProductFilters, TODAS, type ModoVisualizacao } from '@/components/products/ProductFilters'
import { ProductsGridView } from '@/components/products/ProductsGridView'
import { ProductsTableView } from '@/components/products/ProductsTableView'
import type { AcoesProduto, ProdutoListado } from '@/components/products/ProductRowParts'
import {
  formularioDoProduto,
  formularioVazio,
  sugerirCodigo,
  type ProductFormState,
} from '@/components/products/productForm'
import { StockMovementDialog } from '@/components/stock/StockMovementDialog'

type Aba = 'produtos' | 'categorias'

interface FormularioAberto {
  /** Muda a cada abertura para o diálogo começar do zero. */
  chave: number
  inicial: ProductFormState
  editandoId: string | null
}

export default function ProductsManager() {
  const { categorias, produtos, imagensProdutos } = usePos()

  const [aba, setAba] = useState<Aba>('produtos')
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState(TODAS)
  const [modo, setModo] = useState<ModoVisualizacao>('lista')
  const [sinalNovaCategoria, setSinalNovaCategoria] = useState(0)

  const [formulario, setFormulario] = useState<FormularioAberto | null>(null)
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null)
  const [reporId, setReporId] = useState<string | null>(null)
  const produtoParaRepor = reporId ? produtos.find((p) => p.id === reporId) || null : null

  const itens = useMemo(
    () => listarProdutos(produtos, categorias, imagensProdutos, categoriaFiltro, busca),
    [produtos, categorias, imagensProdutos, categoriaFiltro, busca],
  )

  const abrirFormulario = (inicial: ProductFormState, editandoId: string | null) =>
    setFormulario((atual) => ({ chave: (atual?.chave ?? 0) + 1, inicial, editandoId }))

  const novoProduto = () => {
    const categoriaPadrao = categorias.find((c) => c.ativo !== false)?.id || categorias[0]?.id || ''
    abrirFormulario(formularioVazio(categoriaPadrao, sugerirCodigo(produtos)), null)
  }

  const acoes: AcoesProduto = {
    onEditar: (p) => abrirFormulario(formularioDoProduto(p, imagensProdutos[p.id]), p.id),
    onDuplicar: (p) =>
      abrirFormulario(formularioDoProduto(p, imagensProdutos[p.id], { codigo: sugerirCodigo(produtos) }), null),
    onExcluir: setProdutoParaExcluir,
    onRepor: (p) => setReporId(p.id),
  }

  const gerenciarCategorias = () => {
    setFormulario(null)
    setAba('categorias')
    setSinalNovaCategoria((n) => n + 1)
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" />
            Catálogo de Produtos & Combos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre produtos para o balcão, configure regras de emissão de fichas e monte combos com
            desmembramento automático.
          </p>
        </div>
        <Button
          onClick={aba === 'produtos' ? novoProduto : () => setSinalNovaCategoria((n) => n + 1)}
          className="bg-primary hover:bg-primary/90 font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          {aba === 'produtos' ? 'Novo Produto' : 'Nova Categoria'}
        </Button>
      </div>

      <div role="tablist" className="flex items-center gap-2 border-b border-border pb-2">
        <BotaoAba ativa={aba === 'produtos'} onClick={() => setAba('produtos')} icone={<Package className="w-4 h-4" />}>
          Produtos ({produtos.length})
        </BotaoAba>
        <BotaoAba ativa={aba === 'categorias'} onClick={() => setAba('categorias')} icone={<Palette className="w-4 h-4" />}>
          Categorias ({categorias.length})
        </BotaoAba>
      </div>

      {aba === 'produtos' && (
        <div className="space-y-4">
          <ProductFilters
            busca={busca}
            onBusca={setBusca}
            modo={modo}
            onModo={setModo}
            categorias={categorias}
            categoriaSelecionada={categoriaFiltro}
            onCategoria={setCategoriaFiltro}
          />
          {itens.length === 0 ? (
            <CatalogoVazio semProdutos={produtos.length === 0} onCadastrar={novoProduto} />
          ) : modo === 'grade' ? (
            <ProductsGridView itens={itens} acoes={acoes} />
          ) : (
            <ProductsTableView itens={itens} acoes={acoes} />
          )}
        </div>
      )}

      {aba === 'categorias' && <CategoriesPanel createSignal={sinalNovaCategoria} />}

      {formulario && (
        <ProductFormDialog
          key={formulario.chave}
          open
          onOpenChange={(open) => !open && setFormulario(null)}
          inicial={formulario.inicial}
          editandoId={formulario.editandoId}
          onGerenciarCategorias={gerenciarCategorias}
        />
      )}

      <StockMovementDialog
        produto={produtoParaRepor}
        tipoInicial="entrada"
        open={!!produtoParaRepor}
        onOpenChange={(open) => !open && setReporId(null)}
      />

      <DeleteProductDialog produto={produtoParaExcluir} onClose={() => setProdutoParaExcluir(null)} />
    </div>
  )
}

function listarProdutos(
  produtos: Produto[],
  categorias: Categoria[],
  imagens: Record<string, string>,
  categoriaId: string,
  busca: string,
): ProdutoListado[] {
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]))
  const termo = busca.toLowerCase()
  return produtos
    .filter(
      (p) =>
        (categoriaId === TODAS || p.categoria_id === categoriaId) &&
        (p.nome.toLowerCase().includes(termo) || p.codigo_rapido.toLowerCase().includes(termo)),
    )
    .map((produto) => ({
      produto,
      categoria: categoriaPorId.get(produto.categoria_id),
      imagem: imagens[produto.id],
    }))
}

function BotaoAba(props: { ativa: boolean; onClick: () => void; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.ativa}
      onClick={props.onClick}
      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
        props.ativa ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {props.icone}
      {props.children}
    </button>
  )
}

function CatalogoVazio({ semProdutos, onCadastrar }: { semProdutos: boolean; onCadastrar: () => void }) {
  return (
    <div className="border border-dashed border-border rounded-2xl bg-card/50 p-10 text-center space-y-3">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Package className="w-7 h-7 text-muted-foreground opacity-60" />
      </div>
      <div>
        <p className="font-bold text-foreground">Nenhum produto encontrado</p>
        <p className="text-xs text-muted-foreground mt-1">
          {semProdutos
            ? 'Cadastre o primeiro produto com foto para agilizar o atendimento no balcão.'
            : 'Ajuste a busca ou o filtro de categoria.'}
        </p>
      </div>
      {semProdutos && (
        <Button onClick={onCadastrar} className="bg-primary hover:bg-primary/90 font-bold gap-2">
          <Plus className="w-4 h-4" />
          Cadastrar produto
        </Button>
      )}
    </div>
  )
}
