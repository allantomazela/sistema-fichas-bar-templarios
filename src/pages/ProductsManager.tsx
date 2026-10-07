import React, { useState } from 'react'
import { usePos } from '@/context/PosContext'
import { Produto, ComboItem } from '@/types/pos'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ProductImagePicker } from '@/components/products/ProductImagePicker'
import { CategoriesPanel } from '@/components/products/CategoriesPanel'
import { getCategoryIcon } from '@/lib/categoryIcons'
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Package,
  Search,
  Palette,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Copy,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ProductsManager() {
  const {
    categorias,
    produtos,
    addProduto,
    updateProduto,
    deleteProduto,
    reporEstoque,
  } = usePos()

  const [activeTab, setActiveTab] = useState<'produtos' | 'categorias'>('produtos')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatFilter, setSelectedCatFilter] = useState('todas')
  const [viewMode, setViewMode] = useState<'lista' | 'grade'>('lista')
  const [catCreateSignal, setCatCreateSignal] = useState(0)

  // Modal Produto
  const [isProdModalOpen, setIsProdModalOpen] = useState(false)
  const [editingProdId, setEditingProdId] = useState<string | null>(null)
  const [prodToDelete, setProdToDelete] = useState<Produto | null>(null)

  // Modal Reposição Rápida de Estoque
  const [isReporModalOpen, setIsReporModalOpen] = useState(false)
  const [reporProd, setReporProd] = useState<Produto | null>(null)
  const [reporQtd, setReporQtd] = useState('50')

  const [prodForm, setProdForm] = useState<{
    nome: string
    categoria_id: string
    preco: string
    codigo_rapido: string
    emite_ficha_individual: boolean
    ativo: boolean
    descricao: string
    is_combo: boolean
    itens_combo: ComboItem[]
    imagem_base64?: string
    imprimir_imagem_ficha?: boolean
    controla_estoque: boolean
    estoque_atual: string
    estoque_minimo: string
  }>({
    nome: '',
    categoria_id: categorias.find((c) => c.ativo !== false)?.id || categorias[0]?.id || '',
    preco: '',
    codigo_rapido: '',
    emite_ficha_individual: true,
    ativo: true,
    descricao: '',
    is_combo: false,
    itens_combo: [],
    imagem_base64: undefined,
    imprimir_imagem_ficha: false,
    controla_estoque: false,
    estoque_atual: '',
    estoque_minimo: '10',
  })

  const categoriasAtivas = categorias.filter((c) => c.ativo !== false)
  const categoriasParaSelect = categorias // mostra todas no select (inclui inativas já vinculadas)

  // Filtragem de Produtos
  const filteredProdutos = produtos.filter((prod) => {
    const matchCat = selectedCatFilter === 'todas' || prod.categoria_id === selectedCatFilter
    const q = searchQuery.toLowerCase()
    const matchQuery =
      prod.nome.toLowerCase().includes(q) || prod.codigo_rapido.toLowerCase().includes(q)
    return matchCat && matchQuery
  })

  // Abertura de Modal de Produto
  const handleOpenNewProd = () => {
    setEditingProdId(null)
    setProdForm({
      nome: '',
      categoria_id: categoriasAtivas[0]?.id || categorias[0]?.id || '',
      preco: '',
      codigo_rapido: String(produtos.length + 101),
      emite_ficha_individual: true,
      ativo: true,
      descricao: '',
      is_combo: false,
      itens_combo: [],
      imagem_base64: undefined,
      imprimir_imagem_ficha: false,
      controla_estoque: false,
      estoque_atual: '',
      estoque_minimo: '10',
    })
    setIsProdModalOpen(true)
  }

  const handleOpenEditProd = (prod: Produto) => {
    setEditingProdId(prod.id)
    setProdForm({
      nome: prod.nome,
      categoria_id: prod.categoria_id,
      preco: prod.preco.toString(),
      codigo_rapido: prod.codigo_rapido,
      emite_ficha_individual: true,
      ativo: prod.ativo,
      descricao: prod.descricao || '',
      is_combo: !!prod.is_combo,
      itens_combo: prod.itens_combo ? [...prod.itens_combo] : [],
      imagem_base64: prod.imagem_base64,
      imprimir_imagem_ficha: prod.imprimir_imagem_ficha ?? false,
      controla_estoque: !!prod.controla_estoque,
      estoque_atual: prod.estoque_atual !== undefined ? String(prod.estoque_atual) : '',
      estoque_minimo: prod.estoque_minimo !== undefined ? String(prod.estoque_minimo) : '10',
    })
    setIsProdModalOpen(true)
  }

  const handleOpenReporEstoque = (prod: Produto) => {
    setReporProd(prod)
    setReporQtd('50')
    setIsReporModalOpen(true)
  }

  const handleConfirmRepor = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reporProd) return
    const qtdNum = parseInt(reporQtd, 10) || 0
    if (qtdNum <= 0) {
      toast.error('Informe uma quantidade válida para reposição.')
      return
    }
    reporEstoque(reporProd.id, qtdNum)
    setIsReporModalOpen(false)
    setReporProd(null)
  }

  const handleSaveProd = (e: React.FormEvent) => {
    e.preventDefault()
    const precoNum = parseFloat(prodForm.preco.replace(',', '.')) || 0
    if (!prodForm.nome.trim()) {
      toast.error('Informe o nome do produto.')
      return
    }
    if (!prodForm.codigo_rapido.trim()) {
      toast.error('Informe o código rápido.')
      return
    }
    if (precoNum <= 0) {
      toast.error('Informe um preço válido maior que zero.')
      return
    }
    if (!prodForm.categoria_id) {
      toast.error('Selecione uma categoria. Cadastre uma categoria antes, se necessário.')
      return
    }

    const codigoNorm = prodForm.codigo_rapido.trim()
    const codigoDuplicado = produtos.some(
      (p) => p.codigo_rapido === codigoNorm && p.id !== editingProdId,
    )
    if (codigoDuplicado) {
      toast.error(`Já existe um produto com o código #${codigoNorm}.`)
      return
    }

    if (prodForm.is_combo && prodForm.itens_combo.length === 0) {
      toast.error('Adicione ao menos um item na composição do combo.')
      return
    }

    const payload = {
      ...prodForm,
      nome: prodForm.nome.trim(),
      codigo_rapido: codigoNorm,
      preco: precoNum,
      imagem_base64: prodForm.imagem_base64,
      // Foto é só para a tela de venda — nunca na ficha térmica
      imprimir_imagem_ficha: false,
      controla_estoque: prodForm.controla_estoque,
      estoque_atual:
        prodForm.controla_estoque && prodForm.estoque_atual !== ''
          ? Math.max(0, parseInt(prodForm.estoque_atual, 10) || 0)
          : undefined,
      estoque_minimo:
        prodForm.controla_estoque && prodForm.estoque_minimo !== ''
          ? Math.max(0, parseInt(prodForm.estoque_minimo, 10) || 0)
          : undefined,
    }

    if (editingProdId) {
      updateProduto(editingProdId, payload)
    } else {
      addProduto(payload)
    }
    setIsProdModalOpen(false)
  }

  const handleDuplicateProd = (prod: Produto) => {
    setEditingProdId(null)
    setProdForm({
      nome: `${prod.nome} (cópia)`,
      categoria_id: prod.categoria_id,
      preco: prod.preco.toString(),
      codigo_rapido: String(produtos.length + 101),
      emite_ficha_individual: true,
      ativo: true,
      descricao: prod.descricao || '',
      is_combo: !!prod.is_combo,
      itens_combo: prod.itens_combo ? [...prod.itens_combo] : [],
      imagem_base64: prod.imagem_base64,
      imprimir_imagem_ficha: prod.imprimir_imagem_ficha ?? false,
      controla_estoque: !!prod.controla_estoque,
      estoque_atual: prod.estoque_atual !== undefined ? String(prod.estoque_atual) : '',
      estoque_minimo: prod.estoque_minimo !== undefined ? String(prod.estoque_minimo) : '10',
    })
    setIsProdModalOpen(true)
  }

  const handleConfirmDeleteProd = () => {
    if (!prodToDelete) return
    deleteProduto(prodToDelete.id)
    setProdToDelete(null)
  }

  // Combos: Adicionar item ao combo
  const handleAddComboSubItem = (produtoId: string) => {
    setProdForm((prev) => {
      const existing = prev.itens_combo.find((it) => it.produto_id === produtoId)
      if (existing) {
        return {
          ...prev,
          itens_combo: prev.itens_combo.map((it) =>
            it.produto_id === produtoId ? { ...it, quantidade: it.quantidade + 1 } : it,
          ),
        }
      }
      return {
        ...prev,
        itens_combo: [...prev.itens_combo, { produto_id: produtoId, quantidade: 1 }],
      }
    })
  }

  const handleRemoveComboSubItem = (produtoId: string) => {
    setProdForm((prev) => ({
      ...prev,
      itens_combo: prev.itens_combo.filter((it) => it.produto_id !== produtoId),
    }))
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-background text-foreground">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Layers className="w-7 h-7 text-primary" />
            Catálogo de Produtos & Combos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre produtos para o balcão, configure regras de emissão de fichas e monte combos
            com desmembramento automático.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'produtos' ? (
            <Button
              onClick={handleOpenNewProd}
              className="bg-primary hover:bg-primary/90 font-bold gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          ) : (
            <Button
              onClick={() => setCatCreateSignal((n) => n + 1)}
              className="bg-primary hover:bg-primary/90 font-bold gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Categoria
            </Button>
          )}
        </div>
      </div>

      {/* ABAS: PRODUTOS VS CATEGORIAS */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('produtos')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'produtos'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Package className="w-4 h-4" />
          Produtos ({produtos.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categorias')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'categorias'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Palette className="w-4 h-4" />
          Categorias ({categorias.length})
        </button>
      </div>

      {/* CONTEÚDO DA ABA: PRODUTOS */}
      {activeTab === 'produtos' && (
        <div className="space-y-4">
          {/* BARRA DE PESQUISA & FILTRO POR CATEGORIA */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar produtos por nome ou código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 text-sm"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/30 shrink-0 self-end sm:self-auto">
                <Button
                  type="button"
                  variant={viewMode === 'lista' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('lista')}
                  className="h-8 px-2.5 gap-1.5 text-xs font-bold"
                  title="Visualização em lista"
                >
                  <List className="w-3.5 h-3.5" />
                  Lista
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'grade' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grade')}
                  className="h-8 px-2.5 gap-1.5 text-xs font-bold"
                  title="Visualização em grade com fotos"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grade
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full">
              <Button
                variant={selectedCatFilter === 'todas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCatFilter('todas')}
                className="text-xs font-bold shrink-0"
              >
                Todas
              </Button>
              {categorias.map((c) => {
                const CatIcon = getCategoryIcon(c.icone)
                return (
                  <Button
                    key={c.id}
                    variant={selectedCatFilter === c.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCatFilter(c.id)}
                    className="text-xs font-bold shrink-0 gap-1.5"
                  >
                    <span
                      className="w-4 h-4 rounded-full inline-flex items-center justify-center text-white"
                      style={{ backgroundColor: c.cor }}
                    >
                      <CatIcon className="w-2.5 h-2.5" />
                    </span>
                    {c.nome}
                    {c.ativo === false && (
                      <span className="text-[9px] opacity-70">(oculta)</span>
                    )}
                  </Button>
                )
              })}
            </div>
          </div>

          {filteredProdutos.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl bg-card/50 p-10 text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Package className="w-7 h-7 text-muted-foreground opacity-60" />
              </div>
              <div>
                <p className="font-bold text-foreground">Nenhum produto encontrado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {produtos.length === 0
                    ? 'Cadastre o primeiro produto com foto para agilizar o atendimento no balcão.'
                    : 'Ajuste a busca ou o filtro de categoria.'}
                </p>
              </div>
              {produtos.length === 0 && (
                <Button
                  onClick={handleOpenNewProd}
                  className="bg-primary hover:bg-primary/90 font-bold gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar produto
                </Button>
              )}
            </div>
          ) : viewMode === 'grade' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProdutos.map((prod) => {
                const cat = categorias.find((c) => c.id === prod.categoria_id)
                const isControlled = prod.controla_estoque && prod.estoque_atual !== undefined
                const estoqueQtd = prod.estoque_atual ?? 0
                const isEsgotado = isControlled && estoqueQtd <= 0

                return (
                  <div
                    key={prod.id}
                    className="group rounded-2xl border border-border bg-card overflow-hidden shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative aspect-square bg-muted/40 overflow-hidden">
                      {prod.imagem_base64 ? (
                        <img
                          src={prod.imagem_base64}
                          alt={prod.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                          <ImageIcon className="w-10 h-10 opacity-30" />
                          <span className="text-[10px] font-semibold opacity-60">Sem foto</span>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-background/90 text-muted-foreground border border-border">
                        #{prod.codigo_rapido}
                      </span>
                      {!prod.ativo && (
                        <span className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-1 gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                          {prod.nome}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className="font-semibold text-[9px]"
                            style={{ borderColor: cat?.cor, color: cat?.cor }}
                          >
                            {cat?.nome || '—'}
                          </Badge>
                          {prod.is_combo && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[9px] uppercase font-bold py-0">
                              Combo
                            </Badge>
                          )}
                          {isEsgotado && (
                            <Badge variant="destructive" className="text-[9px] font-bold py-0">
                              Esgotado
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/60">
                        <span className="font-mono font-black text-sm">
                          {formatCurrency(prod.preco)}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateProd(prod)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Duplicar"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditProd(prod)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProdToDelete(prod)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
          /* TABELA DE PRODUTOS */
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs overflow-x-auto">
            <table className="w-full text-xs text-left min-w-[720px]">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
                <tr>
                  <th className="p-3">Cód.</th>
                  <th className="p-3">Foto</th>
                  <th className="p-3">Nome do Produto</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Estoque</th>
                  <th className="p-3">Emissão de Ficha</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProdutos.map((prod) => {
                    const cat = categorias.find((c) => c.id === prod.categoria_id)
                    const isControlled = prod.controla_estoque && prod.estoque_atual !== undefined
                    const estoqueQtd = prod.estoque_atual ?? 0
                    const estoqueMin = prod.estoque_minimo ?? 10
                    const isEsgotado = isControlled && estoqueQtd <= 0
                    const isBaixo = isControlled && !isEsgotado && estoqueQtd <= estoqueMin

                    return (
                      <tr key={prod.id} className="hover:bg-muted/20">
                        <td className="p-3 font-mono font-bold text-muted-foreground">
                          #{prod.codigo_rapido}
                        </td>
                        <td className="p-3">
                          {prod.imagem_base64 ? (
                            <img
                              src={prod.imagem_base64}
                              alt={prod.nome}
                              className="w-10 h-10 object-cover rounded-lg border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              <ImageIcon className="w-5 h-5 opacity-40" />
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{prod.nome}</span>
                            {prod.is_combo && (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[9px] uppercase font-bold py-0">
                                Combo ({prod.itens_combo?.length || 0} itens)
                              </Badge>
                            )}
                          </div>
                          {prod.descricao && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              {prod.descricao}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="font-semibold text-[10px]"
                            style={{ borderColor: cat?.cor, color: cat?.cor }}
                          >
                            {cat?.nome || 'Sem categoria'}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono font-bold text-sm">
                          {formatCurrency(prod.preco)}
                        </td>

                        {/* COLUNA DE ESTOQUE COM DESTAQUE VISUAL E BOTÃO DE REPOSIÇÃO */}
                        <td className="p-3">
                          {isControlled ? (
                            <div className="flex items-center gap-2">
                              {isEsgotado ? (
                                <Badge
                                  variant="destructive"
                                  className="font-mono font-black text-[11px] px-2"
                                >
                                  0 un (Esgotado)
                                </Badge>
                              ) : isBaixo ? (
                                <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-mono font-bold text-[11px] px-2">
                                  {estoqueQtd} un (Baixo)
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="font-mono font-bold text-[11px] px-2 text-foreground border-emerald-500/50 bg-emerald-500/5"
                                >
                                  {estoqueQtd} un
                                </Badge>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReporEstoque(prod)}
                                className="h-6 px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10"
                                title="Reposição rápida de estoque"
                              >
                                + Repor
                              </Button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">
                              Não controlado
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          {prod.is_combo ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              Desmembra em fichas individuais
                            </span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                              1 Ficha por unidade
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {prod.ativo ? (
                            <span className="text-emerald-600 flex items-center gap-1 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> Inativo
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-0.5 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateProd(prod)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Duplicar produto"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditProd(prod)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProdToDelete(prod)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA: CATEGORIAS */}
      {activeTab === 'categorias' && <CategoriesPanel createSignal={catCreateSignal} />}

      {/* MODAL: CRIAR / EDITAR PRODUTO */}
      <Dialog open={isProdModalOpen} onOpenChange={setIsProdModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-background text-foreground border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingProdId ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProd} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Nome do Produto
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Cerveja Lata 350ml"
                  value={prodForm.nome}
                  onChange={(e) => setProdForm({ ...prodForm, nome: e.target.value })}
                  required
                  className="h-11 font-semibold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Categoria
                </Label>
                <select
                  value={prodForm.categoria_id}
                  onChange={(e) => setProdForm({ ...prodForm, categoria_id: e.target.value })}
                  className="w-full h-11 px-3 rounded-md border border-input bg-background text-foreground text-sm font-medium"
                >
                  {categoriasParaSelect.length === 0 && (
                    <option value="">Cadastre uma categoria primeiro</option>
                  )}
                  {categoriasParaSelect.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                      {c.ativo === false ? ' (oculta no PDV)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setIsProdModalOpen(false)
                    setActiveTab('categorias')
                    setCatCreateSignal((n) => n + 1)
                  }}
                  className="text-[11px] text-primary font-semibold mt-1.5 hover:underline"
                >
                  + Gerenciar / criar categorias
                </button>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Código Rápido / Atalho
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: 101"
                  value={prodForm.codigo_rapido}
                  onChange={(e) => setProdForm({ ...prodForm, codigo_rapido: e.target.value })}
                  required
                  className="h-11 font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Preço de Venda (R$)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={prodForm.preco}
                  onChange={(e) => setProdForm({ ...prodForm, preco: e.target.value })}
                  required
                  className="h-11 font-mono font-black text-lg"
                />
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Descrição Opcional
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Lata gelada 350ml"
                  value={prodForm.descricao}
                  onChange={(e) => setProdForm({ ...prodForm, descricao: e.target.value })}
                  className="h-11 text-sm"
                />
              </div>
            </div>

            {/* CONTROLE DE ESTOQUE */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    Controle de Estoque
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Se ativado, cada ficha emitida baixa a quantidade física em estoque.
                  </div>
                </div>
                <Switch
                  checked={prodForm.controla_estoque}
                  onCheckedChange={(val) => setProdForm({ ...prodForm, controla_estoque: val })}
                />
              </div>

              {prodForm.controla_estoque && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                      Quantidade Atual em Estoque
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Ex: 100"
                      value={prodForm.estoque_atual}
                      onChange={(e) => setProdForm({ ...prodForm, estoque_atual: e.target.value })}
                      required={prodForm.controla_estoque}
                      className="h-10 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                      Alerta de Estoque Baixo (Mínimo)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Ex: 10"
                      value={prodForm.estoque_minimo}
                      onChange={(e) => setProdForm({ ...prodForm, estoque_minimo: e.target.value })}
                      className="h-10 font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <ProductImagePicker
              value={prodForm.imagem_base64}
              onChange={(base64) =>
                setProdForm((prev) => ({
                  ...prev,
                  imagem_base64: base64,
                }))
              }
            />

            {/* SWITCHES: COMBO */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    Produto ativo no PDV
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Desative para ocultar do balcão sem excluir o cadastro.
                  </div>
                </div>
                <Switch
                  checked={prodForm.ativo}
                  onCheckedChange={(val) => setProdForm({ ...prodForm, ativo: val })}
                />
              </div>

              <div className="p-3 rounded-lg bg-background border border-border text-[11px] text-muted-foreground">
                <strong className="text-foreground">Emissão de fichas:</strong> sempre 1 ficha
                térmica por unidade vendida (ex.: 10 Coca-Colas = 10 fichas).
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    É um Combo / Pacote com Desmembramento
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Gera fichas individuais para cada unidade dos itens componentes na finalização.
                  </div>
                </div>
                <Switch
                  checked={prodForm.is_combo}
                  onCheckedChange={(val) => setProdForm({ ...prodForm, is_combo: val })}
                />
              </div>
            </div>

            {/* ITENS DO COMBO (SE ATIVADO) */}
            {prodForm.is_combo && (
              <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-emerald-700 dark:text-emerald-300">
                    Composição do Combo (Fichas Geradas)
                  </span>
                </div>

                <div className="space-y-2">
                  {prodForm.itens_combo.map((sub, idx) => {
                    const subProd = produtos.find((p) => p.id === sub.produto_id)
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs"
                      >
                        <span className="font-bold">{subProd?.nome || 'Item'}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted">
                            {sub.quantidade} un
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveComboSubItem(sub.produto_id)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground block mb-1">
                    Adicionar item à composição do combo:
                  </Label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddComboSubItem(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    defaultValue=""
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="" disabled>
                      + Selecione um produto para incluir no combo...
                    </option>
                    {produtos
                      .filter((p) => !p.is_combo)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome} ({formatCurrency(p.preco)})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsProdModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 font-bold">
                Salvar Produto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: REPOSIÇÃO RÁPIDA DE ESTOQUE */}
      <Dialog open={isReporModalOpen} onOpenChange={setIsReporModalOpen}>
        <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Reposição Rápida de Estoque
            </DialogTitle>
          </DialogHeader>

          {reporProd && (
            <form onSubmit={handleConfirmRepor} className="space-y-4 py-2">
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-xs text-muted-foreground block font-bold uppercase">
                  Produto Selecionado
                </span>
                <span className="text-base font-black text-foreground block mt-0.5">
                  {reporProd.nome}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>Estoque atual:</span>
                  <Badge variant="outline" className="font-mono font-black text-xs">
                    {reporProd.estoque_atual ?? 0} un
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                  Quantidade a Adicionar (+Estoque)
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={reporQtd}
                  onChange={(e) => setReporQtd(e.target.value)}
                  required
                  autoFocus
                  className="h-12 text-2xl font-black font-mono"
                />
                <div className="flex gap-2 mt-2">
                  {[10, 20, 50, 100].map((val) => (
                    <Button
                      key={val}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReporQtd(String(val))}
                      className="text-xs font-mono font-bold"
                    >
                      +{val}
                    </Button>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsReporModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 font-bold">
                  Confirmar Reposição
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!prodToDelete} onOpenChange={(open) => !open && setProdToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto <strong>{prodToDelete?.nome}</strong> será removido do catálogo. Esta ação
              não pode ser desfeita. Preferindo apenas ocultar no balcão, edite e desative o
              produto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteProd}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
