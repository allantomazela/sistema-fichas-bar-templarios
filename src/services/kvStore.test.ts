import { describe, expect, it } from 'vitest'
import { CATALOG_ARRAY_KEYS, EVENT_ARRAY_KEYS, SEQUENCE_KEYS, STORAGE_KEYS } from './kvStore'

/** Chaves que os resets tratam à parte (configuração nunca é apagada; caixa ativo é ponteiro). */
const CHAVES_FORA_DOS_GRUPOS = [STORAGE_KEYS.CONFIG, STORAGE_KEYS.CAIXA_ATIVO_ID]

describe('classificação das chaves de armazenamento', () => {
  it('toda chave nova precisa estar em um grupo de reset (ou ser explicitamente excluída)', () => {
    const classificadas = [
      ...EVENT_ARRAY_KEYS,
      ...CATALOG_ARRAY_KEYS,
      ...SEQUENCE_KEYS,
      ...CHAVES_FORA_DOS_GRUPOS,
    ]
    expect(new Set(classificadas).size).toBe(classificadas.length)
    expect([...classificadas].sort()).toEqual(Object.values(STORAGE_KEYS).sort())
  })
})
