import { ForbiddenException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient, type RequestScope } from '@vibey/api-shared'
import { ChannelsService } from '../../channels/services/channels.service'
import { DmService } from '../../dm/services/dm.service'
import type { ListRecentCommunicationsQuery } from '../dto'
import { HomeCommunicationsRepository } from '../repositories/home-communications.repository'

export type HomeRecentCommunicationKind = 'channel' | 'dm'

export interface HomeRecentCommunicationItem {
  kind: HomeRecentCommunicationKind
  message_id: string
  thread_id: string
  title: string
  preview: string
  sender_label: string | null
  occurred_at: string
  avatar_url: string | null
  channel_metadata: Record<string, unknown> | null
  partner_user_id: string | null
  unread: number
}

type ChannelRef = {
  id: string
  name: string
  org_id: string
  metadata: Record<string, unknown> | null
}

type DmConversationRef = {
  id: string
  org_id: string
  user_low: string
  user_high: string
}

type ChannelMessageRow = {
  id: string
  channel_id: string
  content: string | null
  created_at: string
  sender_id: string
  sender_type: 'user' | 'agent' | 'system'
  channels: ChannelRef
}

type DmMessageRow = {
  id: string
  conversation_id: string
  content: string | null
  created_at: string
  sender_id: string
  human_dm_conversations: DmConversationRef
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function firstJoinedRow<T>(
  value: unknown,
  parse: (row: Record<string, unknown>) => T | null,
): T | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const row = asRecord(item)
      if (!row) continue
      const parsed = parse(row)
      if (parsed) return parsed
    }
    return null
  }

  const row = asRecord(value)
  return row ? parse(row) : null
}

function parseChannelRef(row: Record<string, unknown>): ChannelRef | null {
  const id = typeof row.id === 'string' ? row.id : null
  const name = typeof row.name === 'string' ? row.name : null
  const orgId = typeof row.org_id === 'string' ? row.org_id : null
  if (!id || !name || !orgId) return null
  const metadata = asRecord(row.metadata)
  return { id, name, org_id: orgId, metadata }
}

function parseDmConversationRef(row: Record<string, unknown>): DmConversationRef | null {
  const id = typeof row.id === 'string' ? row.id : null
  const orgId = typeof row.org_id === 'string' ? row.org_id : null
  const userLow = typeof row.user_low === 'string' ? row.user_low : null
  const userHigh = typeof row.user_high === 'string' ? row.user_high : null
  if (!id || !orgId || !userLow || !userHigh) return null
  return { id, org_id: orgId, user_low: userLow, user_high: userHigh }
}

function parseChannelMessageRow(row: Record<string, unknown>): ChannelMessageRow | null {
  const id = typeof row.id === 'string' ? row.id : null
  const channelId = typeof row.channel_id === 'string' ? row.channel_id : null
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null
  const senderId = typeof row.sender_id === 'string' ? row.sender_id : null
  const senderType = row.sender_type
  const channel = firstJoinedRow(row.channels, parseChannelRef)
  if (!id || !channelId || !createdAt || !senderId || !channel) return null
  if (senderType !== 'user' && senderType !== 'agent' && senderType !== 'system') return null
  return {
    id,
    channel_id: channelId,
    content: typeof row.content === 'string' ? row.content : null,
    created_at: createdAt,
    sender_id: senderId,
    sender_type: senderType,
    channels: channel,
  }
}

function parseDmMessageRow(row: Record<string, unknown>): DmMessageRow | null {
  const id = typeof row.id === 'string' ? row.id : null
  const conversationId = typeof row.conversation_id === 'string' ? row.conversation_id : null
  const createdAt = typeof row.created_at === 'string' ? row.created_at : null
  const senderId = typeof row.sender_id === 'string' ? row.sender_id : null
  const conversation = firstJoinedRow(row.human_dm_conversations, parseDmConversationRef)
  if (!id || !conversationId || !createdAt || !senderId || !conversation) return null
  return {
    id,
    conversation_id: conversationId,
    content: typeof row.content === 'string' ? row.content : null,
    created_at: createdAt,
    sender_id: senderId,
    human_dm_conversations: conversation,
  }
}

function parseChannelMessages(data: unknown): ChannelMessageRow[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((row) => {
    const parsed = parseChannelMessageRow(asRecord(row) ?? {})
    return parsed ? [parsed] : []
  })
}

function parseDmMessages(data: unknown): DmMessageRow[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((row) => {
    const parsed = parseDmMessageRow(asRecord(row) ?? {})
    return parsed ? [parsed] : []
  })
}

