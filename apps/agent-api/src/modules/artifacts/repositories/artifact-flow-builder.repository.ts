import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type JsonRecord = Record<string, unknown>
type QueryError = { message: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type QueryListResult<T> = { data: T[] | null; error: QueryError | null }

@Injectable()
export class ArtifactFlowBuilderRepository {
  async findSpace(supabase: SupabaseClient, spaceId: string): Promise<QueryResult<JsonRecord>> {
    return (await supabase
      .from('spaces')
      .select('id, title, user_id, org_id, schema')
      .eq('id', spaceId)
      .maybeSingle()) as QueryResult<JsonRecord>
  }

  async listSpaceAutomations(
    supabase: SupabaseClient,
    input: { spaceId: string; limit: number },
  ): Promise<QueryListResult<JsonRecord>> {
    return (await supabase
      .from('space_automations')
      .select('id, name, enabled, is_draft, trigger, actions, updated_at')
      .eq('space_id', input.spaceId)
      .limit(input.limit)) as QueryListResult<JsonRecord>
  }

  async findFlow(
    supabase: SupabaseClient,
    input: { spaceId: string; automationId: string },
  ): Promise<QueryResult<JsonRecord>> {
    return (await supabase
      .from('space_automations')
      .select('id, name, enabled, is_draft')
      .eq('space_id', input.spaceId)
      .eq('id', input.automationId)
      .maybeSingle()) as QueryResult<JsonRecord>
  }

  async createSpaceAutomation(
    supabase: SupabaseClient,
    payload: JsonRecord,
  ): Promise<{ data: JsonRecord; error: QueryError | null }> {
    return (await supabase.from('space_automations').insert(payload).select().single()) as {
      data: JsonRecord
      error: QueryError | null
    }
  }

  async updateSpaceAutomation(
    supabase: SupabaseClient,
    input: {
      spaceId: string
      automationId: string
      patch: JsonRecord
    },
  ): Promise<{ data: JsonRecord | null; error: QueryError | null }> {
    return (await supabase
      .from('space_automations')
      .update(input.patch)
      .eq('space_id', input.spaceId)
      .eq('id', input.automationId)
      .select()
      .maybeSingle()) as {
      data: JsonRecord | null
      error: QueryError | null
    }
  }

  async findLatestBuildSession(
    supabase: SupabaseClient,
    spaceId: string,
  ): Promise<QueryResult<JsonRecord>> {
    return (await supabase
      .from('project_flow_build_session')
      .select('*')
      .eq('space_id', spaceId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as QueryResult<JsonRecord>
  }

  async findLatestBuildSessionForConversation(
    supabase: SupabaseClient,
    input: { spaceId: string; conversationId: string },
  ): Promise<QueryResult<JsonRecord>> {
    return (await supabase
      .from('project_flow_build_session')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('conversation_id', input.conversationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()) as QueryResult<JsonRecord>
  }

  async findBuildSession(
    supabase: SupabaseClient,
    input: { spaceId: string; sessionId: string },
  ): Promise<QueryResult<JsonRecord>> {
    return (await supabase
      .from('project_flow_build_session')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('id', input.sessionId)
      .maybeSingle()) as QueryResult<JsonRecord>
  }

  async createBuildSession(
    supabase: SupabaseClient,
    payload: JsonRecord,
  ): Promise<{ data: JsonRecord; error: QueryError | null }> {
    return (await supabase
      .from('project_flow_build_session')
      .insert(payload)
      .select()
      .single()) as { data: JsonRecord; error: QueryError | null }
  }

  async updateBuildSession(
    supabase: SupabaseClient,
    input: { spaceId: string; sessionId: string; updates: JsonRecord },
  ): Promise<{ data: JsonRecord; error: QueryError | null }> {
    return (await supabase
      .from('project_flow_build_session')
      .update(input.updates)
      .eq('space_id', input.spaceId)
      .eq('id', input.sessionId)
      .select()
      .single()) as { data: JsonRecord; error: QueryError | null }
  }

  async createClarificationRows(
    supabase: SupabaseClient,
    rows: JsonRecord[],
  ): Promise<{ error: QueryError | null }> {
    return (await supabase.from('project_flow_build_clarification').insert(rows)) as {
      error: QueryError | null
    }
  }

  async updateClarificationAnswers(
    supabase: SupabaseClient,
    input: { sessionId: string; updates: JsonRecord },
  ): Promise<{ error: QueryError | null }> {
    return (await supabase
      .from('project_flow_build_clarification')
      .update(input.updates)
      .eq('session_id', input.sessionId)) as { error: QueryError | null }
  }

  async listBlueprintsForSpace(
    supabase: SupabaseClient,
    input: { spaceId: string; limit: number },
  ): Promise<QueryListResult<JsonRecord>> {
    return (await supabase
      .from('project_flow_action_blueprint')
      .select('*')
      .or(`space_id.eq.${input.spaceId},space_id.is.null`)
      .order('updated_at', { ascending: false })
      .limit(input.limit)) as QueryListResult<JsonRecord>
  }

  async findBlueprint(
    supabase: SupabaseClient,
    blueprintId: string,
  ): Promise<QueryResult<JsonRecord>> {
    return (await supabase
      .from('project_flow_action_blueprint')
      .select('*')
      .eq('id', blueprintId)
      .maybeSingle()) as QueryResult<JsonRecord>
  }

  async createBlueprint(
    supabase: SupabaseClient,
    payload: JsonRecord,
  ): Promise<{ data: JsonRecord; error: QueryError | null }> {
    return (await supabase
      .from('project_flow_action_blueprint')
      .insert(payload)
      .select()
      .single()) as { data: JsonRecord; error: QueryError | null }
  }

  async updateBlueprint(
    supabase: SupabaseClient,
    input: { blueprintId: unknown; updates: JsonRecord },
  ): Promise<{ data: JsonRecord; error: QueryError | null }> {
    return (await supabase
      .from('project_flow_action_blueprint')
      .update(input.updates)
      .eq('id', input.blueprintId)
      .select()
      .single()) as { data: JsonRecord; error: QueryError | null }
  }

  async createEvaluation(
    supabase: SupabaseClient,
    payload: JsonRecord,
  ): Promise<{ data: JsonRecord; error: QueryError | null }> {
    return (await supabase
      .from('project_flow_build_evaluation')
      .insert(payload)
      .select()
      .single()) as { data: JsonRecord; error: QueryError | null }
  }
}
