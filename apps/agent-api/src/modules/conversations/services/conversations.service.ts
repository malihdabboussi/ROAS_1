import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import { ConversationsRepository } from '../repositories/conversations.repository'
import { MessagesRepository } from '../repositories/messages.repository'
import { ConversationPermissionsService } from './conversation-permissions.service'

/**
 * Conversations Service (Layer 2)
 *
 * Business logic for conversation + message management.
 * Calls repositories for data access — never touches DB directly.
 */
@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationsRepo: ConversationsRepository,
    private readonly messagesRepo: MessagesRepository,
    private readonly permissionsService: ConversationPermissionsService,
  ) {}

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  }

  private normalizeId(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  private isMcpSourcedConversation(conversation: Record<string, unknown>): boolean {
    const metadata = this.asRecord(conversation.metadata)
    return metadata?.source === 'mcp'
  }

  private extractLastResponseChainPointer(
    messages: Array<Record<string, unknown>>,
  ): Record<string, unknown> | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      if ((message.role as string | undefined) !== 'assistant') continue
      const metadata = this.asRecord(message.metadata)
      const chain = this.asRecord(metadata?.response_chain)
      const providerResponseId = this.normalizeId(chain?.provider_response_id)
      const openClawResponseId = this.normalizeId(chain?.openclaw_response_id)
      const previousResponseId = this.normalizeId(chain?.previous_response_id)
      if (!providerResponseId && !openClawResponseId) continue
      return {
        ...(openClawResponseId ? { openclaw_response_id: openClawResponseId } : {}),
        ...(providerResponseId ? { provider_response_id: providerResponseId } : {}),
        ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
        ...(this.normalizeId(message.id) ? { message_id: this.normalizeId(message.id) } : {}),
        updated_at: new Date().toISOString(),
      }
    }
    return null
  }

  async listConversations(
    supabase: SupabaseClient,
    userId: string,
    filters?: { campaign_id?: string; agent_id?: string; include_mcp?: boolean },
    orgId?: string | null,
  ) {
    const conversations = await this.conversationsRepo.findByUserId(supabase, userId, {
      ...filters,
      orgId: orgId !== undefined ? orgId : undefined,
    })
    if (filters?.include_mcp) return conversations
    return conversations.filter((conversation) => !this.isMcpSourcedConversation(conversation))
  }

  private async getConversationForRead(
    supabase: SupabaseClient,
    conversationId: string,
    userId: string,
    orgId?: string | null,
  ) {
    if (orgId) {
      return this.conversationsRepo.findByIdOrgScoped(supabase, conversationId, orgId)
    }
    return this.conversationsRepo.findByIdScoped(supabase, conversationId, userId, orgId)
  }

  async createConversation(
    supabase: SupabaseClient,
    userId: string,
    data: {
      title?: string
      campaign_id?: string
      agent_id?: string
      contact_email?: string
      metadata?: Record<string, unknown>
    },
    orgId?: string | null,
  ) {
    const normalizedContactEmail =
      typeof data.contact_email === 'string' ? data.contact_email.trim().toLowerCase() : ''
    let contactId: string | null = null
    if (normalizedContactEmail) {
      contactId = await this.conversationsRepo.findContactIdByEmail(supabase, {
        userId,
        email: normalizedContactEmail,
        orgId,
      })
    }

    const metadata =
      data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
        ? { ...data.metadata }
        : {}
    if (normalizedContactEmail) {
      metadata.visitor_email = normalizedContactEmail
    }

    return this.conversationsRepo.create(supabase, {
      user_id: userId,
      title: data.title ?? 'New Conversation',
      campaign_id: data.campaign_id ?? null,
      agent_id: data.agent_id ?? null,
      contact_id: contactId,
      metadata,
      org_id: orgId ?? null,
    })
  }

  async getMessages(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    options?: { before?: string; limit?: number },
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessConversation(
      supabase,
      userId,
      orgRole,
      conversationId,
      'view',
      orgId,
    )
    const conversation = await this.getConversationForRead(supabase, conversationId, userId, orgId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    return this.messagesRepo.findByConversationId(supabase, conversationId, options)
  }

  async patchMessageMetadata(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    messageId: string,
    metadataPatch: Record<string, unknown>,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessConversation(
      supabase,
      userId,
      orgRole,
      conversationId,
      'edit',
      orgId,
    )
    const conversation = await this.getConversationForRead(supabase, conversationId, userId, orgId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    const existing = await this.messagesRepo.findById(supabase, messageId)
    if (!existing || (existing.conversation_id as string) !== conversationId) {
      throw new Error('Message not found')
    }

    const currentMeta = (existing.metadata as Record<string, unknown>) ?? {}
    const merged = { ...currentMeta, ...metadataPatch }
    await this.messagesRepo.update(supabase, messageId, { metadata: merged })
    return { success: true }
  }

  async deleteConversation(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessConversation(
      supabase,
      userId,
      orgRole,
      conversationId,
      'admin',
      orgId,
    )
    const conversation = await this.getConversationForRead(supabase, conversationId, userId, orgId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    await this.conversationsRepo.delete(supabase, conversationId)
  }

  async updateConversation(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    data: {
      title?: string
      status?: string
      campaign_id?: string | null
      default_model_id?: string | null
      metadata?: Record<string, unknown>
    },
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessConversation(
      supabase,
      userId,
      orgRole,
      conversationId,
      'edit',
      orgId,
    )
    const conversation = await this.getConversationForRead(supabase, conversationId, userId, orgId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    if (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)) {
      const { metadata: metadataPatch, ...rest } = data
      const currentMeta = this.asRecord(conversation.metadata) ?? {}
      const merged = { ...currentMeta, ...metadataPatch }
      return this.conversationsRepo.update(supabase, conversationId, { ...rest, metadata: merged })
    }

    return this.conversationsRepo.update(supabase, conversationId, data)
  }

  async forkConversation(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    messageId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessConversation(
      supabase,
      userId,
      orgRole,
      conversationId,
      'view',
      orgId,
    )
    const conversation = await this.getConversationForRead(supabase, conversationId, userId, orgId)
    if (!conversation) throw new Error('Conversation not found')

    const messagesToCopy = await this.messagesRepo.findUpToMessage(
      supabase,
      conversationId,
      messageId,
    )
    if (messagesToCopy.length === 0) throw new Error('No messages to fork')

    const originalTitle = (conversation.title as string) ?? 'Conversation'
    const originalMetadata = this.asRecord(conversation.metadata) ?? {}
    const newConversation = await this.conversationsRepo.create(supabase, {
      user_id: userId,
      title: `Fork of ${originalTitle}`,
      campaign_id: (conversation.campaign_id as string) ?? null,
      agent_id: (conversation.agent_id as string) ?? null,
      metadata: originalMetadata,
      org_id: orgId ?? null,
    })

    const forkedFrom = {
      conversation_id: conversationId,
      message_id: messageId,
      forked_at: new Date().toISOString(),
    }
    await this.conversationsRepo.update(supabase, newConversation.id as string, {
      forked_from: forkedFrom,
      default_model_id: (conversation.default_model_id as string) ?? null,
    })

    const newConvId = newConversation.id as string
    const records = messagesToCopy.map((m) => ({
      conversation_id: newConvId,
      role: m.role as string,
      content: (m.content as string | null) ?? null,
      content_blocks: m.content_blocks as unknown,
      metadata: (m.metadata as Record<string, unknown>) ?? undefined,
      model_id: (m.model_id as string) ?? undefined,
      created_at: m.created_at as string,
    }))

    await this.messagesRepo.bulkCreate(supabase, records)

    return {
      conversation: { ...newConversation, forked_from: forkedFrom },
      messageCount: messagesToCopy.length,
    }
  }

  async deleteMessagesFrom(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    messageId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    await this.permissionsService.assertCanAccessConversation(
      supabase,
      userId,
      orgRole,
      conversationId,
      'edit',
      orgId,
    )
    const conversation = await this.getConversationForRead(supabase, conversationId, userId, orgId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    await this.messagesRepo.deleteFrom(supabase, conversationId, messageId)
    const remaining = await this.messagesRepo.findByConversationId(supabase, conversationId, {
      limit: 200,
    })
    const currentMeta = this.asRecord(conversation.metadata) ?? {}
    const { response_chain_last: _oldPointer, ...restMeta } = currentMeta
    const nextPointer = this.extractLastResponseChainPointer(
      remaining as Array<Record<string, unknown>>,
    )
    await this.conversationsRepo.update(supabase, conversationId, {
      metadata: {
        ...restMeta,
        ...(nextPointer ? { response_chain_last: nextPointer } : {}),
      },
    })
  }
}
