export const STORAGE_KEYS = {
  CONFIG: 'templarios_pdv_config',
  CATEGORIAS: 'templarios_pdv_categorias',
  PRODUTOS: 'templarios_pdv_produtos',
  CAIXAS: 'templarios_pdv_caixas',
  MOVIMENTACOES: 'templarios_pdv_movimentacoes',
  MOVIMENTACOES_ESTOQUE: 'templarios_pdv_movimentacoes_estoque',
  VENDAS: 'templarios_pdv_vendas',
  FICHAS: 'templarios_pdv_fichas',
  CAIXA_ATIVO_ID: 'templarios_pdv_caixa_ativo_id',
  SEQUENCIAL_FICHA: 'templarios_pdv_seq_ficha',
  SEQUENCIAL_VENDA: 'templarios_pdv_seq_venda',
  LOTES_FICHAS: 'templarios_pdv_lotes_fichas',
  IMAGENS_PRODUTOS: 'templarios_pdv_imagens_produtos',
}

/**
 * Classificação central dos dados. Ao criar uma chave nova, inclua-a no grupo certo
 * para que "novo evento", "zerar tudo", a proteção contra corrupção e a gravação
 * linha a linha a tratem. CONFIG fica de fora de propósito: nunca é apagada por reset.
 */
/** Dados do evento: apagados em "novo evento" e em "zerar tudo". */
export const EVENT_ARRAY_KEYS = [
  STORAGE_KEYS.CAIXAS,
  STORAGE_KEYS.MOVIMENTACOES,
  STORAGE_KEYS.VENDAS,
  STORAGE_KEYS.FICHAS,
  STORAGE_KEYS.MOVIMENTACOES_ESTOQUE,
  STORAGE_KEYS.LOTES_FICHAS,
]
/** Catálogo: apagado só em "zerar tudo". */
export const CATALOG_ARRAY_KEYS = [
  STORAGE_KEYS.CATEGORIAS,
  STORAGE_KEYS.PRODUTOS,
  STORAGE_KEYS.IMAGENS_PRODUTOS,
]
/** Contadores do evento: voltam a 1 em qualquer reset. */
export const SEQUENCE_KEYS = [STORAGE_KEYS.SEQUENCIAL_FICHA, STORAGE_KEYS.SEQUENCIAL_VENDA]

/** Listas: gravadas no SQLite uma linha por item (ver rowStore) e protegidas contra corrupção. */
export const LIST_KEYS: ReadonlySet<string> = new Set([...EVENT_ARRAY_KEYS, ...CATALOG_ARRAY_KEYS])
