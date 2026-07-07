import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AgentCheckpointsService } from '../../missions/services/agent-checkpoints.service'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import { MissionsAgentOperationsService } from '../../missions/services/missions-agent-operations.service'
import { MissionsRepository } from '../../missions/repositories/missions.repository'
import { AgentLearningLoopRepository } from '../repositories/agent-learning-loop.repository'
import { SkillRecommendationsRepository } from '../repositories/skill-recommendations.repository'
import type {
  AgentLearningExperimentDecision,
  AgentTurnFeedbackSummary,
  SkillRecommendationResource,
  SkillRecommendationRow,
} from '../types/skill-recommendations.types'
import {
  AgentLearningLoopPolicyService,
  type AgentLearningExperimentMetrics,
} from './agent-learning-loop-policy.service'

export interface ApplyResult {
  recommendation: SkillRecommendationRow
  checkpoint_id: string
  experiment_id: string
}

export interface EvaluateResult {
  decision: AgentLearningExperimentDecision
  primary_change_pct: number
  max_guardrail_worsening_pct: number
  reasons: string[]
}

@Injectable()
export class AgentLearningLoopApplyService {
  constructor(
    private readonly repository: SkillRecommendationsRepository,
    private readonly learningRepository: AgentLearningLoopRepository,
    private readonly agentOperations: MissionsAgentOperationsService,
    private readonly checkpoints: AgentCheckpointsService,
    private readonly missionsRepository: MissionsRepository,
    private readonly gateway: MissionAgentGatewayService,
    private readonly policy: AgentLearningLoopPolicyService,
  ) {}

  async applyRecommendation(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    recommendationId: string,
  ): Promise<ApplyResult> {
    const recommendation = await this.loadRecommendation(orgId, recommendationId)
    if (recommendation.customer_visible === false || recommendation.proposal_kind === 'route_out') {
      throw new BadRequestException('Only customer-visible learning-loop proposals can be applied')
    }
    if (recommendation.status !== 'ready') {
      throw new BadRequestException('Only ready learning-loop proposals can be applied')
    }

    await this.agentOperations.assertCanManageAgent(
      supabase,
      userId,
      recommendation.target_agent_key,
      orgId,
    )
    const checkpoint = await this.checkpoints.createLearningLoopCheckpoint(
      supabase,
      userId,
      orgId,
      recommendation.target_agent_key,
      `Agent Learning Loop: before applying ${recommendation.name}`.slice(0, 140),
    )

    await this.applyProposal(supabase, userId, orgId, recommendation)
    const experiment = await this.createExperiment(orgId, recommendation)
    const { data, error } = await this.learningRepository.markRecommendationApplied(
      orgId,
      recommendation.id,
      userId,
      checkpoint.id,
      experiment.id,
    )
    if (error) throw new Error(`Failed to mark learning-loop proposal applied: ${error.message}`)
    if (!data) throw new BadRequestException('Learning-loop proposal not found after apply')

    return {
      recommendation: data as SkillRecommendationRow,
      checkpoint_id: checkpoint.id,
      experiment_id: experiment.id,
    }
  }

  async evaluateExperiment(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    recommendationId: string,
  ): Promise<EvaluateResult> {
    const recommendation = await this.loadRecommendation(orgId, recommendationId)
    const { data: experiment, error } =
      await this.learningRepository.getRunningExperimentForRecommendation(orgId, recommendationId)
    if (error) throw new Error(`Failed to load learning-loop experiment: ${error.message}`)
    if (!experiment) throw new BadRequestException('No running experiment for this proposal')

    const { data: events, error: eventError } = await this.learningRepository.summarizeExperimentEvents(
      orgId,
      recommendation.target_agent_key,
      String(experiment.started_at),
    )
    if (eventError) throw new Error(`Failed to summarize experiment events: ${eventError.message}`)

    const { data: feedbackSummary, error: feedbackError } =
      await this.learningRepository.summarizeAgentTurnFeedback(
        orgId,
        recommendation.target_agent_key,
        String(experiment.started_at),
      )
    if (feedbackError) {
      throw new Error(`Failed to summarize agent turn feedback: ${feedbackError.message}`)
    }

    const currentMetrics = this.metricsFromEvents(events ?? [], feedbackSummary)
    const baselineMetrics = this.metricsFromRecord(experiment.baseline_metrics)
    const result = this.policy.evaluateExperiment({
      baseline: baselineMetrics,
      current: currentMetrics,
      qualifyingEvents: (events ?? []).length,
      elapsedDays: this.elapsedDays(String(experiment.started_at)),
      trustedNegativeFeedbackCount: this.feedbackSummary(feedbackSummary).trusted_negative_count,
    })
    const recommendationStatus = this.statusForDecision(result.decision)
    const experimentStatus = result.decision === 'revert' ? 'reverted' : 'completed'

    if (result.decision === 'revert') {
      if (!recommendation.applied_checkpoint_id) {
        throw new BadRequestException('Cannot revert without an applied checkpoint')
      }
      await this.checkpoints.restore(
        supabase,
        userId,
        orgId,
        recommendation.target_agent_key,
        recommendation.applied_checkpoint_id,
      )
      await this.gateway
        .triggerAgentSkillsSync(userId, recommendation.target_agent_key, orgId)
        .catch(() => undefined)
    }

    const update = await this.learningRepository.updateExperimentDecision(orgId, experiment.id, {
      status: experimentStatus,
      decision: result.decision,
      decision_reasons: result.reasons,
      current_metrics: currentMetrics,
      qualifying_events: (events ?? []).length,
    })
    if (update.error) {
      throw new Error(`Failed to update learning-loop experiment: ${update.error.message}`)
    }
    const recommendationUpdate = await this.learningRepository.updateRecommendationExperimentStatus(
      orgId,
      recommendation.id,
      recommendationStatus,
    )
    if (recommendationUpdate.error) {
      throw new Error(
        `Failed to update learning-loop recommendation: ${recommendationUpdate.error.message}`,
      )
    }

    return {
      decision: result.decision,
      primary_change_pct: result.primaryChangePct,
      max_guardrail_worsening_pct: result.maxGuardrailWorseningPct,
      reasons: result.reasons,
    }
  }

