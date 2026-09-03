import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { usePos } from '@/context/PosContext'
import {
  ShoppingCart,
  Store,
  Layers,
  FileSpreadsheet,
  Settings,
  Sun,
  Moon,
  Clock,
  User,
  ShieldCheck,
  WifiOff,
  AlertTriangle,
  QrCode,
  DollarSign,
  Receipt,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { PrintModal } from '@/components/modals/PrintModal'
import { PaymentModal } from '@/components/modals/PaymentModal'

export default function Layout() {
  const {
    config,
    tema,
    toggleTema,
    caixaAtivo,
    setIsPaymentModalOpen,
    carrinho,
    setIsQuickSearchOpen,
  } = usePos()

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

  // Atalhos Globais no Teclado
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em input normal exceto Enter e Esc
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
        navigate('/validar')
      } else if (e.key === 'F4' && !isInput) {
        e.preventDefault()
        navigate('/produtos')
      } else if (e.key === 'F6' && !isInput) {
        e.preventDefault()
        navigate('/relatorios')
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

  const navItems = [
    { to: '/', label: 'PDV Rápido', icon: Store, shortcut: 'F1' },
    { to: '/caixa', label: 'Controle de Caixa', icon: DollarSign, shortcut: 'F2' },
    { to: '/validar', label: 'Validador Fichas', icon: ShieldCheck, shortcut: 'F3' },
    { to: '/produtos', label: 'Produtos & Combos', icon: Layers, shortcut: 'F4' },
    { to: '/relatorios', label: 'Relatórios & Vendas', icon: FileSpreadsheet, shortcut: 'F6' },
    { to: '/configuracoes', label: 'Configurações', icon: Settings, shortcut: 'F12' },
  ]

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground select-none">
      {/* SIDEBAR LATERAL NAVEGAÇÃO */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shrink-0 z-20">
        <div>
          {/* LOGO & TITULO DO SISTEMA */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-lg">
              <Receipt className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-black text-base tracking-tight text-white leading-tight truncate">
                PDV FICHAS PRO
              </h1>
              <p className="text-[11px] text-blue-400 font-medium truncate">Offline Event System</p>
            </div>
          </div>

          {/* LISTA DE MÓDULOS */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                location.pathname === item.to ||
                (item.to !== '/' && location.pathname.startsWith(item.to))

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-3 rounded-lg text-sm font-semibold transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 opacity-90 group-hover:scale-110 transition-transform" />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.shortcut}
                  </span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* STATUS INFERIOR DO TURNO / OPERADOR */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
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
              <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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

          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <WifiOff className="w-3 h-3 text-emerald-400" />
              Modo Offline Ativo
            </span>
            <span className="font-mono text-slate-500">v1.2.0</span>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL COM HEADER, CONTEÚDO E FOOTER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* HEADER SUPERIOR */}
        <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2 rounded bg-primary/10 text-primary hidden sm:flex">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-foreground leading-tight truncate">
                {config.nome_evento || 'Festa e Evento'}
              </h2>
              {config.subtitulo_evento && (
                <p className="text-xs text-muted-foreground truncate hidden md:block">
                  {config.subtitulo_evento}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* BADGE DE BOBINA */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium text-muted-foreground">
              <span>Bobina:</span>
              <strong className="text-foreground">{config.largura_bobina}</strong>
            </div>

            {/* RELÓGIO DIGITAL */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-muted/70 text-foreground font-mono font-bold text-sm">
              <Clock className="w-4 h-4 text-primary" />
              <span>{time}</span>
            </div>

            {/* ALTERNADOR DE TEMA */}
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

        {/* CORPO DA TELA ATIVA */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          <Outlet />
        </main>

        {/* FOOTER OPERACIONAL COM ATALHOS DE TECLADO */}
        <footer className="h-8 bg-slate-900 text-slate-300 px-4 flex items-center justify-between text-[11px] shrink-0 border-t border-slate-800">
          <div className="flex items-center gap-4 overflow-x-auto py-1">
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                F1
              </kbd>
              PDV
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                F2
              </kbd>
              Caixa
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                F3
              </kbd>
              Validador
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                Enter
              </kbd>
              Finalizar / Imprimir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-800 text-slate-200 px-1.5 py-0.2 rounded font-mono text-[10px] border border-slate-700">
                Esc
              </kbd>
              Cancelar / Limpar
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Anti-fraude Ativado</span>
          </div>
        </footer>
      </div>

      {/* MODAL GLOBAL DE PAGAMENTO & MODAL DE IMPRESSÃO */}
      <PaymentModal />
      <PrintModal />
    </div>
  )
}
