import type { Produto } from '@/types/pos'
import type { LinhaEstoque } from '@/lib/stockReport'
import { Button } from '@/components/ui/button'
import {
  ClipboardCheck,
  History,
  PackageMinus,
  PackagePlus,
  PackageSearch,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { STATUS_ESTOQUE_CLASS, STATUS_ESTOQUE_LABEL } from './stockLabels'
import type { TipoMovimentacaoManual } from './StockMovementDialog'

export interface StockTableActions {
  onMovimentar: (produto: Produto, tipo: TipoMovimentacaoManual) => void
  onVerHistorico: (produto: Produto) => void
  onEditar: (produto: Produto) => void
  onExcluir: (produto: Produto) => void
}

interface StockTableProps {
  linhas: LinhaEstoque[]
  acoes: StockTableActions
}

export function StockTable({ linhas, acoes }: StockTableProps) {
  if (linhas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10 text-muted-foreground">
        <PackageSearch className="w-12 h-12 mb-3 stroke-[1.5]" />
        <p className="font-bold text-foreground">Nenhum produto neste filtro</p>
        <p className="text-xs mt-1 max-w-sm">
          Ajuste a busca ou o filtro de status. Para controlar um produto, escolha “Todos os produtos” e
          use “Contagem” para informar o saldo inicial.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="bg-muted/60 text-[11px] uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="text-left font-bold px-3 py-2.5">Produto</th>
            <th scope="col" className="text-right font-bold px-3 py-2.5">Saldo</th>
            <th scope="col" className="text-right font-bold px-3 py-2.5 hidden md:table-cell">Mínimo</th>
            <th scope="col" className="text-center font-bold px-3 py-2.5">Status</th>
            <th scope="col" className="text-right font-bold px-3 py-2.5 hidden sm:table-cell">Vendido</th>
            <th scope="col" className="text-right font-bold px-3 py-2.5">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {linhas.map((linha) => (
            <StockRow key={linha.produto.id} linha={linha} acoes={acoes} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface StockRowProps {
  linha: LinhaEstoque
  acoes: StockTableActions
}

function StockRow({ linha, acoes }: StockRowProps) {
  const { produto, status } = linha
  const controlado = status !== 'sem_controle'

  return (
    <tr className={status === 'esgotado' ? 'bg-destructive/5' : status === 'baixo' ? 'bg-amber-500/5' : ''}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: linha.categoriaCor }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="font-bold truncate">
              {produto.nome}
              {!produto.ativo && <span className="ml-1.5 text-[10px] text-muted-foreground">(inativo)</span>}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              #{produto.codigo_rapido} · {linha.categoriaNome}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-right font-mono font-black text-base">
        {linha.saldo ?? '—'}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground hidden md:table-cell">
        {linha.minimo ?? '—'}
      </td>
      <td className="px-3 py-2.5 text-center">
        <span
          className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_ESTOQUE_CLASS[status]}`}
        >
          {STATUS_ESTOQUE_LABEL[status]}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right font-mono hidden sm:table-cell">{linha.vendido}</td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          {controlado && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-emerald-700 dark:text-emerald-400"
              onClick={() => acoes.onMovimentar(produto, 'entrada')}
              title="Registrar entrada (compra/recebimento)"
            >
              <PackagePlus className="w-4 h-4" />
              <span className="hidden lg:inline">Entrada</span>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => acoes.onMovimentar(produto, 'ajuste')}
            title={controlado ? 'Informar contagem física (define o saldo)' : 'Ativar controle informando o saldo'}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden lg:inline">{controlado ? 'Contagem' : 'Controlar'}</span>
          </Button>
          {controlado && (
            <IconAction
              icon={PackageMinus}
              label={`Registrar perda de ${produto.nome}`}
              title="Registrar perda (quebra, vencido...)"
              className="text-destructive"
              onClick={() => acoes.onMovimentar(produto, 'perda')}
            />
          )}
          <IconAction
            icon={History}
            label={`Histórico de ${produto.nome}`}
            title="Ver histórico deste produto"
            onClick={() => acoes.onVerHistorico(produto)}
          />
          <IconAction
            icon={Pencil}
            label={`Editar estoque de ${produto.nome}`}
            title="Editar saldo, mínimo e controle de estoque"
            onClick={() => acoes.onEditar(produto)}
          />
          <IconAction
            icon={Trash2}
            label={`Excluir ${produto.nome}`}
            title="Excluir produto"
            className="text-destructive"
            onClick={() => acoes.onExcluir(produto)}
          />
        </div>
      </td>
    </tr>
  )
}

interface IconActionProps {
  icon: LucideIcon
  label: string
  title: string
  className?: string
  onClick: () => void
}

function IconAction({ icon: Icon, label, title, className = '', onClick }: IconActionProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={`h-8 w-8 ${className}`}
      onClick={onClick}
      title={title}
      aria-label={label}
    >
      <Icon className="w-4 h-4" />
    </Button>
  )
}
