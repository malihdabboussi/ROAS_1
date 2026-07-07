import type { ChannelMessage } from '@/lib/channels'

export type DeliverableType = 'image' | 'video' | 'audio' | 'document' | 'artifact' | 'other'

export interface Deliverable {
  id: string
  type: DeliverableType
  url: string
  label: string
  agentKey: string | null
  agentAvatarUrl: string | null
  threadParentId: string | null
  messageId: string
  createdAt: string
  campaignId: string | null
  /** Resolved lineage campaign ids (artifact + copies) for movable entities */
  campaignIds?: string[]
  artifactType?: string
  artifactId?: string
}

export function readCampaignFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  const c = metadata.campaign_id ?? metadata.campaignId
  return typeof c === 'string' && c.length > 0 ? c : null
}

function readCampaignFromBlock(
  block: Record<string, unknown>,
  fallback: string | null,
): string | null {
  const c = block.campaign_id ?? block.campaignId
  if (typeof c === 'string' && c.length > 0) return c
  return fallback
}

const SUPABASE_STORAGE_REGEX =
  /https?:\/\/[a-z0-9.-]+\.supabase\.[a-z]+\/storage\/v1\/object\/[^\s"'<>)]+/gi
const IMAGE_EXT_REGEX = /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i
const VIDEO_EXT_REGEX = /\.(mp4|webm|mov)(\?|$)/i
const AUDIO_EXT_REGEX = /\.(mp3|wav|ogg|aac|m4a)(\?|$)/i
const DOC_EXT_REGEX = /\.(pdf|docx?|xlsx?|csv|pptx?|md|txt)(\?|$)/i
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(([^)]+)\)/g
const HTML_IMG_REGEX = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi

function classifyUrl(url: string): DeliverableType {
  if (IMAGE_EXT_REGEX.test(url)) return 'image'
  if (VIDEO_EXT_REGEX.test(url)) return 'video'
  if (AUDIO_EXT_REGEX.test(url)) return 'audio'
  if (DOC_EXT_REGEX.test(url)) return 'document'
  return 'other'
}

const ARTIFACT_TYPE_LABELS: Record<string, string> = {
  offer: 'Offer',
  funnel: 'Funnel',
  avatar: 'Avatar',
  sequence: 'Email Sequence',
  presentation: 'Presentation',
  ad: 'Ad',
  'ad-campaign': 'Ad Campaign',
  'social-post': 'Social Post',
  'blog-post': 'Blog Post',
}

