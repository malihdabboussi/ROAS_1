const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/m4a',
  pdf: 'application/pdf',
}

function mimeFromExt(ext: string): string {
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}

function mediaTypeFromMime(mime: string): 'image' | 'video' | 'audio' | 'file' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'file'
}

export function activityAttachmentsFromUrls(urls: string[]) {
  return urls.map((url) => {
    let filename = 'attachment'
    try {
      const path = new URL(url).pathname.split('/').pop()
      if (path) filename = decodeURIComponent(path)
    } catch {
      /* keep default */
    }
    const ext = filename.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ''
    const mimeType = mimeFromExt(ext)
    const type = mediaTypeFromMime(mimeType)
    return { filename, mimeType, fileUrl: url, type }
  })
}
