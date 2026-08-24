import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'
import { missionDeliverableFromContentBlock, type MissionDeliverable } from '@/lib/missions'
import type { LinkPreview, SpaceItemActivity } from '../services/spaces.service'
import { mergeCommentLinkPreviews } from './doc-mention-link-previews'

function mimeToDeliverableType(mime: string): MissionDeliverable['type'] {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'file'
}

function externalAttachmentToDeliverable(
  attachment: unknown,
  row: SpaceItemActivity,
  index: number,
): MissionDeliverable | null {
  if (!attachment || typeof attachment !== 'object' || Array.isArray(attachment)) return null
  const value = attachment as Record<string, unknown>
  const fileUrl =
    typeof value.url === 'string'
      ? value.url
      : typeof value.fileUrl === 'string'
        ? value.fileUrl
        : ''
  if (!fileUrl) return null
  const fileName =
    (typeof value.name === 'string' && value.name.trim()) ||
    (typeof value.filename === 'string' && value.filename.trim()) ||
    'Attachment'
  const mimeType =
    (typeof value.mime_type === 'string' && value.mime_type) ||
    (typeof value.mimeType === 'string' && value.mimeType) ||
    'application/octet-stream'
  const externalId = typeof value.id === 'string' && value.id ? value.id : String(index)
  return {
    id: `${row.id}-external-att-${externalId}`,
    mission_id: '',
    user_id: row.user_id,
    campaign_id: null,
    agent_key: 'clickup',
    type: mimeToDeliverableType(mimeType),
    title: fileName,
    content: null,
    file_url: fileUrl,
    file_name: fileName,
    file_size: typeof value.size_bytes === 'number' ? value.size_bytes : null,
    mime_type: mimeType,
    metadata: {
      source: 'external_task_attachment',
      provider: 'clickup',
      spaceId: row.space_id,
      itemId: row.item_id,
      activityId: row.id,
      ...(typeof value.thumbnail_url === 'string' ? { thumbnail: value.thumbnail_url } : {}),
    },
    source: 'chat',
    created_at: row.created_at,
  }
}

/**
 * Convert a `LinkPreview` (Drive pick, pasted URL, etc.) into a
 * `MissionDeliverable` so it can render in the deliverables carousel and
 * inside `DeliverablePreviewModal`. Shared between the bulk activity
 * collector and inline LinkPreviewCard click handlers so both paths produce
 * the exact same deliverable object.
 */
