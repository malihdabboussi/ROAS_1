import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type RuntimeScope = {
  agentKey: string
  userId: string
  orgId?: string | null
  skillKeys?: string[]
}

type InstructionFilter = {
  agent_key?: string
  user_id?: string
  org_id?: string
}

type QueryResult = {
  rows: Array<Record<string, unknown>>
  errorMessage: string | null
}

type QueryError = {
  message?: string
}

type ListQueryResult = {
  data: unknown[] | null
  error: QueryError | null
}

type MaybeRecordQueryResult = {
  data: Record<string, unknown> | null
  error: QueryError | null
}

type UpdateQueryResult = {
  data: unknown | null
  error: QueryError | null
}

type ListQuery = PromiseLike<ListQueryResult> & {
  eq(field: string, value: unknown): ListQuery
  in(field: string, values: unknown[]): ListQuery
  is(field: string, value: null): ListQuery
  limit(count: number): ListQuery
  or(filter: string): ListQuery
}

type MaybeRecordQuery = {
  eq(field: string, value: unknown): MaybeRecordQuery
  is(field: string, value: null): MaybeRecordQuery
  limit(count: number): MaybeRecordQuery
  maybeSingle(): Promise<MaybeRecordQueryResult>
  single(): Promise<MaybeRecordQueryResult>
}

type UpdateQuery = PromiseLike<UpdateQueryResult> & {
  eq(field: string, value: unknown): UpdateQuery
  is(field: string, value: null): UpdateQuery
}

type TableQuery = {
  select(columns: string): ListQuery
  update(payload: Record<string, unknown>): UpdateQuery
}

@Injectable()
export class AgentSyncRepository {
  async listSystemAgentKeys(supabase: SupabaseClient): Promise<QueryResult> {
    const { data, error } = await this.table(supabase, 'agents_registry')
      .select('agent_key')
      .eq('is_system', true)
    return {
      rows: (data ?? []) as Array<Record<string, unknown>>,
      errorMessage: error?.message ?? null,
    }
  }

  async listDeniedSkillOverrides(
    supabase: SupabaseClient,
    input: { userId: string | null; orgId: string | null },
  ): Promise<QueryResult> {
    let query = this.table(supabase, 'agent_overrides')
      .select('agent_key, capability_id, mode, user_id, org_id')
      .eq('capability_kind', 'skill')
      .eq('mode', 'deny')
    if (input.orgId) query = query.eq('org_id', input.orgId).is('user_id', null)
    else if (input.userId) query = query.is('org_id', null).eq('user_id', input.userId)
    else return { rows: [], errorMessage: null }
    const { data, error } = await query
    return {
      rows: (data ?? []) as Array<Record<string, unknown>>,
      errorMessage: error?.message ?? null,
    }
  }

  async findProfileIdByMachineId(
    supabase: SupabaseClient,
    input: { machineColumn: string; machineId: string },
  ): Promise<MaybeRecordQueryResult> {
    const query = this.table(supabase, 'profiles')
      .select('id')
      .eq(input.machineColumn, input.machineId)
      .limit(1) as unknown as MaybeRecordQuery
    return query.single()
  }

