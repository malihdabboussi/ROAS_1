import { parseEntityMentionsFromHtml } from '@/lib/channels/mention-parser'
import type { LinkPreview } from '../services/spaces.service'

/** Build link previews from @@ doc entity chips when the API did not enrich payload.previews. */
export function docMentionPreviewsFromHtml(html: string, spaceId: string): LinkPreview[] {
  const out: LinkPreview[] = []
  const seen = new Set<string>()
  for (const mention of parseEntityMentionsFromHtml(html)) {
    if (mention.type !== 'doc' || !mention.entity_id) continue
    if (seen.has(mention.entity_id)) continue
    seen.add(mention.entity_id)
    const title = mention.label?.trim() || 'Document'
    out.push({
      url: `/spaces/${spaceId}/${mention.entity_id}`,
      provider: 'internal',
      title,
      description: null,
      imageUrl: null,
      iconUrl: null,
      siteName: 'Vibey',
      entityKind: 'space-item',
      entityId: mention.entity_id,
      mimeType: 'text/html',
    })
  }
  return out
}

export function mergeCommentLinkPreviews(
  payloadPreviews: LinkPreview[] | undefined,
  messageHtml: string,
  spaceId: string,
): LinkPreview[] {
  const fromPayload = payloadPreviews ?? []
  const coveredEntityIds = new Set(
    fromPayload.map((p) => p.entityId).filter((id): id is string => !!id),
  )
  const fallbacks = docMentionPreviewsFromHtml(messageHtml, spaceId).filter(
    (p) => !p.entityId || !coveredEntityIds.has(p.entityId),
  )
  return [...fromPayload, ...fallbacks]
}
