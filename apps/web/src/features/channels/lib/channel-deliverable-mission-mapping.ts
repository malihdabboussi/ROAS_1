import type { MissionDeliverable } from '@/lib/missions'
import type { Deliverable } from './channel-deliverables'

const CHANNEL_ARTIFACT_TO_DELIVERABLE_TYPE: Record<string, MissionDeliverable['type']> = {
  offer: 'offer',
  funnel: 'funnel',
  avatar: 'avatar',
  sequence: 'sequence',
  presentation: 'presentation',
  ad: 'ad',
  'ad-campaign': 'ad_campaign',
  'social-post': 'social_post',
  'blog-post': 'blog_post',
  document: 'doc',
  project: 'file',
  widget: 'file',
}

export const ENTITY_TABLE_FOR_ARTIFACT: Record<string, string> = {
  offer: 'offers',
  funnel: 'funnels',
  avatar: 'avatars',
  sequence: 'sequences',
  presentation: 'presentations',
  ad: 'ads',
  'ad-campaign': 'ad_campaigns',
  'social-post': 'social_posts',
  'blog-post': 'blog_posts',
  document: 'conversation_documents',
}

/** Same tables as PATCH /api/artifacts/:table/:id/move */
export const RESOLVABLE_ARTIFACT_TABLES = new Set([
  'offers',
  'funnels',
  'ads',
  'sequences',
  'presentations',
  'avatars',
])

export function deliverableToMissionDeliverable(item: Deliverable): MissionDeliverable {
  const aType = item.artifactType ?? ''
  const mType =
    CHANNEL_ARTIFACT_TO_DELIVERABLE_TYPE[aType] ??
    (item.type === 'image'
      ? ('image' as const)
      : item.type === 'video'
        ? ('video' as const)
        : item.type === 'document'
          ? ('doc' as const)
          : ('file' as const))

  return {
    id: item.id,
    mission_id: '',
    user_id: '',
    agent_key: item.agentKey ?? 'unknown',
    type: mType,
    title: item.label,
    content: null,
    file_url: item.url || null,
    file_name: null,
    file_size: null,
    mime_type: null,
    metadata: {},
    entity_id: item.artifactId ?? null,
    entity_table: ENTITY_TABLE_FOR_ARTIFACT[aType] ?? null,
    campaign_id: item.campaignIds?.[0] ?? item.campaignId ?? null,
    source: 'chat',
    created_at: item.createdAt,
  }
}
