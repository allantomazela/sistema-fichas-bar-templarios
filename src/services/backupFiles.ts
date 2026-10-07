import { isTauri } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import { open, save } from '@tauri-apps/plugin-dialog'
import { BaseDirectory, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs'

const PASTA_BACKUPS_AUTOMATICOS = 'backups'
/** Quantos backups automáticos manter (os mais antigos são apagados). */
const MAX_BACKUPS_AUTOMATICOS = 10
/** Só arquivos criados por saveAutomaticBackup — nunca apaga outros arquivos da pasta. */
const PADRAO_BACKUP_AUTOMATICO = /^antes_de_[a-z_]+_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/

export type MotivoBackupAutomatico = 'antes_de_zerar' | 'antes_de_restaurar'

interface SaveTextFileOptions {
  content: string
  defaultName: string
  filterName: string
  extensions: string[]
  title: string
  mimeType: string
}

/** Salva um arquivo de texto (diálogo nativo no Tauri; download no browser). */
export async function saveTextFile(options: SaveTextFileOptions): Promise<boolean> {
  if (isTauri()) {
    const path = await save({
      defaultPath: options.defaultName,
      filters: [{ name: options.filterName, extensions: options.extensions }],
      title: options.title,
    })
    if (!path) return false
    await writeTextFile(path, options.content)
    return true
  }

  const blob = new Blob([options.content], { type: options.mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = options.defaultName
  link.click()
  URL.revokeObjectURL(url)
  return true
}

/** Salva backup JSON (diálogo nativo no Tauri; download no browser). */
export function saveBackupFile(jsonContent: string): Promise<boolean> {
  return saveTextFile({
    content: jsonContent,
    defaultName: `backup_pdv_fichas_${new Date().toISOString().slice(0, 10)}.json`,
    filterName: 'Backup JSON',
    extensions: ['json'],
    title: 'Exportar backup do PDV',
    mimeType: 'application/json',
  })
}

/**
 * Grava um backup sem perguntar nada, na pasta de dados do app (junto do banco SQLite).
 * Devolve o caminho completo, ou null no navegador (sem acesso ao disco).
 */
export async function saveAutomaticBackup(
  jsonContent: string,
  motivo: MotivoBackupAutomatico,
): Promise<string | null> {
  if (!isTauri()) return null
  const arquivo = `${motivo}_${carimboLocal(new Date())}.json`
  await mkdir(PASTA_BACKUPS_AUTOMATICOS, { baseDir: BaseDirectory.AppData, recursive: true })
  await writeTextFile(`${PASTA_BACKUPS_AUTOMATICOS}/${arquivo}`, jsonContent, {
    baseDir: BaseDirectory.AppData,
  })
  await podarBackupsAntigos().catch((err) => console.error('Falha ao apagar backups antigos', err))
  return join(await appDataDir(), PASTA_BACKUPS_AUTOMATICOS, arquivo)
}

async function podarBackupsAntigos(): Promise<void> {
  const entradas = await readDir(PASTA_BACKUPS_AUTOMATICOS, { baseDir: BaseDirectory.AppData })
  const excedentes = selecionarBackupsExcedentes(entradas.filter((e) => e.isFile).map((e) => e.name))
  for (const nome of excedentes) {
    await remove(`${PASTA_BACKUPS_AUTOMATICOS}/${nome}`, { baseDir: BaseDirectory.AppData })
  }
}

/** "2026-10-06-22-10-33" no horário do computador (o mesmo do relógio do bar). */
export function carimboLocal(data: Date): string {
  const dois = (n: number) => String(n).padStart(2, '0')
  return [
    data.getFullYear(),
    dois(data.getMonth() + 1),
    dois(data.getDate()),
    dois(data.getHours()),
    dois(data.getMinutes()),
    dois(data.getSeconds()),
  ].join('-')
}

/** Backups automáticos além dos N mais recentes (o carimbo no nome ordena por data). */
export function selecionarBackupsExcedentes(nomes: string[], manter = MAX_BACKUPS_AUTOMATICOS): string[] {
  const dataDoNome = (nome: string) => nome.slice(-24, -5)
  return nomes
    .filter((nome) => PADRAO_BACKUP_AUTOMATICO.test(nome))
    .sort((a, b) => dataDoNome(b).localeCompare(dataDoNome(a)))
    .slice(manter)
}

/** Abre e lê um backup JSON (diálogo nativo no Tauri; null se cancelar). */
export async function pickBackupFileContent(): Promise<string | null> {
  if (isTauri()) {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Backup JSON', extensions: ['json'] }],
      title: 'Restaurar backup do PDV',
    })
    if (!selected || Array.isArray(selected)) return null
    return readTextFile(selected)
  }

  return null
}
