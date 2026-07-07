import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactLegacySessionCampaignRepository {
  async checkThemeTable(
    serviceClient: SupabaseClient,
    tableName: 'branding_themes' | 'themes',
  ): Promise<{ error: QueryError | null }> {
    return (await serviceClient.from(tableName).select('id').limit(1)) as {
      error: QueryError | null
    }
  }

  async findConversationCampaign(
    supabase: SupabaseClient,
    input: { conversationId: string; userId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('conversations')
      .select('campaign_id')
      .eq('id', input.conversationId)
      .eq('user_id', input.userId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findCampaignByScope(
    supabase: SupabaseClient,
    input: { campaignId: string; userId: string; orgId?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('campaigns').select('id').eq('id', input.campaignId)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findCampaignNameMatches(
    supabase: SupabaseClient,
    input: {
      campaignName: string
      ilikeValue: string
      userId: string
      orgId?: string | null
    },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('campaigns')
      .select('id, name')
      .neq('status', 'archived')
      .ilike('name', input.ilikeValue)
      .order('updated_at', { ascending: false })
      .limit(5)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findGeneralCampaignId(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', userId)
      .contains('config', { system_kind: 'general' })
      .neq('status', 'archived')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async createGeneralCampaign(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase
      .from('campaigns')
      .insert({
        user_id: userId,
        name: 'General',
        campaign_type: 'get-more-leads',
        config: {
          system_kind: 'general',
          isPinned: true,
          isSystem: true,
          icon: 'folder-kanban',
        },
      })
      .select('id')
      .single()) as {
      data: Record<string, unknown>
      error: QueryError | null
    }
  }

  async updateConversationCampaign(
    supabase: SupabaseClient,
    input: { conversationId: string; userId: string; campaignId: string },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('conversations')
      .update({ campaign_id: input.campaignId })
      .eq('id', input.conversationId)
      .eq('user_id', input.userId)) as {
      error: QueryError | null
    }
  }

  async findTheme(
    supabase: SupabaseClient,
    tableName: 'branding_themes' | 'themes',
    themeId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase.from(tableName).select('*').eq('id', themeId).maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findCampaignConfig(
    supabase: SupabaseClient,
    input: { campaignId: string; userId?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    const query = supabase.from('campaigns').select('config').eq('id', input.campaignId)
    if (input.userId) query.eq('user_id', input.userId)
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
