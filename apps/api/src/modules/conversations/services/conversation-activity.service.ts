import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import { ConversationActivityRepository } from '../repositories/conversation-activity.repository'
import { ConversationPermissionsService } from './conversation-permissions.service'

@Injectable()
export class ConversationActivityService {
  constructor(
    private readonly activityRepository: ConversationActivityRepository,
    private readonly permissionsService: ConversationPermissionsService,
  ) {}

  async decorate(supabase: SupabaseClient, rows: Record<string, unknown>[]) {
    const ids = rows.flatMap((row) => (typeof row.id === 'string' ? [row.id] : []))
    const states = await this.activityRepository.listStates(supabase, ids)
    const statesById = new Map(states.map((state) => [state.conversation_id, state]))
    return rows.map((row) => {
      const state = typeof row.id === 'string' ? statesById.get(row.id) : undefined
      return {
        ...row,
        is_unread: state?.is_unread ?? false,
        needs_action: state?.needs_action ?? false,
      }
    })
  }

  async markRead(
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
      'view',
      orgId,
    )
    await this.activityRepository.markRead(supabase, conversationId, userId)
    return { success: true }
  }
}
