import { useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { usePos } from '@/context/PosContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProductImagePicker } from './ProductImagePicker'
import { ProductStockFields } from './ProductStockFields'
import { ComboEditor } from './ComboEditor'
import { validarFormulario, type ProductFormState } from './productForm'

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Valores iniciais. Monte o diálogo com uma `key` nova a cada abertura para reiniciar o formulário. */
  inicial: ProductFormState
  editandoId: string | null
  onGerenciarCategorias: () => void
}

/** Cadastro/edição de produto: dados, estoque, foto (só na tela) e composição de combo. */
export function ProductFormDialog(props: ProductFormDialogProps) {
  const { categorias, produtos, addProduto, updateProduto } = usePos()
  const [form, setForm] = useState(props.inicial)
  const alterar = (campos: Partial<ProductFormState>) => setForm((prev) => ({ ...prev, ...campos }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const resultado = validarFormulario(form, produtos, props.editandoId)
    if ('erro' in resultado) {
      toast.error(resultado.erro)
      return
    }
    if (props.editandoId) updateProduto(props.editandoId, resultado.produto)
    else addProduto(resultado.produto)
    props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-background text-foreground border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {props.editandoId ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoTexto
              id="produto-nome"
              rotulo="Nome do Produto"
              className="md:col-span-2"
              inputClassName="h-11 font-semibold"
              placeholder="Ex: Cerveja Lata 350ml"
              value={form.nome}
              onChange={(nome) => alterar({ nome })}
              required
            />

            <div>
              <Label htmlFor="produto-categoria" className={CLASSE_ROTULO}>
                Categoria
              </Label>
              <select
                id="produto-categoria"
                value={form.categoria_id}
                onChange={(e) => alterar({ categoria_id: e.target.value })}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-foreground text-sm font-medium"
              >
                {categorias.length === 0 && <option value="">Cadastre uma categoria primeiro</option>}
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.ativo === false ? ' (oculta no PDV)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={props.onGerenciarCategorias}
                className="text-[11px] text-primary font-semibold mt-1.5 hover:underline"
              >
                + Gerenciar / criar categorias
              </button>
            </div>

            <CampoTexto
              id="produto-codigo"
              rotulo="Código Rápido / Atalho"
              inputClassName="h-11 font-mono font-bold"
              placeholder="Ex: 101"
              value={form.codigo_rapido}
              onChange={(codigo_rapido) => alterar({ codigo_rapido })}
              required
            />
            <CampoTexto
              id="produto-preco"
              rotulo="Preço de Venda (R$)"
              type="number"
              step="0.01"
              inputClassName="h-11 font-mono font-black text-lg"
              placeholder="0.00"
              value={form.preco}
              onChange={(preco) => alterar({ preco })}
              required
            />
            <CampoTexto
              id="produto-descricao"
              rotulo="Descrição Opcional"
              inputClassName="h-11 text-sm"
              placeholder="Ex: Lata gelada 350ml"
              value={form.descricao}
              onChange={(descricao) => alterar({ descricao })}
            />
          </div>

          <ProductStockFields
            controla={form.controla_estoque}
            atual={form.estoque_atual}
            minimo={form.estoque_minimo}
            onChange={alterar}
          />

          <ProductImagePicker value={form.imagem_base64} onChange={(imagem_base64) => alterar({ imagem_base64 })} />

          <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
            <LinhaSwitch
              icone={<CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
              titulo="Produto ativo no PDV"
              descricao="Desative para ocultar do balcão sem excluir o cadastro."
              checked={form.ativo}
              onChange={(ativo) => alterar({ ativo })}
            />
            <div className="p-3 rounded-lg bg-background border border-border text-[11px] text-muted-foreground">
              <strong className="text-foreground">Emissão de fichas:</strong> sempre 1 ficha térmica por
              unidade vendida (ex.: 10 Coca-Colas = 10 fichas).
            </div>
            <LinhaSwitch
              icone={<Sparkles className="w-3.5 h-3.5 text-emerald-500" />}
              titulo="É um Combo / Pacote com Desmembramento"
              descricao="Gera fichas individuais para cada unidade dos itens componentes na finalização."
              checked={form.is_combo}
              onChange={(is_combo) => alterar({ is_combo })}
            />
          </div>

          {form.is_combo && (
            <ComboEditor
              itens={form.itens_combo}
              produtos={produtos}
              onChange={(itens_combo) => alterar({ itens_combo })}
            />
          )}

          <DialogFooter className="pt-4 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 font-bold">
              Salvar Produto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface CampoTextoProps {
  id: string
  rotulo: string
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  type?: 'text' | 'number'
  step?: string
  required?: boolean
  className?: string
  inputClassName?: string
}

function CampoTexto({ id, rotulo, onChange, className, inputClassName, type = 'text', ...input }: CampoTextoProps) {
  return (
    <div className={className}>
      <Label htmlFor={id} className={CLASSE_ROTULO}>
        {rotulo}
      </Label>
      <Input id={id} type={type} onChange={(e) => onChange(e.target.value)} className={inputClassName} {...input} />
    </div>
  )
}

interface LinhaSwitchProps {
  icone: React.ReactNode
  titulo: string
  descricao: string
  checked: boolean
  onChange: (valor: boolean) => void
}

function LinhaSwitch({ icone, titulo, descricao, checked, onChange }: LinhaSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-bold text-xs flex items-center gap-1.5">
          {icone}
          {titulo}
        </div>
        <div className="text-[11px] text-muted-foreground">{descricao}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={titulo} />
    </div>
  )
}

const CLASSE_ROTULO = 'text-xs font-bold uppercase text-muted-foreground block mb-1'
