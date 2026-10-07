import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { usePos } from '@/context/PosContext'
import {
  Store,
  Layers,
  FileSpreadsheet,
  Settings,
  Sun,
  Moon,
  Clock,
  User,
  WifiOff,
  DollarSign,
  Receipt,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { PrintModal } from '@/components/modals/PrintModal'
import { PaymentModal } from '@/components/modals/PaymentModal'

export default function Layout() {
  const { config, tema, toggleTema, caixaAtivo, setIsQuickSearchOpen } = usePos()

  const location = useLocation()
  const navigate = useNavigate()
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      )
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      const activeEl = document.activeElement
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT'

      if (e.key === 'F1' && !isInput) {
        e.preventDefault()
        navigate('/')
      } else if (e.key === 'F2' && !isInput) {
        e.preventDefault()
        navigate('/caixa')
      } else if (e.key === 'F3' && !isInput) {
        e.preventDefault()
        navigate('/produtos')
      } else if (e.key === 'F4' && !isInput) {
        e.preventDefault()
        navigate('/relatorios')
      } else if (e.key === 'F5' && !isInput) {
        e.preventDefault()
        navigate('/dashboard')
      } else if (e.key === 'F12' && !isInput) {
        e.preventDefault()
        navigate('/configuracoes')
      } else if (e.key === 'F9' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault()
        setIsQuickSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleGlobalKeys)
    return () => window.removeEventListener('keydown', handleGlobalKeys)
  }, [navigate, setIsQuickSearchOpen])

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1100px)')
    const apply = () => setSidebarCollapsed(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const navItems = [
    { to: '/', label: 'PDV Rápido', icon: Store, shortcut: 'F1' },
    { to: '/dashboard', label: 'Dashboard & Resumo', icon: LayoutDashboard, shortcut: 'F5' },
    { to: '/caixa', label: 'Controle de Caixa', icon: DollarSign, shortcut: 'F2' },
    { to: '/produtos', label: 'Produtos & Combos', icon: Layers, shortcut: 'F3' },
    { to: '/relatorios', label: 'Relatórios & Vendas', icon: FileSpreadsheet, shortcut: 'F4' },
    { to: '/configuracoes', label: 'Configurações', icon: Settings, shortcut: 'F12' },
  ]

  return (
    <div className="flex h-[100dvh] w-screen max-w-[100vw] overflow-hidden bg-background text-foreground select-none">
      <aside
        className={`${
          sidebarCollapsed ? 'w-[4.5rem]' : 'w-56 xl:w-64'
        } bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shrink-0 z-20 transition-[width] duration-200`}
      >
        <div className="min-h-0 flex flex-col">
          <div
            className={`p-3 border-b border-slate-800 bg-slate-950/60 flex items-center ${
              sidebarCollapsed ? 'justify-center' : 'gap-3'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 font-black text-lg shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden min-w-0">
                <h1 className="font-black text-sm xl:text-base tracking-tight text-white leading-tight truncate">
                  BAR TEMPLÁRIOS
                </h1>
                <p className="text-[11px] text-amber-400 font-medium truncate">PDV de Fichas</p>
              </div>
            )}
          </div>

          <nav className="p-2 xl:p-3 space-y-1 overflow-y-auto flex-1 min-h-0">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                location.pathname === item.to ||
                (item.to !== '/' && location.pathname.startsWith(item.to))

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={sidebarCollapsed ? `${item.label} (${item.shortcut})` : undefined}
                  className={({ isActive }) =>
                    `flex items-center ${
                      sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    } py-2.5 xl:py-3 rounded-lg text-sm font-semibold transition-all group ${
                      isActive
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <div className={`flex items-center ${sidebarCollapsed ? '' : 'gap-3'} min-w-0`}>
                    <Icon className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                        isActive ? 'bg-amber-700 text-amber-100' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.shortcut}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className={`border-t border-slate-800 bg-slate-950/40 space-y-2 ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
          {!sidebarCollapsed && (
            <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400 font-medium">Status do Caixa:</span>
                {caixaAtivo ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px] uppercase font-bold tracking-wider">
                    ABERTO
                  </Badge>
                ) : (
                  <Badge
                    variant="destructive"
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    FECHADO
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200 truncate">
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold truncate">
                  {caixaAtivo ? caixaAtivo.operador : 'Sem operador ativo'}
                </span>
              </div>
              {caixaAtivo && (
                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                  Fundo: {formatCurrency(caixaAtivo.saldo_inicial)}
                </div>
              )}
            </div>
          )}

          {sidebarCollapsed && (
            <div
              className={`mx-auto w-2.5 h-2.5 rounded-full ${caixaAtivo ? 'bg-emerald-500' : 'bg-rose-500'}`}
              title={caixaAtivo ? 'Caixa aberto' : 'Caixa fechado'}
            />
          )}

          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <WifiOff className="w-3 h-3 text-emerald-400" />
                Offline
              </span>
              <span className="font-mono text-slate-500">v1.0.0</span>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-12 sm:h-14 border-b border-border bg-card px-2 sm:px-4 flex items-center justify-between shrink-0 shadow-xs z-10 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 truncate min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="w-9 h-9 shrink-0"
              title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </Button>
            <div className="p-1.5 sm:p-2 rounded bg-primary/10 text-primary hidden sm:flex shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm sm:text-base text-foreground leading-tight truncate">
                {config.nome_evento || 'Bar Templários'}
              </h2>
              {config.subtitulo_evento && (
                <p className="text-xs text-muted-foreground truncate hidden md:block">
                  {config.subtitulo_evento}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium text-muted-foreground">
              <span>Bobina:</span>
              <strong className="text-foreground">{config.largura_bobina}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-md bg-muted/70 text-foreground font-mono font-bold text-xs sm:text-sm">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              <span>{time}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleTema}
              title={tema === 'light' ? 'Mudar para Tema Escuro' : 'Mudar para Tema Claro'}
              className="w-9 h-9 border-border"
            >
              {tema === 'light' ? (
                <Moon className="w-4 h-4 text-slate-700" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden relative">
          <Outlet />
        </main>

        <footer className="h-7 sm:h-8 bg-slate-900 text-slate-300 px-2 sm:px-4 flex items-center justify-between text-[10px] sm:text-[11px] shrink-0 border-t border-slate-800">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1 no-scrollbar min-w-0">
            <span className="flex items-center gap-1 shrink-0">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                F1
              </kbd>
              PDV
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                F2
              </kbd>
              Caixa
            </span>
            <span className="flex items-center gap-1 shrink-0 hidden sm:flex">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                F3
              </kbd>
              Produtos
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                Enter
              </kbd>
              Finalizar
            </span>
            <span className="flex items-center gap-1 shrink-0 hidden md:flex">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                Esc
              </kbd>
              Limpar
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400 shrink-0">
            <span>Bar Templários · Dados locais</span>
          </div>
        </footer>
      </div>

      <PaymentModal />
      <PrintModal />
    </div>
  )
}
