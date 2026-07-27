/** Comprime imagem do celular para enviar à análise (máx ~1MB). */
export async function compressImageFile(
  file: File,
  maxWidth = 1024,
  quality = 0.72,
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas não suportado neste dispositivo')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mimeType = 'image/jpeg'
  const dataUrl = canvas.toDataURL(mimeType, quality)
  const base64 = dataUrl.split(',')[1] ?? ''
  if (!base64) throw new Error('Falha ao processar a imagem')

  return { base64, mimeType, previewUrl: dataUrl }
}
