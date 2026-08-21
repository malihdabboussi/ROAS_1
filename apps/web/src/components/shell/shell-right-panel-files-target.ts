import type { ConversationDocument } from '@/lib/artifacts'
import { isArtifactDocumentType } from '@/lib/conversations'
import type { DeliverableType } from '@/lib/missions'

export function conversationDocumentFileUrl(document: ConversationDocument): string | null {
  const content = document.content as unknown
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    const value = (content as { file_url?: unknown }).file_url
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export function conversationDocumentViewerType(document: ConversationDocument): DeliverableType {
  if (isArtifactDocumentType(document.document_type) && document.resource_id) {
    return document.document_type
  }
  if (document.document_type === 'image_upload') return 'image'
  if (document.document_type === 'pdf') return 'pdf'
  if (!conversationDocumentFileUrl(document)) return 'doc'
  return 'file'
}
