import { NavLink } from 'react-router-dom'
import { Receipt, User, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { ResumoEstoque } from '@/lib/stock'
import type { Caixa } from '@/types/pos'
import { NAV_ITEMS, type NavItem } from './navItems'

interface AppSidebarProps {
  recolhido: boolean
  caixaAtivo: Caixa | null
  resumoEstoque: ResumoEstoque
}

export function AppSidebar({ recolhido, caixaAtivo, resumoEstoque }: AppSidebarProps) {
  return (
    <aside
      className={`${
        recolhido ? 'w-[4.5rem]' : 'w-56 xl:w-64'
      } bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shrink-0 z-20 transition-[width] duration-200`}
    >
      <div className="min-h-0 flex flex-col">
        <div
          className={`p-3 border-b border-slate-800 bg-slate-950/60 flex items-center ${
            recolhido ? 'justify-center' : 'gap-3'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 font-black text-lg shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          {!recolhido && (
            <div className="overflow-hidden min-w-0">
              <h1 className="font-black text-sm xl:text-base tracking-tight text-white leading-tight truncate">
                BAR TEMPLÁRIOS
              </h1>
              <p className="text-[11px] text-amber-400 font-medium truncate">PDV de Fichas</p>
            </div>
          )}
        </div>

        <nav className="p-2 xl:p-3 space-y-1 overflow-y-auto flex-1 min-h-0">
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.to}
              item={item}
              recolhido={recolhido}
              alertas={item.to === '/estoque' ? resumoEstoque.esgotados + resumoEstoque.baixos : 0}
              resumoEstoque={resumoEstoque}
            />
          ))}
        </nav>
      </div>

      <div className={`border-t border-slate-800 bg-slate-950/40 space-y-2 ${recolhido ? 'p-2' : 'p-3'}`}>
        {recolhido ? (
          <div
            className={`mx-auto w-2.5 h-2.5 rounded-full ${caixaAtivo ? 'bg-emerald-500' : 'bg-rose-500'}`}
            title={caixaAtivo ? 'Caixa aberto' : 'Caixa fechado'}
          />
        ) : (
          <>
            <CaixaStatus caixaAtivo={caixaAtivo} />
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3 text-emerald-400" />
                Offline
              </span>
              <span className="font-mono text-slate-500">v1.0.0</span>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

interface SidebarLinkProps {
  item: NavItem
  recolhido: boolean
  alertas: number
  resumoEstoque: ResumoEstoque
}

function SidebarLink({ item, recolhido, alertas, resumoEstoque }: SidebarLinkProps) {
  const Icon = item.icon
  const alertaClass =
    resumoEstoque.esgotados > 0 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
  const nomeAcessivel = `${item.label} (${item.shortcut})${alertas > 0 ? `, ${alertas} alerta(s) de estoque` : ''}`

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={nomeAcessivel}
      title={recolhido ? nomeAcessivel : undefined}
      className={({ isActive }) =>
        `flex items-center ${
          recolhido ? 'justify-center px-2' : 'justify-between px-3'
        } py-2.5 xl:py-3 rounded-lg text-sm font-semibold transition-all group ${
          isActive
            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className={`relative flex items-center ${recolhido ? '' : 'gap-3'} min-w-0`}>
            <Icon className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform shrink-0" />
            {!recolhido && <span className="truncate">{item.label}</span>}
            {alertas > 0 && (
              <span
                className={`${
                  recolhido ? 'absolute -top-2 -right-2' : ''
                } min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${alertaClass}`}
                title={`${resumoEstoque.esgotados} esgotado(s), ${resumoEstoque.baixos} com estoque baixo`}
                aria-hidden
              >
                {alertas}
              </span>
            )}
          </div>
          {!recolhido && (
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                isActive ? 'bg-amber-700 text-amber-100' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {item.shortcut}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function CaixaStatus({ caixaAtivo }: { caixaAtivo: Caixa | null }) {
  return (
    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400 font-medium">Status do Caixa:</span>
        {caixaAtivo ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] uppercase font-bold tracking-wider">
            ABERTO
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
            FECHADO
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-200 truncate">
        <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="font-semibold truncate">{caixaAtivo ? caixaAtivo.operador : 'Sem operador ativo'}</span>
      </div>
      {caixaAtivo && (
        <div className="text-[10px] text-slate-400 mt-1 font-mono">
          Fundo: {formatCurrency(caixaAtivo.saldo_inicial)}
        </div>
      )}
    </div>
  )
}
