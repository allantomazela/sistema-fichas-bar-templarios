import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getStatusEstoque } from '@/lib/stock'
import { formatCurrency } from '@/lib/utils'
import type { Produto } from '@/types/pos'
import {
  BadgeCategoria,
  BadgeCombo,
  BotoesProduto,
  MiniaturaProduto,
  type AcoesProduto,
  type ProdutoListado,
} from './ProductRowParts'

interface ProductsTableViewProps {
  itens: ProdutoListado[]
  acoes: AcoesProduto
}

/** Catálogo em tabela: estoque com reposição rápida, regra de fichas e status. */
export function ProductsTableView({ itens, acoes }: ProductsTableViewProps) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs overflow-x-auto">
      <table className="w-full text-xs text-left min-w-[720px]">
        <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border">
          <tr>
            {COLUNAS.map((coluna) => (
              <th key={coluna} className={`p-3 ${coluna === 'Ações' ? 'text-right' : ''}`}>
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {itens.map(({ produto, categoria, imagem }) => (
            <tr key={produto.id} className="hover:bg-muted/20">
              <td className="p-3 font-mono font-bold text-muted-foreground">#{produto.codigo_rapido}</td>
              <td className="p-3">
                <MiniaturaProduto imagem={imagem} nome={produto.nome} className="w-10 h-10 rounded-lg border border-border" />
              </td>
              <td className="p-3 font-bold text-foreground">
                <div className="flex items-center gap-2">
                  <span>{produto.nome}</span>
                  {produto.is_combo && <BadgeCombo texto={`Combo (${produto.itens_combo?.length || 0} itens)`} />}
                </div>
                {produto.descricao && (
                  <div className="text-[10px] text-muted-foreground font-normal">{produto.descricao}</div>
                )}
              </td>
              <td className="p-3">
                <BadgeCategoria categoria={categoria} vazio="Sem categoria" />
              </td>
              <td className="p-3 font-mono font-bold text-sm">{formatCurrency(produto.preco)}</td>
              <td className="p-3">
                <CelulaEstoque produto={produto} onRepor={() => acoes.onRepor(produto)} />
              </td>
              <td className="p-3">
                {produto.is_combo ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    Desmembra em fichas individuais
                  </span>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">1 Ficha por unidade</span>
                )}
              </td>
              <td className="p-3">
                {produto.ativo ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1 font-semibold text-[11px]">
                    <XCircle className="w-3.5 h-3.5" /> Inativo
                  </span>
                )}
              </td>
              <td className="p-3 text-right space-x-0.5 whitespace-nowrap">
                <BotoesProduto produto={produto} acoes={acoes} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Saldo com destaque visual (esgotado / baixo / ok) e botão de reposição rápida. */
function CelulaEstoque({ produto, onRepor }: { produto: Produto; onRepor: () => void }) {
  const status = getStatusEstoque(produto)
  if (status === 'sem_controle') {
    return <span className="text-muted-foreground text-[11px] italic">Não controlado</span>
  }

  const saldo = produto.estoque_atual ?? 0
  return (
    <div className="flex items-center gap-2">
      {status === 'esgotado' ? (
        <Badge variant="destructive" className="font-mono font-black text-[11px] px-2">
          0 un (Esgotado)
        </Badge>
      ) : status === 'baixo' ? (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-mono font-bold text-[11px] px-2">
          {saldo} un (Baixo)
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="font-mono font-bold text-[11px] px-2 text-foreground border-emerald-500/50 bg-emerald-500/5"
        >
          {saldo} un
        </Badge>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRepor}
        className="h-6 px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10"
        title="Reposição rápida de estoque"
      >
        + Repor
      </Button>
    </div>
  )
}

const COLUNAS = ['Cód.', 'Foto', 'Nome do Produto', 'Categoria', 'Preço', 'Estoque', 'Emissão de Ficha', 'Status', 'Ações']
