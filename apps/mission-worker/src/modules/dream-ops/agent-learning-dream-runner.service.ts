import { Injectable } from '@nestjs/common'
import type { AgentLearningDreamGroup } from './agent-learning-dream.types'
import { AgentLearningDreamCollectorService } from './agent-learning-dream-collector.service'
import { AgentLearningDreamJaimeService } from './agent-learning-dream-jaime.service'
import { AgentLearningDreamTriageService } from './agent-learning-dream-triage.service'
import { DreamOpsRepository } from './dream-ops.repository'

type RunRepository = {
  findByDedupeKey(key: string): Promise<Record<string, unknown> | null>
  createRun(input: Record<string, unknown>): Promise<{ id: string }>
  completeRun(id: string, output: Record<string, unknown>): Promise<void>
  countRecommendationsForRun(runId: string): Promise<number>
  getRunOutput?(runId: string): Promise<Record<string, unknown>>
}

type Collector = {
  collect(input: Record<string, unknown>): Promise<{
    groups: AgentLearningDreamGroup[]
    sourceCounts: Record<string, number>
  }>
}

type Triage = {
  triageGroups(
    groups: AgentLearningDreamGroup[],
    options: { maxGroups: number },
  ): Promise<{ included: AgentLearningDreamGroup[] }>
}

type Jaime = {
  runAgentDreamSession(input: Record<string, unknown>): Promise<{ content: string; toolSteps?: unknown[] }>
}

export type AgentLearningDreamRunInput = {
  orgId: string
  userId: string
  agentKey: string
  localDate: string
  windowStart: string
  windowEnd: string
  manual?: boolean
}

export type AgentLearningDreamRunResult = {
  runId: string
  sourceCounts: Record<string, number>
  proposalsCreated: number
  skipped?: boolean
}

const MAX_GROUPS_PER_DREAM = 50

@Injectable()
export class AgentLearningDreamRunnerService {
  constructor(
    private readonly deps: {
      runRepository: RunRepository
      collector: Collector
      triage: Triage
      jaime: Jaime
    },
  ) {}

  static create(
    repository: DreamOpsRepository,
    collector: AgentLearningDreamCollectorService,
    triage: AgentLearningDreamTriageService,
    jaime: AgentLearningDreamJaimeService,
  ): AgentLearningDreamRunnerService {
    return new AgentLearningDreamRunnerService({
      runRepository: repository,
      collector,
      triage,
      jaime,
    })
  }

  async runAgentDream(input: AgentLearningDreamRunInput): Promise<AgentLearningDreamRunResult> {
    const dedupeKey = `agent_learning_dream:${input.orgId}:${input.agentKey}:${input.localDate}`
    if (!input.manual) {
      const existing = await this.deps.runRepository.findByDedupeKey(dedupeKey)
      if (existing?.id) {
        return {
          runId: String(existing.id),
          sourceCounts: {},
          proposalsCreated: 0,
          skipped: true,
        }
      }
    }

    const run = await this.deps.runRepository.createRun({
      org_id: input.orgId,
      user_id: input.userId,
      operation_type: 'agent_learning_dream',
      subject_kind: 'agent',
      subject_key: input.agentKey,
      dedupe_key: dedupeKey,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      local_date: input.localDate,
      status: 'running',
    })

    const collected = await this.deps.collector.collect({
      orgId: input.orgId,
      agentKey: input.agentKey,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
    })
    const triaged = await this.deps.triage.triageGroups(collected.groups, {
      maxGroups: MAX_GROUPS_PER_DREAM,
    })

    if (triaged.included.length === 0) {
      await this.deps.runRepository.completeRun(run.id, {
        status: 'skipped',
        skipped_reason: 'no_meaningful_evidence',
        source_counts: collected.sourceCounts,
        chunks_processed: 0,
        output: { proposals_created: 0 },
      })
      return {
        runId: run.id,
        sourceCounts: collected.sourceCounts,
        proposalsCreated: 0,
        skipped: true,
      }
    }

    await this.deps.jaime.runAgentDreamSession({
      orgId: input.orgId,
      userId: input.userId,
      agentKey: input.agentKey,
      runId: run.id,
      localDate: input.localDate,
      groups: triaged.included,
      sourceCounts: collected.sourceCounts,
    })

    const proposalsCreated = await this.deps.runRepository.countRecommendationsForRun(run.id)
    const existingOutput = this.deps.runRepository.getRunOutput
      ? await this.deps.runRepository.getRunOutput(run.id)
      : {}

    await this.deps.runRepository.completeRun(run.id, {
      status: 'completed',
      source_counts: collected.sourceCounts,
      chunks_processed: 1,
      output: {
        ...existingOutput,
        proposals_created: proposalsCreated,
        jaime_session_completed: true,
      },
    })

    return {
      runId: run.id,
      sourceCounts: collected.sourceCounts,
      proposalsCreated,
    }
  }
}
