import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'

export interface DmPartnerProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  status_emoji: string | null
  status_text: string | null
  timezone: string | null
  functional_role: string | null
}

export interface DmConversation {
  conversation_id: string
  partner: DmPartnerProfile
  org_role: string | null
  last_message_preview: string | null
  last_message_at: string | null
}

export interface DmMessage {
  id: string
  conversation_id: string
  sender_id: string
  content: string | null
  content_blocks: Array<Record<string, unknown>> | null
  metadata: Record<string, unknown> | null
  edited_at: string | null
  created_at: string
  updated_at: string
}

export const dmService = {
  async openDm(targetUserId: string): Promise<{ conversation_id: string; created: boolean }> {
    return backendPost<{ conversation_id: string; created: boolean }>('/api/dm/open', {
      target_user_id: targetUserId,
    })
  },

  async listDms(): Promise<DmConversation[]> {
    const res = await backendGet<{ dms: DmConversation[] }>('/api/dm/list')
    return res.dms
  },

  async getUnreadCounts(): Promise<Record<string, number>> {
    const res = await backendGet<{ counts: Record<string, number> }>('/api/dm/unread-counts')
    return res.counts
  },

  async listMessages(
    conversationId: string,
    opts: { limit?: number; before?: string } = {},
  ): Promise<DmMessage[]> {
    const params = new URLSearchParams()
    if (opts.limit) params.set('limit', String(opts.limit))
    if (opts.before) params.set('before', opts.before)
    const qs = params.toString()
    const res = await backendGet<{ messages: DmMessage[] }>(
      `/api/dm/${conversationId}/messages${qs ? `?${qs}` : ''}`,
    )
    return res.messages
  },

  async sendMessage(
    conversationId: string,
    payload: {
      content?: string
      content_blocks?: Array<Record<string, unknown>>
      metadata?: Record<string, unknown>
      attachments?: string[]
    },
  ): Promise<DmMessage> {
    const res = await backendPost<{ message: DmMessage }>(
      `/api/dm/${conversationId}/messages`,
      payload,
    )
    return res.message
  },

  async editMessage(
    conversationId: string,
    messageId: string,
    content: string,
  ): Promise<DmMessage> {
    const res = await backendPatch<{ message: DmMessage }>(
      `/api/dm/${conversationId}/messages/${messageId}`,
      { content },
    )
    return res.message
  },

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await backendDelete(`/api/dm/${conversationId}/messages/${messageId}`)
  },

  async markRead(conversationId: string): Promise<void> {
    await backendPost(`/api/dm/${conversationId}/read`, {})
  },

  async updateStatus(payload: {
    status_emoji?: string | null
    status_text?: string | null
  }): Promise<void> {
    await backendPatch('/api/profile/status', payload)
  },
}
