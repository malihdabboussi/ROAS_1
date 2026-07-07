import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type QueryError = { message?: string }
type ListResult<T = Record<string, unknown>> = { data: T[] | null; error: QueryError | null }

type ListQuery<T = Record<string, unknown>> = PromiseLike<ListResult<T>> & {
  eq(field: string, value: unknown): ListQuery<T>
  in(field: string, values: unknown[]): ListQuery<T>
  is(field: string, value: null): ListQuery<T>
  limit(count: number): ListQuery<T>
  maybeSingle<R = T>(): Promise<{ data: R | null; error: QueryError | null }>
  or(filter: string): ListQuery<T>
  order(field: string, options?: { ascending?: boolean; nullsFirst?: boolean }): ListQuery<T>
}

type TableQuery = {
  select<T = Record<string, unknown>>(columns: string): ListQuery<T>
}

@Injectable()
export class AgentSyncMaterializationRepository {
  async listPersonalDefinitionsForAll(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<ListResult> {
    return this.table(supabase, 'agent_definitions')
      .select('agent_key, file_name, content, archetype_filter, user_id, org_id')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .is('org_id', null)
      .order('user_id', { nullsFirst: true })
  }

  async listPersonalSkillsForAll(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<ListResult> {
    return this.table(supabase, 'agent_skills')
      .select(
        'id, agent_key, skill_key, name, description, markdown_content, is_enabled, archetype_filter, user_id, org_id',
      )
      .or(`user_id.eq.${userId},user_id.is.null`)
      .is('org_id', null)
      .eq('is_enabled', true)
  }

  async listPersonalSkillResourcesForAll(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<ListResult> {
    return this.table(supabase, 'agent_skill_resources')
      .select('agent_key, skill_key, file_path, content, content_type, storage_url, user_id, org_id')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .is('org_id', null)
  }

  async listPersonalWorkflowsForAll(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<ListResult> {
    return this.table(supabase, 'agent_workflows')
      .select(
        'id, agent_key, workflow_key, name, description, markdown_content, steps, is_enabled, archetype_filter',
      )
      .or(`user_id.eq.${userId},user_id.is.null`)
      .is('org_id', null)
      .eq('is_enabled', true)
  }

  async listPersonalRegistryRowsForAll(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<ListResult> {
    return this.table(supabase, 'agents_registry')
      .select('agent_key, role, level, config')
      .eq('user_id', userId)
      .is('org_id', null)
  }

  async listPersonalAgentDefinitions(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; isSystemAgent: boolean },
  ): Promise<ListResult> {
    let query = this.table(supabase, 'agent_definitions')
      .select('file_name, content, archetype_filter, user_id, org_id')
      .is('org_id', null)
      .eq('agent_key', input.agentKey)
    query = input.isSystemAgent
      ? query.is('user_id', null)
      : query.or(`user_id.eq.${input.userId},user_id.is.null`)
    return query.order('user_id', { nullsFirst: true })
  }

  async listPersonalAgentRegistryRows(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; isSystemAgent?: boolean },
  ): Promise<ListResult> {
    if (input.isSystemAgent) {
      return this.table(supabase, 'agents_registry')
        .select('agent_key, role, level, config')
        .is('user_id', null)
        .is('org_id', null)
        .eq('agent_key', input.agentKey)
        .limit(1)
    }
    return this.table(supabase, 'agents_registry')
      .select('agent_key, role, level, config')
      .eq('user_id', input.userId)
      .is('org_id', null)
      .eq('agent_key', input.agentKey)
      .limit(1)
  }

  async listPersonalAgentWorkflows(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string },
  ): Promise<ListResult> {
    return this.table(supabase, 'agent_workflows')
      .select(
        'id, agent_key, workflow_key, name, description, markdown_content, steps, is_enabled, archetype_filter',
      )
      .or(`user_id.eq.${input.userId},user_id.is.null`)
      .is('org_id', null)
      .eq('agent_key', input.agentKey)
      .eq('is_enabled', true)
  }

  async listOrgAgentDefinitions(
    supabase: SupabaseClient,
    input: { orgId: string; agentKey: string; isSystemAgent: boolean },
  ): Promise<ListResult> {
    let query = this.table(supabase, 'agent_definitions')
      .select('agent_key, file_name, content, archetype_filter, user_id, org_id')
      .is('user_id', null)
      .eq('agent_key', input.agentKey)
    query = input.isSystemAgent
      ? query.is('org_id', null)
      : query.or(`org_id.eq.${input.orgId},org_id.is.null`)
    return query.order('org_id', { nullsFirst: true })
  }

  async listOrgAgentSkills(
    supabase: SupabaseClient,
    input: { orgId: string; agentKey: string },
  ): Promise<ListResult> {
    return this.table(supabase, 'agent_skills')
      .select(
        'id, org_id, agent_key, skill_key, name, description, markdown_content, is_enabled, archetype_filter, user_id',
      )
      .is('user_id', null)
      .or(`agent_key.eq.${input.agentKey},agent_key.eq.*`)
      .eq('is_enabled', true)
      .or(`org_id.eq.${input.orgId},org_id.is.null`)
  }

  async listOrgAgentSkillResources(
    supabase: SupabaseClient,
    input: { orgId: string; agentKey: string },
  ): Promise<ListResult> {
    return this.table(supabase, 'agent_skill_resources')
      .select('org_id, agent_key, skill_key, file_path, content, content_type, storage_url, user_id')
      .is('user_id', null)
      .or(`agent_key.eq.${input.agentKey},agent_key.eq.*`)
      .or(`org_id.eq.${input.orgId},org_id.is.null`)
  }

  async listOrgAgentWorkflows(
    supabase: SupabaseClient,
    input: { orgId: string; agentKey: string },
  ): Promise<ListResult> {
    return this.table(supabase, 'agent_workflows')
      .select(
        'id, org_id, agent_key, workflow_key, name, description, markdown_content, steps, is_enabled, archetype_filter',
      )
      .or(`org_id.eq.${input.orgId},org_id.is.null`)
      .is('user_id', null)
      .or(`agent_key.eq.${input.agentKey},agent_key.eq.*`)
      .eq('is_enabled', true)
  }

  async listOrgAgentRegistryRows(
    supabase: SupabaseClient,
    input: { orgId: string; agentKey: string },
  ): Promise<ListResult> {
    return this.table(supabase, 'agents_registry')
      .select('agent_key, user_id, org_id, role, level, config')
      .eq('org_id', input.orgId)
      .is('user_id', null)
      .eq('agent_key', input.agentKey)
      .limit(1)
  }

  async listActiveOrgMemberships(supabase: SupabaseClient, userId: string): Promise<ListResult> {
    return this.table(supabase, 'org_members')
      .select('org_id')
      .eq('user_id', userId)
      .eq('status', 'active')
  }

  async listOrgAgentKeys(supabase: SupabaseClient, orgId: string): Promise<ListResult> {
    return this.table(supabase, 'agents_registry')
      .select('agent_key')
      .eq('org_id', orgId)
      .is('user_id', null)
  }

  async listOrgSharedSkillsByOrgIds(
    supabase: SupabaseClient,
    orgIds: readonly string[],
  ): Promise<ListResult> {
    return this.table(supabase, 'org_shared_skills')
      .select('skill_name, skill_content')
      .in('org_id', [...orgIds])
  }

  async findOrganizationOwner(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await this.table(supabase, 'organizations')
      .select('owner_id')
      .eq('id', orgId)
      .maybeSingle()
    return data
  }

  async listOrganizationOwnersByIds(
    supabase: SupabaseClient,
    orgIds: readonly string[],
  ): Promise<ListResult> {
    return this.table(supabase, 'organizations')
      .select('owner_id')
      .in('id', [...orgIds])
  }

  async listOrgSharedSkillsByOwnerIds(
    supabase: SupabaseClient,
    ownerIds: readonly string[],
  ): Promise<ListResult> {
    return this.table(supabase, 'org_shared_skills')
      .select('skill_name, skill_content')
      .in('owner_id', [...ownerIds])
  }

  async listBrainLibraryBrains(supabase: SupabaseClient, userId: string): Promise<ListResult> {
    return this.table(supabase, 'ns_brains')
      .select('id, agent_id, campaign_id, is_default')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
  }

  async listBrainNarrativePages(
    supabase: SupabaseClient,
    brainId: unknown,
  ): Promise<ListResult> {
    return this.table(supabase, 'ns_narrative_pages')
      .select('slug, content_md, page_type')
      .eq('brain_id', brainId)
      .eq('status', 'active')
  }

  async listBrainLogEntries(supabase: SupabaseClient, brainId: unknown): Promise<ListResult> {
    return this.table(supabase, 'ns_brain_log')
      .select('event_type, summary, affected_pages, created_at')
      .eq('brain_id', brainId)
      .order('created_at', { ascending: false })
      .limit(20)
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }
}
