import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type AgentRegistryRow = {
  agent_key: string
  name: string | null
  role: string | null
  image_url: string | null
  status?: string | null
}
type CallerInfoRow = { image_url: string | null; role: string | null; name: string | null }
type TemplateRow = { role_key: string; default_name: string; role: string }
type DelegationHistoryRow = {
  prompt: string
  response: string | null
  type: string | null
  created_at: string | null
}

@Injectable()
export class ArtifactAgentDelegationRepository {
  async findScopedAgent(
    supabase: SupabaseClient,
    input: { agentKey: string; userId: string; orgId: string | null },
  ): Promise<QueryResult<AgentRegistryRow>> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, name, role, image_url, status')
      .eq('agent_key', input.agentKey)
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query.maybeSingle()) as QueryResult<AgentRegistryRow>
  }

  async findCallerInfo(
    supabase: SupabaseClient,
    input: { callerAgentKey: string; userId: string; orgId: string | null },
  ): Promise<QueryResult<CallerInfoRow>> {
    let query = supabase
      .from('agents_registry')
      .select('image_url, role, name')
      .eq('agent_key', input.callerAgentKey)
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query.maybeSingle()) as QueryResult<CallerInfoRow>
  }

  async listMatchingTemplates(
    supabase: SupabaseClient,
    targetKey: string,
  ): Promise<{ data: TemplateRow[] | null; error: QueryError | null }> {
    return (await supabase
      .from('agent_employee_templates')
      .select('role_key, default_name, role')
      .or(`role_key.eq.${targetKey},default_name.ilike.${targetKey}`)
      .limit(3)) as {
      data: TemplateRow[] | null
      error: QueryError | null
    }
  }

  async findCampaignAgent(
    supabase: SupabaseClient,
    input: { campaignId: string; agentKey: string },
  ): Promise<QueryResult<{ agent_key: string }>> {
    return (await supabase
      .from('campaign_agents')
      .select('agent_key')
      .eq('campaign_id', input.campaignId)
      .eq('agent_key', input.agentKey)
      .maybeSingle()) as QueryResult<{ agent_key: string }>
  }

  async listRoster(
    supabase: SupabaseClient,
    input: { userId: string; orgId: string | null },
  ): Promise<{
    data: Array<{ agent_key: string; name: string | null; role: string | null }> | null
    error: QueryError | null
  }> {
    let query = supabase
      .from('agents_registry')
      .select('agent_key, name, role')
      .order('created_at', { ascending: true })
      .limit(20)
    query = input.orgId
      ? query.eq('org_id', input.orgId).is('user_id', null)
      : query.eq('user_id', input.userId).is('org_id', null)
    return (await query) as {
      data: Array<{ agent_key: string; name: string | null; role: string | null }> | null
      error: QueryError | null
    }
  }

  async listTemplates(
    supabase: SupabaseClient,
  ): Promise<{ data: TemplateRow[] | null; error: QueryError | null }> {
    return (await supabase
      .from('agent_employee_templates')
      .select('role_key, default_name, role')
      .order('role_key', { ascending: true })
      .limit(30)) as {
      data: TemplateRow[] | null
      error: QueryError | null
    }
  }

  async listCompletedDelegationHistory(
    serviceClient: SupabaseClient,
    input: { targetAgentKey: string; conversationId: string; currentDelegationId: string },
  ): Promise<{ data: DelegationHistoryRow[] | null; error: QueryError | null }> {
    return (await serviceClient
      .from('agent_delegations')
      .select('prompt, response, type, created_at')
      .eq('target_agent_key', input.targetAgentKey)
      .eq('conversation_id', input.conversationId)
      .eq('status', 'completed')
      .neq('id', input.currentDelegationId)
      .order('created_at', { ascending: true })
      .limit(5)) as {
      data: DelegationHistoryRow[] | null
      error: QueryError | null
    }
  }

  async insertDelegation(
    serviceClient: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ error: QueryError | null }> {
    return (await serviceClient.from('agent_delegations').insert(payload)) as {
      error: QueryError | null
    }
  }

  async updateDelegation(
    serviceClient: SupabaseClient,
    input: { delegationId: string; payload: Record<string, unknown> },
  ): Promise<{ error: QueryError | null }> {
    return (await serviceClient
      .from('agent_delegations')
      .update(input.payload)
      .eq('id', input.delegationId)) as {
      error: QueryError | null
    }
  }

  async findHireAssignmentAgent(
    supabase: SupabaseClient,
    agentKey: string,
  ): Promise<QueryResult<AgentRegistryRow>> {
    return (await supabase
      .from('agents_registry')
      .select('agent_key, name, role, image_url')
      .eq('agent_key', agentKey)
      .maybeSingle()) as QueryResult<AgentRegistryRow>
  }

  async upsertCampaignAgent(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('campaign_agents')
      .upsert(payload, { onConflict: 'campaign_id,agent_key' })) as {
      error: QueryError | null
    }
  }
}
