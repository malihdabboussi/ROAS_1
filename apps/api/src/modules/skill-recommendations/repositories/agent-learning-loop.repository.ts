import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyOwnerScope, SupabaseServiceClient } from '@vibey/api-shared'
import { AgentFeedbackRepository } from '../../agent-feedback/repositories/agent-feedback.repository'

@Injectable()
export class AgentLearningLoopRepository {
  constructor(private readonly svc: SupabaseServiceClient) {}

  async findRunningExperimentByArtifactLockKey(
    orgId: string,
    artifactLockKey: string,
  ): Promise<any> {
    return this.svc.client
      .from('agent_learning_experiments')
      .select('id, status')
      .eq('org_id', orgId)
      .eq('artifact_lock_key', artifactLockKey)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  }

  async findReadyRecommendationByArtifactLockKey(
    orgId: string,
    artifactLockKey: string,
  ): Promise<any> {
    return this.svc.client
      .from('agent_improvement_proposals')
      .select('id, status')
      .eq('org_id', orgId)
      .eq('artifact_lock_key', artifactLockKey)
      .eq('customer_visible', true)
      .eq('status', 'ready')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  }

  async updateRecommendationProposal(
    orgId: string,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    return this.svc.client
      .from('agent_improvement_proposals')
      .update(payload)
      .eq('org_id', orgId)
      .eq('id', id)
      .select('id')
      .maybeSingle()
  }

  async findAgentSkillByKey(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null | undefined,
    agentKey: string,
    skillKey: string,
  ): Promise<any> {
    let query: any = supabase
      .from('agent_skills')
      .select('id, skill_key, name, description, markdown_content')
      .eq('agent_key', agentKey)
      .eq('skill_key', skillKey)
    query = applyOwnerScope(query, { userId, orgId: orgId ?? null })
    return query.maybeSingle()
  }

  async markRecommendationApplied(
    orgId: string,
    id: string,
    userId: string,
    checkpointId: string,
    experimentId: string,
  ): Promise<any> {
    return this.svc.client
      .from('agent_improvement_proposals')
      .update({
        status: 'experiment_running',
        applied_checkpoint_id: checkpointId,
        applied_experiment_id: experimentId,
        applied_at: new Date().toISOString(),
        applied_by: userId,
      })
      .eq('org_id', orgId)
      .eq('id', id)
      .select('*')
      .maybeSingle()
  }

  async createExperiment(payload: Record<string, unknown>): Promise<any> {
    return this.svc.client
      .from('agent_learning_experiments')
      .insert(payload)
      .select('id')
      .single()
  }

  async getRunningExperimentForRecommendation(
    orgId: string,
    recommendationId: string,
  ): Promise<any> {
    return this.svc.client
      .from('agent_learning_experiments')
      .select('*')
      .eq('org_id', orgId)
      .eq('recommendation_id', recommendationId)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  }

  async summarizeExperimentEvents(
    orgId: string,
    agentKey: string,
    startedAt: string,
  ): Promise<any> {
    return this.svc.client
      .from('skill_recommendation_events')
      .select('status')
      .eq('org_id', orgId)
      .eq('agent_key', agentKey)
      .gte('created_at', startedAt)
      .order('created_at', { ascending: false })
      .limit(500)
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

  async updateExperimentDecision(
    orgId: string,
    experimentId: string,
    payload: Record<string, unknown>,
  ): Promise<any> {
    return this.svc.client
      .from('agent_learning_experiments')
      .update({
        ...payload,
        decided_at: new Date().toISOString(),
      })
      .eq('org_id', orgId)
      .eq('id', experimentId)
  }

  async updateRecommendationExperimentStatus(
    orgId: string,
    id: string,
    status: string,
  ): Promise<any> {
    return this.svc.client
      .from('agent_improvement_proposals')
      .update({ status })
      .eq('org_id', orgId)
      .eq('id', id)
      .select('*')
      .maybeSingle()
  }
}