  async updateProfileMachineId(
    supabase: SupabaseClient,
    input: { userId: string; machineColumn: string; machineId: string },
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'profiles')
      .update({ [input.machineColumn]: input.machineId })
      .eq('id', input.userId)
    return error
  }

  async listRuntimeSkills(supabase: SupabaseClient, input: RuntimeScope): Promise<QueryResult> {
    let query = this.applyRuntimeScope(
      this.table(supabase, 'agent_skills')
        .select(
          'id, agent_key, skill_key, name, description, markdown_content, is_enabled, archetype_filter, user_id, org_id',
        )
        .or(`agent_key.eq.${input.agentKey},agent_key.eq.*`)
        .eq('is_enabled', true),
      input,
    )
    if (input.skillKeys?.length) query = query.in('skill_key', input.skillKeys)
    const { data, error } = await query
    return { rows: (data ?? []) as Array<Record<string, unknown>>, errorMessage: error?.message ?? null }
  }

  async listRuntimeSkillResources(
    supabase: SupabaseClient,
    input: RuntimeScope,
  ): Promise<QueryResult> {
    let query = this.applyRuntimeScope(
      this.table(supabase, 'agent_skill_resources')
        .select(
          'agent_key, skill_key, file_path, content, content_type, storage_url, user_id, org_id',
        )
        .or(`agent_key.eq.${input.agentKey},agent_key.eq.*`),
      input,
    )
    if (input.skillKeys?.length) query = query.in('skill_key', input.skillKeys)
    const { data, error } = await query
    return { rows: (data ?? []) as Array<Record<string, unknown>>, errorMessage: error?.message ?? null }
  }

  async listRuntimeSkillMetadata(
    supabase: SupabaseClient,
    input: RuntimeScope,
  ): Promise<QueryResult> {
    let query = this.applyRuntimeScope(
      this.table(supabase, 'agent_skills')
        .select(
          'id, agent_key, skill_key, name, description, is_enabled, archetype_filter, user_id, org_id',
        )
        .or(`agent_key.eq.${input.agentKey},agent_key.eq.*`)
        .eq('is_enabled', true),
      input,
    )
    if (input.skillKeys?.length) query = query.in('skill_key', input.skillKeys)
    const { data, error } = await query
    return { rows: (data ?? []) as Array<Record<string, unknown>>, errorMessage: error?.message ?? null }
  }

  async lookupAgentArchetypeConfig(
    supabase: SupabaseClient,
    input: { agentKey: string; userId: string; orgId?: string | null },
  ): Promise<{ config: Record<string, unknown> | null; errorMessage: string | null }> {
    let query = this.table(supabase, 'agents_registry')
      .select('config')
      .eq('agent_key', input.agentKey)
      .limit(1) as unknown as MaybeRecordQuery
    if (input.orgId) query = query.eq('org_id', input.orgId).is('user_id', null)
    else query = query.eq('user_id', input.userId).is('org_id', null)
    const { data, error } = await query.maybeSingle()
    const config =
      data?.config && typeof data.config === 'object'
        ? (data.config as Record<string, unknown>)
        : null
    return { config, errorMessage: error?.message ?? null }
  }

  async listSkillLibraryResources(
    supabase: SupabaseClient,
    skillKeys: string[],
  ): Promise<QueryResult> {
    const { data, error } = await this.table(supabase, 'skill_library_resources')
      .select('skill_key, file_path, content, content_type, storage_url')
      .in('skill_key', skillKeys)
    return { rows: (data ?? []) as Array<Record<string, unknown>>, errorMessage: error?.message ?? null }
  }

  async listVibeyApiSkillAuditRows(
    supabase: SupabaseClient,
    input: InstructionFilter,
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'agent_skills')
      .select('id, user_id, org_id, agent_key, skill_key, markdown_content, is_enabled')
      .eq('skill_key', 'vibey-api')
    query = this.applyInstructionFilter(query, input)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listToolsDefinitionAuditRows(
    supabase: SupabaseClient,
    input: InstructionFilter,
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'agent_definitions')
      .select('id, user_id, org_id, agent_key, file_name, content, source')
      .eq('file_name', 'TOOLS.md')
    query = this.applyInstructionFilter(query, input)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listRepairableVibeyApiSkillRows(
    supabase: SupabaseClient,
    input: InstructionFilter,
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'agent_skills')
      .select('id, agent_key, user_id, org_id, source, is_enabled')
      .eq('skill_key', 'vibey-api')
    query = this.applyInstructionFilter(query, input)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async updatePlatformVibeyApiSkill(
    supabase: SupabaseClient,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.table(supabase, 'agent_skills')
      .update(payload)
      .eq('id', id)
      .eq('source', 'system')
      .is('user_id', null)
      .is('org_id', null)
    if (error) throw error
  }

  async listRepairableToolsDefinitionRows(
    supabase: SupabaseClient,
    input: InstructionFilter,
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'agent_definitions')
      .select('id, agent_key, file_name, user_id, org_id, source, content')
      .eq('file_name', 'TOOLS.md')
    query = this.applyInstructionFilter(query, input)
    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async updateToolsDefinition(
    supabase: SupabaseClient,
    row: { id: string; source: string | null },
    payload: Record<string, unknown>,
  ): Promise<void> {
    let updateQuery = this.table(supabase, 'agent_definitions').update(payload).eq('id', row.id)
    updateQuery = row.source ? updateQuery.eq('source', row.source) : updateQuery.is('source', null)
    const { error } = await updateQuery
    if (error) throw error
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }

  private applyRuntimeScope(query: ListQuery, input: RuntimeScope): ListQuery {
    if (input.orgId) {
      return query.or(`org_id.eq.${input.orgId},org_id.is.null`).is('user_id', null)
    }
    return query.or(`user_id.eq.${input.userId},user_id.is.null`).is('org_id', null)
  }

  private applyInstructionFilter(query: ListQuery, input: InstructionFilter): ListQuery {
    if (input.agent_key) query = query.eq('agent_key', input.agent_key)
    if (input.user_id) query = query.eq('user_id', input.user_id)
    if (input.org_id) query = query.eq('org_id', input.org_id)
    return query
  }
}
