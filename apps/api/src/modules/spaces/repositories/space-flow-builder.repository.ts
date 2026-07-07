import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type JsonRecord = Record<string, unknown>

@Injectable()
export class SpaceFlowBuilderRepository {
  async createSession(
    supabase: SupabaseClient,
    input: {
      org_id?: string | null
      space_id: string
      created_by: string
      status: string
      intent: string
      plan: JsonRecord
      context_hash?: string | null
      trace_events: JsonRecord[]
      clarification_questions?: JsonRecord[]
      validation_errors: string[]
      conversation_id?: string | null
    },
  ) {
    const { data, error } = await supabase
      .from('project_flow_build_session')
      .insert({ ...input, clarification_questions: input.clarification_questions ?? [] })
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as JsonRecord
  }

  async getSession(supabase: SupabaseClient, spaceId: string, sessionId: string) {
    const { data, error } = await supabase
      .from('project_flow_build_session')
      .select('*')
      .eq('space_id', spaceId)
      .eq('id', sessionId)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data ?? null) as JsonRecord | null
  }

  async getLatestSession(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('project_flow_build_session')
      .select('*')
      .eq('space_id', spaceId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data ?? null) as JsonRecord | null
  }

  async getLatestSessionForConversation(
    supabase: SupabaseClient,
    spaceId: string,
    conversationId: string,
  ) {
    const { data, error } = await supabase
      .from('project_flow_build_session')
      .select('*')
      .eq('space_id', spaceId)
      .eq('conversation_id', conversationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data ?? null) as JsonRecord | null
  }

  async listSessions(supabase: SupabaseClient, spaceId: string) {
    const { data, error } = await supabase
      .from('project_flow_build_session')
      .select('id, space_id, conversation_id, automation_id, status, intent, plan, updated_at')
      .eq('space_id', spaceId)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as JsonRecord[]
  }

  async updateSession(
    supabase: SupabaseClient,
    spaceId: string,
    sessionId: string,
    patch: JsonRecord,
  ) {
    const { data, error } = await supabase
      .from('project_flow_build_session')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('space_id', spaceId)
      .eq('id', sessionId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as JsonRecord
  }

  async deleteSession(supabase: SupabaseClient, spaceId: string, sessionId: string) {
    const { error: clarificationError } = await supabase
      .from('project_flow_build_clarification')
      .delete()
      .eq('space_id', spaceId)
      .eq('session_id', sessionId)
    if (clarificationError) throw new BadRequestException(clarificationError.message)
    const { error: evaluationError } = await supabase
      .from('project_flow_build_evaluation')
      .delete()
      .eq('session_id', sessionId)
    if (evaluationError) throw new BadRequestException(evaluationError.message)
    const { error } = await supabase
      .from('project_flow_build_session')
      .delete()
      .eq('space_id', spaceId)
      .eq('id', sessionId)
    if (error) throw new BadRequestException(error.message)
    return { deleted: true }
  }

  async createClarifications(
    supabase: SupabaseClient,
    input: {
      session_id: string
      org_id?: string | null
      space_id: string
      created_by: string
      questions: JsonRecord[]
    },
  ) {
    if (input.questions.length === 0) return []
    const rows = input.questions.map((question) => ({
      session_id: input.session_id,
      org_id: input.org_id ?? null,
      space_id: input.space_id,
      created_by: input.created_by,
      question,
      status: 'open',
    }))
    const { data, error } = await supabase
      .from('project_flow_build_clarification')
      .insert(rows)
      .select()
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as JsonRecord[]
  }

  async listClarificationsForSession(
    supabase: SupabaseClient,
    input: { spaceId: string; sessionId: string },
  ) {
    const { data, error } = await supabase
      .from('project_flow_build_clarification')
      .select('*')
      .eq('space_id', input.spaceId)
      .eq('session_id', input.sessionId)
      .order('created_at', { ascending: true })
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as JsonRecord[]
  }

  async answerClarifications(supabase: SupabaseClient, sessionId: string, answers: JsonRecord) {
    const { data, error } = await supabase
      .from('project_flow_build_clarification')
      .update({ answer: answers, status: 'answered', updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .select()
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as JsonRecord[]
  }

  async listBlueprints(
    supabase: SupabaseClient,
    input: { space_id: string; org_id?: string | null; status?: string; limit?: number },
  ) {
    let query = supabase
      .from('project_flow_action_blueprint')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(input.limit ?? 20)
    query = query.or(
      input.org_id
        ? `space_id.eq.${input.space_id},and(space_id.is.null,org_id.eq.${input.org_id})`
        : `space_id.eq.${input.space_id}`,
    )
    if (input.status) query = query.eq('status', input.status)
    const { data, error } = await query
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as JsonRecord[]
  }

  async getBlueprint(supabase: SupabaseClient, spaceId: string, blueprintId: string) {
    const { data, error } = await supabase
      .from('project_flow_action_blueprint')
      .select('*')
      .eq('id', blueprintId)
      .or(`space_id.eq.${spaceId},space_id.is.null`)
      .maybeSingle()
    if (error) throw new BadRequestException(error.message)
    return (data ?? null) as JsonRecord | null
  }

  async createBlueprint(
    supabase: SupabaseClient,
    input: {
      org_id?: string | null
      space_id?: string | null
      created_by: string
      name: string
      description?: string | null
      category: string
      input_schema: JsonRecord
      action_template: JsonRecord
      required_contexts: string[]
      output_contexts: string[]
    },
  ) {
    const { data, error } = await supabase
      .from('project_flow_action_blueprint')
      .insert({ ...input, status: 'draft' })
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    const row = data as JsonRecord
    await this.createBlueprintVersion(supabase, {
      blueprint_id: String(row.id),
      org_id: input.org_id ?? null,
      space_id: input.space_id ?? null,
      created_by: input.created_by,
      version_number: 1,
      snapshot: row,
      change_note: 'Initial draft',
    })
    return row
  }

  async updateBlueprintStatus(
    supabase: SupabaseClient,
    blueprintId: string,
    status: 'draft' | 'active' | 'archived',
  ) {
    const { data, error } = await supabase
      .from('project_flow_action_blueprint')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', blueprintId)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as JsonRecord
  }

  async createEvaluation(
    supabase: SupabaseClient,
    input: {
      session_id?: string | null
      org_id?: string | null
      space_id: string
      created_by: string
      scenario_key?: string | null
      prompt: string
      trace_events: JsonRecord[]
      summary: JsonRecord
      score: number
      rank: string
    },
  ) {
    const { data, error } = await supabase
      .from('project_flow_build_evaluation')
      .insert(input)
      .select()
      .single()
    if (error) throw new BadRequestException(error.message)
    return data as JsonRecord
  }

  async listEvaluationsForSession(supabase: SupabaseClient, sessionId: string, limit = 5) {
    const { data, error } = await supabase
      .from('project_flow_build_evaluation')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw new BadRequestException(error.message)
    return (data ?? []) as JsonRecord[]
  }

  private async createBlueprintVersion(
    supabase: SupabaseClient,
    input: {
      blueprint_id: string
      org_id?: string | null
      space_id?: string | null
      created_by: string
      version_number: number
      snapshot: JsonRecord
      change_note: string
    },
  ) {
    const { error } = await supabase.from('project_flow_action_blueprint_version').insert(input)
    if (error) throw new BadRequestException(error.message)
  }
}
