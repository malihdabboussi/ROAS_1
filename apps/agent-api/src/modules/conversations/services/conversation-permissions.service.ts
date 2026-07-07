import { ForbiddenException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConversationShareLevel, OrgRole } from '@vibey/api-shared'
import { ConversationPermissionsRepository } from '../repositories/conversation-permissions.repository'

const LEVEL_WEIGHT: Record<ConversationShareLevel, number> = {
  view: 1,
  edit: 2,
  admin: 3,
}

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
    private readonly repository: ConversationPermissionsRepository = new ConversationPermissionsRepository(),
  ) {}

  private hasRequiredLevel(
    actual: ConversationShareLevel | null,
    required: ConversationShareLevel,
  ): boolean {
    if (!actual) return false
    return LEVEL_WEIGHT[actual] >= LEVEL_WEIGHT[required]
  }

  private maxLevel(levels: Array<ConversationShareLevel | null>): ConversationShareLevel | null {
    const cleaned = levels.filter((level): level is ConversationShareLevel => Boolean(level))
    if (cleaned.length === 0) return null
    return cleaned.sort((a, b) => LEVEL_WEIGHT[b] - LEVEL_WEIGHT[a])[0] ?? null
  }

  async resolveEffectiveLevel(
    supabase: SupabaseClient,
    userId: string,
    orgRole: OrgRole | null | undefined,
    conversationId: string,
    orgId?: string | null,
  ): Promise<ConversationShareLevel | null> {
    const { conversation, errorMessage } = await this.repository.findConversationScope(
      supabase,
      conversationId,
      orgId,
    )
    if (errorMessage) throw new Error(errorMessage)
    if (!conversation) return null
    if (conversation.user_id === userId) return 'admin'

    const { shares, errorMessage: sharesErrorMessage } =
      await this.repository.listConversationShares(supabase, conversationId)
    if (sharesErrorMessage) throw new Error(sharesErrorMessage)

    const matchingLevels = shares
      .filter((share) => {
        if (share.entity_type === 'user') return share.entity_id === userId
        if (share.entity_type === 'org' && orgId) {
          return share.entity_id === orgId || share.org_id === orgId
        }
        return false
      })
      .map((share) => share.level as ConversationShareLevel)

    const baseline =
      conversation.org_id && orgId && conversation.org_id === orgId && orgRole
        ? ORG_BASELINE_LEVEL[orgRole]
        : null

    return this.maxLevel([...matchingLevels, baseline])
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
}
