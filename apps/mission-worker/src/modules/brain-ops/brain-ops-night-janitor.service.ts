import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from '../../lib/services/database.service'

const DEFAULT_SWEEP_MS = 6 * 60 * 60 * 1000
const PATTERN_ANALYSIS_STALE_MS = 24 * 60 * 60 * 1000
const LINT_STALE_MS = 7 * 24 * 60 * 60 * 1000
const BELIEF_DECAY_MS = 30 * 24 * 60 * 60 * 1000
const BELIEF_ARCHIVE_MS = 60 * 24 * 60 * 60 * 1000

type CortexBrainRow = {
  id: string
  owner_id: string
  org_id: string | null
  last_pattern_analysis_at: string | null
  last_lint_at: string | null
}

@Injectable()
export class BrainOpsNightJanitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrainOpsNightJanitorService.name)
  private timer: NodeJS.Timeout | null = null
  private sweepInFlight = false

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  onModuleInit() {
    const sweepMs =
      Number(this.configService.get<number>('brainOps.nightJanitorSweepMs')) || DEFAULT_SWEEP_MS
    this.timer = setInterval(() => {
      this.runSweep().catch((err) => {
        this.logger.error(`Night janitor sweep failed: ${(err as Error).message}`)
      })
    }, sweepMs)
    this.logger.log(`Brain ops night janitor started (interval=${sweepMs}ms)`)

    setTimeout(() => {
      this.runSweep().catch((err) => {
        this.logger.error(`Initial night janitor sweep failed: ${(err as Error).message}`)
      })
    }, 10_000)
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async runSweep() {
    if (this.sweepInFlight) return
    this.sweepInFlight = true
    try {
      const client = this.databaseService.getClient()
      const { data, error } = await client
        .from('ns_brains')
        .select('id, owner_id, org_id, last_pattern_analysis_at, last_lint_at')
        .eq('cortex_max', true)
        .is('agent_id', null)
        .is('campaign_id', null)
        .limit(100)

      if (error) {
        this.logger.warn(`Failed to fetch cortex brains: ${error.message}`)
        return
      }

      const brains = (data ?? []) as CortexBrainRow[]
      let enqueued = 0
      for (const brain of brains) {
        if (this.isStale(brain.last_pattern_analysis_at, PATTERN_ANALYSIS_STALE_MS)) {
          enqueued += await this.enqueueIfMissing(
            brain,
            'brain_pattern_analysis',
            `night-pattern-${brain.id}-${this.dayKey()}`,
          )
        }
        if (this.isStale(brain.last_lint_at, LINT_STALE_MS)) {
          enqueued += await this.enqueueIfMissing(
            brain,
            'brain_lint',
            `night-lint-${brain.id}-${this.weekKey()}`,
          )
        }
      }

      if (enqueued > 0) {
        this.logger.log(`Brain ops night janitor enqueued ${enqueued} job(s)`)
      }

      await this.decayCustomerBeliefs()
    } finally {
      this.sweepInFlight = false
    }
  }

  private async decayCustomerBeliefs() {
    const client = this.databaseService.getClient()
    const { data: brains, error: brainsError } = await client
      .from('ns_brains')
      .select('id')
      .eq('scope', 'customer')
      .eq('cortex_max', true)
      .limit(500)
    if (brainsError) {
      this.logger.warn(`Failed to fetch customer brains for decay: ${brainsError.message}`)
      return
    }
    const subjectIds = (brains ?? []).map((b: { id: string }) => b.id)
    if (subjectIds.length === 0) return

    const now = Date.now()
    const archiveBefore = new Date(now - BELIEF_ARCHIVE_MS).toISOString()
    const decayBefore = new Date(now - BELIEF_DECAY_MS).toISOString()

    const { error: archiveErr } = await client
      .from('ns_belief_patterns')
      .update({ status: 'resolved', decayed_at: new Date().toISOString() })
      .in('subject_id', subjectIds)
      .is('decayed_at', null)
      .lt('last_reinforced_at', archiveBefore)
    if (archiveErr) {
      this.logger.warn(`Customer belief archive decay failed: ${archiveErr.message}`)
    }

    const { error: decayErr } = await client.rpc('decay_customer_belief_strength', {
      p_subject_ids: subjectIds,
      p_reinforced_before: decayBefore,
    })
    if (decayErr) {
      this.logger.warn(`Customer belief strength decay failed: ${decayErr.message}`)
    }
  }

  private isStale(value: string | null, staleMs: number): boolean {
    if (!value) return true
    const ts = new Date(value).getTime()
    if (Number.isNaN(ts)) return true
    return Date.now() - ts >= staleMs
  }

  private async enqueueIfMissing(
    brain: CortexBrainRow,
    eventType: 'brain_pattern_analysis' | 'brain_lint',
    dedupeKey: string,
    payload: Record<string, unknown> = { source: 'night_janitor' },
  ): Promise<number> {
    const client = this.databaseService.getClient()
    const { data: existing } = await client
      .from('brain_ops_outbox')
      .select('id')
      .eq('dedupe_key', dedupeKey)
      .limit(1)
      .maybeSingle()
    if (existing?.id) return 0

    const { error } = await client.from('brain_ops_outbox').insert({
      brain_id: brain.id,
      user_id: brain.owner_id,
      org_id: brain.org_id ?? null,
      event_type: eventType,
      dedupe_key: dedupeKey,
      payload,
    })
    if (error) {
      this.logger.warn(`Failed to enqueue ${eventType}: ${error.message}`)
      return 0
    }
    return 1
  }

  private dayKey(): string {
    return new Date().toISOString().slice(0, 10)
  }

  private weekKey(): string {
    return String(Math.floor(Date.now() / LINT_STALE_MS))
  }
}
