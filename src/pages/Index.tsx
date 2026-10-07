import { useEffect, useMemo, useState } from 'react'
import { Printer, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePos } from '@/context/PosContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useStableCallback } from '@/hooks/useStableCallback'
import { CategoryBar, TODAS_CATEGORIAS } from '@/components/pos/CategoryBar'
import { ProductGrid } from '@/components/pos/ProductGrid'
import { CartPanel } from '@/components/pos/CartPanel'
import { CaixaFechadoOverlay } from '@/components/pos/CaixaFechadoOverlay'
import type { Produto } from '@/types/pos'

export default function Index() {
  const {
    categorias,
    produtos,
    imagensProdutos,
    caixaAtivo,
    carrinho,
    addToCart,
    clearCart,
    setIsPaymentModalOpen,
    setPreviewFichas,
    lastSaleResult,
  } = usePos()

  const [categoriaSelecionada, setCategoriaSelecionada] = useState(TODAS_CATEGORIAS)
  const [busca, setBusca] = useState('')

  const categoriasVisiveis = useMemo(
    () => categorias.filter((c) => c.ativo !== false).sort((a, b) => a.ordem - b.ordem),
    [categorias],
  )
  // Se a categoria selecionada foi ocultada, volta para "todas"
  const categoriaEfetiva = categoriasVisiveis.some((c) => c.id === categoriaSelecionada)
    ? categoriaSelecionada
    : TODAS_CATEGORIAS

  const produtosFiltrados = useMemo(
    () => filtrarProdutos(produtos, categoriaEfetiva, busca),
    [produtos, categoriaEfetiva, busca],
  )

  const adicionar = useStableCallback((produto: Produto) => {
    addToCart(produto)
  })

  useAtalhosDoPdv({
    temItens: carrinho.length > 0,
    caixaAberto: !!caixaAtivo,
    onPagar: () => setIsPaymentModalOpen(true),
    onLimpar: clearCart,
  })

  /** Enter na busca: código rápido exato ou único resultado vai direto para a comanda. */
  const handleBuscaSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const termo = busca.trim().toLowerCase()
    if (!termo) return
    const porCodigo = produtos.find((p) => p.ativo && p.codigo_rapido.toLowerCase() === termo)
    const alvo = porCodigo || (produtosFiltrados.length === 1 ? produtosFiltrados[0] : null)
    if (alvo && addToCart(alvo)) {
      toast.success(`+1 ${alvo.nome}`)
      setBusca('')
    }
  }

  return (
    <div className="relative h-full flex flex-col lg:flex-row overflow-hidden bg-background min-h-0">
      {!caixaAtivo && <CaixaFechadoOverlay />}

      <div className="flex-1 flex flex-col min-w-0 border-r border-border overflow-hidden">
        <div className="p-3 border-b border-border bg-card flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form onSubmit={handleBuscaSubmit} className="relative flex-1" role="search">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              aria-label="Buscar produto por nome ou código rápido"
              placeholder="Buscar por nome ou código rápido (ex: 101)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 pr-8 h-11 text-sm bg-muted/40 font-medium"
            />
            {busca && (
              <button
                type="button"
                aria-label="Limpar busca"
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>

          {lastSaleResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewFichas(lastSaleResult.fichas)}
              className="h-11 border-primary/30 text-primary hover:bg-primary/10 gap-1.5 shrink-0"
            >
              <Printer className="w-4 h-4" />
              <span className="font-semibold text-xs">
                Reimprimir Venda #{lastSaleResult.venda.sequencial_venda}
              </span>
            </Button>
          )}
        </div>

        <CategoryBar
          categorias={categoriasVisiveis}
          produtos={produtos}
          selecionada={categoriaEfetiva}
          onSelect={setCategoriaSelecionada}
        />

        <div className="flex-1 overflow-y-auto p-4">
          <ProductGrid
            produtos={produtosFiltrados}
            todosProdutos={produtos}
            imagens={imagensProdutos}
            categorias={categorias}
            carrinho={carrinho}
            onAdd={adicionar}
          />
        </div>
      </div>

      <CartPanel />
    </div>
  )
}

interface AtalhosPdv {
  temItens: boolean
  caixaAberto: boolean
  onPagar: () => void
  onLimpar: () => void
}

/** Enter abre o pagamento; Esc limpa a comanda (com confirmação). */
function useAtalhosDoPdv(atalhos: AtalhosPdv) {
  const handleKeyDown = useStableCallback((e: KeyboardEvent) => {
    if (!atalhos.temItens) return
    if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      if (!atalhos.caixaAberto) {
        toast.error('Abra o Caixa antes de vender!')
        return
      }
      atalhos.onPagar()
    } else if (e.key === 'Escape' && confirm('Deseja limpar todos os itens do carrinho?')) {
      atalhos.onLimpar()
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

function filtrarProdutos(produtos: Produto[], categoriaId: string, busca: string): Produto[] {
  const termo = busca.trim().toLowerCase()
  return produtos.filter((p) => {
    if (!p.ativo) return false
    if (categoriaId !== TODAS_CATEGORIAS && p.categoria_id !== categoriaId) return false
    if (!termo) return true
    return p.nome.toLowerCase().includes(termo) || p.codigo_rapido.toLowerCase().includes(termo)
  })
}
