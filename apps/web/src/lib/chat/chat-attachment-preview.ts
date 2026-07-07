import type { DocumentAttachment } from './document-attachments'

export type ChatAttachmentPreviewKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'json'
  | 'markdown'
  | 'plaintext'
  | 'download'

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac', '.wma'])

export function inferChatAttachmentKind(doc: DocumentAttachment): ChatAttachmentPreviewKind {
  if (doc.type === 'image') return 'image'
  if (doc.type === 'video') return 'video'
  if (doc.type === 'audio') return 'audio'

  const name = doc.filename.toLowerCase()
  const mime = (doc.mimeType ?? '').toLowerCase()

  if (mime.startsWith('audio/') || AUDIO_EXTENSIONS.has(`.${name.split('.').pop()}`)) return 'audio'

  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.includes('json') || name.endsWith('.json')) return 'json'
  if (name.endsWith('.md') || name.endsWith('.markdown') || mime.includes('markdown')) {
    return 'markdown'
  }
  if (
    name.endsWith('.txt') ||
    name.endsWith('.csv') ||
    name.endsWith('.log') ||
    name.endsWith('.tsv') ||
    mime.startsWith('text/')
  ) {
    return 'plaintext'
  }

  if (doc.text != null && doc.text.length > 0 && !doc.fileUrl && !doc.dataUrl) {
    return 'plaintext'
  }

  return 'download'
}

export function attachmentPrimaryUrl(doc: DocumentAttachment): string | null {
  return doc.fileUrl?.trim() || doc.dataUrl?.trim() || null
}

export function attachmentUrlsToDocuments(urls: string[]): DocumentAttachment[] {
  const imageExts = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'])
  const videoExts = new Set(['mp4', 'webm', 'mov', 'm4v'])
  const audioExts = new Set(['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'])

  return urls.map((url) => {
    const pathPart = url.split('?')[0]?.split('/').pop() ?? 'file'
    const filename = decodeURIComponent(pathPart)
    const ext = filename.split('.').pop()?.toLowerCase() ?? ''
    let type: DocumentAttachment['type'] = 'text'
    if (imageExts.has(ext)) type = 'image'
    else if (videoExts.has(ext)) type = 'video'
    else if (audioExts.has(ext)) type = 'audio'
    return { filename, type, fileUrl: url }
  })
}
