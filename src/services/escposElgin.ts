import { invoke, isTauri } from '@tauri-apps/api/core'
import type { Configuracoes, Ficha } from '@/types/pos'
import { formatDate, formatTime } from '@/lib/utils'

export type PrinterInfo = {
  name: string
  is_default: boolean
}

/**
 * Mapa UTF-8 -> CP850 (acentos PT-BR).
 * Somente chaves com \\uXXXX para o parser oxc/vite aceitar.
 */
const CP850: Record<string, number> = Object.fromEntries([
  ['\u00C7', 0x80],
  ['\u00FC', 0x81],
  ['\u00E9', 0x82],
  ['\u00E2', 0x83],
  ['\u00E4', 0x84],
  ['\u00E0', 0x85],
  ['\u00E5', 0x86],
  ['\u00E7', 0x87],
  ['\u00EA', 0x88],
  ['\u00EB', 0x89],
  ['\u00E8', 0x8a],
  ['\u00EF', 0x8b],
  ['\u00EE', 0x8c],
  ['\u00EC', 0x8d],
  ['\u00C4', 0x8e],
  ['\u00C5', 0x8f],
  ['\u00C9', 0x90],
  ['\u00E6', 0x91],
  ['\u00C6', 0x92],
  ['\u00F4', 0x93],
  ['\u00F6', 0x94],
  ['\u00F2', 0x95],
  ['\u00FB', 0x96],
  ['\u00F9', 0x97],
  ['\u00FF', 0x98],
  ['\u00D6', 0x99],
  ['\u00DC', 0x9a],
  ['\u00E1', 0xa0],
  ['\u00ED', 0xa1],
  ['\u00F3', 0xa2],
  ['\u00FA', 0xa3],
  ['\u00F1', 0xa4],
  ['\u00D1', 0xa5],
  ['\u00AA', 0xa6],
  ['\u00BA', 0xa7],
  ['\u00BF', 0xa8],
  ['\u00AC', 0xaa],
  ['\u00BD', 0xab],
  ['\u00BC', 0xac],
  ['\u00A1', 0xad],
  ['\u00AB', 0xae],
  ['\u00BB', 0xaf],
  ['\u00C1', 0xb5],
  ['\u00C2', 0xb6],
  ['\u00C0', 0xb7],
  ['\u00E3', 0xc6],
  ['\u00C3', 0xc7],
  ['\u00D0', 0xd1],
  ['\u00CA', 0xd2],
  ['\u00CB', 0xd3],
  ['\u00C8', 0xd4],
  ['\u00CD', 0xd5],
  ['\u00CC', 0xde],
  ['\u00D3', 0xe0],
  ['\u00DF', 0xe1],
  ['\u00D4', 0xe2],
  ['\u00D2', 0xe3],
  ['\u00F5', 0xe4],
  ['\u00D5', 0xe5],
  ['\u00B5', 0xe6],
  ['\u00FE', 0xe7],
  ['\u00DE', 0xe8],
  ['\u00DA', 0xe9],
  ['\u00DB', 0xea],
  ['\u00D9', 0xeb],
  ['\u00FD', 0xec],
  ['\u00DD', 0xed],
  ['\u00B1', 0xf1],
  ['\u00F7', 0xf6],
  ['\u00B0', 0xf8],
  ['\u00B7', 0xfa],
  ['\u00B2', 0xfd],
])

function encodeCp850(text: string): number[] {
  const out: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0x3f
    if (code >= 0x20 && code <= 0x7e) {
      out.push(code)
    } else if (CP850[ch] != null) {
      out.push(CP850[ch])
    } else {
      out.push(0x3f)
    }
  }
  return out
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return t.slice(0, Math.max(1, max - 1)).trimEnd() + '.'
}

/** Quebra texto em linhas sem estourar a largura (importante no modo dobro). */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxChars) {
      current = next
      continue
    }
    if (current) lines.push(current)
    if (word.length <= maxChars) {
      current = word
    } else {
      let rest = word
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars))
        rest = rest.slice(maxChars)
      }
      current = rest
    }
  }
  if (current) lines.push(current)
  return lines
}

class EscPosBuilder {
  private bytes: number[] = []

  raw(...values: number[]): this {
    this.bytes.push(...values)
    return this
  }

  /** ESC @ */
  init(): this {
    return this.raw(0x1b, 0x40)
  }

  /** ESC t n — CP850 */
  codePageCp850(): this {
    return this.raw(0x1b, 0x74, 0x02)
  }

  /** GS L — margem esquerda 0 (centralizacao simetrica na Elgin i9) */
  leftMarginZero(): this {
    return this.raw(0x1d, 0x4c, 0x00, 0x00)
  }

  /** GS W — largura util padrao 80mm (576 dots) / 58mm (384 dots) */
  printWidth(cols80: boolean): this {
    if (cols80) {
      return this.raw(0x1d, 0x57, 0x40, 0x02) // 576
    }
    return this.raw(0x1d, 0x57, 0x80, 0x01) // 384
  }

  alignCenter(): this {
    return this.raw(0x1b, 0x61, 0x01)
  }

  alignLeft(): this {
    return this.raw(0x1b, 0x61, 0x00)
  }

  bold(on: boolean): this {
    return this.raw(0x1b, 0x45, on ? 0x01 : 0x00)
  }

  /** GS ! n */
  size(n: number): this {
    return this.raw(0x1d, 0x21, n & 0xff)
  }

