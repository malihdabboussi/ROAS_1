import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope } from '@vibey/api-shared'
import type { AgentCheckpointSnapshot } from '../../shared/services/request-context.service'

type QueryError = { message?: string }
type ListResult = { data: unknown[] | null; error: QueryError | null }
type MutateResult = { data: unknown | null; error: QueryError | null }

type ListQuery = PromiseLike<ListResult> & {
  eq(field: string, value: unknown): ListQuery
  is(field: string, value: null): ListQuery
  limit(count: number): ListQuery
  order(field: string, options?: { ascending?: boolean }): ListQuery
}

type TableQuery = {
  insert(payload: Record<string, unknown>): Promise<MutateResult>
  select(columns: string): ListQuery
}

@Injectable()
export class AgentEditCheckpointRepository {
  async hasAnyCheckpoint(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<boolean> {
    let query = this.table(supabase, 'agent_checkpoints')
      .select('id')
      .eq('agent_key', input.agentKey)
      .limit(1)
    query = this.applyOwnerScope(query, input.userId, input.orgId)
    const { data, error } = await query
    if (error) throw new Error(`Failed to check checkpoints: ${error.message}`)
    return (data ?? []).length > 0
  }

  async hasDuplicateMessageCheckpoint(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      agentKey: string
      messageId: string
      kind: 'auto_turn' | 'baseline'
    },
  ): Promise<boolean> {
    let query = this.table(supabase, 'agent_checkpoints')
      .select('id')
      .eq('source_message_id', input.messageId)
      .eq('agent_key', input.agentKey)
      .eq('kind', input.kind)
      .limit(1)
    query = this.applyOwnerScope(query, input.userId, input.orgId)
    const { data, error } = await query
    if (error) throw new Error(`Failed checkpoint duplicate lookup: ${error.message}`)
    return (data ?? []).length > 0
  }

  async insertCheckpoint(
    supabase: SupabaseClient,
    input: {
      userId: string
      orgId?: string | null
      agentKey: string
      conversationId: string
      messageId: string | null
      kind: 'auto_turn' | 'baseline'
      summary: string
      snapshot: AgentCheckpointSnapshot
    },
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'agent_checkpoints').insert({
      user_id: input.orgId ? null : input.userId,
      org_id: input.orgId ?? null,
      agent_key: input.agentKey,
      source_conversation_id: input.conversationId,
      source_message_id: input.messageId,
      kind: input.kind,
      summary: input.summary,
      snapshot: input.snapshot,
    })
    return error
  }

  async listAgentDefinitions(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<ListResult> {
    let query = this.table(supabase, 'agent_definitions')
      .select('file_name, content')
      .eq('agent_key', input.agentKey)
      .order('file_name', { ascending: true })
    query = this.applyOwnerScope(query, input.userId, input.orgId)
    return query
  }

  async listAgentSkills(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null; agentKey: string },
  ): Promise<ListResult> {
    let query = this.table(supabase, 'agent_skills')
      .select('skill_key, name, description, markdown_content, is_enabled')
      .eq('agent_key', input.agentKey)
      .order('skill_key', { ascending: true })
    query = this.applyOwnerScope(query, input.userId, input.orgId)
    return query
  }

  private applyOwnerScope(
    query: ListQuery,
    userId: string,
    orgId: string | null | undefined,
  ): ListQuery {
    return applyOwnerScope(query, { userId, orgId: orgId ?? null }) as ListQuery
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }
}
