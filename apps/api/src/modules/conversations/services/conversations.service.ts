import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import { ConversationsRepository } from '../repositories/conversations.repository'
import { MessagesRepository } from '../repositories/messages.repository'
import {
  needsGeneratedConversationTitle,
  pickGeneratedConversationTitle,
} from '../utils/conversation-title.util'
import {
  ConversationAssetsService,
  type ConversationAssetsScope,
} from './conversation-assets.service'
import { ConversationMessagesService } from './conversation-messages.service'
import { insertConversationPassOffNotification } from './conversation-pass-off-notify'
import { ConversationPermissionsService } from './conversation-permissions.service'
import { ConversationTitleSuggestionService } from './conversation-title-suggestion.service'

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
    private readonly permissionsService: ConversationPermissionsService,
    private readonly assetsService: ConversationAssetsService,
    private readonly titleSuggestionService: ConversationTitleSuggestionService,
    private readonly conversationMessages: ConversationMessagesService,
    private readonly messagesRepo: MessagesRepository,
  ) {}

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  }

  async listConversations(
    supabase: SupabaseClient,
    userId: string,
    filters?: {
      campaign_id?: string
      agent_id?: string
      space_id?: string
      channel_id?: string
      feed_scope?: 'workspace' | 'personal' | 'all' | 'org'
      feed_org_id?: string
    },
    scopeOrgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    const feedScope = filters?.feed_scope ?? 'workspace'

    if (feedScope === 'org' && filters?.feed_org_id) {
      let membership: unknown
      try {
        membership = await this.conversationsRepo.findActiveOrgMembership(
          supabase,
          filters.feed_org_id,
          userId,
        )
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : String(error))
      }
      if (!membership) throw new ForbiddenException('Not a member of that organization')
    }

    const repoFilters: {
      campaign_id?: string
      agent_id?: string
      space_id?: string
      channel_id?: string
      orgId?: string | null
      listAllOrgs?: boolean
    } = {
      campaign_id: filters?.campaign_id,
      agent_id: filters?.agent_id,
      space_id: filters?.space_id,
      channel_id: filters?.channel_id,
    }

    if (feedScope === 'all') {
      repoFilters.listAllOrgs = true
    } else if (feedScope === 'personal') {
      repoFilters.orgId = null
    } else if (feedScope === 'org' && filters?.feed_org_id) {
      repoFilters.orgId = filters.feed_org_id
    } else {
      repoFilters.orgId = scopeOrgId ?? null
    }

    const rows = (await this.conversationsRepo.findByUserId(supabase, userId, repoFilters)).filter(
      (row: Record<string, unknown>) => this.asRecord(row.metadata)?.team_draft !== true,
    )

    const levelsOrgId =
      feedScope === 'org' && filters?.feed_org_id
        ? filters.feed_org_id
        : feedScope === 'personal' || feedScope === 'all'
          ? null
          : (scopeOrgId ?? null)

    return this.withEffectiveLevels(supabase, rows, userId, orgRole, levelsOrgId)
  }

  private async withEffectiveLevels(
    supabase: SupabaseClient,
    rows: Record<string, unknown>[],
    userId: string,
    orgRole?: OrgRole | null,
    orgId?: string | null,
  ) {
    const scopedRows = rows
      .map((row) => ({
        id: typeof row.id === 'string' ? row.id : null,
        org_id: typeof row.org_id === 'string' ? row.org_id : null,
        user_id: typeof row.user_id === 'string' ? row.user_id : null,
      }))
      .filter(
        (row): row is { id: string; org_id: string | null; user_id: string } =>
          row.id !== null && row.user_id !== null,
      )

    const levelsById = await this.permissionsService.resolveEffectiveLevelsForRows(
      supabase,
      scopedRows,
      userId,
      orgRole,
      orgId,
    )

    return rows.map((row) => {
      const conversationId = typeof row.id === 'string' ? row.id : null
      const effectiveLevel = conversationId ? (levelsById.get(conversationId) ?? null) : null
      return { ...row, effective_level: effectiveLevel }
    })
  }

  async listSharedConversations(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    if (orgId) {
      const rows = await this.conversationsRepo.findSharedWithMe(supabase, userId, orgId)
      const withLevels = await this.withEffectiveLevels(supabase, rows, userId, orgRole, orgId)
      return withLevels.filter((row) => row.effective_level !== null)
    }
    return []
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
      id?: string
      title?: string
      campaign_id?: string
      agent_id?: string
      draft?: boolean
      metadata?: Record<string, unknown>
    },
    orgId?: string | null,
  ) {
    if (data.agent_id) {
      const reg = await this.conversationsRepo.findAgentRegistryStatus(
        supabase,
        data.agent_id,
        userId,
        orgId,
      )
      if (reg?.is_active === false) {
        throw new BadRequestException(`Agent '${data.agent_id}' is deactivated`)
      }
    }
    const baseMetadata = this.asRecord(data.metadata) ?? {}
    const metadata = data.draft
      ? {
          ...baseMetadata,
          team_draft: true,
          draft_started_at: new Date().toISOString(),
        }
      : baseMetadata

    return this.conversationsRepo.create(supabase, {
      ...(data.id ? { id: data.id } : {}),
      user_id: userId,
      title: data.title ?? 'New Conversation',
      campaign_id: data.campaign_id ?? null,
      agent_id: data.agent_id ?? null,
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
    return this.conversationMessages.getMessages(
      supabase,
      userId,
      conversationId,
      options,
      orgId,
      orgRole,
    )
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
    return this.conversationMessages.patchMessageMetadata(
      supabase,
      userId,
      conversationId,
      messageId,
      metadataPatch,
      orgId,
      orgRole,
    )
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
      throw new NotFoundException('Conversation not found')
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
      clear_team_draft?: boolean
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
      throw new NotFoundException('Conversation not found')
    }

    const currentMetadata = this.asRecord(conversation.metadata) ?? {}
    const dataFields: Record<string, unknown> = { ...data }
    delete dataFields.clear_team_draft
    const nextMetadata = data.clear_team_draft
      ? (() => {
          const rest = { ...currentMetadata }
          delete rest.team_draft
          delete rest.draft_started_at
          return rest
        })()
      : currentMetadata

    const fields =
      data.metadata && this.asRecord(data.metadata)
        ? {
            ...dataFields,
            metadata: {
              ...nextMetadata,
              ...data.metadata,
            },
          }
        : data.clear_team_draft
          ? {
              ...dataFields,
              metadata: nextMetadata,
            }
          : dataFields

    return this.conversationsRepo.update(supabase, conversationId, fields)
  }

  async forkConversation(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    messageId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    return this.conversationMessages.forkConversation(
      supabase,
      userId,
      conversationId,
      messageId,
      orgId,
      orgRole,
    )
  }

  async deleteMessagesFrom(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    messageId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    await this.conversationMessages.deleteMessagesFrom(
      supabase,
      userId,
      conversationId,
      messageId,
      orgId,
      orgRole,
    )
  }

  async getAssetsFeed(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    scope: ConversationAssetsScope,
    opts?: { agentId?: string | null; campaignId?: string | null; before?: string; limit?: number },
  ) {
    return this.assetsService.getAssetsFeed(supabase, userId, orgId, scope, opts)
  }

  async listConversationShares(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    const effectiveLevel = await this.permissionsService.assertCanAccessConversation(
      supabase,
      userId,
      orgRole,
      conversationId,
      'view',
      orgId,
    )
    const shares = await this.permissionsService.listConversationShares(
      supabase,
      conversationId,
      orgId,
    )
    return { effective_level: effectiveLevel, shares }
  }

  async upsertConversationShare(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    data: Parameters<ConversationPermissionsService['upsertConversationShare']>[3],
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
    const share = await this.permissionsService.upsertConversationShare(
      supabase,
      userId,
      conversationId,
      data,
      orgId,
    )

    const notify = Boolean((data as { notify?: boolean }).notify)
    const note =
      typeof (data as { note?: string }).note === 'string'
        ? (data as { note?: string }).note!.trim()
        : ''
    if (notify && data.entity_type === 'user') {
      await this.notifyConversationPassOff(supabase, {
        conversationId,
        fromUserId: userId,
        toUserId: data.entity_id,
        orgId: orgId ?? null,
        note,
      })
    }

    return share
  }

  async passOffConversation(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    input: {
      user_id: string
      level: 'view' | 'edit' | 'admin'
      note?: string
      notify?: boolean
    },
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    return this.upsertConversationShare(
      supabase,
      userId,
      conversationId,
      {
        entity_type: 'user',
        entity_id: input.user_id,
        level: input.level,
        notify: input.notify ?? true,
        note: input.note,
      },
      orgId,
      orgRole,
    )
  }

  private async notifyConversationPassOff(
    supabase: SupabaseClient,
    input: {
      conversationId: string
      fromUserId: string
      toUserId: string
      orgId: string | null
      note: string
    },
  ): Promise<void> {
    const conversation = await this.conversationsRepo.findById(supabase, input.conversationId)
    try {
      await insertConversationPassOffNotification(supabase, {
        conversationId: input.conversationId,
        conversationTitle: typeof conversation?.title === 'string' ? conversation.title : null,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        orgId: input.orgId,
        note: input.note,
      })
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to notify teammate',
      )
    }
  }

  async deleteConversationShare(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    shareId: string,
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
    await this.permissionsService.deleteConversationShare(supabase, conversationId, shareId, orgId)
  }

  /** @internal Discriminant for controller → HTTP mapping (never sent to client). */
  static readonly ERR_SUGGEST_TITLE_UNAVAILABLE = 'SUGGEST_TITLE_UNAVAILABLE'
  static readonly ERR_SUGGEST_TITLE_FAILED = 'SUGGEST_TITLE_FAILED'

  /**
   * Gemini 3.5 Flash (text) - short chat title from the user's first message.
   */
  async suggestConversationTitle(userMessage: string, userId: string): Promise<{ title: string }> {
    return this.titleSuggestionService.suggestConversationTitle(userMessage, userId)
  }

  /**
   * Replace a raw/placeholder conversation title using the first user message + Gemini.
   * No-op when the current title already looks curated.
   */
  async autoTitleConversation(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
    firstMessageOverride?: string,
  ): Promise<{ title: string; updated: boolean }> {
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

    const currentTitle = typeof conversation.title === 'string' ? conversation.title : null
    const firstMessage =
      (firstMessageOverride ?? '').trim() ||
      (await this.messagesRepo.findFirstUserMessageContent(supabase, conversationId)) ||
      ''
    if (!needsGeneratedConversationTitle(currentTitle, firstMessage) || !firstMessage) {
      return { title: currentTitle ?? '', updated: false }
    }

    let suggested = ''
    try {
      suggested = (await this.titleSuggestionService.suggestConversationTitle(firstMessage, userId))
        .title
    } catch {
      suggested = ''
    }

    const title = pickGeneratedConversationTitle({
      currentTitle,
      firstMessage,
      suggested,
    })
    if (!title) return { title: currentTitle ?? '', updated: false }

    await this.conversationsRepo.update(supabase, conversationId, { title })
    return { title, updated: true }
  }
}
