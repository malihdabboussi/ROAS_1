'use client'

import { ExternalLink, FileText } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface TaskActivityCommentAttachment {
  filename: string
  fileUrl: string
  mimeType?: string
  type?: string
}

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
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  zip: 'application/zip',
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

function fileTypeBadge(filename: string, mimeType: string): string {
  const ext = filename.toLowerCase().match(/\.([^.]+)$/)?.[1]
  if (ext) return ext.toUpperCase()
  if (mimeType === 'application/pdf') return 'PDF'
  return 'FILE'
}

const FILE_BADGE_TONE: Record<string, { bg: string; text: string }> = {
  pdf: { bg: 'bg-red-500/20 dark:bg-red-500/15', text: 'text-red-700 dark:text-destructive' },
  doc: { bg: 'bg-blue-500/20 dark:bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300' },
  docx: { bg: 'bg-blue-500/20 dark:bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300' },
  xls: {
    bg: 'bg-emerald-500/20 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  xlsx: {
    bg: 'bg-emerald-500/20 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  csv: {
    bg: 'bg-emerald-500/20 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  ppt: {
    bg: 'bg-orange-500/20 dark:bg-orange-500/15',
    text: 'text-orange-700 dark:text-orange-300',
  },
  pptx: {
    bg: 'bg-orange-500/20 dark:bg-orange-500/15',
    text: 'text-orange-700 dark:text-orange-300',
  },
  txt: { bg: 'bg-slate-500/20 dark:bg-slate-500/15', text: 'text-slate-700 dark:text-slate-300' },
  md: { bg: 'bg-slate-500/20 dark:bg-slate-500/15', text: 'text-slate-700 dark:text-slate-300' },
  json: {
    bg: 'bg-amber-500/20 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300',
  },
  zip: {
    bg: 'bg-violet-500/20 dark:bg-violet-500/15',
    text: 'text-violet-700 dark:text-violet-300',
  },
}

function fileBadgeTone(filename: string): { bg: string; text: string } {
  const ext = filename.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ''
  return (
    FILE_BADGE_TONE[ext] ?? { bg: 'bg-[var(--color-secondary)]', text: 'text-muted-foreground' }
  )
}

function attachmentMediaType(attachment: TaskActivityCommentAttachment) {
  const mime = attachment.mimeType ?? ''
  const ext = attachment.filename.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ''
  return attachment.type ?? (mime ? mediaTypeFromMime(mime) : mediaTypeFromMime(mimeFromExt(ext)))
}

function TaskActivityCommentAttachmentItem({
  attachment,
}: {
  attachment: TaskActivityCommentAttachment
}) {
  const mime = attachment.mimeType ?? ''
  const ext = attachment.filename.toLowerCase().match(/\.([^.]+)$/)?.[1] ?? ''
  const type = attachmentMediaType(attachment)

  if (type === 'image') {
    return (
      <a
        href={attachment.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-[280px] overflow-hidden rounded-lg border border-[var(--color-border)] transition-opacity hover:opacity-90"
      >
        <img
          src={attachment.fileUrl}
          alt={attachment.filename}
          className="block h-auto max-h-[280px] w-auto max-w-full object-cover"
        />
      </a>
    )
  }

  if (type === 'video') {
    return (
      <video
        src={attachment.fileUrl}
        controls
        className="max-h-[280px] max-w-[280px] rounded-lg border border-[var(--color-border)]"
      />
    )
  }

  if (type === 'audio') {
    return <audio src={attachment.fileUrl} controls className="max-w-[280px]" />
  }

  const isPdf = mime === 'application/pdf' || ext === 'pdf'
  if (isPdf) {
    return (
      <a
        href={attachment.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="card-glass group flex w-[280px] flex-col overflow-hidden rounded-lg border border-[var(--color-border)] transition-opacity hover:opacity-95"
      >
        <div className="bg-[var(--color-muted)]/20 relative h-[160px] w-full overflow-hidden">
          <iframe
            src={`${attachment.fileUrl}#toolbar=0&navpanes=0&view=FitH`}
            className="pointer-events-none h-full w-full"
            title={attachment.filename}
          />
          <div className="absolute bottom-1 right-1">
            <span className="rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              PDF
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2">
          <FileText className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
          <span className="body-3 min-w-0 flex-1 truncate text-[var(--color-foreground)]">
            {attachment.filename}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </a>
    )
  }

  const tone = fileBadgeTone(attachment.filename)
  return (
    <a
      href={attachment.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="card-glass group flex w-[280px] items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2.5 transition-colors hover:bg-[var(--color-hover-subtle)]"
    >
      <div
        className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', tone.bg)}
      >
        <span className={`text-[10px] font-bold ${tone.text}`}>
          {fileTypeBadge(attachment.filename, mime)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="body-3 truncate font-medium text-[var(--color-foreground)]">
          {attachment.filename}
        </div>
        <div className="body-4 truncate text-[var(--color-muted-foreground)]">Click to open</div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  )
}

export function TaskActivityCommentAttachments({
  attachments,
}: {
  attachments: TaskActivityCommentAttachment[]
}) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-spacing-2 flex flex-wrap gap-2">
      {attachments.map((attachment, idx) => (
        <TaskActivityCommentAttachmentItem
          key={`${attachment.fileUrl}-${idx}`}
          attachment={attachment}
        />
      ))}
    </div>
  )
}
