import React from 'react'
import { Ficha, Configuracoes, Caixa } from '@/types/pos'
import { formatCurrency, formatDateTime, formatDate, formatTime } from '@/lib/utils'

interface SingleFichaProps {
  ficha: Ficha
  config: Configuracoes
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getTicketMetrics(largura: Configuracoes['largura_bobina']) {
  const is58 = largura === '58mm'
  return {
    is58,
    /** Largura útil da bobina (quase a largura total do papel). */
    paperMm: is58 ? 58 : 80,
    widthMm: is58 ? 58 : 80,
    titleSize: is58 ? '11px' : '13px',
    subSize: is58 ? '8px' : '9px',
    itemSize: is58 ? '15px' : '18px',
    footerSize: is58 ? '8px' : '9px',
    seqSize: is58 ? '7px' : '8px',
    pad: is58 ? '3mm 2.5mm 4mm' : '3.5mm 3mm 4.5mm',
  }
}

function OrnamentLine() {
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        margin: '4px 0',
      }}
    >
      <span style={{ flex: 1, height: 1, background: '#000', opacity: 0.35 }} />
      <span
        style={{
          width: 4,
          height: 4,
          border: '1px solid #000',
          transform: 'rotate(45deg)',
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, height: 1, background: '#000', opacity: 0.35 }} />
    </div>
  )
}

function getFichaTitulo(config: Configuracoes): string {
  return (config.nome_evento || 'Show de Prêmios').trim() || 'Show de Prêmios'
}

function getFichaLocal(config: Configuracoes): string {
  return (config.subtitulo_evento || config.cabecalho_cupom || 'Bar Templários').trim()
}

function getFichaOrganizacao(config: Configuracoes): string {
  const rodape = (config.rodape_cupom || '').trim()
  if (rodape.toLowerCase().startsWith('organização:')) return rodape
  if (rodape.toLowerCase().startsWith('organizacao:')) return rodape
  return rodape || 'Organização: Templários da Paz'
}

