import {
  Beer,
  Wine,
  CupSoda,
  Utensils,
  Package,
  Coffee,
  IceCreamCone,
  Pizza,
  Sandwich,
  GlassWater,
  Martini,
  Flame,
  Star,
  Heart,
  Zap,
  Tag,
  Drumstick,
  Salad,
  Cookie,
  Milk,
  type LucideIcon,
} from 'lucide-react'

export type CategoryIconOption = {
  id: string
  label: string
  Icon: LucideIcon
}

/** Ícones disponíveis para personalizar categorias no PDV. */
export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { id: 'Beer', label: 'Cerveja', Icon: Beer },
  { id: 'Wine', label: 'Vinho', Icon: Wine },
  { id: 'Martini', label: 'Drink', Icon: Martini },
  { id: 'CupSoda', label: 'Refri', Icon: CupSoda },
  { id: 'GlassWater', label: 'Água', Icon: GlassWater },
  { id: 'Coffee', label: 'Café', Icon: Coffee },
  { id: 'Milk', label: 'Leite', Icon: Milk },
  { id: 'Utensils', label: 'Comida', Icon: Utensils },
  { id: 'Pizza', label: 'Pizza', Icon: Pizza },
  { id: 'Sandwich', label: 'Lanche', Icon: Sandwich },
  { id: 'Drumstick', label: 'Fritura', Icon: Drumstick },
  { id: 'Salad', label: 'Salada', Icon: Salad },
  { id: 'Cookie', label: 'Doce', Icon: Cookie },
  { id: 'IceCreamCone', label: 'Sorvete', Icon: IceCreamCone },
  { id: 'Package', label: 'Combo', Icon: Package },
  { id: 'Flame', label: 'Destaque', Icon: Flame },
  { id: 'Star', label: 'Estrela', Icon: Star },
  { id: 'Heart', label: 'Favorito', Icon: Heart },
  { id: 'Zap', label: 'Rápido', Icon: Zap },
  { id: 'Tag', label: 'Geral', Icon: Tag },
]

export function getCategoryIcon(icone?: string): LucideIcon {
  const found = CATEGORY_ICON_OPTIONS.find((o) => o.id === icone)
  return found?.Icon ?? Tag
}

export const CATEGORY_COLOR_PRESETS = [
  '#D97706',
  '#DC2626',
  '#EA580C',
  '#2563EB',
  '#059669',
  '#7C3AED',
  '#DB2777',
  '#0891B2',
  '#4F46E5',
  '#65A30D',
  '#B45309',
  '#475569',
]
