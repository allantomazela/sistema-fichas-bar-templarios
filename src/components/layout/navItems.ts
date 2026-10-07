import {
  Boxes,
  DollarSign,
  FileSpreadsheet,
  Layers,
  LayoutDashboard,
  Settings,
  Store,
  Ticket,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Tecla de função que abre a tela (também exibida no menu). */
  shortcut: string
}

/** Fonte única do menu lateral e dos atalhos F1–F12. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'PDV Rápido', icon: Store, shortcut: 'F1' },
  { to: '/dashboard', label: 'Dashboard & Resumo', icon: LayoutDashboard, shortcut: 'F5' },
  { to: '/caixa', label: 'Controle de Caixa', icon: DollarSign, shortcut: 'F2' },
  { to: '/produtos', label: 'Produtos & Combos', icon: Layers, shortcut: 'F3' },
  { to: '/estoque', label: 'Estoque', icon: Boxes, shortcut: 'F6' },
  { to: '/fichas-antecipadas', label: 'Fichas Antecipadas', icon: Ticket, shortcut: 'F7' },
  { to: '/relatorios', label: 'Relatórios & Vendas', icon: FileSpreadsheet, shortcut: 'F4' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, shortcut: 'F12' },
]

export const ROTA_POR_ATALHO = new Map(NAV_ITEMS.map((item) => [item.shortcut, item.to]))