  /** ESC 3 n — espacamento entre linhas (mais compacto/equilibrado) */
  lineSpacing(n: number): this {
    return this.raw(0x1b, 0x33, n & 0xff)
  }

  text(text: string): this {
    this.bytes.push(...encodeCp850(text))
    return this
  }

  line(text = ''): this {
    return this.text(text).raw(0x0a)
  }

  feed(lines = 2): this {
    return this.raw(0x1b, 0x64, Math.max(0, Math.min(255, lines)))
  }

  /** Corte parcial Elgin i9: GS V m n (m=66, n=0) */
  partialCut(): this {
    return this.raw(0x1d, 0x56, 0x42, 0x00)
  }

  toUint8Array(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }
}

function getFichaTitulo(config: Configuracoes): string {
  return (config.nome_evento || 'Show de Premios').trim() || 'Show de Premios'
}

function getFichaLocal(config: Configuracoes): string {
  return (config.subtitulo_evento || config.cabecalho_cupom || 'Bar Templarios').trim()
}

function getFichaOrganizacao(config: Configuracoes): string {
  const rodape = (config.rodape_cupom || '').trim()
  const lower = rodape.toLowerCase()
  if (lower.startsWith('organiza') && lower.includes(':')) return rodape
  return rodape || 'Organizacao: Templarios da Paz'
}

/**
 * Layout centralizado pela propria Elgin (ESC a 1).
 * Sem espacos manuais — padding + align center desalinha a ficha.
 */
function buildOneTicket(builder: EscPosBuilder, ficha: Ficha, config: Configuracoes): void {
  const is80 = config.largura_bobina !== '58mm'
  const maxNormal = is80 ? 42 : 30
  const maxDouble = is80 ? 20 : 14
  const sep = '-'.repeat(is80 ? 22 : 16)

  const titulo = getFichaTitulo(config).toUpperCase()
  const local = getFichaLocal(config)
  const org = getFichaOrganizacao(config)
  const seq = String(ficha.sequencial).padStart(4, '0')
  const when = `${formatDate(ficha.data_emissao)} ${formatTime(ficha.data_emissao)}`
  const produto = ficha.produto_nome.toUpperCase()

  builder.alignCenter()
  builder.lineSpacing(28)

  builder.bold(true).size(0x00)
  for (const part of wrapText(titulo, maxNormal)) {
    builder.line(part)
  }
  builder.bold(false)

  builder.line('* * *')
  builder.line(truncate(when, maxNormal))
  for (const part of wrapText(local, maxNormal)) {
    builder.line(part)
  }

  builder.line(sep)
  builder.bold(true).line('VALE CONSUMO')
  builder.bold(false)

  builder.bold(true).size(0x11)
  for (const part of wrapText(produto, maxDouble)) {
    builder.line(part)
  }
  builder.size(0x00).bold(false)

  builder.line(sep)
  for (const part of wrapText(org.toUpperCase(), maxNormal)) {
    builder.line(part)
  }
  builder.line(`No ${seq}`)
  builder.feed(4)
}

/** Monta buffer ESC/POS das fichas com corte entre cada uma (Elgin i9). */
export function buildEscPosFichas(fichas: Ficha[], config: Configuracoes): Uint8Array {
  const builder = new EscPosBuilder()
  const is80 = config.largura_bobina !== '58mm'
  builder.init().codePageCp850().leftMarginZero().printWidth(is80)

  fichas.forEach((ficha, index) => {
    buildOneTicket(builder, ficha, config)
    if (config.corte_automatico !== false) {
      builder.partialCut()
    } else if (index < fichas.length - 1) {
      builder.feed(2)
      builder.alignCenter().line('---------- corte ----------')
      builder.feed(2)
    }
  })

  if (config.corte_automatico === false && fichas.length > 0) {
    builder.feed(2).partialCut()
  }

  return builder.toUint8Array()
}

export async function listSystemPrinters(): Promise<PrinterInfo[]> {
  if (!isTauri()) return []
  return invoke<PrinterInfo[]>('list_printers')
}

export async function printEscPosRaw(printerName: string, data: Uint8Array): Promise<void> {
  if (!isTauri()) {
    throw new Error('Impressao ESC/POS so esta disponivel no aplicativo nativo.')
  }
  await invoke('print_raw', {
    printerName,
    data: Array.from(data),
  })
}

export function pickPrinterName(config: Configuracoes, printers: PrinterInfo[]): string | null {
  const configured = (config.impressora_nome || '').trim()
  if (configured) {
    const exact = printers.find((p) => p.name === configured)
    if (exact) return exact.name
    const fuzzy = printers.find((p) => p.name.toLowerCase().includes(configured.toLowerCase()))
    if (fuzzy) return fuzzy.name
  }

  const elgin = printers.find((p) => {
    const n = p.name.toLowerCase()
    return n.includes('elgin') && n.includes('i9')
  })
  if (elgin) return elgin.name

  const i9 = printers.find((p) => p.name.toLowerCase().includes('i9'))
  if (i9) return i9.name

  const def = printers.find((p) => p.is_default)
  return def?.name || printers[0]?.name || null
}

export async function printFichasEscPos(fichas: Ficha[], config: Configuracoes): Promise<void> {
  if (!fichas.length) return
  const printers = await listSystemPrinters()
  const printerName = pickPrinterName(config, printers)
  if (!printerName) {
    throw new Error(
      'Nenhuma impressora encontrada. Instale a Elgin i9 no Windows e selecione-a em Configuracoes.',
    )
  }
  const payload = buildEscPosFichas(fichas, config)
  await printEscPosRaw(printerName, payload)
}
