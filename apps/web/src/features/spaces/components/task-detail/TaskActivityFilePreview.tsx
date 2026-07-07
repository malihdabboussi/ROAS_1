'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChatAttachmentPreviews } from '@/components/chat/ChatAttachmentPreviewsAdapter'
import { inferChatAttachmentKind } from '@/lib/chat/chat-attachment-preview'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import { htmlToPlainTextPreview } from '../space-item-values'

type ActivityFilePreview = {
  url: string
  name: string
  mimeType?: string
  type?: string
}

const TEXT_FETCH_MAX_BYTES = 50_000

const FILE_FIELD_ID_RE = /^(files?|media|attachments?|documents?)$/i
const URL_FIELD_ID_RE = /(^|_)(url|website|link)s?($|_)/i
const PLAIN_TEXT_ACTIVITY_FIELD_IDS = new Set([
  'notes',
  'description',
  'email',
  'phone',
  'title',
  'first_name',
  'last_name',
  'business_name',
  'address',
  'city',
  'state',
  'country',
  'contact_source',
])
const UPLOADED_FILE_PATH_RE =
  /\/storage\/v1\/object\/|\/object\/public\/|\/uploads\/|\.(pdf|png|jpe?g|gif|webp|svg|mp4|mov|webm|zip|docx?|xlsx?|csv|txt|md|json)(\?|$)/i

function filenameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop()
    return last ? decodeURIComponent(last) : 'File'
  } catch {
    return url.split('/').filter(Boolean).pop() ?? 'File'
  }
}

function isFileUrl(url: string): boolean {
  return /^(https?:|blob:|data:)/i.test(url)
}

function normalizeUrl(url: string): string {
  const t = url.trim()
  return t.includes('://') ? t : `https://${t}`
}

function isFileFieldId(fieldId: string): boolean {
  const id = fieldId.toLowerCase()
  if (FILE_FIELD_ID_RE.test(id)) return true
  return (
    (id.includes('file') || id.includes('media') || id.includes('attachment')) &&
    !URL_FIELD_ID_RE.test(id)
  )
}

export function isUrlLikeFieldId(fieldId: string): boolean {
  const id = fieldId.toLowerCase()
  if (!id || isFileFieldId(id)) return false
  return URL_FIELD_ID_RE.test(id) || id === 'url' || id === 'website' || id === 'link'
}

function isPlainUrlString(url: string): boolean {
  const t = url.trim()
  if (!t || (t.includes('@') && !/^https?:\/\//i.test(t))) return false
  try {
    const u = new URL(normalizeUrl(t))
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    if (!u.hostname.includes('.')) return false
    if (UPLOADED_FILE_PATH_RE.test(`${u.pathname}${u.search}`)) return false
    return true
  } catch {
    return false
  }
}

function shouldTreatValueAsUrlField(_value: unknown, fieldId?: string): boolean {
  const fid = fieldId ?? ''
  return isUrlLikeFieldId(fid)
}

export function isPlainTextActivityFieldId(fieldId: string): boolean {
  const id = fieldId.toLowerCase()
  if (!id || isUrlLikeFieldId(id) || isFileFieldId(id)) return false
  return PLAIN_TEXT_ACTIVITY_FIELD_IDS.has(id)
}

function activityTextPreview(value: unknown, fieldId: string): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null
  if (fieldId === 'notes' || fieldId === 'description') {
    const plain = htmlToPlainTextPreview(raw)
    return plain || null
  }
  return raw
}

export function fieldChangeTextPreview(from: unknown, to: unknown, fieldId: string): string | null {
  if (!isPlainTextActivityFieldId(fieldId)) return null
  const toPreview = activityTextPreview(to, fieldId)
  const fromPreview = activityTextPreview(from, fieldId)
  if (!toPreview) return null
  if (toPreview === fromPreview) return null
  return toPreview
}

function fileFromRecord(record: Record<string, unknown>): ActivityFilePreview | null {
  const rawUrl = record.url ?? record.public_url ?? record.fileUrl
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return null
  if (!isFileUrl(rawUrl)) return null
  const rawName = record.name ?? record.original_filename ?? record.filename
  const rawMime = record.mime_type ?? record.mimeType
  const rawType = record.asset_type ?? record.type
  return {
    url: rawUrl,
    name: typeof rawName === 'string' && rawName.length > 0 ? rawName : filenameFromUrl(rawUrl),
    mimeType: typeof rawMime === 'string' ? rawMime : undefined,
    type: typeof rawType === 'string' ? rawType : undefined,
  }
}

function filesFromValue(value: unknown, fieldId?: string): ActivityFilePreview[] {
  if (shouldTreatValueAsUrlField(value, fieldId)) return []

  if (typeof value === 'string' && value.length > 0 && isFileUrl(value)) {
    return [{ url: value, name: filenameFromUrl(value) }]
  }
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (typeof entry === 'string' && entry.length > 0 && isFileUrl(entry)) {
        if (shouldTreatValueAsUrlField(entry, fieldId)) return null
        return { url: entry, name: filenameFromUrl(entry) }
      }
      if (entry && typeof entry === 'object')
        return fileFromRecord(entry as Record<string, unknown>)
      return null
    })
    .filter((entry): entry is ActivityFilePreview => entry != null)
}

