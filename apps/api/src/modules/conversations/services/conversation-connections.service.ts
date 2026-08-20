import { Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import { ConversationConnectionsRepository } from '../repositories/conversation-connections.repository'
import { ConversationsRepository } from '../repositories/conversations.repository'
import {
  unionConversationConnections,
  type ConversationConnection,
  type ConversationConnectionEntityType,
  type ConversationConnectionRow,
} from './conversation-connections.union'
import { ConversationPermissionsService } from './conversation-permissions.service'

type ConversationRecord = {
  id: string
  org_id?: string | null
  campaign_id?: string | null
  metadata?: unknown
}

@Injectable()
export class ConversationConnectionsService {
  constructor(
    private readonly connectionsRepo: ConversationConnectionsRepository,
    private readonly conversationsRepo: ConversationsRepository,
    private readonly permissionsService: ConversationPermissionsService,
  ) {}

  async list(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ): Promise<{ connections: ConversationConnection[] }> {
    const conversation = await this.loadForAccess(
      supabase,
      userId,
      conversationId,
      'view',
      orgId,
      orgRole,
    )
    const rows = await this.connectionsRepo.list(supabase, conversationId)
    return { connections: this.union(conversation, rows) }
  }

  async add(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    input: { entity_type: ConversationConnectionEntityType; entity_id: string },
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ): Promise<{
    connection: ConversationConnection
    promoted_primary: boolean
    conversation: ConversationRecord
  }> {
    const conversation = await this.loadForAccess(
      supabase,
      userId,
      conversationId,
      'edit',
      orgId,
      orgRole,
    )
    if (input.entity_type === 'campaign') {
      return this.addCampaign(supabase, conversation, input.entity_id)
    }
    return this.addSpace(supabase, conversation, input.entity_id)
  }

  async remove(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    entityType: ConversationConnectionEntityType,
    entityId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ): Promise<{ connections: ConversationConnection[]; conversation: ConversationRecord }> {
    let conversation = await this.loadForAccess(
      supabase,
      userId,
      conversationId,
      'edit',
      orgId,
      orgRole,
    )
    await this.connectionsRepo.deleteByEntity(supabase, conversationId, entityType, entityId)
    if (entityType === 'campaign' && conversation.campaign_id === entityId) {
      conversation = await this.promoteNextCampaign(supabase, conversation)
    }
    if (entityType === 'space' && this.spaceId(conversation) === entityId) {
      conversation = await this.clearSpaceMetadata(supabase, conversation)
    }
    const rows = await this.connectionsRepo.list(supabase, conversationId)
    return { connections: this.union(conversation, rows), conversation }
  }

  private async addCampaign(
    supabase: SupabaseClient,
    conversation: ConversationRecord,
    entityId: string,
  ) {
    const promote = !conversation.campaign_id
    const inserted = await this.connectionsRepo.insert(supabase, {
      conversation_id: conversation.id,
      org_id: conversation.org_id ?? null,
      entity_type: 'campaign',
      entity_id: entityId,
      is_primary: promote,
    })
    let nextConversation = conversation
    if (promote) {
      nextConversation = (await this.conversationsRepo.update(supabase, conversation.id, {
        campaign_id: entityId,
      })) as ConversationRecord
    }
    const row =
      inserted.row ??
      (await this.connectionsRepo.findByEntity(supabase, conversation.id, 'campaign', entityId))
    return {
      connection: this.toConnection(
        row,
        conversation.id,
        conversation.org_id ?? null,
        'campaign',
        entityId,
        promote,
      ),
      promoted_primary: promote,
      conversation: nextConversation,
    }
  }

  private async addSpace(
    supabase: SupabaseClient,
    conversation: ConversationRecord,
    entityId: string,
  ) {
    const inserted = await this.connectionsRepo.insert(supabase, {
      conversation_id: conversation.id,
      org_id: conversation.org_id ?? null,
      entity_type: 'space',
      entity_id: entityId,
      is_primary: false,
    })
    let nextConversation = conversation
    if (!this.spaceId(conversation)) {
      const metadata = {
        ...this.asRecord(conversation.metadata),
        space_id: entityId,
      }
      nextConversation = (await this.conversationsRepo.update(supabase, conversation.id, {
        metadata,
      })) as ConversationRecord
    }
    const row =
      inserted.row ??
      (await this.connectionsRepo.findByEntity(supabase, conversation.id, 'space', entityId))
    return {
      connection: this.toConnection(
        row,
        conversation.id,
        conversation.org_id ?? null,
        'space',
        entityId,
        false,
      ),
      promoted_primary: false,
      conversation: nextConversation,
    }
  }

  private async promoteNextCampaign(supabase: SupabaseClient, conversation: ConversationRecord) {
    const remaining = await this.connectionsRepo.listCampaigns(supabase, conversation.id)
    const next = remaining[0]
    if (!next) {
      return (await this.conversationsRepo.update(supabase, conversation.id, {
        campaign_id: null,
      })) as ConversationRecord
    }
    await this.connectionsRepo.setPrimary(supabase, conversation.id, next.entity_id)
    return (await this.conversationsRepo.update(supabase, conversation.id, {
      campaign_id: next.entity_id,
    })) as ConversationRecord
  }

  private async clearSpaceMetadata(supabase: SupabaseClient, conversation: ConversationRecord) {
    const metadata = { ...this.asRecord(conversation.metadata), space_id: null }
    return (await this.conversationsRepo.update(supabase, conversation.id, {
      metadata,
    })) as ConversationRecord
  }

  private async loadForAccess(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    required: 'view' | 'edit',
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ): Promise<ConversationRecord> {
    await this.permissionsService.assertCanAccessConversation(
      supabase,
      userId,
      orgRole,
      conversationId,
      required,
      orgId,
    )
    const conversation = orgId
      ? await this.conversationsRepo.findByIdOrgScoped(supabase, conversationId, orgId)
      : await this.conversationsRepo.findByIdScoped(supabase, conversationId, userId, orgId)
    if (!conversation) throw new NotFoundException('Conversation not found')
    return conversation as ConversationRecord
  }

  private union(conversation: ConversationRecord, rows: ConversationConnectionRow[]) {
    return unionConversationConnections({
      conversationId: conversation.id,
      orgId: conversation.org_id ?? null,
      campaignId: conversation.campaign_id ?? null,
      metadata: conversation.metadata,
      rows,
    })
  }

  private toConnection(
    row: ConversationConnectionRow | null,
    conversationId: string,
    orgId: string | null,
    entityType: ConversationConnectionEntityType,
    entityId: string,
    isPrimary: boolean,
  ): ConversationConnection {
    if (row) {
      return { ...row, is_primary: isPrimary || row.is_primary, source: 'table' }
    }
    return {
      id: null,
      conversation_id: conversationId,
      org_id: orgId,
      entity_type: entityType,
      entity_id: entityId,
      is_primary: isPrimary,
      created_at: '',
      source: 'column',
    }
  }

  private spaceId(conversation: ConversationRecord): string | null {
    const value = this.asRecord(conversation.metadata).space_id
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }
}