  private async applyProposal(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    recommendation: SkillRecommendationRow,
  ): Promise<void> {
    if (recommendation.proposal_kind === 'skill_create') {
      await this.applySkillCreate(supabase, userId, orgId, recommendation)
      return
    }
    if (recommendation.proposal_kind === 'skill_update') {
      await this.applySkillUpdate(supabase, userId, orgId, recommendation)
      return
    }
    if (recommendation.proposal_kind === 'skill_resource_update') {
      await this.applySkillResources(supabase, userId, orgId, recommendation)
      await this.gateway
        .triggerAgentSkillsSync(userId, recommendation.target_agent_key, orgId)
        .catch(() => undefined)
      return
    }
    if (recommendation.proposal_kind === 'agent_file_update') {
      await this.applyAgentFile(supabase, userId, orgId, recommendation)
      return
    }
    throw new BadRequestException('Unsupported learning-loop proposal kind')
  }

  private async applySkillCreate(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    recommendation: SkillRecommendationRow,
  ): Promise<void> {
    const patch = this.record(recommendation.proposed_patch)
    const skillKey = this.stringValue(patch.skill_key) ?? recommendation.skill_key
    await this.agentOperations.createAgentSkill(
      supabase,
      userId,
      recommendation.target_agent_key,
      {
        skill_key: skillKey,
        name: this.stringValue(patch.name) ?? recommendation.name,
        description: this.stringValue(patch.description) ?? recommendation.description,
        markdown_content:
          this.stringValue(patch.markdown_content) ?? recommendation.markdown_content,
        is_enabled: true,
      },
      orgId,
    )
    await this.createResources(supabase, userId, orgId, recommendation, skillKey)
  }

  private async applySkillUpdate(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    recommendation: SkillRecommendationRow,
  ): Promise<void> {
    const patch = this.record(recommendation.proposed_patch)
    const skillKey =
      recommendation.target_artifact_key ?? this.stringValue(patch.skill_key) ?? recommendation.skill_key
    const { data, error } = await this.learningRepository.findAgentSkillByKey(
      supabase,
      userId,
      orgId,
      recommendation.target_agent_key,
      skillKey,
    )
    if (error) throw new Error(`Failed to load target skill: ${error.message}`)
    if (!data?.id) throw new BadRequestException('Target skill not found')

    await this.agentOperations.updateAgentSkill(
      supabase,
      userId,
      recommendation.target_agent_key,
      data.id as string,
      {
        name: this.stringValue(patch.name) ?? recommendation.name,
        description: this.stringValue(patch.description) ?? recommendation.description,
        markdown_content:
          this.stringValue(patch.markdown_content) ?? recommendation.markdown_content,
      },
      orgId,
    )
    await this.createResources(supabase, userId, orgId, recommendation, skillKey)
  }

  private async applySkillResources(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    recommendation: SkillRecommendationRow,
  ): Promise<void> {
    const skillKey = recommendation.target_artifact_key ?? recommendation.skill_key
    await this.createResources(supabase, userId, orgId, recommendation, skillKey)
  }

  private async createResources(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    recommendation: SkillRecommendationRow,
    skillKey: string,
  ): Promise<void> {
    const patch = this.record(recommendation.proposed_patch)
    const resources = this.resourcesFromPatch(patch.resources, recommendation.resources)
    for (const resource of resources) {
      await this.agentOperations.createAgentSkillResource(
        supabase,
        userId,
        recommendation.target_agent_key,
        skillKey,
        {
          file_path: resource.file_path,
          content_type: resource.content_type,
          content: resource.content,
          storage_url: resource.storage_url ?? undefined,
        },
        orgId,
      )
    }
  }

