import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Nome da área (aparece no log para facilitar o diagnóstico). */
  area: string
  /** Quando muda (ex.: rota atual), o erro é descartado e a área renderiza de novo. */
  resetKey?: string
  /**
   * `silent` = não mostra nada no lugar (usado em modais). Combine com `onError` +
   * `resetKey` para o modal fechar e voltar a funcionar na próxima abertura.
   */
  variant?: 'page' | 'fullscreen' | 'silent'
  onError?: (error: Error) => void
}

interface ErrorBoundaryState {
  error: Error | null
  resetKey?: string
}

/**
 * Isola falhas de renderização: um erro numa tela não derruba o PDV inteiro.
 * Dados já gravados (vendas, estoque) não são afetados — é só a interface que recarrega.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error }
  }

  static getDerivedStateFromProps(
    props: ErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[PDV] Erro de interface em "${this.props.area}"`, error, info.componentStack)
    this.props.onError?.(error)
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const variant = this.props.variant ?? 'page'
    if (variant === 'silent') return null

    return (
      <div
        role="alert"
        className={`flex items-center justify-center p-6 bg-background text-foreground ${
          variant === 'fullscreen' ? 'min-h-screen' : 'h-full'
        }`}
      >
        <div className="max-w-md w-full space-y-4 text-center border border-destructive/40 rounded-2xl p-6 bg-card shadow-lg">
          <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-black">Esta tela encontrou um problema</p>
            <p className="text-sm text-muted-foreground">
              As vendas e o estoque já gravados estão seguros. Tente abrir a tela novamente ou use o
              menu para ir ao PDV.
            </p>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground break-words bg-muted/50 rounded p-2">
            {error.message || 'Erro desconhecido'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground font-bold text-sm"
            >
              <RotateCcw className="w-4 h-4" /> Tentar novamente
            </button>
            {variant === 'fullscreen' && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center h-10 px-4 rounded-md border border-border font-bold text-sm"
              >
                Recarregar aplicativo
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
}
