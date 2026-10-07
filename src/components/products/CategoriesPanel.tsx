import React, { useEffect, useMemo, useState } from 'react'
import { usePos } from '@/context/PosContext'
import { Categoria } from '@/types/pos'
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
import {
  CATEGORY_COLOR_PRESETS,
  CATEGORY_ICON_OPTIONS,
  getCategoryIcon,
} from '@/lib/categoryIcons'
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Search,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'

type CategoriesPanelProps = {
  createSignal?: number
}

export function CategoriesPanel({ createSignal = 0 }: CategoriesPanelProps) {
  const {
    categorias,
    produtos,
    addCategoria,
    updateCategoria,
    deleteCategoria,
    moveCategoria,
  } = usePos()

  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [catToDelete, setCatToDelete] = useState<Categoria | null>(null)
  const [moveToId, setMoveToId] = useState('')

  const [form, setForm] = useState({
    nome: '',
    cor: '#2563EB',
    icone: 'Tag',
    ordem: 1,
    ativo: true,
    descricao: '',
  })

  const sorted = useMemo(
    () => [...categorias].sort((a, b) => a.ordem - b.ordem),
    [categorias],
  )

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) || (c.descricao || '').toLowerCase().includes(q),
    )
  }, [sorted, searchQuery])

  function countProdutos(catId: string) {
    return produtos.filter((p) => p.categoria_id === catId).length
  }

  function openNew() {
    setEditingId(null)
    setForm({
      nome: '',
      cor: CATEGORY_COLOR_PRESETS[categorias.length % CATEGORY_COLOR_PRESETS.length],
      icone: 'Tag',
      ordem: categorias.length + 1,
      ativo: true,
      descricao: '',
    })
    setIsModalOpen(true)
  }

  useEffect(() => {
    if (createSignal > 0) openNew()
    // openNew é estável o suficiente para este sinal externo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createSignal])

  function openEdit(cat: Categoria) {
    setEditingId(cat.id)
    setForm({
      nome: cat.nome,
      cor: cat.cor,
      icone: cat.icone || 'Tag',
      ordem: cat.ordem,
      ativo: cat.ativo !== false,
      descricao: cat.descricao || '',
    })
    setIsModalOpen(true)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast.error('Informe o nome da categoria.')
      return
    }

    const payload = {
      nome: form.nome.trim(),
      cor: form.cor.trim() || '#2563EB',
      icone: form.icone,
      ordem: form.ordem,
      ativo: form.ativo,
      descricao: form.descricao.trim() || undefined,
    }

    if (editingId) {
      updateCategoria(editingId, payload)
    } else {
      addCategoria(payload)
    }
    setIsModalOpen(false)
  }

  function requestDelete(cat: Categoria) {
    const linked = countProdutos(cat.id)
    setCatToDelete(cat)
    const others = sorted.filter((c) => c.id !== cat.id)
    setMoveToId(others[0]?.id || '')
    if (linked === 0) {
      // still show confirm
    }
  }

  function confirmDelete() {
    if (!catToDelete) return
    const linked = countProdutos(catToDelete.id)
    if (linked > 0) {
      if (!moveToId) {
        toast.error('Escolha uma categoria de destino para os produtos.')
        return
      }
      deleteCategoria(catToDelete.id, moveToId)
    } else {
      deleteCategoria(catToDelete.id)
    }
    setCatToDelete(null)
  }

  const PreviewIcon = getCategoryIcon(form.icone)
  const linkedOnDelete = catToDelete ? countProdutos(catToDelete.id) : 0
  const destinations = sorted.filter((c) => c.id !== catToDelete?.id)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Buscar categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-primary/90 font-bold gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Nova categoria
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        A ordem abaixo é a mesma dos filtros no PDV. Use as setas para priorizar as categorias mais
        vendidas. Categorias inativas ficam ocultas na tela de venda.
      </p>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-10 text-center space-y-3">
          <p className="font-bold text-foreground">Nenhuma categoria encontrada</p>
          <p className="text-xs text-muted-foreground">
            Crie categorias como Cervejas, Drinks, Petiscos para organizar o balcão.
          </p>
          <Button onClick={openNew} className="font-bold gap-2">
            <Plus className="w-4 h-4" />
            Criar primeira categoria
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cat) => {
            const Icon = getCategoryIcon(cat.icone)
            const count = countProdutos(cat.id)
            const isActive = cat.ativo !== false
            const realIndex = sorted.findIndex((c) => c.id === cat.id)
            const canUp = realIndex > 0
            const canDown = realIndex >= 0 && realIndex < sorted.length - 1

            return (
              <div
                key={cat.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-2xl border bg-card shadow-xs ${
                  isActive ? 'border-border' : 'border-dashed border-border opacity-75'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="hidden sm:flex flex-col items-center text-muted-foreground gap-0.5">
                    <GripVertical className="w-4 h-4 opacity-40" />
                    <span className="text-[10px] font-mono font-bold">#{cat.ordem}</span>
                  </div>

                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.cor }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground truncate">{cat.nome}</h4>
                      {!isActive && (
                        <Badge variant="outline" className="text-[10px] font-bold">
                          Oculta no PDV
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {count} produto(s)
                      {cat.descricao ? ` · ${cat.descricao}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap sm:flex-nowrap justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canUp || !!searchQuery}
                    onClick={() => moveCategoria(cat.id, 'up')}
                    className="h-8 w-8 p-0"
                    title="Subir na ordem do PDV"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!canDown || !!searchQuery}
                    onClick={() => moveCategoria(cat.id, 'down')}
                    className="h-8 w-8 p-0"
                    title="Descer na ordem do PDV"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = !isActive
                      updateCategoria(cat.id, { ativo: next }, { silent: true })
                      toast.success(next ? 'Categoria visível no PDV.' : 'Categoria oculta no PDV.')
                    }}
                    className="h-8 gap-1.5 px-2 text-xs font-bold"
                    title={isActive ? 'Ocultar no PDV' : 'Mostrar no PDV'}
                  >
                    {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="hidden md:inline">{isActive ? 'Visível' : 'Oculta'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(cat)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => requestDelete(cat)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[min(92dvh,900px)] overflow-y-auto bg-background text-foreground border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingId ? 'Editar categoria' : 'Nova categoria'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-1">
            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Nome
              </Label>
              <Input
                type="text"
                placeholder="Ex: Cervejas, Drinks, Petiscos"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="h-11 font-semibold"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-1">
                Descrição (opcional)
              </Label>
              <Input
                type="text"
                placeholder="Ex: Geladas e long necks"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="h-10 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">
                Ícone no PDV
              </Label>
              <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
                {CATEGORY_ICON_OPTIONS.map(({ id, label, Icon }) => {
                  const selected = form.icone === id
                  return (
                    <button
                      key={id}
                      type="button"
                      title={label}
                      onClick={() => setForm({ ...form, icone: id })}
                      className={`h-10 rounded-lg border flex items-center justify-center transition-all ${
                        selected
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                          : 'border-border hover:border-primary/40 text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">
                Cor do filtro no PDV
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {CATEGORY_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, cor: color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      form.cor.toLowerCase() === color.toLowerCase()
                        ? 'scale-110 ring-2 ring-primary ring-offset-2'
                        : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                  className="h-10 w-14 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={form.cor}
                  onChange={(e) => setForm({ ...form, cor: e.target.value })}
                  className="h-10 font-mono text-xs uppercase flex-1"
                  placeholder="#2563EB"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <div className="font-bold text-xs">Visível no PDV</div>
                <p className="text-[11px] text-muted-foreground">
                  Desative para ocultar a categoria na tela de venda sem apagar o cadastro.
                </p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(val) => setForm({ ...form, ativo: val })}
              />
            </div>

            {/* Prévia */}
            <div className="p-3 rounded-xl border border-dashed border-border bg-muted/10">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">
                Prévia no PDV
              </Label>
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white text-xs font-bold uppercase"
                  style={{ backgroundColor: form.cor }}
                >
                  <PreviewIcon className="w-3.5 h-3.5" />
                  {form.nome.trim() || 'Categoria'}
                </span>
                {!form.ativo && (
                  <span className="text-[11px] text-muted-foreground">(oculta)</span>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 font-bold">
                Salvar categoria
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!catToDelete} onOpenChange={(open) => !open && setCatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  A categoria <strong className="text-foreground">{catToDelete?.nome}</strong> será
                  removida.
                </p>
                {linkedOnDelete > 0 ? (
                  <div className="space-y-2">
                    <p>
                      Há <strong className="text-foreground">{linkedOnDelete}</strong> produto(s)
                      nesta categoria. Escolha para onde movê-los:
                    </p>
                    {destinations.length === 0 ? (
                      <p className="text-destructive text-xs font-semibold">
                        Crie outra categoria antes de excluir esta (não há destino para os
                        produtos).
                      </p>
                    ) : (
                      <select
                        value={moveToId}
                        onChange={(e) => setMoveToId(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm font-medium"
                      >
                        {destinations.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <p>Nenhum produto vinculado. A exclusão é permanente.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={linkedOnDelete > 0 && destinations.length === 0}
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
