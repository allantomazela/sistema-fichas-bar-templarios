import React, { useState } from 'react'
import { usePos } from '@/context/PosContext'
import { Produto, Categoria, ComboItem } from '@/types/pos'
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
  Layers,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Package,
  Search,
  Tag,
  Palette,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  X,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ProductsManager() {
  const {
    categorias,
    produtos,
    addCategoria,
    updateCategoria,
    deleteCategoria,
    addProduto,
    updateProduto,
    deleteProduto,
    reporEstoque,
  } = usePos()

  const [activeTab, setActiveTab] = useState<'produtos' | 'categorias'>('produtos')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCatFilter, setSelectedCatFilter] = useState('todas')

  // Modal Produto
  const [isProdModalOpen, setIsProdModalOpen] = useState(false)
  const [editingProdId, setEditingProdId] = useState<string | null>(null)
  const [prodImageInputRef, setProdImageInputRef] = useState<HTMLInputElement | null>(null)

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
    categoria_id: categorias[0]?.id || '',
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

  // Modal Categoria
  const [isCatModalOpen, setIsCatModalOpen] = useState(false)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState<{
    nome: string
    cor: string
    ordem: number
  }>({
    nome: '',
    cor: '#2563EB',
    ordem: categorias.length + 1,
  })

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
      categoria_id: categorias[0]?.id || '',
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
      emite_ficha_individual: prod.emite_ficha_individual,
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

  // Upload local de imagem de produto (base64 offline)
  const handleProdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida (PNG, JPG, WebP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setProdForm((prev) => ({ ...prev, imagem_base64: base64 }))
      toast.success('Imagem carregada com sucesso!')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveProd = (e: React.FormEvent) => {
    e.preventDefault()
    const precoNum = parseFloat(prodForm.preco.replace(',', '.')) || 0
    if (!prodForm.nome.trim()) {
      toast.error('Informe o nome do produto.')
      return
    }

    const payload = {
      ...prodForm,
      preco: precoNum,
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

  // Abertura de Modal de Categoria
  const handleOpenNewCat = () => {
    setEditingCatId(null)
    setCatForm({
      nome: '',
      cor: '#2563EB',
      ordem: categorias.length + 1,
    })
    setIsCatModalOpen(true)
  }

  const handleOpenEditCat = (cat: Categoria) => {
    setEditingCatId(cat.id)
    setCatForm({
      nome: cat.nome,
      cor: cat.cor,
      ordem: cat.ordem,
    })
    setIsCatModalOpen(true)
  }

  const handleSaveCat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!catForm.nome.trim()) {
      toast.error('Informe o nome da categoria.')
      return
    }

    if (editingCatId) {
      updateCategoria(editingCatId, catForm)
    } else {
      addCategoria(catForm)
    }
    setIsCatModalOpen(false)
  }

  const coresPredefinidas = [
    '#2563EB', // Azul
    '#EA580C', // Laranja
    '#EC4899', // Rosa
    '#8B5CF6', // Roxo
    '#059669', // Verde
    '#DC2626', // Vermelho
    '#D97706', // Amarelo/Âmbar
    '#4F46E5', // Índigo
    '#0891B2', // Ciano
    '#475569', // Cinza
  ]

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
              onClick={handleOpenNewCat}
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
          <div className="flex flex-col sm:flex-row items-center gap-3">
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

            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <Button
                variant={selectedCatFilter === 'todas' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCatFilter('todas')}
                className="text-xs font-bold shrink-0"
              >
                Todas
              </Button>
              {categorias.map((c) => (
                <Button
                  key={c.id}
                  variant={selectedCatFilter === c.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCatFilter(c.id)}
                  className="text-xs font-bold shrink-0 gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: c.cor }}
                  />
                  {c.nome}
                </Button>
              ))}
            </div>
          </div>

          {/* TABELA DE PRODUTOS */}
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
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
                {filteredProdutos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      Nenhum produto cadastrado com esses filtros.
                    </td>
                  </tr>
                ) : (
                  filteredProdutos.map((prod) => {
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
                          ) : prod.emite_ficha_individual !== false ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                              1 Ficha por unidade
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                              Cupom único (sem ficha individual)
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
                        <td className="p-3 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditProd(prod)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Deseja remover o produto "${prod.nome}"?`)) {
                                deleteProduto(prod.id)
                              }
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA ABA: CATEGORIAS */}
      {activeTab === 'categorias' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((cat) => {
            const count = produtos.filter((p) => p.categoria_id === cat.id).length
            return (
              <div
                key={cat.id}
                className="p-4 rounded-2xl border border-border bg-card shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: cat.cor }}
                  >
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{cat.nome}</h4>
                    <p className="text-xs text-muted-foreground">{count} produto(s) associado(s)</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditCat(cat)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Deseja excluir a categoria "${cat.nome}"?`)) {
                        deleteCategoria(cat.id)
                      }
                    }}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
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

            {/* UPLOAD LOCAL DA FOTO DO PRODUTO (BASE64 OFFLINE) */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <Label className="text-xs font-bold uppercase text-muted-foreground block">
                Imagem do Produto (Offline / Base64)
              </Label>
              <input
                ref={(el) => setProdImageInputRef(el)}
                type="file"
                accept="image/*"
                onChange={handleProdImageChange}
                className="hidden"
              />
              <div className="flex items-center gap-4">
                {prodForm.imagem_base64 ? (
                  <div className="relative group">
                    <img
                      src={prodForm.imagem_base64}
                      alt="Prévia do Produto"
                      className="w-20 h-20 object-cover rounded-xl border-2 border-primary/40 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setProdForm((prev) => ({ ...prev, imagem_base64: undefined }))}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      title="Remover imagem"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => prodImageInputRef?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/60 cursor-pointer flex flex-col items-center justify-center text-muted-foreground hover:text-foreground bg-background transition-all shrink-0"
                  >
                    <ImageIcon className="w-6 h-6 mb-1 opacity-60" />
                    <span className="text-[10px] font-bold">Adicionar</span>
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => prodImageInputRef?.click()}
                      className="text-xs font-semibold gap-1.5 h-8"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {prodForm.imagem_base64 ? 'Alterar Foto' : 'Selecionar Foto'}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Aparece no card touch do PDV para facilitar a identificação rápida pelo
                    operador.
                  </p>

                  {/* OPÇÃO DE IMPRIMIR NA FICHA */}
                  {prodForm.imagem_base64 && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          Imprimir foto na ficha
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Imprime versão PB térmica na ficha
                        </p>
                      </div>
                      <Switch
                        checked={!!prodForm.imprimir_imagem_ficha}
                        onCheckedChange={(val) =>
                          setProdForm({ ...prodForm, imprimir_imagem_ficha: val })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SWITCHES: INDIVIDUAL & COMBO */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs">Emissão de Fichas Térmicas</div>
                  <div className="text-[11px] text-muted-foreground">
                    {prodForm.emite_ficha_individual
                      ? 'Emite 1 ficha térmica individual para cada unidade (padrão obrigatório do PDV).'
                      : 'Cupom único: não emite ficha individual (gera comprovante único por item).'}
                  </div>
                </div>
                <Switch
                  checked={prodForm.emite_ficha_individual}
                  onCheckedChange={(val) =>
                    setProdForm({ ...prodForm, emite_ficha_individual: val })
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
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

      {/* MODAL: CRIAR / EDITAR CATEGORIA */}
      <Dialog open={isCatModalOpen} onOpenChange={setIsCatModalOpen}>
        <DialogContent className="max-w-md bg-background text-foreground border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingCatId ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCat} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Nome da Categoria
              </Label>
              <Input
                type="text"
                placeholder="Ex: Bebidas Artesanais"
                value={catForm.nome}
                onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })}
                required
                className="h-11 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Cor de Identificação Visual (Botões do PDV)
              </Label>
              <div className="flex flex-wrap gap-2 my-2">
                {coresPredefinidas.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setCatForm({ ...catForm, cor: color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      catForm.cor === color ? 'scale-125 ring-2 ring-primary ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Input
                type="text"
                value={catForm.cor}
                onChange={(e) => setCatForm({ ...catForm, cor: e.target.value })}
                className="h-9 font-mono text-xs uppercase"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCatModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 font-bold">
                Salvar Categoria
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
