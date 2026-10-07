import { isTauri } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

function defaultBackupName(): string {
  return `backup_pdv_fichas_${new Date().toISOString().slice(0, 10)}.json`
}

/** Salva backup JSON (diálogo nativo no Tauri; download no browser). */
export async function saveBackupFile(jsonContent: string): Promise<boolean> {
  const fileName = defaultBackupName()

  if (isTauri()) {
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: 'Backup JSON', extensions: ['json'] }],
      title: 'Exportar backup do PDV',
    })
    if (!path) return false
    await writeTextFile(path, jsonContent)
    return true
  }

  const blob = new Blob([jsonContent], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
  return true
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
