import { FileIcon, FileText, Folder, Image as ImageIcon, Video } from 'lucide-react'
import {
  FOLDER_MIME,
  MEDIA_LIBRARY_DOC_MIMES,
} from '@/components/media/drive-file-browser-modal.constants'

export function getFileIcon(mimeType: string, size?: 'sm' | 'lg') {
  const cls = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4'
  const normalizedMimeType = mimeType.toLowerCase()
  if (normalizedMimeType === FOLDER_MIME) return <Folder className={`${cls} text-primary`} />
  if (normalizedMimeType.startsWith('image/'))
    return <ImageIcon className={`${cls} text-blue-400`} />
  if (normalizedMimeType.startsWith('video/')) return <Video className={`${cls} text-purple-400`} />
  if (
    MEDIA_LIBRARY_DOC_MIMES.has(normalizedMimeType) ||
    normalizedMimeType.includes('document') ||
    normalizedMimeType.includes('text') ||
    normalizedMimeType.includes('pdf') ||
    normalizedMimeType.includes('presentation') ||
    normalizedMimeType.includes('powerpoint') ||
    normalizedMimeType.includes('spreadsheet') ||
    normalizedMimeType.includes('excel')
  )
    return <FileText className={`${cls} text-emerald-400`} />
  return <FileIcon className={`${cls} text-muted-foreground`} />
}

export function formatSize(bytes?: string) {
  if (!bytes) return '—'
  const n = parseInt(bytes, 10)
  if (isNaN(n)) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function isMediaLibrarySupportedMime(mimeType: string) {
  const normalizedMimeType = mimeType.toLowerCase()
  return (
    normalizedMimeType.startsWith('image/') ||
    normalizedMimeType.startsWith('video/') ||
    MEDIA_LIBRARY_DOC_MIMES.has(normalizedMimeType)
  )
}
