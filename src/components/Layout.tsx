import { Suspense, useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Loader2, Moon, PanelLeftClose, PanelLeftOpen, Store, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { usePos } from '@/context/PosContext'
import { computeResumoEstoque } from '@/lib/stock'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { PrintModal } from '@/components/modals/PrintModal'
import { PaymentModal } from '@/components/modals/PaymentModal'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppFooter } from '@/components/layout/AppFooter'
import { HeaderClock } from '@/components/layout/HeaderClock'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'

export default function Layout() {
  const {
    config,
    tema,
    toggleTema,
    caixaAtivo,
    setIsQuickSearchOpen,
    produtos,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    previewFichas,
    setPreviewFichas,
  } = usePos()
  const resumoEstoque = useMemo(() => computeResumoEstoque(produtos), [produtos])
  const location = useLocation()
  const menuRecolhido = useMenuRecolhidoEmTelaEstreita()

  useGlobalShortcuts(() => setIsQuickSearchOpen(true))

  return (
    <div className="flex h-[100dvh] w-screen max-w-[100vw] overflow-hidden bg-background text-foreground select-none">
      <AppSidebar recolhido={menuRecolhido.valor} caixaAtivo={caixaAtivo} resumoEstoque={resumoEstoque} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        <header className="h-12 sm:h-14 border-b border-border bg-card px-2 sm:px-4 flex items-center justify-between shrink-0 shadow-xs z-10 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 truncate min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={menuRecolhido.alternar}
              className="w-9 h-9 shrink-0"
              title={menuRecolhido.valor ? 'Expandir menu' : 'Recolher menu'}
            >
              {menuRecolhido.valor ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </Button>
            <div className="p-1.5 sm:p-2 rounded bg-primary/10 text-primary hidden sm:flex shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm sm:text-base text-foreground leading-tight truncate">
                {config.nome_evento || 'Bar Templários'}
              </h2>
              {config.subtitulo_evento && (
                <p className="text-xs text-muted-foreground truncate hidden md:block">{config.subtitulo_evento}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-mono font-medium text-muted-foreground">
              <span>Bobina:</span>
              <strong className="text-foreground">{config.largura_bobina}</strong>
            </div>
            <HeaderClock />
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTema}
              title={tema === 'light' ? 'Mudar para Tema Escuro' : 'Mudar para Tema Claro'}
              className="w-9 h-9 border-border"
            >
              {tema === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-hidden relative">
          <ErrorBoundary area={location.pathname} resetKey={location.pathname}>
            <Suspense fallback={<CarregandoTela />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        <AppFooter />
      </div>

      <ErrorBoundary
        area="modal-pagamento"
        variant="silent"
        resetKey={String(isPaymentModalOpen)}
        onError={() => {
          setIsPaymentModalOpen(false)
          toast.error('A tela de pagamento falhou e foi fechada. O carrinho foi mantido: tente de novo.')
        }}
      >
        <PaymentModal />
      </ErrorBoundary>
      <ErrorBoundary
        area="modal-impressao"
        variant="silent"
        resetKey={previewFichas ? 'reimpressao' : 'ocioso'}
        onError={() => {
          setPreviewFichas(null)
          toast.error('Falha ao montar a reimpressão. Tente reimprimir pelo Relatório.')
        }}
      >
        <PrintModal />
      </ErrorBoundary>
    </div>
  )
}

function CarregandoTela() {
  return (
    <div role="status" className="h-full flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin" />
      Carregando…
    </div>
  )
}

/** Menu recolhe sozinho em telas estreitas; o botão do cabeçalho alterna manualmente. */
function useMenuRecolhidoEmTelaEstreita() {
  const [valor, setValor] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1100px)')
    const aplicar = () => setValor(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  return { valor, alternar: () => setValor((v) => !v) }
}
