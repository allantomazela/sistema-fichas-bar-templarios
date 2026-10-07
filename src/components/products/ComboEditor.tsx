import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import type { ComboItem, Produto } from '@/types/pos'
import { adicionarAoCombo } from './productForm'

interface ComboEditorProps {
  itens: ComboItem[]
  produtos: Produto[]
  onChange: (itens: ComboItem[]) => void
}

/** Composição do combo: cada item vira fichas individuais na finalização da venda. */
export function ComboEditor({ itens, produtos, onChange }: ComboEditorProps) {
  const nomePorId = new Map(produtos.map((p) => [p.id, p.nome]))
  const elegiveis = produtos.filter((p) => !p.is_combo)

  return (
    <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-3">
      <span className="font-bold text-xs uppercase text-emerald-700 dark:text-emerald-300">
        Composição do Combo (Fichas Geradas)
      </span>

      <div className="space-y-2">
        {itens.map((sub) => (
          <div
            key={sub.produto_id}
            className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs"
          >
            <span className="font-bold">{nomePorId.get(sub.produto_id) || 'Item'}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted">{sub.quantidade} un</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remover ${nomePorId.get(sub.produto_id) || 'item'} do combo`}
                onClick={() => onChange(itens.filter((it) => it.produto_id !== sub.produto_id))}
                className="h-6 w-6 p-0 text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Label htmlFor="combo-adicionar" className="text-[11px] text-muted-foreground block mb-1">
          Adicionar item à composição do combo:
        </Label>
        <select
          id="combo-adicionar"
          onChange={(e) => {
            if (e.target.value) {
              onChange(adicionarAoCombo(itens, e.target.value))
              e.target.value = ''
            }
          }}
          defaultValue=""
          className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
        >
          <option value="" disabled>
            + Selecione um produto para incluir no combo...
          </option>
          {elegiveis.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} ({formatCurrency(p.preco)})
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
