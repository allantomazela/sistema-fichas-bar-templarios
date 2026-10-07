/**
 * Comprime foto de produto para base64 (offline / SQLite).
 * Mantém proporção e limita lado maior para não inflar o banco local.
 */
export async function compressProductImage(
  file: File,
  options?: { maxSide?: number; quality?: number },
): Promise<string> {
  const maxSide = options?.maxSide ?? 480
  const quality = options?.quality ?? 0.72

  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione uma imagem valida (PNG, JPG ou WebP).')
  }

  // Arquivos pequenos: usa original (ate ~180KB)
  if (file.size <= 180_000 && file.type !== 'image/svg+xml') {
    return readAsDataUrl(file)
  }

  const dataUrl = await readAsDataUrl(file)
  const img = await loadImage(dataUrl)

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  // JPEG reduz bastante o tamanho no SQLite local
  return canvas.toDataURL('image/jpeg', quality)
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Nao foi possivel carregar a imagem.'))
    img.src = src
  })
}
