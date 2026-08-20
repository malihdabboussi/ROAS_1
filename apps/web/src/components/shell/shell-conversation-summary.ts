import type { Message } from '@/lib/conversations'
import { extractLinksFromText, extractMediaFromText } from '@/lib/conversations'
import {
  formatRetrievalSourceTitle,
  isBrainRetrievalReceipt,
  isWebResearchSource,
} from '@/lib/conversations/retrieval-receipts'

type UnknownRow = Record<string, unknown>

export type ConversationTaskRow = {
  id: string
  title: string
  state: 'complete' | 'failed'
  createdAt: string
}

export type ConversationFileRow = {
  id: string
  messageId: string
  title: string
  subtitle: string | null
  kind: 'artifact' | 'image' | 'video' | 'audio' | 'file'
  fileUrl: string | null
  mimeType: string | null
  mediaAssetId: string | null
  entityId: string | null
  entityType: string | null
  createdAt: string
}

export type ConversationMissionRow = {
  id: string
  title: string
  createdAt: string
}

export type ConversationSourceRow = {
  id: string
  title: string
  kind: string
  href: string | null
  createdAt: string
}

function asRows(value: unknown): UnknownRow[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is UnknownRow =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
      )
    : []
}

function stringField(row: UnknownRow, key: string): string | null {
  const value = row[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function messagePlainText(message: Message): string {
  if (message.content?.trim()) return message.content
  return (message.content_blocks ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.content)
    .join('\n')
}

function orderedBlocks(message: Message): UnknownRow[] {
  return asRows(message.metadata.content_blocks_ordered)
}

export function extractConversationTaskRows(messages: Message[]): ConversationTaskRow[] {
  const rows: ConversationTaskRow[] = []
  const seen = new Set<string>()
  const seenSignatures = new Set<string>()

  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const block of orderedBlocks(message)) {
      if (block.type !== 'tool' || (block.state !== 'complete' && block.state !== 'failed'))
        continue
      const title =
        stringField(block, 'label') ?? stringField(block, 'action') ?? stringField(block, 'name')
      if (!title) continue
      const id = stringField(block, 'id') ?? `${message.id}:${title}`
      const signature = `${message.id}:${title}:${block.state}`
      if (seen.has(id) || seenSignatures.has(signature)) continue
      seen.add(id)
      seenSignatures.add(signature)
      const endedAt = typeof block.endedAt === 'number' ? block.endedAt : null
      rows.push({
        id,
        title,
        state: block.state,
        createdAt: endedAt ? new Date(endedAt).toISOString() : message.created_at,
      })
    }

    const legacySteps = Array.isArray(message.metadata.tool_steps)
      ? message.metadata.tool_steps
      : []
    legacySteps.forEach((step, index) => {
      const stepRow =
        step && typeof step === 'object' && !Array.isArray(step) ? (step as UnknownRow) : null
      const title =
        typeof step === 'string' ? step.trim() : stepRow ? stringField(stepRow, 'label') : null
      if (!title) return
      const state = stepRow?.status === 'failed' ? 'failed' : 'complete'
      const signature = `${message.id}:${title}:${state}`
      if (seenSignatures.has(signature)) return
      seenSignatures.add(signature)
      rows.push({
        id: `${message.id}:tool-step:${index}`,
        title,
        state,
        createdAt: message.created_at,
      })
    })
  }

  return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

/**
 * Missions this conversation started.
 *
 * `missions` has no `conversation_id` column, so the only conversation-scoped
 * link is the receipt the chat writes when a mission launches: an assistant
 * message carrying `mission_id`, with an `artifact_preview` block naming it.
 * Reading the thread is therefore exact — it returns the missions started
 * here, not every mission in the surrounding space.
 */
export function extractConversationMissionRows(messages: Message[]): ConversationMissionRow[] {
  const rows: ConversationMissionRow[] = []
  const seen = new Set<string>()

  for (const message of messages) {
    if (message.role !== 'assistant') continue

    const blocks = orderedBlocks(message)
    const missionBlock = blocks.find(
      (block) => block.type === 'artifact_preview' && block.artifactType === 'mission',
    )
    const missionId =
      (missionBlock ? stringField(missionBlock, 'artifactId') : null) ??
      stringField(message.metadata as UnknownRow, 'mission_id')
    if (!missionId || seen.has(missionId)) continue
    seen.add(missionId)

    const blockName = missionBlock ? stringField(missionBlock, 'name') : null
    rows.push({
      id: missionId,
      title: blockName ?? (message.content?.trim() || 'Mission'),
      createdAt: message.created_at,
    })
  }

  return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function attachmentKind(row: UnknownRow): ConversationFileRow['kind'] {
  const type = stringField(row, 'type')
  const mimeType = stringField(row, 'mimeType')?.toLowerCase() ?? ''
  if (type === 'image' || mimeType.startsWith('image/')) return 'image'
  if (type === 'video' || mimeType.startsWith('video/')) return 'video'
  if (type === 'audio' || mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

export function extractConversationFileRows(messages: Message[]): ConversationFileRow[] {
  const rows: ConversationFileRow[] = []
  const seen = new Set<string>()

  const push = (row: ConversationFileRow) => {
    const dedupeKey = row.fileUrl ?? `${row.kind}:${row.entityId ?? row.id}`
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)
    rows.push(row)
  }

  for (const message of messages) {
    for (const document of asRows(message.metadata.documents)) {
      const fileUrl = stringField(document, 'fileUrl') ?? stringField(document, 'dataUrl')
      const title = stringField(document, 'filename') ?? 'Attached file'
      push({
        id: `${message.id}:document:${title}`,
        messageId: message.id,
        title,
        subtitle: null,
        kind: attachmentKind(document),
        fileUrl,
        mimeType: stringField(document, 'mimeType'),
        mediaAssetId: stringField(document, 'mediaAssetId'),
        entityId: null,
        entityType: null,
        createdAt: message.created_at,
      })
    }

    for (const artifact of asRows(message.metadata.highlighted_artifacts)) {
      const entityId = stringField(artifact, 'id')
      const entityType = stringField(artifact, 'type')
      if (!entityId || !entityType) continue
      push({
        id: `${message.id}:artifact:${entityId}`,
        messageId: message.id,
        title: stringField(artifact, 'label') ?? 'Artifact',
        subtitle: null,
        kind: 'artifact',
        fileUrl: null,
        mimeType: null,
        mediaAssetId: null,
        entityId,
        entityType,
        createdAt: message.created_at,
      })
    }

    for (const block of orderedBlocks(message)) {
      const type = stringField(block, 'type')
      if (type === 'artifact_preview') {
        const entityId = stringField(block, 'artifactId')
        const entityType = stringField(block, 'artifactType')
        if (!entityId || !entityType) continue
        push({
          id: stringField(block, 'id') ?? `${message.id}:artifact:${entityId}`,
          messageId: message.id,
          title: stringField(block, 'name') ?? 'Artifact',
          subtitle: stringField(block, 'subtitle'),
          kind: 'artifact',
          fileUrl: null,
          mimeType: null,
          mediaAssetId: null,
          entityId,
          entityType,
          createdAt: message.created_at,
        })
      }
      if (type === 'pdf_file' || type === 'docx_file') {
        const fileUrl = stringField(block, 'url')
        if (!fileUrl) continue
        push({
          id: stringField(block, 'id') ?? `${message.id}:${fileUrl}`,
          messageId: message.id,
          title: stringField(block, 'label') ?? 'Document',
          subtitle: null,
          kind: 'file',
          fileUrl,
          mimeType:
            type === 'pdf_file'
              ? 'application/pdf'
              : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          mediaAssetId: null,
          entityId: null,
          entityType: null,
          createdAt: message.created_at,
        })
      }
      if (type === 'media_asset') {
        const fileUrl = stringField(block, 'url')
        const kind = stringField(block, 'kind')
        if (!fileUrl || !kind || !['image', 'video', 'audio', 'file'].includes(kind)) continue
        push({
          id: stringField(block, 'id') ?? `${message.id}:${fileUrl}`,
          messageId: message.id,
          title: stringField(block, 'title') ?? stringField(block, 'fileName') ?? 'Media',
          subtitle: stringField(block, 'prompt'),
          kind: kind as ConversationFileRow['kind'],
          fileUrl,
          mimeType: stringField(block, 'mimeType'),
          mediaAssetId: stringField(block, 'mediaAssetId'),
          entityId: null,
          entityType: null,
          createdAt: message.created_at,
        })
      }
    }

    for (const media of extractMediaFromText(messagePlainText(message))) {
      push({
        id: `${message.id}:media:${media.url}`,
        messageId: message.id,
        title: media.label ?? 'Media',
        subtitle: null,
        kind: media.kind,
        fileUrl: media.url,
        mimeType: null,
        mediaAssetId: null,
        entityId: null,
        entityType: null,
        createdAt: message.created_at,
      })
    }
  }

  return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export function extractConversationSourceRows(messages: Message[]): ConversationSourceRow[] {
  const rows: ConversationSourceRow[] = []
  const seen = new Set<string>()

  for (const message of messages) {
    for (const receipt of asRows(message.metadata.retrieval_receipts)) {
      if (!isBrainRetrievalReceipt(receipt)) continue
      const key = `receipt:${receipt.scope ?? ''}:${receipt.brain_id ?? ''}:${receipt.query ?? ''}:${receipt.results_count ?? 0}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({
        id: `${message.id}:${key}`,
        title: formatRetrievalSourceTitle(receipt),
        kind: 'brain',
        href: null,
        createdAt: message.created_at,
      })
    }

    for (const source of asRows(message.metadata.web_research_urls)) {
      if (!isWebResearchSource(source)) continue
      if (seen.has(source.url)) continue
      seen.add(source.url)
      rows.push({
        id: `${message.id}:web:${source.url}`,
        title: source.title || source.url,
        kind: 'link',
        href: source.url,
        createdAt: message.created_at,
      })
    }

    for (const reference of asRows(message.metadata.message_references)) {
      const id = stringField(reference, 'id')
      const kind = stringField(reference, 'kind')
      if (!id || !kind) continue
      const key = `${kind}:${id}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({
        id: `${message.id}:reference:${key}`,
        title: stringField(reference, 'label') ?? 'Connected source',
        kind,
        href: null,
        createdAt: message.created_at,
      })
    }

    for (const link of extractLinksFromText(messagePlainText(message))) {
      if (seen.has(link.url)) continue
      seen.add(link.url)
      rows.push({
        id: `${message.id}:link:${link.url}`,
        title: link.title,
        kind: 'link',
        href: link.url,
        createdAt: message.created_at,
      })
    }
  }

  return rows.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
