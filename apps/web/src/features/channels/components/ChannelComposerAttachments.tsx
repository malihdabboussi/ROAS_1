import { FileText, Film, Loader2, Music, X } from 'lucide-react'

export interface AttachedFile {
  id: string
  filename: string
  mimeType: string
  uploading: boolean
  url?: string
  error?: string
  previewUrl?: string
  file?: File
  isDriveLink?: boolean
}

export interface PersistedAttachment {
  id: string
  filename: string
  mimeType: string
  url: string
  previewUrl?: string
  isDriveLink?: boolean
}

export function hydrateAttachmentsFromStorage(key: string): AttachedFile[] {
  if (typeof window === 'undefined') return []
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as PersistedAttachment[]
    if (!Array.isArray(parsed)) return []
    return parsed.map((p) => ({
      id: p.id,
      filename: p.filename,
      mimeType: p.mimeType,
      uploading: false,
      url: p.url,
      previewUrl:
        p.previewUrl ?? (p.mimeType.startsWith('image/') && !p.isDriveLink ? p.url : undefined),
      isDriveLink: p.isDriveLink,
    }))
  } catch {
    localStorage.removeItem(key)
    return []
  }
}

export function driveFileShareUrl(id: string, mimeType: string): string {
  switch (mimeType) {
    case 'application/vnd.google-apps.document':
      return `https://docs.google.com/document/d/${id}/edit`
    case 'application/vnd.google-apps.spreadsheet':
      return `https://docs.google.com/spreadsheets/d/${id}/edit`
    case 'application/vnd.google-apps.presentation':
      return `https://docs.google.com/presentation/d/${id}/edit`
    case 'application/vnd.google-apps.folder':
      return `https://drive.google.com/drive/folders/${id}`
    default:
      return `https://drive.google.com/file/d/${id}/view`
  }
}

function GoogleDriveLogo({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} aria-hidden role="img">
      {/* Google Drive brand logo colors are intentionally fixed. */}
      <path
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066da"
      />
      <path
        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
        fill="#00ac47"
      />
      <path
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
        fill="#ea4335"
      />
      <path
        d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
        fill="#00832d"
      />
      <path
        d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
        fill="#2684fc"
      />
      <path
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  )
}

export function ChannelComposerAttachmentChips({
  files,
  onRemove,
}: {
  files: AttachedFile[]
  onRemove: (id: string) => void
}) {
  if (files.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 px-3 pb-1 pt-2">
      {files.map((file) => {
        const isImage = file.mimeType.startsWith('image/')
        const isVideo = file.mimeType.startsWith('video/')
        const isAudio = file.mimeType.startsWith('audio/')

        return (
          <div
            key={file.id}
            className={`border-border group flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${
              file.error
                ? 'text-destructive border-destructive/50'
                : file.uploading
                  ? 'text-muted-foreground'
                  : 'text-foreground'
            }`}
          >
            {(isImage || file.isDriveLink) && file.previewUrl ? (
              <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded">
                <img
                  src={file.previewUrl}
                  alt={file.filename}
                  className="h-full w-full object-cover"
                />
                {file.uploading && (
                  <span className="bg-secondary/80 absolute inset-0 flex items-center justify-center">
                    <Loader2 className="text-foreground h-3 w-3 animate-spin" />
                  </span>
                )}
              </span>
            ) : file.isDriveLink ? (
              <GoogleDriveLogo className="h-3.5 w-3.5 shrink-0" />
            ) : file.uploading ? (
              <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : isVideo ? (
              <Film className="h-3.5 w-3.5 shrink-0" />
            ) : isAudio ? (
              <Music className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="max-w-36 truncate" title={file.error ?? file.filename}>
              {file.filename}
            </span>
            {file.error && <span className="typo-caption text-destructive">failed</span>}
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              className="ml-0.5 rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label={`Remove ${file.filename}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
