import type { CompanyDreamGroup } from './company-dream-signal-triage.service'

type DreamRunRepository = {
  findByDedupeKey(key: string): Promise<Record<string, unknown> | null>
  createRun(input: Record<string, unknown>): Promise<{ id: string }>
  completeRun(id: string, output: Record<string, unknown>): Promise<void>
}

type DreamCollector = {
  collect(input: Record<string, unknown>): Promise<{
    groups: CompanyDreamGroup[]
    sourceCounts: Record<string, number>
  }>
}

type DreamTriage = {
  triageGroups(
    groups: CompanyDreamGroup[],
    options: { maxGroups: number },
  ): Promise<{ included: CompanyDreamGroup[] }>
}

type DreamAtlas = {
  runDailyDreamChunk(input: Record<string, unknown>): Promise<{ signals: unknown[] }>
}

export type CompanyDailyDreamRunInput = {
  orgId: string
  brainId: string
  userId: string
  localDate: string
  windowStart: string
  windowEnd: string
  manual?: boolean
}

export type CompanyDailyDreamRunResult = {
  runId: string
  chunksProcessed: number
  sourceCounts: Record<string, number>
  signalsCreated: number
  skipped?: boolean
}

const MAX_GROUPS_PER_DIGEST = 50
const MAX_GROUPS_PER_CHUNK = 8

export class CompanyDailyDreamRunnerService {
  constructor(
    private readonly deps: {
      runRepository: DreamRunRepository
      collector: DreamCollector
      triage: DreamTriage
      atlas: DreamAtlas
    },
  ) {}

  async runDailyDream(input: CompanyDailyDreamRunInput): Promise<CompanyDailyDreamRunResult> {
    const dedupeKey = `company-dream-${input.orgId}-${input.localDate}`
    if (!input.manual) {
      const existing = await this.deps.runRepository.findByDedupeKey(dedupeKey)
      if (existing?.id) {
        return {
          runId: String(existing.id),
          chunksProcessed: 0,
          sourceCounts: {},
          signalsCreated: 0,
          skipped: true,
        }
      }
    }

    const run = await this.deps.runRepository.createRun({
      org_id: input.orgId,
      brain_id: input.brainId,
      dedupe_key: dedupeKey,
      window_start: input.windowStart,
      window_end: input.windowEnd,
      status: 'running',
    })

    const collected = await this.deps.collector.collect({
      orgId: input.orgId,
      brainId: input.brainId,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
    })
    const triaged = await this.deps.triage.triageGroups(collected.groups, {
      maxGroups: MAX_GROUPS_PER_DIGEST,
    })

    let chunksProcessed = 0
    let signalsCreated = 0
    for (const chunk of this.chunk(triaged.included, MAX_GROUPS_PER_CHUNK)) {
      const result = await this.deps.atlas.runDailyDreamChunk({
        orgId: input.orgId,
        brainId: input.brainId,
        userId: input.userId,
        runId: run.id,
        localDate: input.localDate,
        groups: chunk,
      })
      chunksProcessed += 1
      signalsCreated += result.signals.length
    }

    await this.deps.runRepository.completeRun(run.id, {
      status: 'completed',
      source_counts: collected.sourceCounts,
      chunks_processed: chunksProcessed,
      signals_created: signalsCreated,
    })

    return {
      runId: run.id,
      chunksProcessed,
      sourceCounts: collected.sourceCounts,
      signalsCreated,
    }
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }
}