function truncatePreview(raw: string | null | undefined, max = 120): string {
  const text = (raw ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}

@Injectable()
export class HomeCommunicationsService {
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly channelsService: ChannelsService,
    private readonly dmService: DmService,
    private readonly homeCommunicationsRepository: HomeCommunicationsRepository,
  ) {}

  async listRecent(
    supabase: SupabaseClient,
    scope: RequestScope,
    query: ListRecentCommunicationsQuery,
  ): Promise<{ items: HomeRecentCommunicationItem[] }> {
    if (!scope.orgId) throw new ForbiddenException('Recent messages require an organisation.')

    const fetchLimit = Math.min(query.limit * 3, 50)

    const membershipResult = await this.homeCommunicationsRepository.listMemberChannelIds(
      supabase,
      scope.userId,
    )

    if (membershipResult.error) {
      throw new Error(`DB error: ${membershipResult.error.message}`)
    }

    const memberChannelIds = [
      ...new Set(
        ((membershipResult.data ?? []) as Array<{ channel_id: unknown }>)
          .map((row) => (typeof row.channel_id === 'string' ? row.channel_id : null))
          .filter((id): id is string => Boolean(id)),
      ),
    ]

    const [channelMessagesResult, dmMessagesResult, channelUnreadRows, dmUnreadRows] =
      await Promise.all([
        this.homeCommunicationsRepository.listChannelMessages(supabase, {
          orgId: scope.orgId,
          channelIds: memberChannelIds,
          limit: fetchLimit,
        }),
        this.homeCommunicationsRepository.listDmMessages(supabase, {
          orgId: scope.orgId,
          limit: fetchLimit,
        }),
        this.channelsService.getUnreadCounts(supabase, scope),
        this.dmService.getUnreadCounts(supabase, scope),
      ])

    if (channelMessagesResult.error) {
      throw new Error(`DB error: ${channelMessagesResult.error.message}`)
    }
    if (dmMessagesResult.error) throw new Error(`DB error: ${dmMessagesResult.error.message}`)

    const channelUnread = channelUnreadRows.counts ?? {}
    const dmUnread = dmUnreadRows.counts ?? {}

    const channelMessages = parseChannelMessages(channelMessagesResult.data)
    const dmMessages = parseDmMessages(dmMessagesResult.data)

    const participantDmMessages = dmMessages.filter((row) => {
      const conv = row.human_dm_conversations
      return conv.user_low === scope.userId || conv.user_high === scope.userId
    })

    const senderIds = new Set<string>()
    for (const row of channelMessages) {
      if (row.sender_type === 'user') senderIds.add(row.sender_id)
    }
    for (const row of participantDmMessages) senderIds.add(row.sender_id)

    const partnerIds = new Set<string>()
    for (const row of participantDmMessages) {
      const conv = row.human_dm_conversations
      partnerIds.add(conv.user_low === scope.userId ? conv.user_high : conv.user_low)
    }

    const profileIds = [...new Set([...senderIds, ...partnerIds])]
    const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>()

    if (profileIds.length > 0) {
      const { data, error } = await this.homeCommunicationsRepository.listProfiles(
        this.svc.client,
        profileIds,
      )
      if (error) throw new Error(`DB error: ${error.message}`)
      for (const profile of (data ?? []) as Array<{
        id: string
        full_name: string | null
        avatar_url: string | null
      }>) {
        profileMap.set(profile.id, profile)
      }
    }

    const resolveSenderLabel = (
      senderType: ChannelMessageRow['sender_type'],
      senderId: string,
    ): string | null => {
      if (senderType === 'system') return 'System'
      if (senderType === 'agent') {
        const key = senderId.trim()
        return key.length > 0 ? key.charAt(0).toUpperCase() + key.slice(1) : 'Agent'
      }
      return profileMap.get(senderId)?.full_name ?? 'Someone'
    }

    const merged: HomeRecentCommunicationItem[] = []

    for (const row of channelMessages) {
      const channel = row.channels
      merged.push({
        kind: 'channel',
        message_id: row.id,
        thread_id: row.channel_id,
        title: channel.name,
        preview: truncatePreview(row.content),
        sender_label: resolveSenderLabel(row.sender_type, row.sender_id),
        occurred_at: row.created_at,
        avatar_url: null,
        channel_metadata: channel.metadata,
        partner_user_id: null,
        unread: channelUnread[row.channel_id] ?? 0,
      })
    }

    for (const row of participantDmMessages) {
      const conv = row.human_dm_conversations
      const partnerId = conv.user_low === scope.userId ? conv.user_high : conv.user_low
      const partner = profileMap.get(partnerId)
      merged.push({
        kind: 'dm',
        message_id: row.id,
        thread_id: row.conversation_id,
        title: (partner?.full_name ?? '').trim() || 'Direct message',
        preview: truncatePreview(row.content),
        sender_label:
          row.sender_id === scope.userId
            ? 'You'
            : (profileMap.get(row.sender_id)?.full_name ?? 'Someone'),
        occurred_at: row.created_at,
        avatar_url: partner?.avatar_url ?? null,
        channel_metadata: null,
        partner_user_id: partnerId,
        unread: dmUnread[row.conversation_id] ?? 0,
      })
    }

    merged.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

    return { items: merged.slice(0, query.limit) }
  }
}
