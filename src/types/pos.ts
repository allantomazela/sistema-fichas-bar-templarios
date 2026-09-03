export type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'cortesia'

export type StatusCaixa = 'aberto' | 'fechado'
export type TipoMovimentacaoCaixa = 'sangria' | 'suprimento'
export type StatusVenda = 'concluida' | 'cancelada'
export type StatusFicha = 'emitida' | 'utilizada' | 'cancelada'
export type LarguraBobina = '58mm' | '80mm'

export interface Categoria {
  id: string
  nome: string
  cor: string // Hex color code for UI cards
  icone?: string
  ordem: number
}

export interface ComboItem {
  produto_id: string
  quantidade: number
}

export interface Produto {
  id: string
  categoria_id: string
  nome: string
  preco: number
  codigo_rapido: string // Ex: "01", "REF", etc
  emite_ficha_individual: boolean // Se true, 3 unidades = 3 fichas
  ativo: boolean
  descricao?: string
  is_combo?: boolean
  itens_combo?: ComboItem[] // Para desmembrar combos em fichas individuais
  imagem_base64?: string // Imagem do produto em base64 (offline-first)
  imprimir_imagem_ficha?: boolean // Se viável, imprimir imagem do produto na ficha
  controla_estoque?: boolean // Se true, o produto tem limite e baixa de estoque
  estoque_atual?: number // Quantidade atual em estoque (opcional)
  estoque_minimo?: number // Alerta de estoque baixo (opcional, ex: 10)
}

export interface Caixa {
  id: string
  operador: string
  abertura: string // ISO string
  fechamento?: string // ISO string
  saldo_inicial: number
  status: StatusCaixa
  observacoes?: string
  valores_informados?: {
    dinheiro?: number
    pix?: number
    debito?: number
    credito?: number
    cortesia?: number
  }
}

export interface MovimentacaoCaixa {
  id: string
  caixa_id: string
  tipo: TipoMovimentacaoCaixa
  valor: number
  motivo: string
  operador: string
  data_hora: string // ISO string
}

export interface VendaItem {
  id: string
  venda_id: string
  produto_id: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  total_item: number
  emite_ficha_individual: boolean
  is_combo?: boolean
  itens_combo?: ComboItem[]
}

export interface Venda {
  id: string
  sequencial_venda: number
  caixa_id: string
  operador: string
  data_hora: string // ISO string
  total: number
  subtotal: number
  desconto: number
  forma_pagamento: FormaPagamento
  valor_recebido: number
  troco: number
  status: StatusVenda
  motivo_cancelamento?: string
  itens: VendaItem[]
}

export interface Ficha {
  id: string
  venda_id: string
  sequencial_venda: number
  produto_id: string
  produto_nome: string
  categoria_nome: string
  preco: number
  codigo_validacao: string // Código hash anti-fraude curto (ex: 8 caracteres alfanuméricos)
  hash_seguranca: string // Hash completo SHA-like
  sequencial: number // Sequencial global do dia/evento (#0001)
  data_emissao: string // ISO string
  operador: string
  caixa_id: string
  status: StatusFicha
  data_utilizacao?: string
  operador_validacao?: string
  produto_imagem_base64?: string
  imprimir_imagem_ficha?: boolean
}

export interface Configuracoes {
  nome_evento: string
  subtitulo_evento: string
  cabecalho_cupom: string
  rodape_cupom: string
  logomarca_base64?: string // Logomarca do evento em base64
  largura_bobina: LarguraBobina
  corte_automatico: boolean
  modo_impressao_padrao: 'individual' | 'agrupado' // individual = 1 ficha por item
  senha_admin: string // Padrão "1234" ou configurável
  taxa_servico_habilitada: boolean
  auto_imprimir_ao_finalizar: boolean
  simular_impressao_tela: boolean
  chave_pix_estatica?: string
  nome_beneficiario_pix?: string
  cidade_pix?: string
  salt_seguranca: string
  tema: 'light' | 'dark'

  // Personalização da Ficha Impressa
  ficha_mostrar_cabecalho?: boolean // padrão true
  ficha_mostrar_logo?: boolean // padrão true
  ficha_mostrar_qrcode?: boolean // padrão true
  ficha_mostrar_hash?: boolean // código hash anti-fraude (padrão true)
  ficha_mostrar_preco?: boolean // padrão true
  ficha_mostrar_data_hora?: boolean // padrão true
  ficha_mostrar_operador?: boolean // padrão true
  ficha_mostrar_rodape?: boolean // padrão true
  ficha_mostrar_imagem_produto?: boolean // se o produto tiver imagem (padrão false)
}

export interface CartItem {
  produto: Produto
  quantidade: number
  preco_unitario: number
  observacao?: string
}

export interface DatabaseBackup {
  versao: string
  data_backup: string
  configuracoes: Configuracoes
  categorias: Categoria[]
  produtos: Produto[]
  caixas: Caixa[]
  movimentacoes_caixa: MovimentacaoCaixa[]
  vendas: Venda[]
  fichas: Ficha[]
}
