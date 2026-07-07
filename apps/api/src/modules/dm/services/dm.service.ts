import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient, type RequestScope } from '@vibey/api-shared'
import {
  HumanDmRepository,
  type HumanDmConversationRow,
  type HumanDmMessageRow,
  type HumanDmPartnerProfileRow,
} from '../repositories/human-dm.repository'

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

function dmPartnerId(conversation: HumanDmConversationRow, userId: string): string {
  return conversation.user_low === userId ? conversation.user_high : conversation.user_low
}

@Injectable()
export class DmService {
  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repo: HumanDmRepository,
  ) {}

  // ── Open / list ──────────────────────────────────────────────

  async openDm(supabase: SupabaseClient, scope: RequestScope, targetUserId: string) {
    if (!scope.orgId) throw new ForbiddenException('DMs are only available within an organisation.')
    if (targetUserId === scope.userId)
      throw new ForbiddenException('You cannot open a DM with yourself.')

    const targetMember = await this.repo.findActiveOrgMember(supabase, scope.orgId, targetUserId)
    if (!targetMember) {
      throw new NotFoundException('Target user is not an active member of your organisation.')
    }

    const existing = await this.repo.findConversationByPair(
      supabase,
      scope.orgId,
      scope.userId,
      targetUserId,
    )
    if (existing) return { conversation_id: existing.id, created: false }

    const created = await this.repo.createConversation(
      supabase,
      scope.orgId,
      scope.userId,
      targetUserId,
    )
    return { conversation_id: created.id, created: true }
  }

  async listDms(supabase: SupabaseClient, scope: RequestScope): Promise<DmConversation[]> {
    if (!scope.orgId) return []

    const conversations = await this.repo.listConversationsForUser(
      supabase,
      scope.userId,
      scope.orgId,
    )
    if (!conversations.length) return []

    const partnerIds = conversations.map((c) =>
      c.user_low === scope.userId ? c.user_high : c.user_low,
    )
    const uniquePartnerIds = [...new Set(partnerIds)]

    const [profiles, orgMembers] = await Promise.all([
      this.repo.listPartnerProfiles(this.svc.client, uniquePartnerIds),
      this.repo.listActiveOrgMemberRoles(this.svc.client, scope.orgId, uniquePartnerIds),
    ])

    const profileMap = new Map<string, DmPartnerProfile>()
    for (const p of profiles as HumanDmPartnerProfileRow[]) profileMap.set(p.id, p)

    const orgRoleMap = new Map<string, string>()
    for (const om of orgMembers) {
      orgRoleMap.set(om.user_id, om.role)
    }

    const result: DmConversation[] = []
    for (const c of conversations) {
      const partnerId = c.user_low === scope.userId ? c.user_high : c.user_low
      const profile = profileMap.get(partnerId)
      if (!profile) continue
      result.push({
        conversation_id: c.id,
        partner: profile,
        org_role: orgRoleMap.get(partnerId) ?? null,
        last_message_preview: c.last_message_preview,
        last_message_at: c.last_message_at,
      })
    }
    return result
  }

  // ── Messages ─────────────────────────────────────────────────

  async listMessages(
    supabase: SupabaseClient,
    scope: RequestScope,
    conversationId: string,
    opts: { limit?: number; before?: string },
  ): Promise<DmMessage[]> {
    await this.assertParticipant(supabase, scope, conversationId)
    const rows = await this.repo.listMessages(
      supabase,
      conversationId,
      opts.limit ?? 100,
      opts.before,
    )
    return rows.map(this.mapMessage)
  }

  async sendMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    conversationId: string,
    payload: {
      content?: string
      content_blocks?: Array<Record<string, unknown>>
      metadata?: Record<string, unknown>
      attachments?: string[]
    },
  ): Promise<DmMessage> {
    const conversation = await this.assertParticipant(supabase, scope, conversationId)
    const metadata: Record<string, unknown> = { ...(payload.metadata ?? {}) }
    if (payload.attachments?.length) {
      metadata.attachments = payload.attachments
    }
    const row = await this.repo.createMessage(supabase, {
      conversation_id: conversationId,
      sender_id: scope.userId,
      content: payload.content?.trim() || null,
      content_blocks: payload.content_blocks ?? null,
      metadata,
    })
    await this.createMessageNotification(supabase, scope, conversation, row)
    return this.mapMessage(row)
  }

  async editMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    conversationId: string,
    messageId: string,
    content: string,
  ): Promise<DmMessage> {
    await this.assertParticipant(supabase, scope, conversationId)
    const existing = await this.repo.findMessageById(supabase, conversationId, messageId)
    if (!existing) throw new NotFoundException('Message not found.')
    if (existing.sender_id !== scope.userId)
      throw new ForbiddenException('Cannot edit this message.')
    const updated = await this.repo.updateMessage(supabase, messageId, { content })
    return this.mapMessage(updated)
  }

  async deleteMessage(
    supabase: SupabaseClient,
    scope: RequestScope,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    await this.assertParticipant(supabase, scope, conversationId)
    const existing = await this.repo.findMessageById(supabase, conversationId, messageId)
    if (!existing) throw new NotFoundException('Message not found.')
    if (existing.sender_id !== scope.userId)
      throw new ForbiddenException('Cannot delete this message.')
    await this.repo.deleteMessage(supabase, messageId)
  }

  async markRead(
    supabase: SupabaseClient,
    scope: RequestScope,
    conversationId: string,
  ): Promise<void> {
    await this.assertParticipant(supabase, scope, conversationId)
    await this.repo.markRead(supabase, conversationId, scope.userId)
  }

  async getUnreadCounts(supabase: SupabaseClient, scope: RequestScope) {
    const rows = await this.repo.getUnreadCounts(supabase, scope.userId)
    const counts: Record<string, number> = {}
    for (const row of rows) {
      if (row.unread > 0) counts[row.conversation_id] = row.unread
    }
    return { counts }
  }

  // ── Helpers ──────────────────────────────────────────────────

  private mapMessage = (row: HumanDmMessageRow): DmMessage => ({
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    content: row.content,
    content_blocks: row.content_blocks,
    metadata: row.metadata,
    edited_at: row.edited_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  })

  private async assertParticipant(
    supabase: SupabaseClient,
    scope: RequestScope,
    conversationId: string,
  ): Promise<HumanDmConversationRow> {
    const conv = await this.repo.findConversationById(supabase, conversationId)
    if (!conv) throw new NotFoundException('Conversation not found.')
    if (conv.user_low !== scope.userId && conv.user_high !== scope.userId) {
      throw new ForbiddenException('You are not a participant in this conversation.')
    }
    return conv
  }

  private async createMessageNotification(
    supabase: SupabaseClient,
    scope: RequestScope,
    conversation: HumanDmConversationRow,
    message: HumanDmMessageRow,
  ): Promise<void> {
    const recipientId = dmPartnerId(conversation, scope.userId)
    const senderProfile = await this.repo.lookupSenderProfile(supabase, scope.userId)
    const senderName = senderProfile?.full_name?.trim() || 'Someone'
    const preview = message.content?.trim() || 'Sent a message'
    const actionUrl = `/team?dm=${encodeURIComponent(scope.userId)}`

    await this.repo.createNotification(supabase, {
      user_id: recipientId,
      org_id: scope.orgId,
      type: 'human_dm_message',
      title: `${senderName} sent you a DM`,
      body: preview,
      action_url: actionUrl,
      channel_sent: { in_app: true },
      metadata: {
        conversation_id: conversation.id,
        message_id: message.id,
        sender_id: scope.userId,
      },
    })
  }
}
