import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DatabaseService } from '../../lib/services/database.service'
import { DreamOpsEligibilityService } from './dream-ops-eligibility.service'
import { DreamOpsRepository } from './dream-ops.repository'
import type { DreamOpsSettingRow } from './types'

const DEFAULT_SWEEP_MS = 6 * 60 * 60 * 1000

@Injectable()
export class DreamOpsNightJanitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DreamOpsNightJanitorService.name)
  private readonly repository: DreamOpsRepository
  private readonly eligibility: DreamOpsEligibilityService
  private timer: NodeJS.Timeout | null = null
  private sweepInFlight = false

  constructor(
    private readonly configService: ConfigService,
    databaseService: DatabaseService,
    repository?: DreamOpsRepository,
    eligibility?: DreamOpsEligibilityService,
  ) {
    this.repository = repository ?? new DreamOpsRepository(databaseService)
    this.eligibility = eligibility ?? new DreamOpsEligibilityService(databaseService)
  }

  onModuleInit() {
    const sweepMs =
      Number(this.configService.get<number>('dreamOps.nightJanitorSweepMs')) ||
      Number(this.configService.get<number>('brainOps.nightJanitorSweepMs')) ||
      DEFAULT_SWEEP_MS
    this.timer = setInterval(() => {
      this.runSweep().catch((err) => {
        this.logger.error(`Dream Ops night janitor sweep failed: ${(err as Error).message}`)
      })
    }, sweepMs)
    this.logger.log(`Dream Ops night janitor started (interval=${sweepMs}ms)`)

    setTimeout(() => {
      this.runSweep().catch((err) => {
        this.logger.error(`Initial Dream Ops sweep failed: ${(err as Error).message}`)
      })
    }, 10_000)
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async runSweep(): Promise<void> {
    if (this.sweepInFlight) return
    this.sweepInFlight = true
    try {
      const settings = await this.repository.listEnabledSettings()
      let queued = 0
      for (const setting of settings) {
        if (!(await this.isDue(setting))) continue
        queued += await this.queueIfEligible(setting)
      }
      if (queued > 0) this.logger.log(`Dream Ops queued ${queued} job(s)`)
    } finally {
      this.sweepInFlight = false
    }
  }

  private async queueIfEligible(setting: DreamOpsSettingRow): Promise<number> {
    if (!setting.user_id) return 0
    const localDate = this.localDate(setting.timezone)
    const windowEnd = new Date().toISOString()
    const lookbackHours = Number(setting.lookback_hours || 24)
    const windowStart = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString()
    const hasEvidence = await this.eligibility.hasEvidence({ setting, windowStart, windowEnd })
    if (!hasEvidence) return 0

    const dedupeKey = this.dedupeKey(setting, localDate)
    const existing = await this.repository.findOutboxByDedupeKey(dedupeKey)
    if (existing?.id) return 0

    await this.repository.insertOutbox({
      org_id: setting.org_id,
      user_id: setting.user_id,
      operation_type: setting.operation_type,
      subject_kind: setting.subject_kind,
      subject_key: setting.subject_key,
      target_id: setting.target_id,
      dedupe_key: dedupeKey,
      payload: {
        source: 'dream_ops_night_janitor',
        local_date: localDate,
        window_start: windowStart,
        window_end: windowEnd,
        lookback_hours: lookbackHours,
      },
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
      next_attempt_at: new Date().toISOString(),
    })
    await this.repository.markSettingQueued(setting.id, localDate)
    return 1
  }

  private async isDue(setting: DreamOpsSettingRow): Promise<boolean> {
    if (setting.schedule === 'manual_only') return false
    const nowParts = this.localParts(setting.timezone)
    if (setting.schedule === 'weekdays' && (nowParts.weekday === 6 || nowParts.weekday === 7)) {
      return false
    }
    if (setting.last_queued_local_date === nowParts.date) return false
    return nowParts.time >= this.normalizeLocalTime(setting.local_time)
  }

  private dedupeKey(setting: DreamOpsSettingRow, localDate: string): string {
    if (setting.operation_type === 'company_daily_dream') {
      return `company_daily_dream:${setting.org_id}:${localDate}`
    }
    return `agent_learning_dream:${setting.org_id}:${setting.subject_key}:${localDate}`
  }

  private localDate(timezone: string): string {
    return this.localParts(timezone).date
  }

  private localParts(timezone: string): { date: string; time: string; weekday: number } {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    })
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
    )
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday) + 1
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      time: `${parts.hour}:${parts.minute}`,
      weekday: weekday > 0 ? weekday : 1,
    }
  }

  private normalizeLocalTime(value: string): string {
    const match = String(value || '00:00').match(/^(\d{2}):(\d{2})/)
    return match ? `${match[1]}:${match[2]}` : '00:00'
  }
}
