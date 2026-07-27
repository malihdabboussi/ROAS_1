import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }

@Injectable()
export class ArtifactLegacyIntegrationsRepository {
  async listConnectedIntegrations(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    if (!input.orgId) {
      return (await supabase
        .from('user_integrations')
        .select(
          'id, user_id, integration_id, provider, status, agent_enabled, scope_mode, is_default',
        )
        .eq('status', 'connected')
        .eq('user_id', input.userId)
        .is('org_id', null)) as {
        data: Array<Record<string, unknown>> | null
        error: QueryError | null
      }
    }

    const personalCrossContextIds = [
      'fathom',
      'fireflies',
      'page_grader',
      'openai_codex',
      'anthropic_claude',
      'google_calendar',
      'outlook',
      'slack',
    ]

    const [orgRows, personalRows] = await Promise.all([
      supabase
        .from('user_integrations')
        .select(
          'id, user_id, integration_id, provider, status, agent_enabled, scope_mode, is_default',
        )
        .eq('status', 'connected')
        .eq('org_id', input.orgId),
      supabase
        .from('user_integrations')
        .select(
          'id, user_id, integration_id, provider, status, agent_enabled, scope_mode, is_default',
        )
        .eq('status', 'connected')
        .eq('user_id', input.userId)
        .eq('scope_mode', 'personal')
        .is('org_id', null)
        .in('integration_id', personalCrossContextIds),
    ])

    const orgResult = orgRows as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
    if (orgResult.error) return { data: null, error: orgResult.error }
    const personalResult = personalRows as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
    if (personalResult.error) return { data: null, error: personalResult.error }

    const rows: Array<Record<string, unknown>> = []
    const seen = new Set<string>()
    for (const row of [...(orgResult.data ?? []), ...(personalResult.data ?? [])]) {
      const id = String(row.id ?? '').trim()
      const integrationId = String(row.integration_id ?? '')
        .trim()
        .toLowerCase()
      const key = id || `${integrationId}:${String(row.scope_mode ?? '')}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push(row)
    }
    return { data: rows, error: null }
  }

  async listCapabilities(
    supabase: SupabaseClient,
    integrationIds: string[],
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase
      .from('integration_capabilities')
      .select('integration_id, action_slug, execution_mode')
      .in('integration_id', integrationIds)
      .order('action_slug')) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async findExecutionModeConfig(
    supabase: SupabaseClient,
    integrationId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('project_composio_toolkit_config')
      .select('enabled, metadata')
      .eq('integration_id', integrationId.trim().toLowerCase())
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listActionSlugs(
    supabase: SupabaseClient,
    integrationId: string,
  ): Promise<{ data: Array<{ action_slug: string }> | null; error: QueryError | null }> {
    return (await supabase
      .from('integration_capabilities')
      .select('action_slug')
      .eq('integration_id', integrationId.trim().toLowerCase())
      .order('action_slug')) as {
      data: Array<{ action_slug: string }> | null
      error: QueryError | null
    }
  }

  async findRouteConfig(
    supabase: SupabaseClient,
    input: { integrationId: string; actionSlug: string },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('integration_capabilities')
      .select('route_config')
      .eq('integration_id', input.integrationId.trim().toLowerCase())
      .eq('action_slug', input.actionSlug.trim())
      .maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }

  async listDetailedCapabilities(
    supabase: SupabaseClient,
    input: { integrationId: string; domain?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('integration_capabilities')
      .select('action_slug, execution_mode, display_name, description, parameters, domains')
      .eq('integration_id', input.integrationId)
      .order('display_name')
    if (input.domain) query = query.or(`domains.cs.{${input.domain}},domains.cs.{shared}`)
    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async listIntegrationStatusRows(
    supabase: SupabaseClient,
    input: { integrationId: string; userId: string; orgId?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return this.listScopedUserIntegrationRows(
      supabase,
      input,
      'id, user_id, org_id, integration_id, provider, status, agent_enabled, metadata, scope_mode, is_default, connection_label, updated_at',
    )
  }

  async searchCapabilitiesByEmbedding(
    supabase: SupabaseClient,
    input: {
      queryEmbedding: number[]
      matchCount: number
      filterIntegrationId: string | null
      filterDomain: string | null
    },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return (await supabase.rpc('search_integration_capabilities', {
      query_embedding: input.queryEmbedding,
      match_count: input.matchCount,
      filter_integration_id: input.filterIntegrationId,
      filter_domain: input.filterDomain,
    })) as { data: Array<Record<string, unknown>> | null; error: QueryError | null }
  }

  async searchCapabilitiesByText(
    supabase: SupabaseClient,
    input: { query: string; limit: number; domain?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    let query = supabase
      .from('integration_capabilities')
      .select(
        'integration_id, action_slug, execution_mode, display_name, description, parameters, domains',
      )
      .or(
        `display_name.ilike.%${input.query}%,description.ilike.%${input.query}%,integration_id.ilike.%${input.query}%`,
      )
      .limit(input.limit)

    if (input.domain) query = query.or(`domains.cs.{${input.domain}},domains.cs.{shared}`)

    return (await query) as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
  }

  async upsertPendingComposioIntegration(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('user_integrations')
      .upsert(payload, { onConflict: 'user_id,integration_id,org_id' })) as {
      error: QueryError | null
    }
  }

  async findComposioConfigByIntegrationId(
    supabase: SupabaseClient,
    integrationId: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('project_composio_toolkit_config')
      .select('integration_id, toolkit_slug, auth_config_id, enabled, metadata')
      .eq('integration_id', integrationId)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async findComposioConfigByToolkitSlug(
    supabase: SupabaseClient,
    toolkitSlug: string,
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    return (await supabase
      .from('project_composio_toolkit_config')
      .select('integration_id, toolkit_slug, auth_config_id, enabled, metadata')
      .eq('toolkit_slug', toolkitSlug)
      .maybeSingle()) as { data: Record<string, unknown> | null; error: QueryError | null }
  }

  async listComposioIntegrationRows(
    supabase: SupabaseClient,
    input: { integrationId: string; userId: string; orgId?: string | null },
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    return this.listScopedUserIntegrationRows(
      supabase,
      input,
      'id, user_id, org_id, status, agent_enabled, metadata, scope_mode, is_default, connection_label, updated_at',
    )
  }

  async updateComposioIntegrationRow(
    supabase: SupabaseClient,
    input: { id: string; payload: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.from('user_integrations').update(input.payload).eq('id', input.id)) as {
      error: QueryError | null
    }
  }

  async insertComposioIntegrationRow(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.from('user_integrations').insert(payload)) as {
      error: QueryError | null
    }
  }

  private async listScopedUserIntegrationRows(
    supabase: SupabaseClient,
    input: { integrationId: string; userId: string; orgId?: string | null },
    select: string,
  ): Promise<{ data: Array<Record<string, unknown>> | null; error: QueryError | null }> {
    if (!input.orgId) {
      return (await supabase
        .from('user_integrations')
        .select(select)
        .eq('integration_id', input.integrationId)
        .eq('user_id', input.userId)
        .is('org_id', null)
        .order('updated_at', { ascending: false })) as {
        data: Array<Record<string, unknown>> | null
        error: QueryError | null
      }
    }

    const [orgRows, personalRows] = await Promise.all([
      supabase
        .from('user_integrations')
        .select(select)
        .eq('integration_id', input.integrationId)
        .eq('org_id', input.orgId)
        .order('updated_at', { ascending: false }),
      supabase
        .from('user_integrations')
        .select(select)
        .eq('integration_id', input.integrationId)
        .eq('user_id', input.userId)
        .eq('scope_mode', 'personal')
        .is('org_id', null)
        .order('updated_at', { ascending: false }),
    ])

    const orgResult = orgRows as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
    if (orgResult.error) return { data: null, error: orgResult.error }

    const personalResult = personalRows as {
      data: Array<Record<string, unknown>> | null
      error: QueryError | null
    }
    if (personalResult.error) return { data: null, error: personalResult.error }

    const rows: Array<Record<string, unknown>> = []
    const seenIds = new Set<string>()
    for (const row of [...(orgResult.data ?? []), ...(personalResult.data ?? [])]) {
      const id = String(row.id ?? '').trim()
      if (id && seenIds.has(id)) continue
      if (id) seenIds.add(id)
      rows.push(row)
    }

    return { data: rows, error: null }
  }

  async findAgentCapabilityRecord(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ): Promise<{ data: Record<string, unknown> | null; error: QueryError | null }> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, level, role, config')
      .eq('user_id', input.userId)
      .eq('agent_key', input.agentKey)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    return (await query.maybeSingle()) as {
      data: Record<string, unknown> | null
      error: QueryError | null
    }
  }
}