function urlStringsFromValue(value: unknown, fieldId?: string): string[] {
  if (!shouldTreatValueAsUrlField(value, fieldId)) return []
  if (typeof value !== 'string') return []
  const t = value.trim()
  if (!t || !isPlainUrlString(t)) return []
  return [normalizeUrl(t)]
}

/** Files added or removed in this field_change — not the full field value. */
export function diffActivityFileChanges(
  from: unknown,
  to: unknown,
  fieldId?: string,
): { added: ActivityFilePreview[]; removed: ActivityFilePreview[] } {
  const fromFiles = filesFromValue(from, fieldId)
  const toFiles = filesFromValue(to, fieldId)
  const fromUrls = new Set(fromFiles.map((f) => f.url))
  const toUrls = new Set(toFiles.map((f) => f.url))
  return {
    added: toFiles.filter((f) => !fromUrls.has(f.url)),
    removed: fromFiles.filter((f) => !toUrls.has(f.url)),
  }
}

export function diffUrlFieldChanges(
  from: unknown,
  to: unknown,
  fieldId?: string,
): { added: string[]; removed: string[] } {
  const fromUrls = urlStringsFromValue(from, fieldId)
  const toUrls = urlStringsFromValue(to, fieldId)
  const fromSet = new Set(fromUrls)
  const toSet = new Set(toUrls)
  return {
    added: toUrls.filter((u) => !fromSet.has(u)),
    removed: fromUrls.filter((u) => !toSet.has(u)),
  }
}

export function diffActivityFiles(
  from: unknown,
  to: unknown,
  fieldId?: string,
): ActivityFilePreview[] {
  const { added, removed } = diffActivityFileChanges(from, to, fieldId)
  return [...added, ...removed]
}

export function formatUrlFieldActivityLabel(
  payload: Record<string, unknown>,
  resolveFieldLabel: (fieldId: string) => string,
): string | null {
  const fieldId = typeof payload.field === 'string' ? payload.field : ''
  if (!isUrlLikeFieldId(fieldId)) return null
  const { added, removed } = diffUrlFieldChanges(payload.from, payload.to, fieldId)
  if (added.length === 0 && removed.length === 0) return null

  const fieldLabel = fieldId ? resolveFieldLabel(fieldId) : 'URL'

  if (removed.length > 0 && added.length === 0) {
    if (removed.length === 1) return `removed a link from ${fieldLabel}`
    return `removed links from ${fieldLabel}`
  }
  if (added.length > 0 && removed.length === 0) {
    if (added.length === 1) return `added a link to ${fieldLabel}`
    return `added links to ${fieldLabel}`
  }
  return `updated ${fieldLabel}`
}

export function formatFileFieldActivityLabel(
  payload: Record<string, unknown>,
  resolveFieldLabel: (fieldId: string) => string,
): string | null {
  const fieldId = typeof payload.field === 'string' ? payload.field : ''
  if (isUrlLikeFieldId(fieldId) || isPlainTextActivityFieldId(fieldId)) return null

  const { added, removed } = diffActivityFileChanges(payload.from, payload.to, fieldId)
  if (added.length === 0 && removed.length === 0) return null

  const fieldLabel = fieldId ? resolveFieldLabel(fieldId) : 'Files'

  if (removed.length > 0 && added.length === 0) {
    if (removed.length === 1) return `removed ${removed[0]!.name}`
    return `removed ${removed.length} files from ${fieldLabel}`
  }
  if (added.length > 0 && removed.length === 0) {
    if (added.length === 1) return `added ${added[0]!.name} to ${fieldLabel}`
    return `added ${added.length} files to ${fieldLabel}`
  }
  return `updated ${fieldLabel}`
}

