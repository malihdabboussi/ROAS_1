import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TimelineEventRecord } from '../services/message-timeline.service'

type QueryError = { message?: string }
type ListResult = { data: unknown[] | null; error: QueryError | null }
type SingleResult<T = Record<string, unknown>> = { data: T | null; error: QueryError | null }
type MutateResult = { data: unknown | null; error: QueryError | null }

type ListQuery = PromiseLike<ListResult> & {
  eq(field: string, value: unknown): ListQuery
  in(field: string, values: unknown[]): ListQuery
  is(field: string, value: null): ListQuery
  limit(count: number): ListQuery
  not(field: string, operator: string, value: unknown): ListQuery
  order(field: string, options?: { ascending?: boolean }): ListQuery
  maybeSingle<T = Record<string, unknown>>(): Promise<SingleResult<T>>
}

type SingleQuery = {
  single<T = Record<string, unknown>>(): Promise<SingleResult<T>>
}

type InsertQuery = PromiseLike<MutateResult> & {
  select(columns: string): SingleQuery
}

type UpdateQuery = PromiseLike<MutateResult> & {
  eq(field: string, value: unknown): UpdateQuery
}

type TableQuery = {
  insert(payload: Record<string, unknown>): InsertQuery
  select(columns: string): ListQuery
  update(payload: Record<string, unknown>): UpdateQuery
  upsert(payload: Record<string, unknown>, options?: Record<string, unknown>): Promise<MutateResult>
}

@Injectable()
export class ChatRuntimeRepository {
  async findOrganizationSettings(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<{ settings?: unknown } | null> {
    const { data } = await this.table(supabase, 'organizations')
      .select('settings')
      .eq('id', orgId)
      .maybeSingle<{ settings?: unknown }>()
    return data
  }

  async insertSkillRecommendationEvent(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'skill_recommendation_events').insert(payload)
    return error
  }

  async insertTimelineEvent(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'vb_message_timeline_events').insert(payload)
    return error
  }

  async listTimelineEvents(
    supabase: SupabaseClient,
    input: { userId: string; conversationId: string; messageId: string },
  ): Promise<{ rows: TimelineEventRecord[]; error: QueryError | null }> {
    const { data, error } = await this.table(supabase, 'vb_message_timeline_events')
      .select('id, seq, type, payload, created_at')
      .eq('user_id', input.userId)
      .eq('conversation_id', input.conversationId)
      .eq('message_id', input.messageId)
      .order('seq', { ascending: true })
    return { rows: (data ?? []) as TimelineEventRecord[], error }
  }

  async insertTrace(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<{ id: string | null; error: QueryError | null }> {
    const { data, error } = await this.table(supabase, 'vb_agent_traces')
      .insert(payload)
      .select('id')
      .single<{ id?: string }>()
    return { id: data?.id ?? null, error }
  }

  async updateTrace(
    supabase: SupabaseClient,
    traceId: string,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'vb_agent_traces')
      .update(payload)
      .eq('id', traceId)
    return error
  }

  async upsertRuntimeRun(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'agent_runtime_runs').upsert(payload, {
      onConflict: 'run_id',
    })
    return error
  }

  async updateRuntimeRun(
    supabase: SupabaseClient,
    runId: string,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'agent_runtime_runs')
      .update(payload)
      .eq('run_id', runId)
    return error
  }

  async findLatestRuntimeRunForConversation(
    supabase: SupabaseClient,
    conversationId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await this.table(supabase, 'agent_runtime_runs')
      .select('run_id, message_id, status, error, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data
  }

  async insertRuntimeRunCheckpoint(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryError | null> {
    const { error } = await this.table(supabase, 'agent_runtime_run_checkpoints').insert(payload)
    return error
  }

  async findAgentState(
    supabase: SupabaseClient,
    input: { userId: string; agentId: string },
  ): Promise<{ state_content?: string | null } | null> {
    const { data } = await this.table(supabase, 'user_agent_state')
      .select('state_content')
      .eq('user_id', input.userId)
      .eq('agent_id', input.agentId)
      .maybeSingle<{ state_content?: string | null }>()
    return data
  }

  async findConversationReference(
    supabase: SupabaseClient,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await this.table(supabase, 'conversations')
      .select('id, user_id, org_id, title, agent_id, metadata')
      .eq('id', id)
      .maybeSingle()
    return data
  }

  async listConversationReferenceMessages(
    supabase: SupabaseClient,
    input: { conversationId: string; limit: number },
  ): Promise<Array<{ role: string; content: string | null }>> {
    const { data } = await this.table(supabase, 'messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', input.conversationId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(input.limit)
    return (data ?? []) as Array<{ role: string; content: string | null }>
  }

  async listPulseCampaigns(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'campaigns')
      .select('id, name, status')
      .eq('user_id', input.userId)
      .not('status', 'in', '("archived","completed")')
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async listPulseMissions(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'missions')
      .select('status')
      .eq('user_id', input.userId)
      .not('status', 'in', '("archived","cancelled")')
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query
    return (data ?? []) as Array<Record<string, unknown>>
  }

  async findPulseAgent(
    supabase: SupabaseClient,
    input: { userId: string; agentKey: string; orgId?: string | null },
  ): Promise<Record<string, unknown> | null> {
    let query = this.table(supabase, 'agents_registry')
      .select('level, config')
      .eq('user_id', input.userId)
      .eq('agent_key', input.agentKey)
    if (input.orgId !== undefined) {
      query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    }
    const { data } = await query.maybeSingle()
    return data
  }

  async listPulseSignals(
    supabase: SupabaseClient,
    input: { userId: string; orgId?: string | null },
  ): Promise<Array<Record<string, unknown>>> {
    let query = this.table(supabase, 'agent_signals')
      .select('signal_type')
      .eq('user_id', input.userId)
      .is('consumed_at', null)
    query = input.orgId ? query.eq('org_id', input.orgId) : query.is('org_id', null)
    const { data } = await query.order('created_at', { ascending: false }).limit(10)
    return (data ?? []) as Array<Record<string, unknown>>
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }
}
