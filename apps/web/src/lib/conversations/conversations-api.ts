import {
  backendDelete,
  backendFetch,
  backendGet,
  backendPatch,
  backendPost,
  type BackendFetchOptions,
} from '@/lib/api/backend-client'
import type {
  Conversation,
  ConversationShareEntityType,
  ConversationShareLevel,
  ConversationShareRecord,
  Message,
} from './conversation.types'

export interface ConversationFeedOptions {
  feedScope?: 'workspace' | 'personal' | 'all' | 'org'
  feedOrgId?: string | null
  spaceId?: string | null
  channelId?: string | null
}

function isPendingConversationId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith('pending-')
}

export async function fetchConversations(
  campaignId?: string | null,
  agentId?: string | null,
  memberId?: string | null,
  feed?: ConversationFeedOptions,
  backend?: BackendFetchOptions,
): Promise<Conversation[]> {
  const params = new URLSearchParams()
  if (campaignId) params.set('campaign_id', campaignId)
  if (agentId) params.set('agent_id', agentId)
  if (memberId) params.set('member_id', memberId)
  if (feed?.feedScope) params.set('feed_scope', feed.feedScope)
  if (feed?.feedOrgId) params.set('feed_org_id', feed.feedOrgId)
  if (feed?.spaceId) params.set('space_id', feed.spaceId)
  if (feed?.channelId) params.set('channel_id', feed.channelId)
  const query = params.toString()
  return backendGet<Conversation[]>(`/api/conversations${query ? `?${query}` : ''}`, backend ?? {})
}

export async function createNewConversation(params?: {
  title?: string
  campaign_id?: string
  agent_id?: string
  draft?: boolean
  metadata?: Record<string, unknown>
}): Promise<Conversation> {
  return backendPost<Conversation>('/api/conversations', params ?? {})
}

export async function fetchMessages(
  conversationId: string,
  options?: { limit?: number; before?: string },
): Promise<Message[]> {
  const params = new URLSearchParams()
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.before) params.set('before', options.before)
  const query = params.toString()
  return backendGet<Message[]>(
    `/api/conversations/${conversationId}/messages${query ? `?${query}` : ''}`,
  )
}

export interface SendConversationMessageStreamingParams {
  conversation_id: string
  content: string
  model?: string
  source?: string
  campaign_id?: string | null
  space_id?: string | null
  scope_kind?: string | null
  system_context?: string
  hidden?: boolean
}

export async function sendConversationMessageStreaming(
  params: SendConversationMessageStreamingParams,
): Promise<void> {
  const response = await backendFetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: params.conversation_id,
      content: params.content,
      model: params.model,
      source: params.source ?? 'studio',
      campaign_id: params.campaign_id ?? null,
      space_id: params.space_id ?? null,
      scope_kind: params.scope_kind,
      ...(params.system_context ? { system_context: params.system_context } : {}),
      ...(params.hidden ? { hidden: true } : {}),
    }),
  })

  if (!response.ok) {
    if (response.status === 402) throw new Error('__CREDITS_EXHAUSTED__')
    throw new Error('Chat stream failed')
  }

  const reader = response.body?.getReader()
  if (!reader) return
  while (true) {
    const { done } = await reader.read()
    if (done) return
  }
}

export type ConversationAssetsScope = 'artifacts' | 'documents' | 'media' | 'links'

export interface ConversationAssetFeedItem {
  id: string
  scope: ConversationAssetsScope
  created_at: string
  conversation_id: string
  conversation_title: string | null
  agent_id: string | null
  message_id?: string
  message_snippet?: string
  url?: string
  title?: string
  media_kind?: 'image' | 'video'
  document?: {
    id: string
    conversation_id: string
    campaign_id: string | null
    resource_id?: string | null
    document_type: string
    title: string | null
    content: Record<string, unknown>
    metadata?: Record<string, unknown>
    created_at: string
    updated_at: string
  }
}

export async function fetchConversationAssets(
  scope: ConversationAssetsScope,
  options?: { agent_id?: string; campaign_id?: string; limit?: number; before?: string },
): Promise<{ items: ConversationAssetFeedItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams()
  params.set('scope', scope)
  if (options?.agent_id) params.set('agent_id', options.agent_id)
  if (options?.campaign_id) params.set('campaign_id', options.campaign_id)
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.before) params.set('before', options.before)
  return backendGet<{ items: ConversationAssetFeedItem[]; nextCursor: string | null }>(
    `/api/conversations/assets?${params.toString()}`,
  )
}

export async function setConversationPinned(id: string, pinned: boolean): Promise<Conversation> {
  if (isPendingConversationId(id)) {
    throw new Error('Cannot pin a pending conversation')
  }
  return backendPatch<Conversation>(`/api/conversations/${id}`, { metadata: { pinned } })
}

