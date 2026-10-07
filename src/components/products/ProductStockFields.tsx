import { Package } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface ProductStockFieldsProps {
  controla: boolean
  atual: string
  minimo: string
  onChange: (campos: { controla_estoque?: boolean; estoque_atual?: string; estoque_minimo?: string }) => void
}

/** Liga/desliga o controle de estoque do produto e define saldo e alerta mínimo. */
export function ProductStockFields({ controla, atual, minimo, onChange }: ProductStockFieldsProps) {
  return (
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
          checked={controla}
          aria-label="Controlar estoque deste produto"
          onCheckedChange={(val) => onChange({ controla_estoque: val })}
        />
      </div>

      {controla && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <Label htmlFor="produto-estoque-atual" className="text-xs font-bold uppercase text-muted-foreground block mb-1">
              Quantidade Atual em Estoque
            </Label>
            <Input
              id="produto-estoque-atual"
              type="number"
              min="0"
              step="1"
              placeholder="Ex: 100"
              value={atual}
              onChange={(e) => onChange({ estoque_atual: e.target.value })}
              required
              className="h-10 font-mono font-bold"
            />
          </div>
          <div>
            <Label htmlFor="produto-estoque-minimo" className="text-xs font-bold uppercase text-muted-foreground block mb-1">
              Alerta de Estoque Baixo (Mínimo)
            </Label>
            <Input
              id="produto-estoque-minimo"
              type="number"
              min="1"
              step="1"
              placeholder="Ex: 10"
              value={minimo}
              onChange={(e) => onChange({ estoque_minimo: e.target.value })}
              className="h-10 font-mono"
            />
          </div>
        </div>
      )}
    </div>
  )
}
