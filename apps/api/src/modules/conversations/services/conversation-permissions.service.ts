import { ForbiddenException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ConversationShareLevel,
  OrgRole,
  UpsertConversationShareDto,
} from '@vibey/api-shared'
import {
  ConversationPermissionsRepository,
  type ConversationPermissionRow,
  type ConversationShareRow,
} from '../repositories/conversation-permissions.repository'

const LEVEL_WEIGHT: Record<ConversationShareLevel, number> = {
  view: 1,
  edit: 2,
  admin: 3,
}

/** Keep PostgREST `in.(...)` URLs under Node/undici header limits. */
const CONVERSATION_SHARE_LOOKUP_BATCH_SIZE = 50

// Conversations are private-by-default. Org role grants NO baseline access.
// You must be the conversation creator OR be explicitly shared with the conversation.
// (Per Sefy directive: "you wanna share a convo, share it.")
const ORG_BASELINE_LEVEL: Record<OrgRole, ConversationShareLevel | null> = {
  viewer: null,
  editor: null,
  creator: null,
  admin: null,
  owner: null,
}

@Injectable()
export class ConversationPermissionsService {
  constructor(
    private readonly permissionsRepository: ConversationPermissionsRepository = new ConversationPermissionsRepository(),
  ) {}

  private maxLevel(
    levels: Array<ConversationShareLevel | null | undefined>,
  ): ConversationShareLevel | null {
    const cleaned = levels.filter((level): level is ConversationShareLevel => Boolean(level))
    if (cleaned.length === 0) return null
    return cleaned.sort((a, b) => LEVEL_WEIGHT[b] - LEVEL_WEIGHT[a])[0] ?? null
  }

  private hasRequiredLevel(
    actual: ConversationShareLevel | null,
    required: ConversationShareLevel,
  ): boolean {
    if (!actual) return false
    return LEVEL_WEIGHT[actual] >= LEVEL_WEIGHT[required]
  }

  private baselineFromOrgRole(orgRole: OrgRole | null | undefined): ConversationShareLevel | null {
    if (!orgRole) return null
    return ORG_BASELINE_LEVEL[orgRole]
  }

  private shareApplies(
    share: Pick<ConversationShareRow, 'entity_type' | 'entity_id' | 'org_id'>,
    userId: string,
    orgId?: string | null,
  ): boolean {
    if (share.entity_type === 'user') return share.entity_id === userId
    if (!orgId) return false
    return share.entity_id === orgId || share.org_id === orgId
  }

  private async loadConversation(
    supabase: SupabaseClient,
    conversationId: string,
    orgId?: string | null,
  ): Promise<ConversationPermissionRow | null> {
    return this.permissionsRepository.loadConversation(supabase, conversationId, orgId)
  }

  async resolveEffectiveLevel(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    conversationId: string,
    orgId?: string | null,
  ): Promise<ConversationShareLevel | null> {
    const conversation = await this.loadConversation(supabase, conversationId, orgId)
    if (!conversation) return null
    if (conversation.user_id === userId) return 'admin'

    const matchingLevels = (await this.permissionsRepository.listSharesByConversation(
      supabase,
      conversationId,
    ))
      .filter((row) => this.shareApplies(row, userId, orgId))
      .map((row) => row.level)

    const baseline =
      conversation.org_id && orgId && conversation.org_id === orgId
        ? this.baselineFromOrgRole(orgRole)
        : null

    return this.maxLevel([...matchingLevels, baseline])
  }

  /**
   * Batched effective-level resolver for a pre-loaded set of conversations.
   * Performs ONE `conversation_shares` fetch via `.in(...)` instead of N per-row queries.
   * Caller must supply rows that already match the scope (orgId filter applied upstream),
   * so no per-row re-fetch of the conversation row is needed.
   */
  async resolveEffectiveLevelsForRows(
    supabase: SupabaseClient,
    rows: Array<{ id: string; org_id: string | null; user_id: string }>,
    userId: string,
    orgRole: OrgRole | null | undefined,
    orgId?: string | null,
  ): Promise<Map<string, ConversationShareLevel | null>> {
    const result = new Map<string, ConversationShareLevel | null>()
    if (rows.length === 0) return result

    for (const row of rows) {
      if (row.user_id === userId) {
        result.set(row.id, 'admin')
      }
    }

    const foreignRows = rows.filter((row) => row.user_id !== userId)
    if (foreignRows.length === 0) return result

    const sharesByConversation = new Map<string, ConversationShareRow[]>()
    const foreignIds = foreignRows.map((row) => row.id)
    for (let offset = 0; offset < foreignIds.length; offset += CONVERSATION_SHARE_LOOKUP_BATCH_SIZE) {
      const batch = foreignIds.slice(offset, offset + CONVERSATION_SHARE_LOOKUP_BATCH_SIZE)
      const shares = await this.permissionsRepository.listSharesByConversationIds(supabase, batch)
      for (const share of shares) {
        const bucket = sharesByConversation.get(share.conversation_id) ?? []
        bucket.push(share)
        sharesByConversation.set(share.conversation_id, bucket)
      }
    }

    for (const row of foreignRows) {
      const shares = sharesByConversation.get(row.id) ?? []
      const matchingLevels = shares
        .filter((share) => this.shareApplies(share, userId, orgId))
        .map((share) => share.level)
      const baseline =
        row.org_id && orgId && row.org_id === orgId ? this.baselineFromOrgRole(orgRole) : null
      result.set(row.id, this.maxLevel([...matchingLevels, baseline]))
    }

    return result
  }

  async assertCanAccessConversation(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    conversationId: string,
    requiredLevel: ConversationShareLevel,
    orgId?: string | null,
  ): Promise<ConversationShareLevel> {
    const effective = await this.resolveEffectiveLevel(
      supabase,
      userId,
      orgRole,
      conversationId,
      orgId,
    )
    if (!this.hasRequiredLevel(effective, requiredLevel)) {
      throw new ForbiddenException('Insufficient permissions for this conversation')
    }
    return effective as ConversationShareLevel
  }

  async listConversationShares(
    supabase: SupabaseClient,
    conversationId: string,
    orgId?: string | null,
  ): Promise<ConversationShareRow[]> {
    return this.permissionsRepository.listConversationShares(supabase, conversationId, orgId)
  }

  async upsertConversationShare(
    supabase: SupabaseClient,
    userId: string,
    conversationId: string,
    dto: UpsertConversationShareDto,
    orgId?: string | null,
  ): Promise<ConversationShareRow> {
    const conversation = await this.loadConversation(supabase, conversationId, orgId)
    if (!conversation) throw new ForbiddenException('Conversation not found')
    if (dto.entity_type === 'org' && orgId && dto.entity_id !== orgId) {
      throw new ForbiddenException('Organization share must target the active organization')
    }

    return this.permissionsRepository.upsertConversationShare(supabase, {
      conversation_id: conversationId,
      org_id: conversation.org_id,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      level: dto.level,
      created_by: userId,
    })
  }

  async deleteConversationShare(
    supabase: SupabaseClient,
    conversationId: string,
    shareId: string,
    orgId?: string | null,
  ): Promise<void> {
    await this.permissionsRepository.deleteConversationShare(supabase, conversationId, shareId, orgId)
  }
}
