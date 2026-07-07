import { Injectable, Logger } from '@nestjs/common'
import { SkillRecommendationsRepository } from '../repositories/skill-recommendations.repository'
import type { SkillRecommendationEventRow } from '../types/skill-recommendations.types'
import { SkillRecommendationJobsService } from './skill-recommendation-jobs.service'

type EventGroup = {
  key: string
  agentKey: string
  promptFingerprint: string
  toolSignature: string
  events: SkillRecommendationEventRow[]
}

@Injectable()
export class SkillRecommendationDetectionService {
  private readonly logger = new Logger(SkillRecommendationDetectionService.name)

  constructor(
    private readonly repository: SkillRecommendationsRepository,
    private readonly jobs: SkillRecommendationJobsService,
  ) {}

  async scanOrg(orgId: string): Promise<{ candidates: number; jobs: number }> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data, error }, systemAgentKeys] = await Promise.all([
      this.repository.listRecentEvents(orgId, since),
      this.loadSystemAgentKeys(),
    ])

    if (error) throw new Error(`Failed to scan skill recommendation events: ${error.message}`)

    const groups = this.groupEvents((data ?? []) as SkillRecommendationEventRow[], systemAgentKeys)
    let candidates = 0
    let jobs = 0
    for (const group of groups) {
      if (group.events.length < 3) continue
      const candidateId = await this.upsertCandidate(orgId, group)
      candidates += 1
      const latestEvent = group.events[0]
      if (latestEvent) {
        const queued = await this.jobs.enqueueCandidateReview({
          userId: latestEvent.user_id,
          orgId,
          candidateId,
          triggerEventId: latestEvent.id,
        })
        if (!queued.deduped) jobs += 1
      }
    }
    return { candidates, jobs }
  }

  private groupEvents(
    rows: SkillRecommendationEventRow[],
    systemAgentKeys: Set<string>,
  ): EventGroup[] {
    const groups = new Map<string, EventGroup>()
    for (const row of rows) {
      if (systemAgentKeys.has(row.agent_key.toLowerCase())) continue
      if ((row.skill_keys_used ?? []).length > 0) continue
      if ((row.workflow_keys_used ?? []).length > 0) continue
      const key = [row.agent_key, row.prompt_fingerprint, row.tool_signature || ''].join('::')
      const group =
        groups.get(key) ??
        ({
          key,
          agentKey: row.agent_key,
          promptFingerprint: row.prompt_fingerprint,
          toolSignature: row.tool_signature || '',
          events: [],
        } satisfies EventGroup)
      group.events.push(row)
      groups.set(key, group)
    }
    return [...groups.values()]
  }

  private async loadSystemAgentKeys(): Promise<Set<string>> {
    const { data, error } = await this.repository.listSystemAgentKeys()
    if (error) throw new Error(`Failed to load system agent keys: ${error.message}`)
    return new Set(
      ((data ?? []) as Array<{ agent_key?: unknown }>)
        .map((row) => (typeof row.agent_key === 'string' ? row.agent_key.toLowerCase() : null))
        .filter((agentKey): agentKey is string => Boolean(agentKey)),
    )
  }

  private async upsertCandidate(orgId: string, group: EventGroup): Promise<string> {
    const sorted = [...group.events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const newest = sorted[0]
    const oldest = sorted[sorted.length - 1]
    const toolNames = [...new Set(sorted.flatMap((event) => event.tool_names ?? []))]
    const evidenceIds = sorted.map((event) => event.id)

    const { data, error } = await this.repository.upsertCandidate({
      org_id: orgId,
      agent_key: group.agentKey,
      prompt_fingerprint: group.promptFingerprint,
      tool_signature: group.toolSignature,
      tool_names: toolNames,
      run_count: sorted.length,
      evidence_event_ids: evidenceIds,
      first_event_at: oldest?.created_at ?? null,
      last_event_at: newest?.created_at ?? null,
    })

    if (error || !data?.id) {
      this.logger.warn(`Candidate upsert failed for ${group.key}: ${error?.message}`)
      throw new Error(`Failed to upsert skill recommendation candidate: ${error?.message}`)
    }

    return data.id as string
  }
}
