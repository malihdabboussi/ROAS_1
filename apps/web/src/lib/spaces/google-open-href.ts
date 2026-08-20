const GOOGLE_FILE_ID = /^[A-Za-z0-9_-]+$/
const GOOGLE_OPEN_HOSTS = new Set(['docs.google.com', 'drive.google.com'])

export function safeGoogleOpenHref(href: string | null | undefined): string | null {
  if (!href) return null
  try {
    const url = new URL(href)
    if (url.protocol !== 'https:') return null
    if (!GOOGLE_OPEN_HOSTS.has(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

export function googleFileId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (GOOGLE_FILE_ID.test(trimmed)) return trimmed
  return (
    trimmed.match(/\/(?:document|spreadsheets|presentation)\/d\/([A-Za-z0-9_-]+)/)?.[1] ??
    trimmed.match(/\/(?:file|folders)\/d\/([A-Za-z0-9_-]+)/)?.[1] ??
    trimmed.match(/\/drive\/folders\/([A-Za-z0-9_-]+)/)?.[1] ??
    null
  )
}

export function googleNativeOpenHref(fileId: string, mimeType?: string | null): string | null {
  const id = googleFileId(fileId)
  if (!id) return null
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

const NATIVE_GOOGLE_APPS = new Set([
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.folder',
])

/** Open-in-Drive URL for a synced Drive item. Native Docs/Sheets/Slides must not use file/view. */
export function driveOpenHref(
  driveFileId: string,
  webViewLink?: string | null,
  mimeType?: string | null,
): string {
  const native = googleNativeOpenHref(driveFileId, mimeType)
  const saved = safeGoogleOpenHref(webViewLink)
  const fallback = `https://drive.google.com/file/d/${encodeURIComponent(driveFileId)}/view`
  if (mimeType && NATIVE_GOOGLE_APPS.has(mimeType)) return native ?? saved ?? fallback
  return saved ?? native ?? fallback
}
