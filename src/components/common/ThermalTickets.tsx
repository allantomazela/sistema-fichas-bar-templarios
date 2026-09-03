import React from 'react'
import { Ficha, Configuracoes, Venda, Caixa, LarguraBobina } from '@/types/pos'
import { QRCodeSVG } from './QRCodeSVG'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ShieldCheck, Printer, Scissors } from 'lucide-react'

interface SingleFichaProps {
  ficha: Ficha
  config: Configuracoes
  showCutLine?: boolean
}

export const ThermalFichaTicket: React.FC<SingleFichaProps> = ({
  ficha,
  config,
  showCutLine = true,
}) => {
  const is58mm = config.largura_bobina === '58mm'
  const widthClass = is58mm ? 'w-[200px] text-[11px]' : 'w-[280px] text-[12px]'

  const showCabecalho = config.ficha_mostrar_cabecalho !== false
  const showLogo = config.ficha_mostrar_logo !== false && !!config.logomarca_base64
  const showQrCode = config.ficha_mostrar_qrcode !== false
  const showHash = config.ficha_mostrar_hash !== false
  const showPreco = config.ficha_mostrar_preco !== false
  const showDataHora = config.ficha_mostrar_data_hora !== false
  const showOperador = config.ficha_mostrar_operador !== false
  const showRodape = config.ficha_mostrar_rodape !== false
  const showProductImage =
    config.ficha_mostrar_imagem_produto !== false &&
    ficha.imprimir_imagem_ficha !== false &&
    !!ficha.produto_imagem_base64

  return (
    <div
      className={`thermal-ticket font-mono bg-white text-black p-3 my-2 border border-dashed border-gray-400 rounded-none shadow-sm select-none ${widthClass} mx-auto transition-all`}
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >
      {/* LOGO DO EVENTO (SE CONFIGURADA E HABILITADA) */}
      {showLogo && (
        <div className="flex justify-center mb-2 pb-1 border-b border-gray-300">
          <img
            src={config.logomarca_base64}
            alt="Logo do Evento"
            className="max-h-12 max-w-[80%] object-contain filter grayscale contrast-125"
          />
        </div>
      )}

      {/* CABEÇALHO DO EVENTO */}
      {showCabecalho && (
        <div className="text-center border-b border-black pb-2 mb-2">
          <div className="text-[10px] uppercase font-bold tracking-wider text-gray-700">
            *** FICHA DE CONSUMO ***
          </div>
          <div className="font-extrabold text-[15px] leading-tight uppercase mt-0.5">
            {config.nome_evento || 'EVENTO'}
          </div>
          {config.subtitulo_evento && (
            <div className="text-[10px] text-gray-800 leading-tight mt-0.5">
              {config.subtitulo_evento}
            </div>
          )}
          {config.cabecalho_cupom && (
            <div className="text-[9px] text-gray-600 mt-1 leading-none">
              {config.cabecalho_cupom}
            </div>
          )}
        </div>
      )}

      {/* DETALHES DO PRODUTO (DESTAQUE MÁXIMO) */}
      <div className="text-center py-2 border-b-2 border-black">
        {showProductImage && (
          <div className="flex justify-center mb-1">
            <img
              src={ficha.produto_imagem_base64}
              alt={ficha.produto_nome}
              className="w-14 h-14 object-cover rounded border border-black/40 filter grayscale contrast-125"
            />
          </div>
        )}
        <div className="text-[10px] uppercase font-semibold text-gray-600">
          [{ficha.categoria_nome}]
        </div>
        <div className="font-black text-[18px] leading-tight uppercase my-1 text-black tracking-wide break-words">
          {ficha.produto_nome}
        </div>
        {showPreco &&
          (ficha.preco > 0 ? (
            <div className="text-[14px] font-bold mt-1">{formatCurrency(ficha.preco)}</div>
          ) : (
            <div className="text-[11px] font-bold text-gray-700">ITEM DE COMBO</div>
          ))}
      </div>

      {/* SEQUENCIAL E NÚMERO DA VENDA */}
      <div className="py-2 text-center border-b border-dashed border-black">
        <div className="flex items-center justify-between text-[11px] px-1 font-bold">
          <span>FICHA:</span>
          <span className="text-[15px] font-black tracking-widest">
            #{String(ficha.sequencial).padStart(5, '0')}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] px-1 mt-0.5">
          <span>VENDA:</span>
          <span>#{String(ficha.sequencial_venda).padStart(4, '0')}</span>
        </div>
      </div>

      {/* QR CODE ANTI-FRAUDE E/OU CÓDIGO HASH */}
      {(showQrCode || showHash) && (
        <div className="py-2 flex flex-col items-center justify-center">
          {showQrCode && (
            <div className="p-1 bg-white border border-black inline-block">
              <QRCodeSVG value={ficha.hash_seguranca} size={is58mm ? 90 : 110} />
            </div>
          )}
          {showHash && (
            <>
              <div className="text-[12px] font-black tracking-widest mt-1 bg-black text-white px-2 py-0.5">
                {ficha.codigo_validacao}
              </div>
              <div className="text-[8px] text-gray-600 uppercase mt-0.5 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 inline" /> CÓDIGO ANTI-FRAUDE ÚNICO
              </div>
            </>
          )}
        </div>
      )}

      {/* INFORMAÇÕES DE OPERAÇÃO E RODAPÉ */}
      {(showDataHora || showOperador || (showRodape && config.rodape_cupom)) && (
        <div className="border-t border-black pt-1.5 text-[9px] text-center space-y-0.5">
          {showDataHora && <div>DATA: {formatDateTime(ficha.data_emissao)}</div>}
          {showOperador && (
            <div>
              OP: {ficha.operador} | CX: {ficha.caixa_id.slice(-6)}
            </div>
          )}
          {showRodape && config.rodape_cupom && (
            <div className="text-[9px] font-bold italic pt-1 border-t border-dashed border-gray-400 mt-1">
              {config.rodape_cupom}
            </div>
          )}
        </div>
      )}

      {showCutLine && config.corte_automatico && (
        <div className="flex items-center justify-center gap-1 text-[8px] text-gray-400 mt-2 border-t border-dotted border-gray-400 pt-1">
          <Scissors className="w-3 h-3" />
          <span>--- CORTE AQUI ---</span>
        </div>
      )}
    </div>
  )
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
  const totalInformado =
    (valoresInf.dinheiro || 0) +
    (valoresInf.pix || 0) +
    (valoresInf.debito || 0) +
    (valoresInf.credito || 0)

  const diferencaDinheiro = (valoresInf.dinheiro || 0) - resumo.saldoDinheiroEsperado

  return (
    <div
      className={`thermal-ticket font-mono bg-white text-black p-3 my-2 border border-dashed border-gray-400 rounded-none shadow-sm select-none ${widthClass} mx-auto`}
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >
      {/* CABEÇALHO */}
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        <div className="font-extrabold text-[14px] uppercase">{config.nome_evento}</div>
        <div className="text-[11px] font-bold uppercase bg-black text-white py-0.5 px-1 mt-1">
          *** FECHAMENTO DE CAIXA ***
        </div>
      </div>

      {/* DADOS DO TURNO */}
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

      {/* RESUMO GERAL */}
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

      {/* DETALHAMENTO POR FORMA DE PAGAMENTO */}
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

      {/* CONFERÊNCIA DE GAVETA (DINHEIRO FÍSICO) */}
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

      {/* SEÇÃO MOVIMENTAÇÕES DISCRIMINADAS (SANGRIA / SUPRIMENTO) */}
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

      {/* CONFERÊNCIA ÀS CEGAS */}
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

      {/* ASSINATURA */}
      <div className="pt-6 text-center text-[9px]">
        <div className="border-t border-black w-4/5 mx-auto pt-1 mb-1 font-bold">
          {caixa.operador}
        </div>
        <div>ASSINATURA DO OPERADOR / FISCAL</div>
      </div>
    </div>
  )
}

// COMPONENTE GLOBAIS DE IMPRESSÃO VIA BROWSER
export function triggerBrowserPrint(elementId: string): void {
  const element = document.getElementById(elementId)
  if (!element) {
    window.print()
    return
  }

  // Create an iframe to print cleanly without UI headers/footers
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

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Impressão Térmica - Fichas</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          body {
            margin: 0;
            padding: 8px;
            font-family: "Courier New", Courier, monospace;
            background: #ffffff;
            color: #000000;
          }
          .thermal-ticket {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 16px;
            padding-bottom: 12px;
          }
          .thermal-ticket:last-child {
            margin-bottom: 0;
          }
          * {
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
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
