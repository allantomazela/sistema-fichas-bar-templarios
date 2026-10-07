import { useMemo } from 'react'
import { Package } from 'lucide-react'
import { getDisponibilidade } from '@/lib/stock'
import type { CartItem, Categoria, Produto } from '@/types/pos'
import { ProductCard } from './ProductCard'

interface ProductGridProps {
  produtos: Produto[]
  todosProdutos: Produto[]
  imagens: Record<string, string>
  categorias: Categoria[]
  carrinho: CartItem[]
  onAdd: (produto: Produto) => void
}

export function ProductGrid({ produtos, todosProdutos, imagens, categorias, carrinho, onAdd }: ProductGridProps) {
  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const disponibilidadePorId = useMemo(() => {
    const produtosPorId = new Map(todosProdutos.map((p) => [p.id, p]))
    return new Map(todosProdutos.map((p) => [p.id, getDisponibilidade(p, produtosPorId)]))
  }, [todosProdutos])
  const quantidadeNoCarrinho = useMemo(
    () => new Map(carrinho.map((it) => [it.produto.id, it.quantidade])),
    [carrinho],
  )

  if (produtos.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
        <Package className="w-12 h-12 mb-3 stroke-[1.5] text-muted-foreground/60" />
        <h4 className="font-bold text-base text-foreground">Nenhum produto encontrado</h4>
        <p className="text-xs max-w-sm mt-1">
          Tente buscar por outro termo ou selecione uma categoria diferente.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
      {produtos.map((produto) => {
        const categoria = categoriaPorId.get(produto.categoria_id)
        const disponibilidade = disponibilidadePorId.get(produto.id)
        return (
          <ProductCard
            key={produto.id}
            produto={produto}
            imagem={imagens[produto.id]}
            corCategoria={categoria?.cor || COR_PADRAO}
            nomeCategoria={categoria?.nome}
            quantidadeNoCarrinho={quantidadeNoCarrinho.get(produto.id) ?? 0}
            controlado={disponibilidade?.controlado ?? false}
            disponivel={disponibilidade?.disponivel ?? 0}
            status={disponibilidade?.status ?? 'sem_controle'}
            limitadoPor={disponibilidade?.limitadoPor}
            onAdd={onAdd}
          />
        )
      })}
    </div>
  )
}

const COR_PADRAO = '#3B82F6'
