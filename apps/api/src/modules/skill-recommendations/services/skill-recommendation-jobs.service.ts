import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import { AgentLearningLoopRepository } from '../repositories/agent-learning-loop.repository'
import { SkillRecommendationsRepository } from '../repositories/skill-recommendations.repository'
import type {
  SkillRecommendationCandidateRow,
  SkillRecommendationEventRow,
  AgentTurnFeedbackSummary,
  SkillRecommendationJobRow,
  SkillRecommendationJobStatus,
  SkillRecommendationTraceEvidence,
} from '../types/skill-recommendations.types'
import { SkillRecommendationJaimeService } from './skill-recommendation-jaime.service'

@Injectable()
export class SkillRecommendationJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SkillRecommendationJobsService.name)
  private readonly pollIntervalMs = 10_000
  private readonly maxAttempts = 3
  private readonly maxTraceEvidence = 3
  private readonly maxTraceTextChars = 6000
  private readonly maxTraceJsonChars = 12000
  private timer: NodeJS.Timeout | null = null
  private processing = false
  private activeJobCount = 0

  constructor(
    private readonly repository: SkillRecommendationsRepository,
    private readonly learningRepository: AgentLearningLoopRepository,
    private readonly jaime: SkillRecommendationJaimeService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  onModuleInit() {
    if (process.env.DISABLE_SKILL_RECOMMENDATION_POLLER === '1') return
    this.timer = setInterval(() => void this.processDueJobs(), this.pollIntervalMs)
    void this.processDueJobs()
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async enqueueCandidateReview(input: {
    userId: string
    orgId: string
    candidateId: string
    triggerEventId?: string
  }): Promise<{ jobId: string; status: SkillRecommendationJobStatus; deduped: boolean }> {
    const dedupeKey = `agent-improvement:${input.candidateId}`
    const { data: existing, error: existingError } = await this.repository.findActiveJob(
      input.orgId,
      dedupeKey,
    )

    if (existingError) throw new Error(`DB error: ${existingError.message}`)
    if (existing?.id) {
      return {
        jobId: existing.id as string,
        status: existing.status as SkillRecommendationJobStatus,
        deduped: true,
      }
    }

    const { data, error } = await this.repository.insertJob({
      user_id: input.userId,
      org_id: input.orgId,
      candidate_id: input.candidateId,
      dedupe_key: dedupeKey,
      payload: {
        candidate_id: input.candidateId,
        trigger_event_id: input.triggerEventId ?? null,
      },
      status: 'queued',
      attempts: 0,
      max_attempts: this.maxAttempts,
      next_attempt_at: new Date().toISOString(),
    })

    if (
      error?.message?.includes('uq_agent_improvement_jobs_active_dedupe') ||
      error?.message?.includes('uq_skill_recommendation_jobs_active_dedupe')
    ) {
      const { data: raced } = await this.repository.findActiveJob(input.orgId, dedupeKey)
      if (raced?.id) {
        return {
          jobId: raced.id as string,
          status: raced.status as SkillRecommendationJobStatus,
          deduped: true,
        }
      }
    }

    if (error || !data) throw new Error(`DB error: ${error?.message ?? 'Failed to enqueue job'}`)

    await this.repository.markOpenCandidateQueued(input.candidateId)

    void this.processDueJobs()
    return {
      jobId: data.id as string,
      status: data.status as SkillRecommendationJobStatus,
      deduped: false,
    }
  }

  async processDueJobs(): Promise<void> {
    if (this.processing) return
    this.processing = true
    let jobs: SkillRecommendationJobRow[] = []
    try {
      await this.recoverStaleJobs()
      const slots = 2 - this.activeJobCount
      if (slots <= 0) return
      const { data, error } = await this.repository.listDueJobs(slots, new Date().toISOString())
      if (error) throw new Error(`DB error: ${error.message}`)
      for (const raw of data ?? []) {
        const claimed = await this.claimJob(raw as SkillRecommendationJobRow)
        if (claimed) jobs.push(claimed)
      }
      this.activeJobCount += jobs.length
    } catch (error) {
      const message = (error as Error).message
      this.logger.warn(`Skill recommendation queue cycle failed: ${message}`)
      reportAppError(this.errorReporter, {
        app: process.env.APP_NAME ?? 'api',
        category: 'worker',
        feature: 'agent_improvement_proposals/jobs',
        error_code: 'queue_cycle_failed',
        message,
      })
    } finally {
      this.processing = false
    }

    for (const job of jobs) {
      void this.executeClaimedJob(job)
        .catch((error) => {
          const message = (error as Error).message
          this.logger.error(`Skill recommendation job ${job.id} failed: ${message}`)
          reportAppError(this.errorReporter, {
            app: process.env.APP_NAME ?? 'api',
            category: 'worker',
            feature: 'agent_improvement_proposals/jobs',
            error_code: 'job_failed',
            message,
            user_id: job.user_id,
            context: { jobId: job.id, candidateId: job.candidate_id },
          })
        })
        .finally(() => {
          this.activeJobCount -= 1
        })
    }
  }

  private async recoverStaleJobs(): Promise<void> {
    const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data } = await this.repository.listStaleProcessingJobs(staleThreshold)
    for (const row of data ?? []) {
      const attempts = Number(row.attempts ?? 0)
      const maxAttempts = Number(row.max_attempts ?? this.maxAttempts)
      const nextStatus = attempts >= maxAttempts ? 'failed' : 'retry'
      await this.repository.updateStaleJob(row.id, {
        status: nextStatus,
        last_error: 'Recovered: stuck in processing beyond 10 minutes',
        completed_at: nextStatus === 'failed' ? new Date().toISOString() : null,
        next_attempt_at: new Date().toISOString(),
      })
    }
  }

  private async claimJob(
    job: SkillRecommendationJobRow,
  ): Promise<SkillRecommendationJobRow | null> {
    const attempts = Number(job.attempts || 0) + 1
    const { data, error } = await this.repository.claimJob(job, attempts)
    if (error) throw new Error(`DB error: ${error.message}`)
    return (data as SkillRecommendationJobRow | null) ?? null
  }

  private async executeClaimedJob(job: SkillRecommendationJobRow): Promise<void> {
    try {
      await this.repository.markCandidateProcessing(job.candidate_id)

      const candidate = await this.loadCandidate(job.candidate_id)
      const events = await this.loadEvents(candidate)
      const traceEvidence = await this.loadTraceEvidence(job.org_id, events)
      const existingSkills = await this.loadExistingSkills(job.org_id, candidate.agent_key)
      const feedbackSummary = await this.loadFeedbackSummary(job.org_id, candidate)
      const review = await this.jaime.reviewCandidate({
        job,
        candidate,
        events,
        traceEvidence,
        existingSkills,
        feedbackSummary,
      })

      if (review.verdict === 'skip') {
        await this.repository.updateCandidate(candidate.id, {
          status: 'skipped',
          skip_reason: review.reason,
        })
        await this.markSucceeded(job, { verdict: 'skip', reason: review.reason, raw: review.raw })
        return
      }

      const payload = this.buildRecommendationPayload(job, candidate, review.proposal)
      if (payload.proposal_kind === 'route_out') {
        const { data: routeOut, error: routeOutError } =
          await this.repository.upsertRecommendation(payload)
        if (routeOutError || !routeOut?.id) {
          throw new Error(`Failed to save Jaime route-out: ${routeOutError?.message}`)
        }
        await this.repository.updateCandidate(candidate.id, { status: 'routed_out' })
        await this.markSucceeded(job, {
          verdict: 'route_out',
          recommendation_id: routeOut.id,
          raw: review.raw,
        })
        return
      }

      const artifactLockKey = String(payload.artifact_lock_key ?? '')
      if (artifactLockKey) {
        const { data: runningExperiment, error: experimentError } =
          await this.learningRepository.findRunningExperimentByArtifactLockKey(
            job.org_id,
            artifactLockKey,
          )
        if (experimentError) {
          throw new Error(`Failed to check running experiment: ${experimentError.message}`)
        }
        if (runningExperiment?.id) {
          await this.repository.updateCandidate(candidate.id, {
            status: 'skipped',
            skip_reason: 'artifact_has_running_experiment',
          })
          await this.markSucceeded(job, {
            verdict: 'wait_for_running_experiment',
            experiment_id: runningExperiment.id,
            raw: review.raw,
          })
          return
        }

        const { data: existingProposal, error: existingError } =
          await this.learningRepository.findReadyRecommendationByArtifactLockKey(
            job.org_id,
            artifactLockKey,
          )
        if (existingError) {
          throw new Error(`Failed to check existing proposal: ${existingError.message}`)
        }
        if (existingProposal?.id) {
          const { data: patched, error: patchError } =
            await this.learningRepository.updateRecommendationProposal(
              job.org_id,
              existingProposal.id,
              payload,
            )
          if (patchError || !patched?.id) {
            throw new Error(`Failed to patch Jaime proposal: ${patchError?.message}`)
          }
          await this.repository.updateCandidate(candidate.id, { status: 'recommended' })
          await this.markSucceeded(job, {
            verdict: 'patched_existing_proposal',
            recommendation_id: patched.id,
            raw: review.raw,
          })
          return
        }
      }

      const { data: recommendation, error: insertError } =
        await this.repository.upsertRecommendation(payload)

      if (insertError || !recommendation?.id) {
        throw new Error(`Failed to save Jaime proposal: ${insertError?.message}`)
      }

      await this.repository.updateCandidate(candidate.id, { status: 'recommended' })
      await this.markSucceeded(job, {
        verdict: 'recommend',
        recommendation_id: recommendation.id,
        raw: review.raw,
      })
    } catch (error) {
      await this.markFailedOrRetry(job, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async loadCandidate(candidateId: string): Promise<SkillRecommendationCandidateRow> {
    const { data, error } = await this.repository.loadCandidate(candidateId)
    if (error || !data) throw new Error(`Candidate not found: ${error?.message ?? candidateId}`)
    return data as SkillRecommendationCandidateRow
  }

  private async loadEvents(
    candidate: SkillRecommendationCandidateRow,
  ): Promise<SkillRecommendationEventRow[]> {
    const eventIds = candidate.evidence_event_ids.slice(0, 8)
    if (eventIds.length === 0) return []
    const { data, error } = await this.repository.loadEvents(eventIds)
    if (error) throw new Error(`Failed to load recommendation events: ${error.message}`)
    return (data ?? []) as SkillRecommendationEventRow[]
  }

  private async loadTraceEvidence(
    orgId: string,
    events: SkillRecommendationEventRow[],
  ): Promise<SkillRecommendationTraceEvidence[]> {
    const traceIds = [
      ...new Set(
        events
          .map((event) => event.trace_id)
          .filter(
            (traceId): traceId is string => typeof traceId === 'string' && traceId.length > 0,
          ),
      ),
    ].slice(0, this.maxTraceEvidence)
    if (traceIds.length === 0) return []

    const { data, error } = await this.repository.loadTraceRows(orgId, traceIds)

    if (error) {
      this.logger.warn(`Failed to hydrate skill recommendation traces: ${error.message}`)
      return []
    }

    const byTraceId = new Map<string, Record<string, unknown>>()
    for (const row of data ?? []) {
      if (typeof row.id === 'string') byTraceId.set(row.id, row as Record<string, unknown>)
    }

    return events
      .filter((event) => event.trace_id && byTraceId.has(event.trace_id))
      .slice(0, this.maxTraceEvidence)
      .map((event) => {
        const trace = byTraceId.get(event.trace_id!)!
        return {
          event_id: event.id,
          trace_id: event.trace_id!,
          user_message: this.compactTraceText(trace.user_message, this.maxTraceTextChars),
          agent_response: this.compactTraceText(trace.response, this.maxTraceTextChars),
          tool_steps_excerpt: this.compactTraceJson(trace.tool_steps, this.maxTraceJsonChars),
          messages_input_excerpt: this.compactTraceJson(
            trace.messages_input,
            this.maxTraceJsonChars,
          ),
          messages_output_excerpt: this.compactTraceJson(
            trace.messages_output,
            this.maxTraceJsonChars,
          ),
          system_prompt_excerpt: this.compactTraceText(trace.system_prompt, this.maxTraceTextChars),
          model: typeof trace.model === 'string' ? trace.model : null,
          status: typeof trace.status === 'string' ? trace.status : null,
          total_tokens: typeof trace.total_tokens === 'number' ? trace.total_tokens : null,
          duration_ms: typeof trace.duration_ms === 'number' ? trace.duration_ms : null,
          completed_at: typeof trace.completed_at === 'string' ? trace.completed_at : null,
        }
      })
  }

  private async loadExistingSkills(
    orgId: string,
    agentKey: string,
  ): Promise<Array<{ skill_key: string; name: string; description: string }>> {
    const { data, error } = await this.repository.listExistingSkills(orgId, agentKey)
    if (error) throw new Error(`Failed to load existing skills: ${error.message}`)
    return (data ?? []).map((row) => ({
      skill_key: String(row.skill_key),
      name: String(row.name),
      description: String(row.description ?? ''),
    }))
  }

  private async loadFeedbackSummary(
    orgId: string,
    candidate: SkillRecommendationCandidateRow,
  ): Promise<AgentTurnFeedbackSummary> {
    const since =
      candidate.first_event_at ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await this.repository.summarizeAgentTurnFeedback(
      orgId,
      candidate.agent_key,
      since,
    )
    if (error) {
      this.logger.warn(`Failed to summarize agent turn feedback: ${error.message}`)
      return this.emptyFeedbackSummary()
    }
    return this.normalizeFeedbackSummary(data)
  }

  private normalizeFeedbackSummary(value: unknown): AgentTurnFeedbackSummary {
    const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
    return {
      total_count: this.numberValue(record.total_count),
      positive_count: this.numberValue(record.positive_count),
      negative_count: this.numberValue(record.negative_count),
      trusted_negative_count: this.numberValue(record.trusted_negative_count),
      top_tags: Array.isArray(record.top_tags)
        ? record.top_tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
    }
  }

  private emptyFeedbackSummary(): AgentTurnFeedbackSummary {
    return {
      total_count: 0,
      positive_count: 0,
      negative_count: 0,
      trusted_negative_count: 0,
      top_tags: [],
    }
  }

  private numberValue(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0
  }

  private async markSucceeded(job: SkillRecommendationJobRow, result: Record<string, unknown>) {
    const { error } = await this.repository.markJobSucceeded(job, result)
    if (error) throw new Error(`DB error: ${error.message}`)
  }

  private async markFailedOrRetry(job: SkillRecommendationJobRow, message: string): Promise<void> {
    const nextStatus = job.attempts >= (job.max_attempts || this.maxAttempts) ? 'failed' : 'retry'
    const nextAttemptAt = new Date(Date.now() + this.getBackoffMs(job.attempts)).toISOString()
    const { error } = await this.repository.markJobFailedOrRetry(
      job,
      nextStatus,
      message,
      nextAttemptAt,
    )
    if (error) {
      this.logger.warn(`Failed to update job failure state: ${error.message}`)
      reportAppError(this.errorReporter, {
        app: process.env.APP_NAME ?? 'api',
        category: 'worker',
        feature: 'agent_improvement_proposals/jobs',
        error_code: 'failure_state_update_failed',
        message: error.message,
        user_id: job.user_id,
        context: { jobId: job.id },
      })
    }
  }

  private getBackoffMs(attempts: number): number {
    if (attempts <= 1) return 60 * 60 * 1000
    return 3 * 60 * 60 * 1000
  }

  private compactTraceJson(value: unknown, maxChars: number): string | null {
    if (value === null || value === undefined) return null
    try {
      return this.compactTraceText(JSON.stringify(value), maxChars)
    } catch {
      return this.compactTraceText(String(value), maxChars)
    }
  }

  private compactTraceText(value: unknown, maxChars: number): string | null {
    if (typeof value !== 'string') return null
    const cleaned = value
      .replace(/https?:\/\/\S+/g, '[url]')
      .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[email]')
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, '[id]')
      .replace(/\s+/g, ' ')
      .trim()
    if (!cleaned) return null
    if (cleaned.length <= maxChars) return cleaned
    return `${cleaned.slice(0, maxChars)}...[truncated]`
  }

  private buildRecommendationPayload(
    job: SkillRecommendationJobRow,
    candidate: SkillRecommendationCandidateRow,
    proposal: Extract<
      Awaited<ReturnType<SkillRecommendationJaimeService['reviewCandidate']>>,
      { verdict: 'recommend' }
    >['proposal'],
  ): Record<string, unknown> {
    const proposalKind = proposal.proposal_kind ?? 'skill_create'
    const targetArtifactKind = proposal.target_artifact_kind ?? 'skill'
    const targetArtifactKey =
      proposal.target_artifact_key ??
      (targetArtifactKind === 'skill' ? proposal.skill_key : proposal.skill_key)
    const artifactLockKey =
      proposal.artifact_lock_key ??
      [
        proposal.customer_visible === false ? 'internal' : job.org_id,
        proposal.target_agent_key,
        targetArtifactKind,
        targetArtifactKey,
      ].join(':')

    return {
      org_id: job.org_id,
      candidate_id: candidate.id,
      job_id: job.id,
      target_agent_key: proposal.target_agent_key,
      skill_key: proposal.skill_key,
      name: proposal.name,
      description: proposal.description,
      markdown_content: proposal.markdown_content,
      resources: proposal.resources,
      evidence_event_ids: proposal.evidence_event_ids,
      workflow_summary: proposal.workflow_summary,
      recommended_actions: proposal.recommended_actions,
      confidence: proposal.confidence,
      status: proposalKind === 'route_out' ? 'routed_out' : 'ready',
      proposal_kind: proposalKind,
      route_out_type: proposal.route_out_type,
      customer_visible: proposalKind === 'route_out' ? false : proposal.customer_visible !== false,
      target_artifact_kind: targetArtifactKind,
      target_artifact_key: targetArtifactKey,
      artifact_lock_key: artifactLockKey,
      priority_score: proposal.priority_score ?? 0,
      proposed_patch: proposal.proposed_patch ?? {},
      quality_failures: proposal.quality_failures ?? [],
    }
  }
}
