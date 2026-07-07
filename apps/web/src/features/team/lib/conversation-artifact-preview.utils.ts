import type { ConversationDocument } from '@/lib/artifacts/artifact-types'
import { extractMarkdownFromDocumentContent } from '@/lib/content/document-content-markdown'

export interface ConversationArtifactPreviewMeta {
  title: string
  typeLabel: string
  badgeClass: string
  excerpt: string | null
  /** Image URL suitable for a thumbnail */
  thumbUrl: string | null
  /** PDF URL for inline iframe preview (when no image thumb) */
  pdfEmbedUrl: string | null
  /** Best URL to open in a new tab */
  openUrl: string | null
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(url)
}

const EXCERPT_MAX = 160

function plainPreviewFromMarkdown(md: string, maxLen: number): string {
  const plain = md
    .replace(/^#{1,6}\s+[^\n]*\n?/gm, '')
    .replace(/[*_`>]+/g, '')
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return ''
  return plain.length > maxLen ? `${plain.slice(0, maxLen - 1)}…` : plain
}

function coerceContent(doc: ConversationDocument): Record<string, unknown> {
  const c = doc.content
  if (c && typeof c === 'object' && !Array.isArray(c)) return c as Record<string, unknown>
  return {}
}

export function artifactDocTypeBadgeClass(documentType: string): string {
  switch (documentType) {
    case 'offer':
      return 'badge-glass badge-glass-purple'
    case 'funnel':
      return 'badge-glass badge-glass-blue'
    case 'presentation':
      return 'badge-glass badge-glass-cyan'
    case 'sequence':
    case 'email':
      return 'badge-glass badge-glass-orange'
    case 'avatar':
      return 'badge-glass badge-glass-muted'
    case 'image_upload':
      return 'badge-glass badge-glass-cyan'
    case 'pdf':
      return 'badge-glass badge-glass-orange'
    case 'upload':
    default:
      return 'badge-glass badge-glass-muted'
  }
}

export function artifactDocTypeLabel(documentType: string): string {
  if (documentType === 'image_upload') return 'Image'
  if (documentType === 'upload') return 'File'
  if (documentType === 'pdf') return 'PDF'
  return documentType.replace(/_/g, ' ')
}

export function buildConversationArtifactPreviewMeta(
  doc: ConversationDocument,
): ConversationArtifactPreviewMeta {
  const content = coerceContent(doc)
  const title = doc.title?.trim() || artifactDocTypeLabel(doc.document_type)
  const type = doc.document_type

  const fileUrl = pickString(content, 'file_url', 'public_file_url')
  const imageCandidate =
    pickString(content, 'image_url', 'thumbnail_url', 'preview_url') ||
    (typeof content.image === 'string' && content.image.trim() ? content.image.trim() : null)

  const thumbUrl =
    imageCandidate && isImageUrl(imageCandidate)
      ? imageCandidate
      : fileUrl && isImageUrl(fileUrl)
        ? fileUrl
        : null

  const typeField = pickString(content, 'type', 'mime_type', 'document_format')?.toLowerCase() ?? ''
  const isPdf =
    typeField === 'pdf' ||
    (fileUrl?.toLowerCase().includes('.pdf') ?? false) ||
    (type === 'presentation' && Boolean(fileUrl))

  const pdfEmbedUrl = fileUrl && isPdf && !thumbUrl ? fileUrl : null

  const openUrl =
    pickString(content, 'published_url', 'public_url', 'tracking_url') ||
    pdfEmbedUrl ||
    thumbUrl ||
    fileUrl ||
    null

  let excerpt: string | null = null
  const text = pickString(
    content,
    'text',
    'summary',
    'description',
    'caption',
    'snippet',
    'headline',
    'hook',
    'value_proposition',
  )
  if (text) {
    excerpt = text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX - 1)}…` : text
  } else {
    const md = extractMarkdownFromDocumentContent(doc.content)
    if (md) {
      const plain = plainPreviewFromMarkdown(md, EXCERPT_MAX)
      excerpt = plain ? plain : null
    }
  }

  return {
    title,
    typeLabel: artifactDocTypeLabel(type),
    badgeClass: artifactDocTypeBadgeClass(type),
    excerpt,
    thumbUrl,
    pdfEmbedUrl,
    openUrl,
  }
}
