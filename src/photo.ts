export async function compactPhoto(file: File) {
  if (file.size > 12_000_000 || !file.type.startsWith('image/')) throw new Error('Invalid photo')
  const image = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 380 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo unavailable')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const encoded = canvas.toDataURL('image/jpeg', .68)
    if (encoded.length > 90000) throw new Error('Photo too large')
    return encoded
  } finally { image.close() }
}