export async function renameConversation(id: string, title: string): Promise<void> {
  if (isPendingConversationId(id)) return
  await backendPatch(`/api/conversations/${id}`, { title })
}

export async function autoTitleConversation(
  id: string,
  userMessage?: string,
): Promise<{ title: string; updated: boolean }> {
  if (isPendingConversationId(id)) {
    return { title: '', updated: false }
  }
  return backendPost<{ title: string; updated: boolean }>(`/api/conversations/${id}/auto-title`, {
    ...(userMessage ? { user_message: userMessage } : {}),
  })
}

export async function setConversationArchived(
  id: string,
  archived: boolean,
): Promise<Conversation> {
  if (isPendingConversationId(id)) {
    throw new Error('Cannot archive a pending conversation')
  }
  return backendPatch<Conversation>(`/api/conversations/${id}`, {
    status: archived ? 'archived' : 'active',
  })
}

export async function assignConversationCampaign(
  conversationId: string,
  campaignId: string | null,
): Promise<Conversation> {
  if (isPendingConversationId(conversationId)) {
    throw new Error('Cannot assign campaign to a pending conversation')
  }
  return backendPatch<Conversation>(`/api/conversations/${conversationId}`, {
    campaign_id: campaignId,
  })
}

export async function assignConversationSpace(
  conversationId: string,
  spaceId: string | null,
): Promise<Conversation> {
  if (isPendingConversationId(conversationId)) {
    throw new Error('Cannot assign space to a pending conversation')
  }
  return backendPatch<Conversation>(`/api/conversations/${conversationId}`, {
    metadata: { space_id: spaceId },
  })
}

/** Assign campaign + space in one patch (chat header scope picker). */
export async function assignConversationScope(
  conversationId: string,
  campaignId: string | null,
  spaceId: string | null,
): Promise<Conversation> {
  if (isPendingConversationId(conversationId)) {
    throw new Error('Cannot assign scope to a pending conversation')
  }
  return backendPatch<Conversation>(`/api/conversations/${conversationId}`, {
    campaign_id: campaignId,
    metadata: { space_id: spaceId },
  })
}

export async function deleteConversation(id: string): Promise<void> {
  return backendDelete(`/api/conversations/${id}`)
}

export async function fetchConversationShares(
  conversationId: string,
): Promise<{ effective_level: ConversationShareLevel; shares: ConversationShareRecord[] }> {
  return backendGet<{ effective_level: ConversationShareLevel; shares: ConversationShareRecord[] }>(
    `/api/conversations/${conversationId}/shares`,
  )
}

export async function upsertConversationShare(
  conversationId: string,
  input: {
    entity_type: ConversationShareEntityType
    entity_id: string
    level: ConversationShareLevel
  },
): Promise<ConversationShareRecord> {
  return backendPost<ConversationShareRecord>(`/api/conversations/${conversationId}/shares`, input)
}

export async function deleteConversationShare(
  conversationId: string,
  shareId: string,
): Promise<{ deleted: boolean }> {
  return backendDelete<{ deleted: boolean }>(
    `/api/conversations/${conversationId}/shares/${shareId}`,
  )
}

async function fetchConversationMessageIds(conversationId: string): Promise<Array<{ id: string }>> {
  return backendGet<Array<{ id: string }>>(`/api/conversations/${conversationId}/messages`)
}

export async function duplicateConversation(
  conversationId: string,
  options?: { campaignId?: string | null; titlePrefix?: string },
): Promise<Conversation> {
  if (isPendingConversationId(conversationId)) {
    throw new Error('Cannot duplicate a pending conversation')
  }
  const messages = await fetchConversationMessageIds(conversationId)
  const lastMessage = messages[messages.length - 1]
  if (!lastMessage) throw new Error('No messages to duplicate')
  const result = await backendPost<{ conversation: Conversation; messageCount: number }>(
    `/api/conversations/${conversationId}/fork`,
    { message_id: lastMessage.id },
  )
  let newConversation = result.conversation
  const patch: Record<string, unknown> = {}
  if (options?.campaignId !== undefined) patch.campaign_id = options.campaignId
  const desiredTitle = options?.titlePrefix
    ? `${options.titlePrefix}${(newConversation.title ?? '').replace(/^Fork of\s+/i, '')}`.trim()
    : null
  if (desiredTitle) patch.title = desiredTitle
  if (Object.keys(patch).length > 0) {
    newConversation = await backendPatch<Conversation>(
      `/api/conversations/${newConversation.id}`,
      patch,
    )
  }
  return newConversation
}
