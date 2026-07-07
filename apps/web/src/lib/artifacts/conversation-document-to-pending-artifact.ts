import type { ConversationDocument } from './artifact-types'
import type { VibeyPendingArtifactOpen } from './pending-artifact-open'

function coerceRecord(content: ConversationDocument['content']): Record<string, unknown> {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    return content as Record<string, unknown>
  }
  return {}
}

function pickId(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === 'string') {
      const t = v.trim()
      if (t.length > 0) return t
    }
  }
  return null
}

/** Resolves linked offer id for conversation documents (resource_id or content fields). */
export function getOfferIdFromConversationDocument(doc: ConversationDocument): string | null {
  if (doc.document_type !== 'offer') return null
  const content = coerceRecord(doc.content)
  const resourceId =
    typeof doc.resource_id === 'string' && doc.resource_id.trim().length > 0
      ? doc.resource_id.trim()
      : null
  return resourceId ?? pickId(content, ['offer_id', 'resource_id', 'id'])
}

/** Resolves linked funnel id for conversation documents (resource_id or content fields). */
export function getFunnelIdFromConversationDocument(doc: ConversationDocument): string | null {
  if (doc.document_type !== 'funnel') return null
  const content = coerceRecord(doc.content)
  const resourceId =
    typeof doc.resource_id === 'string' && doc.resource_id.trim().length > 0
      ? doc.resource_id.trim()
      : null
  return resourceId ?? pickId(content, ['funnel_id', 'resource_id', 'id'])
}

export function conversationDocumentToPendingArtifact(
  doc: ConversationDocument,
): VibeyPendingArtifactOpen | null {
  const content = coerceRecord(doc.content)
  const resourceId =
    typeof doc.resource_id === 'string' && doc.resource_id.trim().length > 0
      ? doc.resource_id.trim()
      : null

  const name = doc.title?.trim() || 'Artifact'

  switch (doc.document_type) {
    case 'offer': {
      const id = resourceId ?? pickId(content, ['offer_id', 'resource_id', 'id'])
      if (!id) return null
      return { kind: 'simple', type: 'offer', id, name }
    }
    case 'avatar': {
      const id = resourceId ?? pickId(content, ['avatar_id', 'resource_id', 'id'])
      if (!id) return null
      return { kind: 'simple', type: 'avatar', id, name }
    }
    case 'funnel': {
      const funnelId = resourceId ?? pickId(content, ['funnel_id', 'resource_id', 'id'])
      if (!funnelId) return null
      const pageId = pickId(content, ['page_id', 'funnel_page_id'])
      if (pageId) return { kind: 'page', funnelId, pageId, name }
      return { kind: 'simple', type: 'funnel', id: funnelId, name }
    }
    case 'presentation': {
      const id = resourceId ?? pickId(content, ['presentation_id', 'resource_id', 'id'])
      if (!id) return null
      return { kind: 'simple', type: 'presentation', id, name }
    }
    case 'sequence': {
      const id = resourceId ?? pickId(content, ['sequence_id', 'resource_id', 'id'])
      if (!id) return null
      return { kind: 'simple', type: 'sequence', id, name }
    }
    case 'email': {
      const emailId = resourceId ?? pickId(content, ['email_id', 'sequence_email_id', 'id'])
      const sequenceId = pickId(content, ['sequence_id'])
      if (emailId && sequenceId) {
        return { kind: 'sequence-email', sequenceId, emailId, name }
      }
      return null
    }
    default:
      return null
  }
}
