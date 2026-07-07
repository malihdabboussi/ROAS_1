import type { MissionDeliverable } from '@/lib/missions'

const INTERNAL_SPACE_DOC_URL = /^\/spaces\/([^/]+)\/([^/?#]+)/

export function isSpaceItemDocDeliverable(deliverable: MissionDeliverable): boolean {
  return (
    deliverable.type === 'doc' &&
    deliverable.entity_table === 'space_items' &&
    !!deliverable.entity_id
  )
}

export function resolveSpaceDocDeliverableContext(
  deliverable: MissionDeliverable,
  fallbackSpaceId?: string | null,
): { spaceId: string; itemId: string } | null {
  if (!isSpaceItemDocDeliverable(deliverable) || !deliverable.entity_id) return null

  const metaSpaceId = deliverable.metadata?.spaceId
  const internalUrl = deliverable.metadata?.internalUrl
  if (typeof internalUrl === 'string') {
    const match = INTERNAL_SPACE_DOC_URL.exec(internalUrl)
    if (match?.[1] && match[2]) {
      return { spaceId: match[1], itemId: match[2] }
    }
  }

  if (typeof metaSpaceId === 'string' && metaSpaceId.trim()) {
    return { spaceId: metaSpaceId.trim(), itemId: deliverable.entity_id }
  }

  if (fallbackSpaceId?.trim()) {
    return { spaceId: fallbackSpaceId.trim(), itemId: deliverable.entity_id }
  }

  return null
}