/** Ficha de bar / voucher de consumo — térmica 58/80mm, P&B, compacta e 1 unidade por ficha. */
export const ThermalFichaTicket: React.FC<SingleFichaProps> = ({ ficha, config }) => {
  const m = getTicketMetrics(config.largura_bobina)
  const titulo = getFichaTitulo(config).toUpperCase()
  const local = getFichaLocal(config)
  const organizacao = getFichaOrganizacao(config)
  const seq = String(ficha.sequencial).padStart(4, '0')

  return (
    <div
      className="thermal-ticket select-none mx-auto my-2 bg-white text-black"
      style={{
        width: `${m.widthMm}mm`,
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: m.pad,
        fontFamily: '"Courier New", Courier, monospace',
        border: '1px solid #000',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: m.titleSize,
          lineHeight: 1.15,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {titulo}
      </div>

      <OrnamentLine />

      <div style={{ fontSize: m.subSize, fontWeight: 600, lineHeight: 1.35 }}>
        {formatDate(ficha.data_emissao)}
        <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
        {formatTime(ficha.data_emissao)}
        <br />
        {local}
      </div>

      <div
        style={{
          margin: '6px 0',
          padding: '6px 2px',
          borderTop: '1px solid #000',
          borderBottom: '1px solid #000',
        }}
      >
        <div
          style={{
            fontSize: '7px',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            opacity: 0.55,
            marginBottom: 3,
          }}
        >
          Vale consumo
        </div>
        <div
          style={{
            fontWeight: 900,
            fontSize: m.itemSize,
            lineHeight: 1.15,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            wordBreak: 'break-word',
          }}
        >
          {ficha.produto_nome}
        </div>
      </div>

      <div
        style={{
          fontSize: m.footerSize,
          fontWeight: 700,
          lineHeight: 1.3,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {organizacao}
      </div>
      <div
        style={{
          marginTop: 3,
          fontSize: m.seqSize,
          fontWeight: 600,
          letterSpacing: '0.08em',
          opacity: 0.55,
        }}
      >
        Nº {seq}
      </div>
    </div>
  )
}

function buildFichaTicketHtml(ficha: Ficha, config: Configuracoes, isLast: boolean): string {
  const m = getTicketMetrics(config.largura_bobina)
  const titulo = escapeHtml(getFichaTitulo(config).toUpperCase())
  const local = escapeHtml(getFichaLocal(config))
  const organizacao = escapeHtml(getFichaOrganizacao(config))
  const itemName = escapeHtml(ficha.produto_nome.toUpperCase())
  const dateStr = escapeHtml(formatDate(ficha.data_emissao))
  const timeStr = escapeHtml(formatTime(ficha.data_emissao))
  const seq = String(ficha.sequencial).padStart(4, '0')
  const cutMark =
    !isLast && config.corte_automatico !== false
      ? `<div class="cut-mark" aria-hidden="true">- - - - - corte - - - - -</div>`
      : ''

  return `
    <article class="ticket">
      <div class="ticket-inner">
        <div class="t-title">${titulo}</div>
        <div class="t-ornament" aria-hidden="true"><span></span><i></i><span></span></div>
        <div class="t-meta">${dateStr}<span>·</span>${timeStr}<br/>${local}</div>
        <div class="t-item-box">
          <div class="t-label">Vale consumo</div>
          <div class="t-item">${itemName}</div>
        </div>
        <div class="t-org">${organizacao}</div>
        <div class="t-seq">Nº ${seq}</div>
      </div>
      ${cutMark}
    </article>
  `
}

/**
 * Impressão das fichas:
 * 1) Nativo ESC/POS → Elgin i9 (RAW + guilhotina) quando modo escpos
 * 2) Fallback: impressão via WebView (bobina contínua)
 */
export async function printFichasDireto(fichas: Ficha[], config: Configuracoes): Promise<void> {
  if (!fichas.length) return

  const { isTauri } = await import('@tauri-apps/api/core')
  const useEscPos = isTauri() && (config.modo_impressao || 'escpos') !== 'navegador'

  if (useEscPos) {
    try {
      const { printFichasEscPos } = await import('@/services/escposElgin')
      await printFichasEscPos(fichas, config)
      return
    } catch (err) {
      console.error('Falha ESC/POS Elgin i9, tentando fallback do navegador:', err)
      const message = err instanceof Error ? err.message : String(err)
      try {
        const { toast } = await import('sonner')
        toast.warning(`Elgin i9: ${message}. Tentando impressão alternativa…`)
      } catch {
        /* ignore */
      }
    }
  }

  printFichasBrowser(fichas, config)
}

/**
 * Fallback WebView: bobina contínua, altura = conteúdo (sem tripa de página A4).
 */
function printFichasBrowser(fichas: Ficha[], config: Configuracoes): void {
  const m = getTicketMetrics(config.largura_bobina)
  const paperMm = m.paperMm
  const ticketsHtml = fichas
    .map((ficha, index) => buildFichaTicketHtml(ficha, config, index === fichas.length - 1))
    .join('\n')

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Fichas</title>
  <style>
    @page {
      margin: 0;
      size: ${paperMm}mm auto;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: ${paperMm}mm;
      max-width: ${paperMm}mm;
      background: #fff;
      color: #000;
      font-family: "Courier New", Courier, monospace;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket {
      width: ${paperMm}mm;
      max-width: ${paperMm}mm;
      margin: 0;
      padding: 0;
      page-break-inside: avoid;
      break-inside: avoid;
      height: auto;
    }
    .ticket-inner {
      width: 100%;
      padding: ${m.pad};
      text-align: center;
      border-bottom: 1px solid #000;
    }
    .t-title {
      font-weight: 800;
      font-size: ${m.titleSize};
      line-height: 1.15;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .t-ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      margin: 3px 0 4px;
    }
    .t-ornament span {
      flex: 1;
      height: 1px;
      background: #000;
      opacity: 0.35;
    }
    .t-ornament i {
      width: 4px;
      height: 4px;
      border: 1px solid #000;
      transform: rotate(45deg);
      flex-shrink: 0;
      font-style: normal;
    }
    .t-meta {
      font-size: ${m.subSize};
      font-weight: 600;
      line-height: 1.35;
    }
    .t-meta span { margin: 0 4px; opacity: 0.4; }
    .t-item-box {
      margin: 5px 0;
      padding: 5px 2px;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .t-label {
      font-size: 7px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      opacity: 0.55;
      margin-bottom: 2px;
    }
    .t-item {
      font-weight: 900;
      font-size: ${m.itemSize};
      line-height: 1.15;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      word-break: break-word;
    }
    .t-org {
      font-size: ${m.footerSize};
      font-weight: 700;
      line-height: 1.3;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .t-seq {
      margin-top: 2px;
      font-size: ${m.seqSize};
      font-weight: 600;
      letter-spacing: 0.08em;
      opacity: 0.55;
    }
    .cut-mark {
      width: 100%;
      text-align: center;
      font-size: 7px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 1.5mm 0 2mm;
      line-height: 1;
      opacity: 0.7;
    }
    @media print {
      html, body { width: ${paperMm}mm !important; }
      .ticket { width: ${paperMm}mm !important; }
    }
  </style>
</head>
<body>${ticketsHtml}</body>
</html>`)
  doc.close()

  const win = iframe.contentWindow
  if (!win) {
    document.body.removeChild(iframe)
    return
  }

  const cleanup = () => {
    try {
      if (iframe.parentNode) document.body.removeChild(iframe)
    } catch {
      /* ignore */
    }
  }

  win.focus()
  setTimeout(() => {
    try {
      win.print()
    } finally {
      setTimeout(cleanup, 1200)
    }
  }, 250)
}

// COMPROVANTE DE FECHAMENTO DE CAIXA TÉRMICO
interface FechamentoTicketProps {
  caixa: Caixa
  config: Configuracoes
  resumo: {
    totalVendasCount: number
    totalFichasCount: number
    totalFaturamento: number
    totalDinheiro: number
    totalPix: number
    totalDebito: number
    totalCredito: number
    totalCortesia: number
    saldoInicial: number
    totalSuprimento: number
    totalSangria: number
    saldoDinheiroEsperado: number
    movimentacoes?: Array<{
      id: string
      tipo: 'sangria' | 'suprimento'
      valor: number
      motivo: string
      operador: string
      data_hora: string
    }>
  }
}

export const ThermalFechamentoTicket: React.FC<FechamentoTicketProps> = ({
  caixa,
  config,
  resumo,
}) => {
  const is58mm = config.largura_bobina === '58mm'
  const widthClass = is58mm ? 'w-[200px] text-[10px]' : 'w-[280px] text-[11px]'

  const valoresInf = caixa.valores_informados || {}
  const diferencaDinheiro = (valoresInf.dinheiro || 0) - resumo.saldoDinheiroEsperado

  return (
    <div
      className={`thermal-ticket font-mono bg-white text-black p-3 my-2 border border-dashed border-gray-400 rounded-none shadow-sm select-none ${widthClass} mx-auto`}
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <div className="font-extrabold text-[14px] uppercase">{config.nome_evento}</div>
        <div className="text-[11px] font-bold uppercase bg-black text-white py-0.5 px-1 mt-1">
          *** FECHAMENTO DE CAIXA ***
        </div>
      </div>

      <div className="text-[10px] space-y-0.5 border-b border-black pb-2 mb-2">
        <div className="flex justify-between">
          <span>OPERADOR:</span>
          <span className="font-bold">{caixa.operador}</span>
        </div>
        <div className="flex justify-between">
          <span>CAIXA ID:</span>
          <span>{caixa.id}</span>
        </div>
        <div className="flex justify-between">
          <span>ABERTURA:</span>
          <span>{formatDateTime(caixa.abertura)}</span>
        </div>
        <div className="flex justify-between">
          <span>FECHAMENTO:</span>
          <span>{caixa.fechamento ? formatDateTime(caixa.fechamento) : 'EM ABERTO'}</span>
        </div>
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <div className="font-bold text-[11px] uppercase mb-1">TOTALIZADORES:</div>
        <div className="flex justify-between">
          <span>Qtd. Vendas:</span>
          <span className="font-bold">{resumo.totalVendasCount}</span>
        </div>
        <div className="flex justify-between">
          <span>Qtd. Fichas Emitidas:</span>
          <span className="font-bold">{resumo.totalFichasCount}</span>
        </div>
        <div className="flex justify-between font-bold text-[12px] pt-1 border-t border-dashed border-gray-400 mt-1">
          <span>FATURAMENTO TOTAL:</span>
          <span>{formatCurrency(resumo.totalFaturamento)}</span>
        </div>
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <div className="font-bold text-[11px] uppercase mb-1">POR FORMA DE PAGTO (SISTEMA):</div>
        <div className="flex justify-between">
          <span>Dinheiro (Vendas):</span>
          <span>{formatCurrency(resumo.totalDinheiro)}</span>
        </div>
        <div className="flex justify-between">
          <span>PIX:</span>
          <span>{formatCurrency(resumo.totalPix)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cartão Débito:</span>
          <span>{formatCurrency(resumo.totalDebito)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cartão Crédito:</span>
          <span>{formatCurrency(resumo.totalCredito)}</span>
        </div>
        {resumo.totalCortesia > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Cortesia / Isento:</span>
            <span>{formatCurrency(resumo.totalCortesia)}</span>
          </div>
        )}
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <div className="font-bold text-[11px] uppercase mb-1">GAVETA DE DINHEIRO:</div>
        <div className="flex justify-between">
          <span>(+) Fundo Abertura:</span>
          <span>{formatCurrency(resumo.saldoInicial)}</span>
        </div>
        <div className="flex justify-between">
          <span>(+) Vendas Dinheiro:</span>
          <span>{formatCurrency(resumo.totalDinheiro)}</span>
        </div>
        <div className="flex justify-between">
          <span>(+) Suprimentos:</span>
          <span>{formatCurrency(resumo.totalSuprimento)}</span>
        </div>
        <div className="flex justify-between text-red-700">
          <span>(-) Sangrias (Retiradas):</span>
          <span>-{formatCurrency(resumo.totalSangria)}</span>
        </div>
        <div className="flex justify-between font-bold text-[12px] pt-1 border-t border-black mt-1">
          <span>SALDO ESPERADO:</span>
          <span>{formatCurrency(resumo.saldoDinheiroEsperado)}</span>
        </div>
      </div>

      <div className="border-b border-black pb-2 mb-2">
        <div className="font-bold text-[11px] uppercase mb-1">
          MOVIMENTAÇÕES DO TURNO ({resumo.movimentacoes?.length || 0}):
        </div>
        {!resumo.movimentacoes || resumo.movimentacoes.length === 0 ? (
          <div className="text-[9px] text-gray-500 italic">Nenhuma sangria ou suprimento</div>
        ) : (
          <div className="space-y-1">
            {resumo.movimentacoes.map((mov) => {
              const hora = new Date(mov.data_hora).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })
              const isSangria = mov.tipo === 'sangria'
              return (
                <div
                  key={mov.id}
                  className="text-[9px] border-b border-dotted border-gray-300 pb-0.5"
                >
                  <div className="flex justify-between font-bold">
                    <span>
                      {hora} [{isSangria ? 'SANGRIA' : 'SUPRIM.'}]
                    </span>
                    <span>
                      {isSangria ? '-' : '+'}
                      {formatCurrency(mov.valor)}
                    </span>
                  </div>
                  <div className="text-[8px] text-gray-600 truncate">
                    {mov.motivo} ({mov.operador})
                  </div>
                </div>
              )
            })}
            <div className="flex justify-between font-bold text-[10px] pt-1 border-t border-black mt-1">
              <span>TOTAL LÍQUIDO MOVIMENTADO:</span>
              <span>
                {resumo.totalSuprimento - resumo.totalSangria >= 0 ? '+' : ''}
                {formatCurrency(resumo.totalSuprimento - resumo.totalSangria)}
              </span>
            </div>
          </div>
        )}
      </div>

      {caixa.valores_informados && (
        <div className="border-b border-black pb-2 mb-2 bg-gray-50 p-1.5">
          <div className="font-bold text-[10px] uppercase mb-1">CONFERÊNCIA DECLARADA:</div>
          <div className="flex justify-between">
            <span>Dinheiro Contado:</span>
            <span>{formatCurrency(valoresInf.dinheiro || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>PIX Conferido:</span>
            <span>{formatCurrency(valoresInf.pix || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Cartões (POS):</span>
            <span>{formatCurrency((valoresInf.debito || 0) + (valoresInf.credito || 0))}</span>
          </div>
          <div
            className={`flex justify-between font-bold text-[11px] pt-1 border-t border-dashed border-gray-500 mt-1 ${
              diferencaDinheiro === 0
                ? 'text-emerald-700'
                : diferencaDinheiro > 0
                  ? 'text-blue-700'
                  : 'text-red-700'
            }`}
          >
            <span>DIFERENÇA DINHEIRO:</span>
            <span>
              {diferencaDinheiro >= 0 ? '+' : ''}
              {formatCurrency(diferencaDinheiro)}
            </span>
          </div>
        </div>
      )}

      <div className="pt-6 text-center text-[9px]">
        <div className="border-t border-black w-4/5 mx-auto pt-1 mb-1 font-bold">
          {caixa.operador}
        </div>
        <div>ASSINATURA DO OPERADOR / FISCAL</div>
      </div>
    </div>
  )
}

export function triggerBrowserPrint(elementId: string): void {
  const element = document.getElementById(elementId)
  if (!element) {
    window.print()
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    window.print()
    return
  }

  const ticketsHtml = Array.from(element.querySelectorAll('.thermal-ticket'))
    .map((node) => (node as HTMLElement).outerHTML)
    .join('\n')

  const contentHtml = ticketsHtml || element.innerHTML

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Impressão Térmica</title>
        <style>
          @page { margin: 0; size: auto; }
          body {
            margin: 0;
            padding: 8px;
            font-family: "Courier New", Courier, monospace;
            background: #ffffff;
            color: #000000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .thermal-ticket {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-after: always;
            break-after: page;
            margin: 0 auto 8px;
          }
          .thermal-ticket:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        </style>
      </head>
      <body>${contentHtml}</body>
    </html>
  `)
  doc.close()

  iframe.contentWindow?.focus()
  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 250)
}
