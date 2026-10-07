import { LayoutGrid, List, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getCategoryIcon } from '@/lib/categoryIcons'
import type { Categoria } from '@/types/pos'

export type ModoVisualizacao = 'lista' | 'grade'
export const TODAS = 'todas'

interface ProductFiltersProps {
  busca: string
  onBusca: (valor: string) => void
  modo: ModoVisualizacao
  onModo: (modo: ModoVisualizacao) => void
  categorias: Categoria[]
  categoriaSelecionada: string
  onCategoria: (id: string) => void
}

/** Busca por nome/código, alternância lista/grade e filtro por categoria. */
export function ProductFilters(props: ProductFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            aria-label="Buscar produtos por nome ou código"
            placeholder="Buscar produtos por nome ou código..."
            value={props.busca}
            onChange={(e) => props.onBusca(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>

        <div
          role="group"
          aria-label="Modo de visualização"
          className="flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/30 shrink-0 self-end sm:self-auto"
        >
          {MODOS.map(({ modo, rotulo, titulo, Icone }) => (
            <Button
              key={modo}
              type="button"
              variant={props.modo === modo ? 'default' : 'ghost'}
              size="sm"
              aria-pressed={props.modo === modo}
              onClick={() => props.onModo(modo)}
              className="h-8 px-2.5 gap-1.5 text-xs font-bold"
              title={titulo}
            >
              <Icone className="w-3.5 h-3.5" />
              {rotulo}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto w-full">
        <Button
          variant={props.categoriaSelecionada === TODAS ? 'default' : 'outline'}
          size="sm"
          onClick={() => props.onCategoria(TODAS)}
          className="text-xs font-bold shrink-0"
        >
          Todas
        </Button>
        {props.categorias.map((c) => {
          const CatIcon = getCategoryIcon(c.icone)
          return (
            <Button
              key={c.id}
              variant={props.categoriaSelecionada === c.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => props.onCategoria(c.id)}
              className="text-xs font-bold shrink-0 gap-1.5"
            >
              <span
                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-white"
                style={{ backgroundColor: c.cor }}
              >
                <CatIcon className="w-2.5 h-2.5" />
              </span>
              {c.nome}
              {c.ativo === false && <span className="text-[9px] opacity-70">(oculta)</span>}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

const MODOS = [
  { modo: 'lista' as const, rotulo: 'Lista', titulo: 'Visualização em lista', Icone: List },
  { modo: 'grade' as const, rotulo: 'Grade', titulo: 'Visualização em grade com fotos', Icone: LayoutGrid },
]
