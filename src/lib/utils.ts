/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formatadores criados uma vez: instanciar Intl a cada chamada pesa em listas grandes. */
const FORMATO_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const FORMATO_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})
const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const FORMATO_HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function formatCurrency(value: number): string {
  return FORMATO_MOEDA.format(value || 0)
}

/** Lê um valor digitado ("12,50" ou "12.50"); vazio ou inválido vira 0. */
export function parseValorMonetario(texto: string): number {
  const valor = parseFloat(texto.replace(',', '.'))
  return Number.isFinite(valor) ? valor : 0
}

function formatarData(formato: Intl.DateTimeFormat, isoString?: string): string {
  if (!isoString) return '-'
  try {
    return formato.format(new Date(isoString))
  } catch {
    return isoString
  }
}

export function formatDateTime(isoString?: string): string {
  return formatarData(FORMATO_DATA_HORA, isoString)
}

export function formatDate(isoString?: string): string {
  return formatarData(FORMATO_DATA, isoString)
}

export function formatTime(isoString?: string): string {
  return formatarData(FORMATO_HORA, isoString)
}