export function linkPreviewToDeliverable(
  preview: LinkPreview,
  ctx: { rowId: string; userId: string | null; createdAt: string },
): MissionDeliverable | null {
  if (!preview?.url) return null
  const provider = preview.provider ?? 'generic'
  const title = preview.title?.trim() ? preview.title : preview.url
  const mimeType =
    preview.mimeType && preview.mimeType.length > 0
      ? preview.mimeType
      : provider === 'drive'
        ? 'application/vnd.google-apps.unknown'
        : 'text/uri-list'
  const isSpaceDoc =
    preview.entityKind === 'space-item' && !!preview.entityId && provider === 'internal'
  const spaceIdFromUrl = preview.url.match(/^\/spaces\/([^/]+)\//)?.[1] ?? null
  const fileUrl =
    provider === 'drive' ||
    preview.mimeType?.startsWith('image/') ||
    preview.mimeType === 'application/pdf'
      ? preview.url
      : null
  return {
    id: `${ctx.rowId}-prev-${preview.url}`,
    mission_id: '',
    user_id: ctx.userId ?? '',
    campaign_id: null,
    agent_key: 'user',
    type: isSpaceDoc ? 'doc' : mimeToDeliverableType(mimeType),
    title,
    content: isSpaceDoc ? preview.description : null,
    file_url: fileUrl,
    file_name: title,
    file_size: null,
    mime_type: mimeType,
    entity_id: preview.entityId ?? null,
    entity_table: isSpaceDoc ? 'space_items' : null,
    metadata: {
      source: 'task_activity_link',
      provider,
      ...(preview.entityKind ? { entityKind: preview.entityKind } : {}),
      ...(preview.imageUrl ? { thumbnail: preview.imageUrl } : {}),
      ...(isSpaceDoc && spaceIdFromUrl ? { spaceId: spaceIdFromUrl } : {}),
      ...(isSpaceDoc ? { internalUrl: preview.url } : {}),
    },
    source: 'chat',
    created_at: ctx.createdAt,
  }
}

/**
 * Builds preview rows for the task modal carousel from activity: agent ui blocks
 * (documents, artifacts, screenshots) and user-uploaded comment attachments.
 */
export function collectTaskDeliverablesFromActivity(
  rows: SpaceItemActivity[],
): MissionDeliverable[] {
  const out: MissionDeliverable[] = []
  const seen = new Set<string>()
  const seenExternalAttachmentUrls = new Set<string>()

  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  for (const row of sorted) {
    if (row.event_type === 'agent_task_execution') {
      const payload = row.payload
      const blocks = Array.isArray(payload.content_blocks_ordered)
        ? (payload.content_blocks_ordered as MessageContentBlock[])
        : []
      const agentKey = (typeof payload.agent_key === 'string' ? payload.agent_key : null) ?? null
      for (const block of blocks) {
        const d = missionDeliverableFromContentBlock(block, {
          messageId: row.id,
          createdAt: row.created_at,
          agentKey,
        })
        if (d && !seen.has(d.id)) {
          seen.add(d.id)
          out.push(d)
        }
      }
    }

    if (row.event_type === 'comment' || row.event_type === 'user.comment') {
      const payload = row.payload

      // Direct binary attachments (local upload, Dropbox).
      const attachments = Array.isArray(payload.attachments) ? payload.attachments : []
      let i = 0
      for (const att of attachments) {
        if (!att || typeof att !== 'object') continue
        const a = att as Record<string, unknown>
        const fileUrl = typeof a.fileUrl === 'string' ? a.fileUrl : ''
        const filename = typeof a.filename === 'string' ? a.filename : 'Attachment'
        const mimeType = typeof a.mimeType === 'string' ? a.mimeType : 'application/octet-stream'
        if (!fileUrl) continue
        const id = `${row.id}-att-${i++}`
        if (seen.has(id)) continue
        seen.add(id)
        out.push({
          id,
          mission_id: '',
          user_id: row.user_id,
          campaign_id: null,
          agent_key: 'user',
          type: mimeToDeliverableType(mimeType),
          title: filename,
          content: null,
          file_url: fileUrl,
          file_name: filename,
          file_size: typeof a.sizeBytes === 'number' ? a.sizeBytes : null,
          mime_type: mimeType,
          metadata: {
            source: 'task_activity_comment',
            spaceId: row.space_id,
            itemId: row.item_id,
            activityId: row.id,
          },
          source: 'chat',
          created_at: row.created_at,
        })
      }

      // Link previews (Drive picks, pasted URLs, @@ doc mentions enriched by API).
      const messageHtml = typeof payload.message === 'string' ? payload.message : ''
      const previews = mergeCommentLinkPreviews(
        Array.isArray(payload.previews) ? (payload.previews as LinkPreview[]) : undefined,
        messageHtml,
        row.space_id,
      )
      for (const preview of previews) {
        const d = linkPreviewToDeliverable(preview, {
          rowId: row.id,
          userId: row.user_id,
          createdAt: row.created_at,
        })
        if (!d || seen.has(d.id)) continue
        seen.add(d.id)
        out.push(d)
      }
    }

    if (
      row.event_type === 'field_change' &&
      typeof row.payload.field === 'string' &&
      /^(attachments?|files?|media|documents?)$/i.test(row.payload.field)
    ) {
      const attachments = Array.isArray(row.payload.to) ? row.payload.to : []
      attachments.forEach((attachment, index) => {
        const deliverable = externalAttachmentToDeliverable(attachment, row, index)
        if (
          !deliverable ||
          seen.has(deliverable.id) ||
          (deliverable.file_url && seenExternalAttachmentUrls.has(deliverable.file_url))
        ) {
          return
        }
        seen.add(deliverable.id)
        if (deliverable.file_url) seenExternalAttachmentUrls.add(deliverable.file_url)
        out.push(deliverable)
      })
    }
  }

  return out
}
