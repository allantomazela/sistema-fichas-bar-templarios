export type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'cortesia'

export type StatusCaixa = 'aberto' | 'fechado'
export type TipoMovimentacaoCaixa = 'sangria' | 'suprimento'
export type StatusVenda = 'concluida' | 'cancelada'
export type StatusFicha = 'emitida' | 'cancelada'
export type LarguraBobina = '58mm' | '80mm'

export interface Categoria {
  id: string
  nome: string
  cor: string // Hex — cor dos filtros no PDV
  icone?: string // Nome do ícone Lucide (ex: Beer, Wine)
  ordem: number // Ordem de exibição no PDV (menor = primeiro)
  ativo?: boolean // false = oculta no PDV sem excluir (padrão true)
  descricao?: string // Texto auxiliar no cadastro
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
  imprimir_imagem_ficha?: boolean // Legado — sempre false; ficha imprime apenas o nome
  controla_estoque?: boolean // Se true, o produto tem limite e baixa de estoque
  estoque_atual?: number // Quantidade atual em estoque (opcional)
  estoque_minimo?: number // Alerta de estoque baixo (opcional, ex: 10)
}

/**
 * Produto com a foto embutida: formato do formulário de cadastro e do arquivo de backup.
 * No banco a foto fica numa lista própria (ver ProductImageService).
 */
export interface ProdutoComImagem extends Produto {
  imagem_base64?: string // Foto só na tela de venda / cadastro (nunca na ficha)
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

/**
 * entrada = compra/recebimento · ajuste = contagem física (define o saldo)
 * perda = quebra/vencido · venda = baixa automática · estorno = venda cancelada
 */
export type TipoMovimentacaoEstoque = 'entrada' | 'ajuste' | 'perda' | 'venda' | 'estorno' | 'lote'

export interface MovimentacaoEstoque {
  id: string
  produto_id: string
  produto_nome: string
  tipo: TipoMovimentacaoEstoque
  /** Variação aplicada ao saldo (positiva = entrou, negativa = saiu). */
  quantidade: number
  estoque_anterior: number
  estoque_posterior: number
  motivo?: string
  venda_id?: string
  sequencial_venda?: number
  operador?: string
  data_hora: string // ISO string
  /** Preenchidos quando um lançamento manual é corrigido depois. */
  editado_em?: string
  editado_por?: string
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
  /** Venda gerada na prestação de contas de um lote de fichas antecipadas. */
  lote_id?: string
  lote_numero?: number
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
  /** Preenchido nas fichas antecipadas: numeração própria do lote (L03-0001). */
  lote_numero?: number
  /** @deprecated Não usado — fichas não carregam foto do produto */
  produto_imagem_base64?: string
  /** @deprecated Sempre false — ficha imprime só o nome */
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
  /** Nome da impressora no Windows/Linux (ex.: Elgin i9(USB)). */
  impressora_nome?: string
  /**
   * escpos = RAW Elgin i9 (recomendado, corta guilhotina).
   * navegador = diálogo de impressão do WebView (fallback).
   */
  modo_impressao?: 'escpos' | 'navegador'
  modo_impressao_padrao?: 'individual' // Sempre individual: 1 ficha térmica própria por unidade
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
  /** @deprecated Sempre false — foto do produto não sai na ficha */
  ficha_mostrar_imagem_produto?: boolean
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
  produtos: ProdutoComImagem[]
  caixas: Caixa[]
  movimentacoes_caixa: MovimentacaoCaixa[]
  vendas: Venda[]
  fichas: Ficha[]
  movimentacoes_estoque?: MovimentacaoEstoque[]
  lotes_fichas?: LoteFichas[]
}

export type StatusLoteFichas = 'aberto' | 'prestado' | 'cancelado'

export interface LoteFichasItem {
  produto_id: string
  produto_nome: string
  preco_unitario: number
  quantidade: number
  /** Informado na prestação de contas. */
  devolvidas?: number
}

/**
 * Fichas impressas antes da venda (contingência, ambulante, barraca).
 * Não entram no caixa ao imprimir: o estoque fica reservado e a venda só
 * é registrada na prestação de contas (fichas que não voltaram = vendidas).
 */
export interface LoteFichas {
  id: string
  numero: number
  responsavel: string
  motivo?: string
  status: StatusLoteFichas
  criado_em: string
  criado_por: string
  itens: LoteFichasItem[]
  /** Fichas impressas (guardadas para reimpressão; não entram na lista de fichas de venda). */
  fichas: Ficha[]
  prestado_em?: string
  prestado_por?: string
  forma_pagamento?: FormaPagamento
  total_recebido?: number
  venda_id?: string
  sequencial_venda?: number
  cancelado_em?: string
  motivo_cancelamento?: string
}
