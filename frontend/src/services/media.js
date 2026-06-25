export function getMediaKind(file) {
  if (!file) return 'unknown'

  const type = typeof file === 'string' ? '' : (file.type || '')
  if (type.startsWith('audio/')) return 'audio'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('image/')) return 'image'

  const url = typeof file === 'string' ? file : (file.url || file.src || file.path || file.file || '')
  const lower = String(url).toLowerCase()
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/.test(lower)) return 'image'
  if (/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/.test(lower)) return 'video'
  if (/\.(mp3|wav|aac|m4a|flac|oga|opus)(\?.*)?$/.test(lower)) return 'audio'
  return 'other'
}

export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function readAudioMetadata(file) {
  if (!file?.name) return {}
  const title = file.name.replace(/\.[^/.]+$/, '')
  return { title, artist: '', album: '', picture: null }
}

export function pictureToObjectUrl(picture) {
  if (!picture?.data) return null
  try {
    const payload = picture.data instanceof Uint8Array ? picture.data : new Uint8Array(picture.data)
    const blob = new Blob([payload], { type: picture.format || 'image/jpeg' })
    return URL.createObjectURL(blob)
  } catch (error) {
    return null
  }
}

export function revokeObjectUrl(url) {
  if (!url) return
  try { URL.revokeObjectURL(url) } catch (error) {}
}
