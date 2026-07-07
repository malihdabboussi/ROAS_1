import { FileIcon, FileText, Folder, Image as ImageIcon, Video } from 'lucide-react'
import type { DropboxFile } from '@/lib/services/dropbox-api'

export function getDropboxFileIcon(file: DropboxFile, size?: 'sm' | 'lg') {
  const cls = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4'
  if (file['.tag'] === 'folder') return <Folder className={`${cls} text-primary`} />

  const name = file.name.toLowerCase()
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/.test(name)) {
    return <ImageIcon className={`${cls} text-primary`} />
  }
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(name)) {
    return <Video className={`${cls} text-warning`} />
  }
  if (/\.(pdf|doc|docx|txt|md|rtf|odt|xls|xlsx|xlsm|ppt|pptx|csv)$/.test(name)) {
    return <FileText className={`${cls} text-success`} />
  }
  return <FileIcon className={`${cls} text-muted-foreground`} />
}

export function formatDropboxSize(bytes?: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDropboxDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
