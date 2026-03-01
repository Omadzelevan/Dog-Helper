function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('File read failed'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onerror = () => reject(new Error('Image decode failed'))
    image.onload = () => resolve(image)
    image.src = dataUrl
  })
}

export async function fileToDataUrl(file, options = {}) {
  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.8,
    outputType = 'image/jpeg',
  } = options

  const sourceDataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(sourceDataUrl)
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return sourceDataUrl

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL(outputType, quality)
}
