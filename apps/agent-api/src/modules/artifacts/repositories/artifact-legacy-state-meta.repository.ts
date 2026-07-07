import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactLegacyStateMetaRepository {
  async upsertAgentState(
    supabase: SupabaseClient,
    input: { userId: string; agentId: string; stateContent: string; updatedAt: string },
  ): Promise<{ data: Record<string, unknown>; error: QueryError | null }> {
    return (await supabase
      .from('user_agent_state')
      .upsert(
        {
          user_id: input.userId,
          agent_id: input.agentId,
          state_content: input.stateContent,
          updated_at: input.updatedAt,
        },
        { onConflict: 'user_id,agent_id' },
      )
      .select('updated_at')
      .single()) as { data: Record<string, unknown>; error: QueryError | null }
  }

  async findAgentState(
    supabase: SupabaseClient,
    input: { userId: string; agentId: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('user_agent_state')
      .select('state_content, updated_at')
      .eq('user_id', input.userId)
      .eq('agent_id', input.agentId)
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findAdSetIdForAd(
    supabase: SupabaseClient,
    input: { adId: string; userId: string; orgId: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('ads').select('ad_set_id').eq('id', input.adId)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query.single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findCampaignIdForAdSet(
    supabase: SupabaseClient,
    input: { adSetId: string; userId: string; orgId: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('ad_sets').select('ad_campaign_id').eq('id', input.adSetId)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query.single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async findAdCampaignMetadata(
    supabase: SupabaseClient,
    input: { campaignId: string; userId: string; orgId: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase.from('ad_campaigns').select('metadata').eq('id', input.campaignId)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query.single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async updateAdCampaignMetadata(
    supabase: SupabaseClient,
    input: {
      campaignId: string
      userId: string
      orgId: string | null
      payload: Record<string, unknown>
    },
  ): Promise<{ error: QueryError | null }> {
    let query = supabase.from('ad_campaigns').update(input.payload).eq('id', input.campaignId)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query) as { error: QueryError | null }
  }

  async findConnectedMetaIntegrations(
    supabase: SupabaseClient,
    input: { userId: string; orgId: string | null; includeMetadata: boolean },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    const columns = input.includeMetadata
      ? 'user_id, access_token, metadata, scope_mode, is_default, updated_at'
      : 'user_id, access_token, scope_mode, is_default, updated_at'
    let query = supabase
      .from('user_integrations')
      .select(columns)
      .eq('integration_id', 'meta')
      .eq('status', 'connected')
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query.order('updated_at', { ascending: false })) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findAdSetDeliverySettings(
    supabase: SupabaseClient,
    input: { adSetId: string; userId: string; orgId: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('ad_sets')
      .select('targeting, optimization_goal, ad_campaign_id')
      .eq('id', input.adSetId)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query.single()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
