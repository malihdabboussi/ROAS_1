import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

const INTEGRATION_CONTEXT_SELECT =
  'id, user_id, integration_id, provider, status, connected_at, last_sync_at, metadata, agent_enabled, scope_mode, is_default, connection_label'

type QueryError = { message?: string }
type ListResult<T = Record<string, unknown>> = { data: T[] | null; error: QueryError | null }
type SingleResult<T = Record<string, unknown>> = { data: T | null; error: QueryError | null }

type ListQuery<T = Record<string, unknown>> = PromiseLike<ListResult<T>> & {
  eq(field: string, value: unknown): ListQuery<T>
  in(field: string, values: unknown[]): ListQuery<T>
  is(field: string, value: null): ListQuery<T>
  limit(count: number): ListQuery<T>
  neq(field: string, value: unknown): ListQuery<T>
  or(expression: string): ListQuery<T>
  order(field: string, options?: { ascending?: boolean }): ListQuery<T>
  maybeSingle<R = T>(): Promise<SingleResult<R>>
}

type MutationResult = { error: QueryError | null }
type MutationQuery = PromiseLike<MutationResult> & {
  eq(field: string, value: unknown): MutationQuery
  is(field: string, value: null): MutationQuery
}

type TableQuery = {
  select<T = Record<string, unknown>>(columns: string): ListQuery<T>
  update(patch: Record<string, unknown>): MutationQuery
}

@Injectable()
export class ChatContextRepository {
  async listScopedIntegrations(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<ListResult> {
    let query = this.table(supabase, 'user_integrations').select(INTEGRATION_CONTEXT_SELECT)
    query = input.orgId
      ? query.eq('org_id', input.orgId)
      : query.eq('user_id', input.userId).is('org_id', null)
    return query
  }

  async listPersonalIntegrations(
    supabase: SupabaseClient,
    input: { userId: string; integrationIds: readonly string[] },
  ): Promise<ListResult> {
    return this.table(supabase, 'user_integrations')
      .select(INTEGRATION_CONTEXT_SELECT)
      .in('integration_id', [...input.integrationIds])
      .eq('user_id', input.userId)
      .is('org_id', null)
  }

  async findCampaignConfig(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string; orgId?: string | null },
  ): Promise<SingleResult<{ config?: unknown }>> {
    let query = this.table(supabase, 'campaigns')
      .select<{ config?: unknown }>('config')
      .eq('id', input.campaignId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.eq('user_id', input.userId)
    return query.maybeSingle()
  }

  async findTheme(
    supabase: SupabaseClient,
    tableName: 'branding_themes' | 'themes',
    themeId: string,
  ): Promise<SingleResult> {
    return this.table(supabase, tableName).select('*').eq('id', themeId).maybeSingle()
  }

  async listMediaAssetUrls(
    supabase: SupabaseClient,
    assetIds: readonly string[],
  ): Promise<Array<{ id: string; public_url?: string | null }>> {
    const { data } = await this.table(supabase, 'media_assets')
      .select<{ id: string; public_url?: string | null }>('id, public_url')
      .in('id', [...assetIds])
    return data ?? []
  }

  async probeThemeTable(
    supabase: SupabaseClient,
    tableName: 'branding_themes' | 'themes',
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, tableName).select('id').limit(1)
    return error
  }