function activityFileToDocument(
  file: ActivityFilePreview,
  fetchedText?: string,
): DocumentAttachment {
  const mime = file.mimeType ?? ''
  let type: DocumentAttachment['type'] = 'text'
  if (mime.startsWith('image/') || file.type === 'image') type = 'image'
  else if (mime.startsWith('video/') || file.type === 'video') type = 'video'
  else if (mime.startsWith('audio/') || file.type === 'audio') type = 'audio'

  return {
    filename: file.name,
    type,
    fileUrl: file.url,
    mimeType: file.mimeType,
    text: fetchedText,
  }
}

function TaskActivityFilePreviewItem({ file }: { file: ActivityFilePreview }) {
  const [fetchedText, setFetchedText] = useState<string | undefined>(undefined)

  const doc = useMemo(() => activityFileToDocument(file, fetchedText), [file, fetchedText])

  const kind = inferChatAttachmentKind(doc)
  const shouldFetchText =
    !fetchedText && !!file.url && (kind === 'markdown' || kind === 'plaintext' || kind === 'json')

  useEffect(() => {
    if (!shouldFetchText) return
    let cancelled = false
    void fetch(file.url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('fetch failed'))))
      .then((body) => {
        if (!cancelled) setFetchedText(body.slice(0, TEXT_FETCH_MAX_BYTES))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [file.url, shouldFetchText])

  return <ChatAttachmentPreviews documents={[doc]} className="mt-0" compact />
}

function displayUrlLabel(url: string): string {
  try {
    return url.replace(/^https?:\/\//, '')
  } catch {
    return url
  }
}

export function shouldRenderFieldFilePreview(payload: Record<string, unknown>): boolean {
  const fieldId = typeof payload.field === 'string' ? payload.field : ''
  if (shouldRenderFieldUrlPreview(payload)) return false
  return diffActivityFileChanges(payload.from, payload.to, fieldId).added.length > 0
}

export function shouldRenderFieldUrlPreview(payload: Record<string, unknown>): boolean {
  const fieldId = typeof payload.field === 'string' ? payload.field : ''
  if (!isUrlLikeFieldId(fieldId)) return false
  return diffUrlFieldChanges(payload.from, payload.to, fieldId).added.length > 0
}

export function shouldRenderFieldTextPreview(payload: Record<string, unknown>): boolean {
  const fieldId = typeof payload.field === 'string' ? payload.field : ''
  if (!fieldId) return false
  return fieldChangeTextPreview(payload.from, payload.to, fieldId) != null
}

export function TaskActivityTextPreview({
  from,
  to,
  fieldId,
}: {
  from?: unknown
  to?: unknown
  fieldId?: string
}) {
  const preview = useMemo(() => {
    if (!fieldId) return null
    return fieldChangeTextPreview(from, to, fieldId)
  }, [from, to, fieldId])
  if (!preview) return null
  return (
    <p
      className="body-3 text-muted-foreground mt-spacing-1 min-w-0 break-words"
      title={preview.length > 120 ? preview : undefined}
    >
      {preview}
    </p>
  )
}

export function TaskActivityUrlPreview({
  from,
  to,
  fieldId,
}: {
  from?: unknown
  to?: unknown
  fieldId?: string
}) {
  const { added } = useMemo(() => diffUrlFieldChanges(from, to, fieldId), [from, to, fieldId])
  if (added.length === 0) return null
  return (
    <div className="mt-spacing-1 gap-spacing-1 flex min-w-0 flex-col">
      {added.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="body-3 min-w-0 max-w-full truncate text-blue-400 transition-colors hover:text-blue-300"
          title={url}
        >
          {displayUrlLabel(url)}
        </a>
      ))}
    </div>
  )
}

export function TaskActivityFilePreview({
  from,
  to,
  fieldId,
}: {
  from?: unknown
  to?: unknown
  fieldId?: string
}) {
  const { added } = useMemo(() => diffActivityFileChanges(from, to, fieldId), [from, to, fieldId])
  if (added.length === 0) return null
  return (
    <div className="mt-spacing-2 gap-spacing-2 flex flex-col">
      {added.map((file, idx) => (
        <TaskActivityFilePreviewItem key={`added-${file.url}-${idx}`} file={file} />
      ))}
    </div>
  )
}
