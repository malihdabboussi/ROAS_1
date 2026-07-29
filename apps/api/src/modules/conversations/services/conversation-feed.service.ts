import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrgRole } from '@vibey/api-shared'
import { ConversationActivityService } from './conversation-activity.service'
import { ConversationsService } from './conversations.service'

interface ConversationFeedFilters {
  campaign_id?: string
  agent_id?: string
  space_id?: string
  channel_id?: string
  feed_scope?: 'workspace' | 'personal' | 'all' | 'org'
  feed_org_id?: string
}

@Injectable()
export class ConversationFeedService {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly activityService: ConversationActivityService,
  ) {}

  async list(
    supabase: SupabaseClient,
    userId: string,
    filters: ConversationFeedFilters,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    const rows = await this.conversationsService.listConversations(
      supabase,
      userId,
      filters,
      orgId,
      orgRole,
    )
    return this.activityService.decorate(supabase, rows)
  }

  async listShared(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
    orgRole?: OrgRole | null,
  ) {
    const rows = await this.conversationsService.listSharedConversations(
      supabase,
      userId,
      orgId,
      orgRole,
    )
    return this.activityService.decorate(supabase, rows)
  }
}
