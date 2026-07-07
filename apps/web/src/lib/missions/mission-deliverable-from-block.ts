import type { MessageContentBlock } from '@/lib/chat/message-content-blocks'
import type { MissionDeliverable } from './mission-types'

const CHANNEL_ARTIFACT_TO_MISSION_TYPE: Record<string, MissionDeliverable['type']> = {
  offer: 'offer',
  funnel: 'funnel',
  avatar: 'avatar',
  sequence: 'sequence',
  presentation: 'presentation',
  ad: 'ad',
  'ad-set': 'ad_set',
  'ad-campaign': 'ad_campaign',
  'social-post': 'social_post',
  'blog-post': 'blog_post',
  email: 'email',
  'visual-doc': 'visual_doc',
  form: 'form',
  task: 'task',
  mission: 'mission',
  flow: 'flow',
  website: 'website',
  theme: 'theme',
  'custom-object': 'custom_object',
  document: 'doc',
  project: 'file',
  widget: 'file',
}

const ENTITY_TABLE_FOR_ARTIFACT: Record<string, string> = {
  offer: 'offers',
  funnel: 'funnels',
  avatar: 'avatars',
  sequence: 'sequences',
  presentation: 'presentations',
  ad: 'ads',
  'ad-set': 'ad_sets',
  'ad-campaign': 'ad_campaigns',
  'social-post': 'social_posts',
  'blog-post': 'blog_posts',
  email: 'emails',
  'visual-doc': 'space_items',
  form: 'forms',
  task: 'space_items',
  mission: 'missions',
  flow: 'space_automations',
  website: 'funnels',
  theme: 'themes',
  'custom-object': 'space_items',
  document: 'conversation_documents',
}

export type ChannelSourceForDeliverable = {
  messageId: string
  createdAt: string
  agentKey: string | null
}

function baseMissionFields(
  opts: ChannelSourceForDeliverable,
): Pick<
  MissionDeliverable,
  | 'mission_id'
  | 'user_id'
  | 'agent_key'
  | 'content'
  | 'file_name'
  | 'file_size'
  | 'mime_type'
  | 'metadata'
  | 'source'
  | 'created_at'
> {
  return {
    mission_id: '',
    user_id: '',
    agent_key: opts.agentKey ?? 'unknown',
    content: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    metadata: {},
    source: 'chat',
    created_at: opts.createdAt,
  }
}

/** Map a channel message content block to MissionDeliverable for DeliverablePreviewModal. */
export function missionDeliverableFromContentBlock(
  block: MessageContentBlock,
  opts: ChannelSourceForDeliverable,
): MissionDeliverable | null {
  if (block.type === 'pdf_file' || block.type === 'docx_file') {
    const isDocx = block.type === 'docx_file'
    return {
      id: `${opts.messageId}-${isDocx ? 'docx' : 'pdf'}-${block.id}`,
      ...baseMissionFields(opts),
      type: isDocx ? 'file' : 'pdf',
      title: block.label,
      file_url: block.url,
      file_name: block.label,
      mime_type: isDocx
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : null,
      entity_id: null,
      entity_table: null,
    }
  }

  if (block.type === 'media_asset') {
    const url = block.url.trim()
    if (!url) return null
    const mediaType =
      block.kind === 'image' || block.kind === 'video' || block.kind === 'audio'
        ? block.kind
        : 'file'
    return {
      id: `${opts.messageId}-media-${block.mediaAssetId ?? block.id}`,
      ...baseMissionFields(opts),
      type: mediaType,
      title: block.title,
      file_url: url,
      file_name: block.fileName ?? block.title,
      mime_type: block.mimeType ?? null,
      entity_id: block.mediaAssetId ?? null,
      entity_table: block.mediaAssetId ? 'media_assets' : null,
      metadata: {
        source: 'chat',
        ...(block.prompt ? { prompt: block.prompt } : {}),
      },
    }
  }

  if (block.type === 'artifact_preview') {
    const aType = block.artifactType
    const imageUrl = block.imageUrl?.trim() ?? ''
    const videoUrl = block.videoUrl?.trim() ?? ''
    let missionType = CHANNEL_ARTIFACT_TO_MISSION_TYPE[aType] ?? 'file'
    let file_url: string | null = null
    if (imageUrl) {
      missionType = 'image'
      file_url = imageUrl
    } else if (videoUrl) {
      missionType = 'video'
      file_url = videoUrl
    }
    const artifactTitle =
      aType === 'email'
        ? block.emailSubject?.trim()
          ? block.emailSubject.trim()
          : block.name
        : block.name

    return {
      id: `${opts.messageId}-artifact-${block.artifactId}`,
      ...baseMissionFields(opts),
      type: missionType,
      title: artifactTitle,
      file_url,
      entity_id: block.artifactId,
      entity_table: ENTITY_TABLE_FOR_ARTIFACT[aType] ?? null,
    }
  }

  if (block.type === 'document_card') {
    const documentId = block.documentId?.trim() ?? ''
    const spaceItemId = block.spaceItemId?.trim() ?? ''
    const entityId = spaceItemId || documentId
    const snippet = block.snippet.trim()
    if (!entityId) return null

    return {
      id: `${opts.messageId}-doc-${entityId}`,
      ...baseMissionFields(opts),
      type: 'doc',
      title: block.title,
      content: snippet || null,
      file_url: null,
      entity_id: entityId,
      entity_table: spaceItemId ? 'space_items' : 'conversation_documents',
      metadata: {
        source: 'chat',
        ...(block.spaceId ? { spaceId: block.spaceId } : {}),
        ...(spaceItemId ? { spaceItemId } : {}),
        ...(documentId ? { documentId } : {}),
        ...(spaceItemId && block.spaceId
          ? { internalUrl: `/spaces/${block.spaceId}/${spaceItemId}` }
          : {}),
      },
    }
  }

  if (block.type === 'project_preview') {
    return {
      id: `${opts.messageId}-project-${block.project_id}`,
      ...baseMissionFields(opts),
      type: 'file',
      title: block.name,
      file_url: null,
      entity_id: block.project_id,
      entity_table: null,
    }
  }

  if (block.type === 'widget_preview') {
    return {
      id: `${opts.messageId}-widget-${block.id}`,
      ...baseMissionFields(opts),
      type: 'file',
      title: block.name,
      file_url: null,
      entity_id: null,
      entity_table: null,
    }
  }

  if (block.type === 'browser_screenshot') {
    const url = block.imageUrl?.trim() ?? ''
    if (!url) return null
    let label = 'Browser Screenshot'
    if (block.pageUrl) {
      try {
        label = `Screenshot — ${new URL(block.pageUrl).hostname}`
      } catch {
        label = 'Browser Screenshot'
      }
    }
    return {
      id: `${opts.messageId}-screenshot-${block.id}`,
      ...baseMissionFields(opts),
      type: 'image',
      title: label,
      file_url: url,
      entity_id: null,
      entity_table: null,
    }
  }

  return null
}
