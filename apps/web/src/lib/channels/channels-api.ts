import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import type { ChannelMember, ChannelMention } from '@/lib/channels/channel-types'

export type { ChannelMember, ChannelMention } from '@/lib/channels/channel-types'

export interface Channel {
  id: string
  org_id: string | null
  user_id: string
  name: string
  description: string | null
  is_private: boolean
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  can_manage?: boolean
  is_favorite?: boolean
}

export interface ChannelMessage {
  id: string
  channel_id: string
  sender_type: 'user' | 'agent' | 'system'
  sender_id: string
  content: string | null
  content_blocks: Array<Record<string, unknown>> | null
  metadata: {
    mentions?: ChannelMention[]
    [key: string]: unknown
  } | null
  reply_to_id: string | null
  thread_name: string | null
  pinned: boolean
  pinned_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateChannelPayload {
  name: string
  description?: string | null
  is_private?: boolean
}

export interface UpdateChannelPayload {
  name?: string
  description?: string | null
  is_private?: boolean
  icon?: string
  icon_color?: string
  /** Campaign context binding for agents in this channel; `null` clears it. */
  default_campaign_id?: string | null
}

export interface AddChannelMemberPayload {
  member_type: 'user' | 'agent'
  user_id?: string
  agent_key?: string
  role?: 'admin' | 'edit' | 'view'
}

export interface SendChannelMessagePayload {
  content?: string
  content_blocks?: Array<Record<string, unknown>>
  mentions?: ChannelMention[]
  attachments?: string[]
  reply_to_id?: string
  /** Active space context — server resolves `campaign_id` and threads scope
   *  to the channel-agent runtime (parity with Vibey chat). */
  space_id?: string
}

export interface StartBrainstormPayload {
  agent_keys: string[]
  /** Active space context for scoping brainstorm threads to the space campaign. */
  space_id?: string
}

export const channelsService = {
  async listChannels(): Promise<Channel[]> {
    const response = await backendGet<{ channels: Channel[] }>('/api/channels')
    return response.channels
  },

  async getUnreadCounts(): Promise<Record<string, number>> {
    const response = await backendGet<{ counts: Record<string, number> }>(
      '/api/channels/unread-counts',
    )
    return response.counts
  },

  async markChannelRead(channelId: string): Promise<void> {
    await backendPost<{ success: boolean }>(`/api/channels/${channelId}/read`, {})
  },

  async createChannel(
    payload: CreateChannelPayload,
  ): Promise<{ channel: Channel; members: ChannelMember[] }> {
    return backendPost<{ channel: Channel; members: ChannelMember[] }>('/api/channels', payload)
  },

  async getChannel(channelId: string): Promise<{ channel: Channel; members: ChannelMember[] }> {
    return backendGet<{ channel: Channel; members: ChannelMember[] }>(`/api/channels/${channelId}`)
  },

  async updateChannel(
    channelId: string,
    payload: UpdateChannelPayload,
  ): Promise<{ channel: Channel }> {
    return backendPatch<{ channel: Channel }>(`/api/channels/${channelId}`, payload)
  },

  async patchMessageBlocks(
    channelId: string,
    messageId: string,
    blocks: Array<Record<string, unknown>>,
  ): Promise<{ success: boolean }> {
    return backendPatch<{ success: boolean }>(
      `/api/channels/${channelId}/messages/${messageId}/metadata`,
      { content_blocks_ordered: blocks },
    )
  },

  async updateChannelUserState(
    channelId: string,
    patch: { is_favorite?: boolean },
  ): Promise<{ channel_id: string; is_favorite: boolean; updated_at: string }> {
    return backendPatch(`/api/channels/${channelId}/user-state`, patch)
  },

  async deleteChannel(channelId: string): Promise<{ success: boolean }> {
    return backendDelete<{ success: boolean }>(`/api/channels/${channelId}`)
  },

  async listMembers(channelId: string): Promise<ChannelMember[]> {
    const response = await backendGet<{ members: ChannelMember[] }>(
      `/api/channels/${channelId}/members`,
    )
    return response.members
  },

  async addMember(
    channelId: string,
    payload: AddChannelMemberPayload,
  ): Promise<{ member: ChannelMember }> {
    return backendPost<{ member: ChannelMember }>(`/api/channels/${channelId}/members`, payload)
  },

  async updateMemberRole(
    channelId: string,
    memberId: string,
    role: 'admin' | 'edit' | 'view',
  ): Promise<{ member: ChannelMember }> {
    return backendPatch<{ member: ChannelMember }>(
      `/api/channels/${channelId}/members/${memberId}`,
      {
        role,
      },
    )
  },

  async removeMember(channelId: string, memberId: string): Promise<{ success: boolean }> {
    return backendDelete<{ success: boolean }>(`/api/channels/${channelId}/members/${memberId}`)
  },

  async listMessages(
    channelId: string,
    params?: { before?: string; limit?: number },
  ): Promise<ChannelMessage[]> {
    const query = new URLSearchParams()
    if (params?.before) query.set('before', params.before)
    if (params?.limit) query.set('limit', String(params.limit))
    const suffix = query.toString() ? `?${query.toString()}` : ''

    const response = await backendGet<{ messages: ChannelMessage[] }>(
      `/api/channels/${channelId}/messages${suffix}`,
    )
    return response.messages
  },

  async sendMessage(
    channelId: string,
    payload: SendChannelMessagePayload,
  ): Promise<{ message: ChannelMessage }> {
    return backendPost<{ message: ChannelMessage }>(`/api/channels/${channelId}/messages`, payload)
  },

  async pinMessage(
    channelId: string,
    messageId: string,
    pinned: boolean,
  ): Promise<{ message: ChannelMessage }> {
    return backendPatch<{ message: ChannelMessage }>(
      `/api/channels/${channelId}/messages/${messageId}/pin`,
      { pinned },
    )
  },

  async editMessage(
    channelId: string,
    messageId: string,
    content: string,
  ): Promise<{ message: ChannelMessage }> {
    return backendPatch<{ message: ChannelMessage }>(
      `/api/channels/${channelId}/messages/${messageId}`,
      { content },
    )
  },

  async deleteMessage(channelId: string, messageId: string): Promise<{ success: boolean }> {
    return backendDelete<{ success: boolean }>(`/api/channels/${channelId}/messages/${messageId}`)
  },

  async startBrainstorm(
    channelId: string,
    payload: StartBrainstormPayload,
  ): Promise<{ message: ChannelMessage }> {
    return backendPost<{ message: ChannelMessage }>(
      `/api/channels/${channelId}/brainstorm`,
      payload,
    )
  },

  async renameThread(
    channelId: string,
    messageId: string,
    threadName: string | null,
  ): Promise<{ message: ChannelMessage }> {
    return backendPatch<{ message: ChannelMessage }>(
      `/api/channels/${channelId}/messages/${messageId}/rename`,
      { thread_name: threadName },
    )
  },

  async retryAgentInvocation(
    channelId: string,
    messageId: string,
    agentKey: string,
  ): Promise<{ accepted: boolean }> {
    return backendPost<{ accepted: boolean }>(
      `/api/channels/${channelId}/messages/${messageId}/retry-agent`,
      { agent_key: agentKey },
    )
  },
}
