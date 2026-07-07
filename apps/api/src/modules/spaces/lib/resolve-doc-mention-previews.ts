import type { SupabaseClient } from '@supabase/supabase-js'
import type { LinkPreview } from '../../link-preview/link-preview.types'
import type { LinkPreviewService } from '../../link-preview/services/link-preview.service'

type DocMention = { type: string; entity_id?: string; label?: string }
type DocMentionPreviewRow = {
  id: string
  space_id: string | null
  title: string | null
  doc_body: string | null
  custom_data: Record<string, unknown> | null
}
type DocMentionPreviewRepository = {
  findDocMentionPreviewItemById(
    supabase: SupabaseClient,
    itemId: string,
  ): Promise<{ data: DocMentionPreviewRow | null; error: { message: string } | null }>
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function driveFileIdFromCustom(custom: Record<string, unknown>): string | null {
  const id = custom._drive_file_id ?? custom.drive_file_id
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

/** Parse `@@` doc entity chips persisted in comment HTML. */
export function parseDocEntityMentionsFromHtml(html: string): DocMention[] {
  const out: DocMention[] = []
  const seen = new Set<string>()
  const tagRe = /<span\b[^>]*\bclass="[^"]*\bentity-chip\b[^"]*"[^>]*>/gi
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(html))) {
    const attrs = match[0]
    const kind = /data-entity-kind="([^"]+)"/.exec(attrs)?.[1]
    const entityId = /data-entity-id="([^"]+)"/.exec(attrs)?.[1]
    const label = /data-entity-label="([^"]*)"/.exec(attrs)?.[1] ?? ''
    if (kind !== 'doc' || !entityId) continue
    if (seen.has(entityId)) continue
    seen.add(entityId)
    out.push({ type: 'doc', entity_id: entityId, label })
  }
  return out
}

function mergeDocMentions(
  mentions: DocMention[] | undefined,
  html: string | undefined,
): DocMention[] {
  const merged: DocMention[] = []
  const seen = new Set<string>()
  for (const mention of [...(mentions ?? []), ...parseDocEntityMentionsFromHtml(html ?? '')]) {
    if (mention.type !== 'doc' || !mention.entity_id) continue
    if (seen.has(mention.entity_id)) continue
    seen.add(mention.entity_id)
    merged.push(mention)
  }
  return merged
}

/** Resolve @@ doc entity mentions into link previews for task activity + deliverables. */
export async function resolveDocMentionLinkPreviews(
  repository: DocMentionPreviewRepository,
  supabase: SupabaseClient,
  linkPreview: LinkPreviewService,
  ctx: { userId: string; orgId: string | null },
  mentions: DocMention[] | undefined,
  html?: string,
): Promise<LinkPreview[]> {
  const docMentions = mergeDocMentions(mentions, html)
  if (!docMentions.length) return []

  const out: LinkPreview[] = []
  const seen = new Set<string>()

  for (const mention of docMentions.slice(0, 5)) {
    const docId = mention.entity_id!
    if (seen.has(docId)) continue
    seen.add(docId)

    const { data: row, error } = await repository.findDocMentionPreviewItemById(supabase, docId)
    if (error || !row) continue

    const custom =
      row.custom_data && typeof row.custom_data === 'object' && !Array.isArray(row.custom_data)
        ? (row.custom_data as Record<string, unknown>)
        : {}
    if (custom._view_type !== 'doc') continue

    const spaceId = String(row.space_id ?? '')
    const title =
      mention.label?.trim() ||
      (typeof row.title === 'string' && row.title.trim() ? row.title : 'Document')
    const coverUrl =
      typeof custom._doc_cover_url === 'string' && custom._doc_cover_url.trim()
        ? custom._doc_cover_url
        : null
    const internalUrl = `/spaces/${spaceId}/${docId}`

    const driveFileId = driveFileIdFromCustom(custom)
    const isDrive =
      driveFileId != null || custom._doc_source === 'drive' || custom.source_type === 'drive'

    if (isDrive && driveFileId) {
      const driveUrl = `https://drive.google.com/file/d/${driveFileId}/view`
      try {
        const resolved = await linkPreview.resolveMany([driveUrl], {
          supabase,
          userId: ctx.userId,
          orgId: ctx.orgId,
        })
        const drivePreview = resolved[0]
        if (drivePreview) {
          out.push({
            ...drivePreview,
            title: drivePreview.title ?? title,
            entityKind: 'space-item',
            entityId: docId,
          })
          continue
        }
      } catch {
        // fall through to internal preview
      }
    }

    const bodyPlain = typeof row.doc_body === 'string' ? stripHtml(row.doc_body) : ''
    out.push({
      url: internalUrl,
      provider: 'internal',
      title,
      description: bodyPlain ? bodyPlain.slice(0, 240) : null,
      imageUrl: coverUrl,
      iconUrl: null,
      siteName: 'Vibey',
      entityKind: 'space-item',
      entityId: docId,
      mimeType: 'text/html',
    })
  }

  return out
}
