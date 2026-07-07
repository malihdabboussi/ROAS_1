import { Injectable } from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { AgentFeedbackRepository } from '../../agent-feedback/repositories/agent-feedback.repository'
import type { SkillRecommendationJobRow } from '../types/skill-recommendations.types'

const SKILL_RECOMMENDATION_TABLES = {
  events: 'skill_recommendation_events',
  candidates: 'agent_improvement_candidates',
  jobs: 'agent_improvement_jobs',
  proposals: 'agent_improvement_proposals',
} as const

const AGENT_IMPROVEMENT_VISIBLE_STATUSES = [
  'ready',
  'experiment_running',
  'kept',
  'revising',
  'reverted',
  'inconclusive',
] as const

@Injectable()
export class SkillRecommendationsRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async readOrganizationSettings(orgId: string): Promise<any> {
    return this.svc.client.from('organizations').select('settings').eq('id', orgId).maybeSingle()
  }

  async updateOrganizationSettings(orgId: string, settings: Record<string, unknown>): Promise<any> {
    return this.svc.client.from('organizations').update({ settings }).eq('id', orgId)
  }

  async materializeAgentLearningDreamSettings(orgId: string): Promise<void> {
    const { data: org, error: orgError } = await this.svc.client
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .maybeSingle()
    if (orgError) throw new Error(`Failed to resolve organization owner: ${orgError.message}`)
    const ownerId = typeof org?.owner_id === 'string' ? org.owner_id : null
    if (!ownerId) return

    const [definitionResult, eventResult, feedbackResult] = await Promise.all([
      this.svc.client
        .from('agent_definitions')
        .select('agent_key')
        .or(`org_id.eq.${orgId},org_id.is.null`)
        .limit(500),
      this.svc.client
        .from(SKILL_RECOMMENDATION_TABLES.events)
        .select('agent_key')
        .eq('org_id', orgId)
        .limit(500),
      this.svc.client
        .from('agent_turn_feedback')
        .select('agent_key')
        .eq('org_id', orgId)
        .limit(500),
    ])
    if (definitionResult.error) {
      throw new Error(`Failed to load org agents: ${definitionResult.error.message}`)
    }
    if (eventResult.error) {
      throw new Error(`Failed to load agent recommendation signals: ${eventResult.error.message}`)
    }
    if (feedbackResult.error) {
      throw new Error(`Failed to load agent feedback signals: ${feedbackResult.error.message}`)
    }

    const agentKeys = new Set<string>()
    for (const row of [
      ...(definitionResult.data ?? []),
      ...(eventResult.data ?? []),
      ...(feedbackResult.data ?? []),
    ] as Array<{ agent_key?: string | null }>) {
      const key = String(row.agent_key || '').trim()
      if (key) agentKeys.add(key)
    }
    if (agentKeys.size === 0) return

    const rows = Array.from(agentKeys).map((agentKey) => ({
      org_id: orgId,
      user_id: ownerId,
      operation_type: 'agent_learning_dream',
      subject_kind: 'agent',
      subject_key: agentKey,
      target_id: null,
      enabled: true,
      schedule: 'daily',
      local_time: '02:30',
      timezone: 'UTC',
      lookback_hours: 24,
      min_activity_threshold: 1,
      metadata: { source: 'agent_improvement_proposals_settings' },
    }))
    const { error } = await this.svc.client.from('dream_ops_settings').upsert(rows, {
      onConflict: 'org_id,operation_type,subject_kind,subject_key',
    })
    if (error) throw new Error(`Failed to materialize Jaime Dream Ops settings: ${error.message}`)
  }

  async listReadyRecommendations(orgId: string, limit: number): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.proposals)
      .select('*')
      .eq('org_id', orgId)
      .in('status', AGENT_IMPROVEMENT_VISIBLE_STATUSES)
      .eq('customer_visible', true)
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  async getRecommendation(orgId: string, id: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.proposals)
      .select('*')
      .eq('org_id', orgId)
      .eq('id', id)
      .maybeSingle()
  }

  async updateRecommendationStatus(orgId: string, id: string, status: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.proposals)
      .update({ status })
      .eq('org_id', orgId)
      .eq('id', id)
      .select('*')
      .maybeSingle()
  }

  async updateCandidateStatusByOrg(
    orgId: string,
    candidateId: string,
    status: string,
  ): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.candidates)
      .update({ status })
      .eq('id', candidateId)
      .eq('org_id', orgId)
  }

  async listPendingCandidates(orgId: string, limit: number): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.candidates)
      .select('*')
      .eq('org_id', orgId)
      .in('status', ['open', 'analysis_queued', 'analysis_processing'])
      .order('last_event_at', { ascending: false })
      .limit(limit)
  }

  async listRecentEvents(orgId: string, since: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.events)
      .select('*')
      .eq('org_id', orgId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2000)
  }

  async listSystemAgentKeys(): Promise<any> {
    return this.svc.client
      .from('agent_definitions')
      .select('agent_key')
      .or('source.eq.system,org_id.is.null')
  }

  async upsertCandidate(payload: Record<string, unknown>): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.candidates)
      .upsert(payload, {
        onConflict: 'org_id,agent_key,prompt_fingerprint,tool_signature',
      })
      .select('id')
      .single()
  }

  async findActiveJob(orgId: string, dedupeKey: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.jobs)
      .select('id, status')
      .eq('org_id', orgId)
      .eq('dedupe_key', dedupeKey)
      .in('status', ['queued', 'processing', 'retry'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  }

  async insertJob(payload: Record<string, unknown>): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.jobs)
      .insert(payload)
      .select('id, status')
      .single()
  }

  async markOpenCandidateQueued(candidateId: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.candidates)
      .update({ status: 'analysis_queued' })
      .eq('id', candidateId)
      .eq('status', 'open')
  }

  async listDueJobs(slots: number, nowIso: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.jobs)
      .select('*')
      .in('status', ['queued', 'retry'])
      .lte('next_attempt_at', nowIso)
      .order('created_at', { ascending: true })
      .limit(slots)
  }

  async listStaleProcessingJobs(staleThreshold: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.jobs)
      .select('id, attempts, max_attempts')
      .eq('status', 'processing')
      .lt('started_at', staleThreshold)
      .limit(20)
  }

  async updateStaleJob(rowId: string, payload: Record<string, unknown>): Promise<any> {
    return this.svc.client.from(SKILL_RECOMMENDATION_TABLES.jobs).update(payload).eq('id', rowId)
  }

  async claimJob(job: SkillRecommendationJobRow, attempts: number): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.jobs)
      .update({
        status: 'processing',
        attempts,
        started_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', job.id)
      .in('status', ['queued', 'retry'])
      .select('*')
      .maybeSingle()
  }

  async markCandidateProcessing(candidateId: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.candidates)
      .update({ status: 'analysis_processing' })
      .eq('id', candidateId)
      .in('status', ['open', 'analysis_queued', 'analysis_processing'])
  }

  async updateCandidate(candidateId: string, payload: Record<string, unknown>): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.candidates)
      .update(payload)
      .eq('id', candidateId)
  }

  async upsertRecommendation(payload: Record<string, unknown>): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.proposals)
      .upsert(payload, { onConflict: 'candidate_id' })
      .select('id')
      .single()
  }

  async loadCandidate(candidateId: string): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.candidates)
      .select('*')
      .eq('id', candidateId)
      .single()
  }

  async loadEvents(eventIds: string[]): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.events)
      .select('*')
      .in('id', eventIds)
  }

  async loadTraceRows(orgId: string, traceIds: string[]): Promise<any> {
    return this.svc.client
      .from('vb_agent_traces')
      .select(
        'id,user_message,response,tool_steps,messages_input,messages_output,system_prompt,model,status,total_tokens,duration_ms,completed_at',
      )
      .eq('org_id', orgId)
      .in('id', traceIds)
  }

  async listExistingSkills(orgId: string, agentKey: string): Promise<any> {
    return this.svc.client
      .from('agent_skills')
      .select('skill_key, name, description')
      .eq('agent_key', agentKey)
      .or(`org_id.eq.${orgId},org_id.is.null`)
      .order('name', { ascending: true })
      .limit(80)
  }

  async summarizeAgentTurnFeedback(
    orgId: string,
    agentKey: string,
    since: string,
  ): Promise<any> {
    const { data, error } = await this.svc.client
      .from('agent_turn_feedback')
      .select('thumbs_up, tags, feedback_text')
      .eq('org_id', orgId)
      .eq('agent_key', agentKey)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (error) return { data: null, error }
    return { data: AgentFeedbackRepository.summarizeRows(data ?? []), error: null }
  }

  async markJobSucceeded(
    job: SkillRecommendationJobRow,
    result: Record<string, unknown>,
  ): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.jobs)
      .update({
        status: 'succeeded',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('attempts', job.attempts)
  }

  async markJobFailedOrRetry(
    job: SkillRecommendationJobRow,
    status: 'failed' | 'retry',
    message: string,
    nextAttemptAt: string,
  ): Promise<any> {
    return this.svc.client
      .from(SKILL_RECOMMENDATION_TABLES.jobs)
      .update({
        status,
        last_error: message.slice(0, 1200),
        completed_at: status === 'failed' ? new Date().toISOString() : null,
        next_attempt_at: status === 'retry' ? nextAttemptAt : new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('attempts', job.attempts)
  }
}
