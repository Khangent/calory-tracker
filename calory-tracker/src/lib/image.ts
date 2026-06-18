/**
 * Read an image File and return a downscaled JPEG data URL.
 * Keeps the payload small for the vision API while staying legible for estimation.
 */
export async function fileToDataURL(file: File, maxDim = 1024, quality = 0.8): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the image file.'))
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Could not load the image.'))
    el.src = original
  })

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  if (scale >= 1) return original // already small enough

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return original
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality)
}
