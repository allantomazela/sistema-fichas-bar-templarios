import { Copy, Edit2, Image as ImageIcon, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Categoria, Produto } from '@/types/pos'

/** Ações sobre um produto, iguais na grade e na tabela. */
export interface AcoesProduto {
  onDuplicar: (produto: Produto) => void
  onEditar: (produto: Produto) => void
  onExcluir: (produto: Produto) => void
  onRepor: (produto: Produto) => void
}

/** Dados de exibição já resolvidos pela página (evita buscas repetidas por linha). */
export interface ProdutoListado {
  produto: Produto
  categoria?: Categoria
  imagem?: string
}

export function BotoesProduto({ produto, acoes }: { produto: Produto; acoes: AcoesProduto }) {
  return (
    <>
      <BotaoIcone rotulo={`Duplicar ${produto.nome}`} onClick={() => acoes.onDuplicar(produto)}>
        <Copy className="w-3.5 h-3.5" />
      </BotaoIcone>
      <BotaoIcone rotulo={`Editar ${produto.nome}`} onClick={() => acoes.onEditar(produto)}>
        <Edit2 className="w-3.5 h-3.5" />
      </BotaoIcone>
      <BotaoIcone rotulo={`Excluir ${produto.nome}`} perigo onClick={() => acoes.onExcluir(produto)}>
        <Trash2 className="w-3.5 h-3.5" />
      </BotaoIcone>
    </>
  )
}

function BotaoIcone(props: { rotulo: string; perigo?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={props.onClick}
      aria-label={props.rotulo}
      title={props.rotulo}
      className={`h-8 w-8 p-0 text-muted-foreground ${props.perigo ? 'hover:text-destructive' : 'hover:text-foreground'}`}
    >
      {props.children}
    </Button>
  )
}

/** Foto do produto (carregada só quando aparece na tela) ou marcador "sem foto". */
export function MiniaturaProduto({ imagem, nome, className }: { imagem?: string; nome: string; className: string }) {
  if (imagem) {
    return <img src={imagem} alt={nome} loading="lazy" decoding="async" className={`object-cover ${className}`} />
  }
  return (
    <div className={`bg-muted flex items-center justify-center text-muted-foreground ${className}`}>
      <ImageIcon className="w-1/3 h-1/3 opacity-40" />
    </div>
  )
}

export function BadgeCategoria({ categoria, vazio }: { categoria?: Categoria; vazio: string }) {
  return (
    <Badge
      variant="outline"
      className="font-semibold text-[10px]"
      style={{ borderColor: categoria?.cor, color: categoria?.cor }}
    >
      {categoria?.nome || vazio}
    </Badge>
  )
}

export function BadgeCombo({ texto }: { texto: string }) {
  return (
    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[9px] uppercase font-bold py-0">{texto}</Badge>
  )
}
