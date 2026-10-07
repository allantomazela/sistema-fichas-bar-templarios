import { describe, expect, it } from 'vitest'
import { carimboLocal, selecionarBackupsExcedentes } from './backupFiles'

const nome = (motivo: string, carimbo: string) => `${motivo}_${carimbo}.json`

describe('backups automáticos', () => {
  it('carimbo usa o horário local do computador, com zeros à esquerda', () => {
    expect(carimboLocal(new Date(2026, 0, 5, 9, 7, 3))).toBe('2026-01-05-09-07-03')
  })

  it('mantém só os N mais recentes, misturando motivos, e apaga os mais antigos', () => {
    const nomes = [
      nome('antes_de_zerar', '2026-10-06-22-10-33'),
      nome('antes_de_restaurar', '2026-10-07-08-00-00'),
      nome('antes_de_zerar', '2026-10-01-10-00-00'),
      nome('antes_de_restaurar', '2026-09-30-23-59-59'),
    ]
    expect(selecionarBackupsExcedentes(nomes, 2)).toEqual([
      nome('antes_de_zerar', '2026-10-01-10-00-00'),
      nome('antes_de_restaurar', '2026-09-30-23-59-59'),
    ])
  })

  it('nunca apaga arquivos que não foram criados pelo backup automático', () => {
    const nomes = ['meu_backup.json', 'backup_pdv_fichas_2026-10-06.json', 'notas.txt']
    expect(selecionarBackupsExcedentes(nomes, 0)).toEqual([])
  })
})
