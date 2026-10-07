import { useMemo } from 'react'
import { getCategoryIcon } from '@/lib/categoryIcons'
import type { Categoria, Produto } from '@/types/pos'

export const TODAS_CATEGORIAS = 'todas'

interface CategoryBarProps {
  categorias: Categoria[]
  produtos: Produto[]
  selecionada: string
  onSelect: (categoriaId: string) => void
}

/** Filtro por categoria (botões grandes para toque), com contagem de produtos ativos. */
export function CategoryBar({ categorias, produtos, selecionada, onSelect }: CategoryBarProps) {
  const { totalAtivos, porCategoria } = useMemo(() => {
    const contagem = new Map<string, number>()
    let total = 0
    for (const p of produtos) {
      if (!p.ativo) continue
      total++
      contagem.set(p.categoria_id, (contagem.get(p.categoria_id) ?? 0) + 1)
    }
    return { totalAtivos: total, porCategoria: contagem }
  }, [produtos])

  return (
    <div className="p-3 bg-muted/30 border-b border-border overflow-x-auto flex items-center gap-2 no-scrollbar">
      <button
        type="button"
        onClick={() => onSelect(TODAS_CATEGORIAS)}
        aria-pressed={selecionada === TODAS_CATEGORIAS}
        className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0 transition-all ${
          selecionada === TODAS_CATEGORIAS
            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-105'
            : 'bg-card text-muted-foreground hover:bg-muted border border-border'
        }`}
      >
        Todos ({totalAtivos})
      </button>
      {categorias.map((cat) => {
        const ativa = selecionada === cat.id
        const CatIcon = getCategoryIcon(cat.icone)
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            aria-pressed={ativa}
            className={`px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shrink-0 transition-all flex items-center gap-2 border ${
              ativa ? 'text-white shadow-md scale-105 border-transparent' : 'bg-card text-foreground hover:bg-muted border-border'
            }`}
            style={{ backgroundColor: ativa ? cat.cor : undefined, borderColor: ativa ? cat.cor : undefined }}
          >
            <span
              className={`w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 ${
                ativa ? 'bg-white/20 text-white' : 'text-white'
              }`}
              style={{ backgroundColor: ativa ? undefined : cat.cor }}
            >
              <CatIcon className="w-3 h-3" />
            </span>
            <span>{cat.nome}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${ativa ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'}`}
            >
              {porCategoria.get(cat.id) ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}