  async findCampaignContext(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string; orgId?: string | null },
  ): Promise<Record<string, unknown> | null> {
    let query = this.table(supabase, 'campaigns').select('name, context').eq('id', input.campaignId)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.eq('user_id', input.userId)
    const { data } = await query.maybeSingle()
    return data
  }

  async listOffers(
    supabase: SupabaseClient,
    input: {
      userId: string
      campaignId: string
      orgId?: string | null
      selectedIds?: readonly string[]
    },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'offers')
      .select('id, name, processing_status')
      .eq('campaign_id', input.campaignId)
    if (!input.orgId) query = query.eq('user_id', input.userId)
    if (input.selectedIds?.length) query = query.in('id', [...input.selectedIds])
    const { data } = await query.order('created_at', { ascending: false }).limit(10)
    return data ?? []
  }

  async listFunnels(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string; orgId?: string | null },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'funnels')
      .select('id, name, status, funnel_type')
      .eq('campaign_id', input.campaignId)
    if (!input.orgId) query = query.eq('user_id', input.userId)
    const { data } = await query.order('created_at', { ascending: false }).limit(10)
    return data ?? []
  }

  async listLeadMagnets(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string; orgId?: string | null },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'presentations')
      .select('id, name, status')
      .eq('campaign_id', input.campaignId)
    if (!input.orgId) query = query.eq('user_id', input.userId)
    const { data } = await query.order('created_at', { ascending: false }).limit(10)
    return data ?? []
  }

  async listSequences(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string; orgId?: string | null },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'sequences')
      .select('id, name, status')
      .eq('campaign_id', input.campaignId)
    if (!input.orgId) query = query.eq('user_id', input.userId)
    const { data } = await query.order('created_at', { ascending: false }).limit(10)
    return data ?? []
  }

  async listAdCampaigns(
    supabase: SupabaseClient,
    input: { userId: string; campaignId: string; orgId?: string | null },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'ad_campaigns')
      .select('id, name, meta_campaign_id, meta_ad_account_id, meta_page_id, metadata')
      .eq('campaign_id', input.campaignId)
    if (!input.orgId) query = query.eq('user_id', input.userId)
    const { data } = await query.order('created_at', { ascending: false }).limit(10)
    return data ?? []
  }

  async listAvatars(
    supabase: SupabaseClient,
    input: {
      userId: string
      campaignId: string
      orgId?: string | null
      selectedIds?: readonly string[]
    },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'avatars')
      .select('id, name, avatar_type')
      .eq('campaign_id', input.campaignId)
    if (!input.orgId) query = query.eq('user_id', input.userId)
    if (input.selectedIds?.length) query = query.in('id', [...input.selectedIds])
    const { data } = await query.order('created_at', { ascending: false }).limit(10)
    return data ?? []
  }

  async findAgentConfiguredModelConfig(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ): Promise<SingleResult<{ config?: unknown }>> {
    let query = this.table(supabase, 'agents_registry')
      .select<{ config?: unknown }>('config')
      .eq('user_id', input.userId)
      .eq('agent_key', input.agentKey)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    return query.maybeSingle()
  }

  async findAgentRegistration(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ): Promise<SingleResult<{ config?: unknown; is_active?: boolean }>> {
    let query = this.table(supabase, 'agents_registry')
      .select<{ config?: unknown; is_active?: boolean }>('config, is_active')
      .eq('agent_key', input.agentKey)
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    return query.maybeSingle()
  }

  async findModelCapability(
    supabase: SupabaseClient,
    input: { provider: string; modelName: string },
  ): Promise<SingleResult<{ capability_profile?: unknown }>> {
    return this.table(supabase, 'llm_model_capabilities')
      .select<{ capability_profile?: unknown }>('capability_profile')
      .eq('provider', input.provider)
      .eq('model_name', input.modelName)
      .eq('is_active', true)
      .maybeSingle()
  }

  async findContactByEmail(
    supabase: SupabaseClient,
    input: { userId: string; email: string; orgId?: string | null },
  ): Promise<SingleResult<{ id?: string }>> {
    let query = this.table(supabase, 'contacts')
      .select<{ id?: string }>('id')
      .eq('user_id', input.userId)
      .eq('email', input.email)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    return query.maybeSingle()
  }

  async updateProfileLastInteraction(
    supabase: SupabaseClient,
    input: { userId: string; timestamp: string },
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'profiles')
      .update({ last_interaction_at: input.timestamp })
      .eq('id', input.userId)
    return error
  }

  async updateMachineRuntimeActivity(
    supabase: SupabaseClient,
    input: { userId: string; patch: Record<string, unknown> },
  ): Promise<void> {
    await this.table(supabase, 'profiles').update(input.patch).eq('id', input.userId)
  }

  async findOrganizationProfile(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await this.table(supabase, 'organizations')
      .select('name, slug, account_type')
      .eq('id', orgId)
      .eq('status', 'active')
      .maybeSingle()
    return data
  }

  async findUserProfile(supabase: SupabaseClient, userId: string): Promise<SingleResult> {
    return this.table(supabase, 'profiles')
      .select(
        'full_name, email, company_name, industry, website, plan, onboarding_data, preferences',
      )
      .eq('id', userId)
      .maybeSingle()
  }

  async listTeamRosterAgents(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<ListResult> {
    let query = this.table(supabase, 'agents_registry')
      .select('agent_key, name, role, level, specialty, config')
      .neq('level', 'c_level')
      .neq('level', 'system')
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    return query
  }

  async listCampaignAgents(supabase: SupabaseClient, campaignId: string): Promise<ListResult> {
    return this.table(supabase, 'campaign_agents')
      .select('agent_key, name, config')
      .eq('campaign_id', campaignId)
  }

  async listAgentsByKeys(
    supabase: SupabaseClient,
    agentKeys: readonly string[],
  ): Promise<Array<Record<string, unknown>>> {
    const { data } = await this.table(supabase, 'agents_registry')
      .select('agent_key, role, specialty, config')
      .in('agent_key', [...agentKeys])
    return data ?? []
  }

  async listAgentWorkflows(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; keys: readonly string[]; orgId?: string | null },
  ): Promise<ListResult> {
    let query = this.table(supabase, 'agent_workflows')
      .select('workflow_key, name, markdown_content, is_enabled')
      .eq('agent_key', input.agentKey)
      .in('workflow_key', [...input.keys])
    query = input.orgId
      ? query.or(`org_id.eq.${input.orgId},org_id.is.null`).is('user_id', null)
      : query.or(`user_id.eq.${input.userId},user_id.is.null`).is('org_id', null)
    return query
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }
}
