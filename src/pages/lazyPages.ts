import { lazy } from 'react'

/**
 * Telas secundárias em pedaços separados: o PDV (Index) abre sem esperar gráficos,
 * relatórios e configurações. Logo depois elas são baixadas em segundo plano, então
 * F2–F12 continuam instantâneos.
 */
const carregadores = {
  Dashboard: () => import('./Dashboard'),
  CashControl: () => import('./CashControl'),
  ProductsManager: () => import('./ProductsManager'),
  StockControl: () => import('./StockControl'),
  FichaLotes: () => import('./FichaLotes'),
  Reports: () => import('./Reports'),
  Settings: () => import('./Settings'),
}

export const Dashboard = lazy(carregadores.Dashboard)
export const CashControl = lazy(carregadores.CashControl)
export const ProductsManager = lazy(carregadores.ProductsManager)
export const StockControl = lazy(carregadores.StockControl)
export const FichaLotes = lazy(carregadores.FichaLotes)
export const Reports = lazy(carregadores.Reports)
export const Settings = lazy(carregadores.Settings)

/** Rotina ESC/POS: baixada antes da primeira venda para a 1ª impressão não esperar. */
const carregarImpressora = () => import('@/services/escposElgin')

/** Agenda o pré-carregamento para quando o PDV estiver ocioso. Devolve a função de cancelamento. */
export function agendarPreCarregamento(): () => void {
  const carregarTudo = () => {
    for (const carregar of [carregarImpressora, ...Object.values(carregadores)]) {
      carregar().catch((err) => console.warn('[PDV] Pré-carregamento de tela falhou', err))
    }
  }
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(carregarTudo, { timeout: 3000 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(carregarTudo, 1500)
  return () => window.clearTimeout(id)
}
