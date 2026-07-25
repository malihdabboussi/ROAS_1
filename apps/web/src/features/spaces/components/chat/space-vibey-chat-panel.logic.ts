import type { ChatModelSettings } from '@/lib/chat/chat-model-settings'
import type { DocumentAttachment } from '@/lib/chat/document-attachments'
import type { Conversation } from '@/lib/conversations/conversation.types'

export const HOME_CHAT_SEED_STORAGE_KEY = 'home-chat-seed'
export const DEFAULT_SPACE_CHAT_AGENT_KEY = 'vibey'

export interface SpaceChatAttachedArtifact {
  id: string
  type: string
  label: string
}

export type SpaceChatMessageReferenceKind =
  | 'artifact'
  | 'media'
  | 'mission'
  | 'conversation'
  | 'person'

export interface SpaceChatMessageReference {
  kind: SpaceChatMessageReferenceKind
  id: string
  label: string
  type?: string
  campaign_id?: string
  brain_id?: string
}

export interface HomeChatSeedPayload {
  space_id: string
  conversation?: Conversation
  content: string
  documents?: DocumentAttachment[]
  artifacts?: SpaceChatAttachedArtifact[]
  model?: string
  references?: SpaceChatMessageReference[]
  modelSettings?: ChatModelSettings
}

interface ConversationScopeLike {
  agent_id?: string | null
  campaign_id?: string | null
  metadata?: Record<string, unknown> | null
}

export interface SpaceChatScope {
  campaignId: string | null
  spaceId: string | null
}

interface ConversationListLike extends ConversationScopeLike {
  id: string
  updated_at: string
}

interface MessageMutationLike {
  role?: string
  metadata?: Record<string, unknown> | null
}

const TASK_MUTATION_ACTIONS = new Set(['create_task', 'update_task', 'delete_task'])
const MISSION_MUTATION_ACTIONS = new Set(['create_mission'])
const SPACE_ARTIFACT_VIEW_TYPE_BY_ARTIFACT_TYPE: Record<string, string> = {
  website: 'websites',
  funnel: 'funnels',
  offer: 'offers',
  'ad-campaign': 'ad_campaigns',
  sequence: 'sequences',
  presentation: 'presentations',
  avatar: 'avatars',
  'social-post': 'social_posts',
  'instagram-research': 'instagram_research',
  'tiktok-research': 'tiktok_research',
  'youtube-research': 'youtube_research',
  'twitter-research': 'twitter_research',
  ad: 'ads',
  document: 'docs',
}

interface SpaceChatAutoFocusMessageLike {
  id: string
  role?: string
  metadata?: Record<string, unknown> | null
}

export interface SpaceChatAutoFocusTarget {
  key: string
  viewType: string
}

export interface SpaceChatConversationUrlParams {
  origin: string
  isChannelScope: boolean
  chatScopeId: string
  spaceId: string | null | undefined
  conversationId: string
}

export function readHomeChatSeedForSpace(spaceId: string): HomeChatSeedPayload | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(HOME_CHAT_SEED_STORAGE_KEY)
  if (!raw) return null
  try {
    const payload = JSON.parse(raw) as HomeChatSeedPayload
    if (!payload || payload.space_id !== spaceId) return null
    return payload
  } catch {
    return null
  }
}

export function isHomeChatSeedPending(spaceId: string, searchParams: URLSearchParams): boolean {
  if (searchParams.get('home_seed') !== '1') return false
  const requestedSpaceId = searchParams.get('space')
  if (requestedSpaceId && requestedSpaceId !== spaceId) return false
  return readHomeChatSeedForSpace(spaceId) !== null
}

export function messageHasTaskMutation(message: MessageMutationLike): boolean {
  if (message.role !== 'assistant') return false
  if (message.metadata?.spaces_undoable === true) return true
  const blocks = message.metadata?.content_blocks_ordered
  if (!Array.isArray(blocks)) return false
  return blocks.some((block) => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return false
    const record = block as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name : ''
    const action = typeof record.action === 'string' ? record.action : ''
    return TASK_MUTATION_ACTIONS.has(name) || TASK_MUTATION_ACTIONS.has(action)
  })
}

export function getConversationAgentKey(
  conversation: ConversationScopeLike | null | undefined,
): string {
  const agentKey = conversation?.agent_id?.trim()
  return agentKey && agentKey.length > 0 ? agentKey : DEFAULT_SPACE_CHAT_AGENT_KEY
}

export function resolveSpaceChatSendAgentKey(
  activeAgentKey: string,
  requestedAgentKey?: string,
): string {
  const requested = requestedAgentKey?.trim()
  return requested && requested.length > 0 ? requested : activeAgentKey
}