  private async applyAgentFile(
    supabase: SupabaseClient,
    userId: string,
    orgId: string,
    recommendation: SkillRecommendationRow,
  ): Promise<void> {
    const patch = this.record(recommendation.proposed_patch)
    const fileName = this.stringValue(patch.file_name) ?? recommendation.target_artifact_key
    const content = this.stringValue(patch.content)
    if (!fileName || !['ROLE.md', 'IDENTITY.md', 'SOUL.md'].includes(fileName)) {
      throw new BadRequestException('Agent file proposals must target ROLE.md, IDENTITY.md, or SOUL.md')
    }
    if (!content) throw new BadRequestException('Agent file proposals require content')

    await this.missionsRepository.upsertAgentDefinition(
      supabase,
      userId,
      orgId,
      recommendation.target_agent_key,
      fileName,
      content,
    )
    await this.gateway
      .triggerAgentSkillsSync(userId, recommendation.target_agent_key, orgId)
      .catch(() => undefined)
  }

  private async createExperiment(orgId: string, recommendation: SkillRecommendationRow) {
    const patch = this.record(recommendation.proposed_patch)
    const baselineMetrics = this.metricsFromRecord(patch.baseline_metrics)
    const { data, error } = await this.learningRepository.createExperiment({
      org_id: orgId,
      recommendation_id: recommendation.id,
      target_agent_key: recommendation.target_agent_key,
      artifact_lock_key:
        recommendation.artifact_lock_key ??
        [orgId, recommendation.target_agent_key, recommendation.target_artifact_kind, recommendation.skill_key].join(':'),
      status: 'running',
      baseline_metrics: baselineMetrics,
      current_metrics: {},
      qualifying_events: 0,
      started_at: new Date().toISOString(),
    })
    if (error) throw new Error(`Failed to create learning-loop experiment: ${error.message}`)
    if (!data?.id) throw new Error('Failed to create learning-loop experiment')
    return data
  }

  private async loadRecommendation(
    orgId: string,
    recommendationId: string,
  ): Promise<SkillRecommendationRow> {
    const { data, error } = await this.repository.getRecommendation(orgId, recommendationId)
    if (error) throw new Error(`Failed to load learning-loop proposal: ${error.message}`)
    if (!data) throw new BadRequestException('Learning-loop proposal not found')
    return data as SkillRecommendationRow
  }

  private metricsFromEvents(
    events: Array<Record<string, unknown>>,
    feedbackSummary: unknown = null,
  ): AgentLearningExperimentMetrics {
    const qualifyingEvents = events.length
    const feedback = this.feedbackSummary(feedbackSummary)
    const negativeFeedbackRate =
      feedback.total_count > 0 ? feedback.negative_count / feedback.total_count : 0
    if (qualifyingEvents === 0) {
      return {
        primarySuccessRate: 0,
        toolErrorRate: 0,
        roleViolationRate: 0,
        negativeFeedbackRate,
      }
    }
    const completed = events.filter((event) => event.status === 'completed').length
    const failed = events.filter((event) => event.status === 'failed').length
    return {
      primarySuccessRate: completed / qualifyingEvents,
      toolErrorRate: failed / qualifyingEvents,
      roleViolationRate: 0,
      negativeFeedbackRate,
    }
  }

  private feedbackSummary(value: unknown): AgentTurnFeedbackSummary {
    const record = this.record(value)
    return {
      total_count: this.numberValue(record.total_count, 0),
      positive_count: this.numberValue(record.positive_count, 0),
      negative_count: this.numberValue(record.negative_count, 0),
      trusted_negative_count: this.numberValue(record.trusted_negative_count, 0),
      top_tags: Array.isArray(record.top_tags)
        ? record.top_tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
    }
  }

  private metricsFromRecord(value: unknown): AgentLearningExperimentMetrics {
    const record = this.record(value)
    return {
      primarySuccessRate: this.numberValue(record.primarySuccessRate, 0.5),
      toolErrorRate: this.numberValue(record.toolErrorRate, 0.1),
      roleViolationRate: this.numberValue(record.roleViolationRate, 0),
      negativeFeedbackRate: this.numberValue(record.negativeFeedbackRate, 0),
    }
  }

  private resourcesFromPatch(
    value: unknown,
    fallback: SkillRecommendationResource[],
  ): SkillRecommendationResource[] {
    const rawResources = Array.isArray(value) ? value : fallback
    return rawResources
      .map((resource) => this.record(resource))
      .map((resource) => ({
        file_path: this.stringValue(resource.file_path) ?? '',
        content_type: this.stringValue(resource.content_type) ?? 'text/markdown',
        content: this.stringValue(resource.content) ?? '',
        storage_url: this.stringValue(resource.storage_url),
      }))
      .filter((resource) => resource.file_path.length > 0)
  }

  private statusForDecision(decision: AgentLearningExperimentDecision): SkillRecommendationRow['status'] {
    if (decision === 'keep') return 'kept'
    if (decision === 'revise') return 'revising'
    if (decision === 'revert') return 'reverted'
    return 'inconclusive'
  }

  private elapsedDays(startedAt: string): number {
    const start = new Date(startedAt).getTime()
    if (!Number.isFinite(start)) return 0
    return Math.max(0, Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000)))
  }

  private record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return value as Record<string, unknown>
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null
  }

  private numberValue(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback
  }
}
