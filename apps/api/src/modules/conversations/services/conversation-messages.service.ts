import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import type { CreateMissionReceiptDto } from '../dto/create-mission-receipt.dto'
import { ConversationsRepository } from '../repositories/conversations.repository'
import { MessagesRepository } from '../repositories/messages.repository'
import { ConversationPermissionsService } from './conversation-permissions.service'

@Injectable()
export class ConversationMessagesService {
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
      throw new NotFoundException('Conversation not found')
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
      throw new NotFoundException('Conversation not found')
    }

    const existing = await this.messagesRepo.findById(supabase, messageId)
    if (!existing || (existing.conversation_id as string) !== conversationId) {
      throw new NotFoundException('Message not found')
    }

    const currentMeta = (existing.metadata as Record<string, unknown>) ?? {}
    const merged = { ...currentMeta, ...metadataPatch }
    await this.messagesRepo.update(supabase, messageId, { metadata: merged })
    return { success: true }
  }

  async createMissionReceipt(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    input: CreateMissionReceiptDto,
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
    if (!conversation) throw new NotFoundException('Conversation not found')

    const existing = await this.messagesRepo.findById(supabase, input.mission_id)
    if (existing) {
      const metadata = this.asRecord(existing.metadata)
      if (
        existing.conversation_id === conversationId &&
        metadata?.quick_mission_receipt === true &&
        metadata.mission_id === input.mission_id
      ) {
        return existing
      }
      throw new ConflictException('Mission receipt identifier is already in use')
    }

    const content = `Quick Mission started: **${input.mission_title}**.`
    return this.messagesRepo.create(supabase, {
      id: input.mission_id,
      conversation_id: conversationId,
      role: 'assistant',
      content,
      metadata: {
        quick_mission_receipt: true,
        mission_id: input.mission_id,
        content_blocks_ordered: [
          {
            type: 'text',
            id: `quick-mission-text-${input.mission_id}`,
            content,
          },
          {
            type: 'artifact_preview',
            id: `quick-mission-card-${input.mission_id}`,
            artifactType: 'mission',
            artifactId: input.mission_id,
            ...(input.space_id ? { spaceId: input.space_id } : {}),
            name: input.mission_title,
            subtitle: 'Started from this chat',
            status: 'Started',
          },
        ],
      },
    })
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
    if (!conversation) throw new NotFoundException('Conversation not found')

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
      throw new NotFoundException('Conversation not found')
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
