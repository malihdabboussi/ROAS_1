'use client'

import { FileText, Film, Image as ImageIcon, Loader2, Music, X } from 'lucide-react'
import { CHAT_FILE_STATUS_LABELS } from '@/lib/chat/chat-file-status.config'
import type {
  DocumentAttachment,
  DocumentIntelligenceMetadata,
  DocumentIntelligenceStatus,
} from '@/lib/chat/document-attachments'

export interface ParsedFileResult {
  filename: string
  mimeType: string
  sizeBytes: number
  type: 'text' | 'image' | 'video' | 'audio'
  text?: string
  dataUrl?: string
  preview?: string
  fileUrl?: string
  mediaAssetId?: string
  documentIntelligence?: DocumentIntelligenceMetadata | null
}

export interface AttachedFile {
  id: string
  file: File
  uploading: boolean
  parsed?: ParsedFileResult[]
  error?: string
  documentStatus?: DocumentIntelligenceStatus | 'uploaded'
  /** Local object URL for image previews (revoked on remove/unmount). */
  previewUrl?: string
}

interface FileAttachmentsProps {
  files: AttachedFile[]
  onRemove: (id: string) => void
  stripClassName?: string
}

function getFileIcon(file: File) {
  if (file.type.startsWith('video/')) {
    return <Film className="h-3.5 w-3.5 shrink-0" />
  }
  if (file.type.startsWith('image/')) {
    return <ImageIcon className="h-3.5 w-3.5 shrink-0" />
  }
  if (file.type.startsWith('audio/')) {
    return <Music className="h-3.5 w-3.5 shrink-0" />
  }
  return <FileText className="h-3.5 w-3.5 shrink-0" />
}

function getDocumentIcon(doc: DocumentAttachment) {
  if (doc.type === 'video') return <Film className="h-4 w-4 shrink-0" />
  if (doc.type === 'image') return <ImageIcon className="h-4 w-4 shrink-0" />
  const mime = (doc.mimeType ?? '').toLowerCase()
  if (mime.startsWith('audio/')) return <Music className="h-4 w-4 shrink-0" />
  return <FileText className="h-4 w-4 shrink-0" />
}

function resolveImagePreview(attachedFile: AttachedFile): string | null {
  if (attachedFile.previewUrl) return attachedFile.previewUrl
  const parsedImage = attachedFile.parsed?.find((p) => p.type === 'image')
  return parsedImage?.fileUrl || parsedImage?.dataUrl || parsedImage?.preview || null
}

function resolveAttachmentStatus(
  attachedFile: AttachedFile,
): DocumentIntelligenceStatus | 'uploaded' | null {
  if (attachedFile.error) return 'failed'
  if (attachedFile.documentStatus) return attachedFile.documentStatus
  const parsed = attachedFile.parsed?.[0]
  if (parsed?.documentIntelligence?.status) return parsed.documentIntelligence.status
  if (parsed?.type === 'text' && parsed.mediaAssetId) return 'uploaded'
  return null
}

export function FileAttachments({ files, onRemove, stripClassName }: FileAttachmentsProps) {
  if (files.length === 0) return null

  return (
    <div className={`scrollbar-hide overflow-x-auto ${stripClassName ?? 'px-4 pb-2'}`}>
      <div className="flex flex-nowrap gap-2">
        {files.map((attachedFile) => {
          const isImage = attachedFile.file.type.startsWith('image/')
          const imagePreview = isImage ? resolveImagePreview(attachedFile) : null
          const status = resolveAttachmentStatus(attachedFile)
          const statusLabel = status ? CHAT_FILE_STATUS_LABELS[status] : null
          return (
            <div
              key={attachedFile.id}
              className={`group flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${
                attachedFile.error
                  ? 'border-destructive/50 text-destructive'
                  : attachedFile.uploading
                    ? 'border-border text-muted-foreground'
                    : 'border-border text-foreground'
              }`}
            >
              {imagePreview ? (
                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded">
                  <img
                    src={imagePreview}
                    alt={attachedFile.file.name}
                    className="h-full w-full object-cover"
                  />
                  {attachedFile.uploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    </span>
                  )}
                </span>
              ) : attachedFile.uploading ? (
                <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : (
                getFileIcon(attachedFile.file)
              )}
              <span
                className="max-w-[140px] truncate"
                title={attachedFile.error ?? attachedFile.file.name}
              >
                {attachedFile.file.name}
              </span>
              {attachedFile.error && (
                <span className="text-destructive max-w-[160px] truncate text-[10px]">failed</span>
              )}
              {!attachedFile.error && statusLabel && !attachedFile.uploading && (
                <span
                  className={`max-w-[80px] truncate text-[10px] ${statusLabel.className}`}
                  title={statusLabel.label}
                >
                  {status === 'processing' && (
                    <Loader2 className="mr-1 inline h-2.5 w-2.5 animate-spin" />
                  )}
                  {statusLabel.label}
                </span>
              )}

              <button
                type="button"
                onClick={() => onRemove(attachedFile.id)}
                className="text-muted-foreground hover:text-foreground ml-0.5 shrink-0 rounded p-0.5 opacity-60 transition-all hover:opacity-100"
                aria-label={`Remove ${attachedFile.file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Read-only file chips for persisted DocumentAttachment[] on sent messages. */
export function PersistedFileChips({
  documents,
  className,
}: {
  documents: DocumentAttachment[]
  className?: string
}) {
  if (documents.length === 0) return null

  return (
    <div className={className ?? 'mt-spacing-2 flex flex-wrap gap-2'}>
      {documents.map((doc, idx) => {
        const url = doc.fileUrl?.trim() || doc.dataUrl?.trim() || null
        const chip = (
          <div
            key={`${doc.filename}-${idx}`}
            className="border-border bg-muted flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1 text-sm"
          >
            {getDocumentIcon(doc)}
            <span className="text-foreground max-w-[140px] truncate" title={doc.filename}>
              {doc.filename}
            </span>
          </div>
        )

        if (url) {
          return (
            <a
              key={`${doc.filename}-${idx}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-all hover:brightness-110"
            >
              {chip}
            </a>
          )
        }

        return chip
      })}
    </div>
  )
}