export function resolveSpaceChatSeedSendOptions(
  seed: {
    agentKey?: string
    conversationId?: string
    railIntent?: 'new' | 'list' | 'focus' | null
  },
  activeAgentKey: string,
): { forceNewConversation: boolean; agentKey?: string } {
  return {
    forceNewConversation:
      seed.railIntent === 'new' ||
      Boolean(seed.agentKey && seed.agentKey !== activeAgentKey && !seed.conversationId),
    agentKey: seed.agentKey,
  }
}

export function getConversationSpaceId(
  conversation: ConversationScopeLike | null | undefined,
): string | null {
  const value = conversation?.metadata?.space_id
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** Effective campaign/space: override → conversation → panel context. */
export function resolveSpaceChatScope(
  conversation: ConversationScopeLike | null | undefined,
  panelFallback: SpaceChatScope,
  override: SpaceChatScope | null | undefined,
): SpaceChatScope {
  if (override) {
    return { campaignId: override.campaignId, spaceId: override.spaceId }
  }
  if (conversation) {
    return {
      campaignId: conversation.campaign_id ?? null,
      spaceId: getConversationSpaceId(conversation),
    }
  }
  return { campaignId: panelFallback.campaignId, spaceId: panelFallback.spaceId }
}

export function getConversationChannelId(
  conversation: ConversationScopeLike | null | undefined,
): string | null {
  const value = conversation?.metadata?.channel_id
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function conversationBelongsToSpace(
  conversation: ConversationScopeLike | null | undefined,
  spaceId: string,
): boolean {
  return getConversationSpaceId(conversation) === spaceId
}

export function conversationBelongsToChannel(
  conversation: ConversationScopeLike | null | undefined,
  channelId: string,
): boolean {
  return getConversationChannelId(conversation) === channelId
}

export function mergeConversationLists<T extends ConversationListLike>(...lists: T[][]): T[] {
  const byId = new Map<string, T>()
  for (const list of lists) {
    for (const conversation of list) {
      byId.set(conversation.id, { ...byId.get(conversation.id), ...conversation } as T)
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

export function buildSpaceChatConversationUrl({
  origin,
  isChannelScope,
  chatScopeId,
  spaceId,
  conversationId,
}: SpaceChatConversationUrlParams): string {
  if (isChannelScope) {
    return `${origin}/home/channels/${encodeURIComponent(chatScopeId)}?conv=${encodeURIComponent(
      conversationId,
    )}`
  }
  return `${origin}/spaces?space=${encodeURIComponent(spaceId ?? '')}&conv=${encodeURIComponent(
    conversationId,
  )}`
}

export function resolveSpaceChatAutoFocusTarget(
  messages: SpaceChatAutoFocusMessageLike[],
): SpaceChatAutoFocusTarget | null {
  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
  const blocks = latestAssistant?.metadata?.content_blocks_ordered
  if (!Array.isArray(blocks)) return null

  const missionToolBlock = blocks.find((block): block is Record<string, unknown> => {
    if (!block || typeof block !== 'object') return false
    const record = block as Record<string, unknown>
    if (record.type !== 'tool' || record.state !== 'complete') return false
    const name = typeof record.name === 'string' ? record.name : ''
    const action = typeof record.action === 'string' ? record.action : ''
    return MISSION_MUTATION_ACTIONS.has(name) || MISSION_MUTATION_ACTIONS.has(action)
  })
  if (missionToolBlock) {
    const key =
      typeof missionToolBlock.toolCallId === 'string'
        ? `missions:${missionToolBlock.toolCallId}`
        : typeof missionToolBlock.id === 'string'
          ? `missions:${missionToolBlock.id}`
          : `missions:${latestAssistant?.id ?? 'latest'}`
    return { key, viewType: 'missions' }
  }

  const artifactBlock = blocks.find((block): block is Record<string, unknown> => {
    if (!block || typeof block !== 'object') return false
    const type = (block as Record<string, unknown>).type
    if (type === 'document_card') {
      return typeof (block as Record<string, unknown>).spaceItemId === 'string'
    }
    return type === 'artifact_preview'
  })
  const isDocumentCard = artifactBlock?.type === 'document_card'
  const artifactType = isDocumentCard ? 'document' : artifactBlock?.artifactType
  const artifactId = isDocumentCard ? artifactBlock?.spaceItemId : artifactBlock?.artifactId
  if (typeof artifactType !== 'string' || typeof artifactId !== 'string') return null

  const viewType = SPACE_ARTIFACT_VIEW_TYPE_BY_ARTIFACT_TYPE[artifactType] ?? null
  if (!viewType) return null
  return { key: `${viewType}:${artifactId}`, viewType }
}