export function extractDeliverablesFromMessage(
  msg: ChannelMessage,
  rosterAvatars?: Map<string, string>,
  campaignResolver?: (m: ChannelMessage) => string | null,
): Deliverable[] {
  const content = msg.content ?? ''
  const results: Deliverable[] = []
  const seen = new Set<string>()

  const resolvedCampaign =
    campaignResolver?.(msg) ??
    readCampaignFromMetadata(msg.metadata as Record<string, unknown> | null)

  const agentKey = msg.sender_type === 'agent' ? msg.sender_id : null
  const agentAvatarUrl =
    msg.sender_type === 'agent' ? (rosterAvatars?.get(msg.sender_id) ?? null) : null
  const base = {
    agentKey,
    agentAvatarUrl,
    threadParentId: msg.reply_to_id,
    messageId: msg.id,
    createdAt: msg.created_at,
    campaignId: resolvedCampaign,
  }

  const addUrl = (url: string, labelOverride?: string, typeOverride?: DeliverableType) => {
    if (seen.has(url)) return
    seen.add(url)
    const type = typeOverride ?? classifyUrl(url)
    const label = labelOverride ?? url.split('/').pop()?.split('?')[0] ?? 'File'
    results.push({ id: `${msg.id}-url-${seen.size}`, type, url, label, ...base })
  }

  let match: RegExpExecArray | null
  SUPABASE_STORAGE_REGEX.lastIndex = 0
  while ((match = SUPABASE_STORAGE_REGEX.exec(content)) !== null) {
    addUrl(match[0])
  }

  MARKDOWN_IMAGE_REGEX.lastIndex = 0
  while ((match = MARKDOWN_IMAGE_REGEX.exec(content)) !== null) {
    if (match[2]) addUrl(match[2])
  }

  MARKDOWN_LINK_REGEX.lastIndex = 0
  while ((match = MARKDOWN_LINK_REGEX.exec(content)) !== null) {
    const url = match[2] ?? ''
    if (VIDEO_EXT_REGEX.test(url) || AUDIO_EXT_REGEX.test(url) || DOC_EXT_REGEX.test(url)) {
      addUrl(url, match[1] || undefined)
    }
  }

  HTML_IMG_REGEX.lastIndex = 0
  while ((match = HTML_IMG_REGEX.exec(content)) !== null) {
    if (match[1]) addUrl(match[1])
  }

  const meta = msg.metadata as Record<string, unknown> | null
  const attachmentUrls = meta?.attachments
  if (Array.isArray(attachmentUrls)) {
    for (const url of attachmentUrls) {
      if (typeof url === 'string' && url.trim()) addUrl(url.trim())
    }
  }

  const orderedBlocks = (meta?.content_blocks_ordered as unknown[]) ?? []

  for (const raw of orderedBlocks) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const block = raw as Record<string, unknown>
    const blockType = typeof block.type === 'string' ? block.type : ''

    if (blockType === 'artifact_preview') {
      const artifactType = typeof block.artifactType === 'string' ? block.artifactType : ''
      const artifactId = typeof block.artifactId === 'string' ? block.artifactId : ''
      const name =
        typeof block.name === 'string'
          ? block.name
          : (ARTIFACT_TYPE_LABELS[artifactType] ?? 'Artifact')
      const imageUrl = typeof block.imageUrl === 'string' ? block.imageUrl : ''
      const videoUrl = typeof block.videoUrl === 'string' ? block.videoUrl : ''
      const dedupeKey = artifactId || `${blockType}-${block.id}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)

      const hasImage = !!imageUrl && !seen.has(imageUrl)
      if (hasImage) seen.add(imageUrl)
      const hasVideo = !!videoUrl && !seen.has(videoUrl)
      if (hasVideo) seen.add(videoUrl)

      results.push({
        id: `${msg.id}-artifact-${artifactId || block.id}`,
        type: hasImage ? 'image' : 'artifact',
        url: imageUrl || videoUrl || '',
        label: name,
        artifactType,
        artifactId,
        ...base,
        campaignId: readCampaignFromBlock(block, resolvedCampaign),
      })
      continue
    }

    if (blockType === 'document_card') {
      const docId = typeof block.documentId === 'string' ? block.documentId : ''
      const title = typeof block.title === 'string' ? block.title : 'Document'
      const dedupeKey = docId || `doc-${block.id}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      results.push({
        id: `${msg.id}-doc-${docId || block.id}`,
        type: 'document',
        url: '',
        label: title,
        artifactType: 'document',
        artifactId: docId,
        ...base,
        campaignId: readCampaignFromBlock(block, resolvedCampaign),
      })
      continue
    }

    if (blockType === 'browser_screenshot') {
      const imageUrl = typeof block.imageUrl === 'string' ? block.imageUrl : ''
      if (!imageUrl || seen.has(imageUrl)) continue
      seen.add(imageUrl)
      const pageUrl = typeof block.pageUrl === 'string' ? block.pageUrl : ''
      results.push({
        id: `${msg.id}-screenshot-${block.id}`,
        type: 'image',
        url: imageUrl,
        label: pageUrl ? `Screenshot — ${new URL(pageUrl).hostname}` : 'Browser Screenshot',
        ...base,
        campaignId: readCampaignFromBlock(block, resolvedCampaign),
      })
      continue
    }

    if (blockType === 'project_preview') {
      const projectId = typeof block.project_id === 'string' ? block.project_id : ''
      const name = typeof block.name === 'string' ? block.name : 'Project'
      const dedupeKey = projectId || `project-${block.id}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      results.push({
        id: `${msg.id}-project-${projectId || block.id}`,
        type: 'artifact',
        url: '',
        label: name,
        artifactType: 'project',
        artifactId: projectId,
        ...base,
        campaignId: readCampaignFromBlock(block, resolvedCampaign),
      })
      continue
    }

    if (blockType === 'widget_preview') {
      const name = typeof block.name === 'string' ? block.name : 'Widget'
      const dedupeKey = `widget-${block.id}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      results.push({
        id: `${msg.id}-widget-${block.id}`,
        type: 'artifact',
        url: '',
        label: name,
        artifactType: 'widget',
        ...base,
        campaignId: readCampaignFromBlock(block, resolvedCampaign),
      })
      continue
    }

    if (blockType !== 'text') continue
    const textContent = typeof block.content === 'string' ? block.content : ''
    if (!textContent) continue
    SUPABASE_STORAGE_REGEX.lastIndex = 0
    while ((match = SUPABASE_STORAGE_REGEX.exec(textContent)) !== null) {
      addUrl(match[0])
    }
    MARKDOWN_IMAGE_REGEX.lastIndex = 0
    while ((match = MARKDOWN_IMAGE_REGEX.exec(textContent)) !== null) {
      if (match[2]) addUrl(match[2])
    }
    MARKDOWN_LINK_REGEX.lastIndex = 0
    while ((match = MARKDOWN_LINK_REGEX.exec(textContent)) !== null) {
      const url = match[2] ?? ''
      if (
        VIDEO_EXT_REGEX.test(url) ||
        AUDIO_EXT_REGEX.test(url) ||
        DOC_EXT_REGEX.test(url) ||
        IMAGE_EXT_REGEX.test(url)
      ) {
        addUrl(url, match[1] || undefined)
      }
    }
  }

  return results
}
