import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import parser from 'cron-parser'
import type { ScheduleConfig } from '../dto'
import { SpaceAutomationRunsRepository } from '../repositories/space-automation-runs.repository'
import { SpaceAutomationsRepository } from '../repositories/space-automations.repository'
import { SpaceAutomationService, type TriggerEvent } from './space-automation.service'

/**
 * Drives time-based ("schedule") space automations.
 *
 * Storage: the user-facing config lives on `space_automations.trigger` JSONB
 * (see {@link ScheduleConfig}). Two materialized columns,
 * `schedule_next_fire_at` and `schedule_last_fired_at`, let the cron job find
 * due rows without parsing JSON.
 *
 * Execution model: a single `@Cron(EVERY_MINUTE)` job in `CronService` calls
 * {@link processDueSchedules}. We compute the next fire once at save time
 * (see {@link computeInitialNextFireAt}) and roll it forward each time the
 * scheduler fires. Agent actions resolve their runtime inside
 * `SpaceAutomationService` through `UserAgentApiService`, so this scheduler
 * does not pre-wake a Fly machine.
 */
const DEFAULT_TIMEZONE = 'UTC'
const DUE_BATCH_SIZE = 50

@Injectable()
export class SpaceAutomationSchedulerService {
  private readonly logger = new Logger(SpaceAutomationSchedulerService.name)

  constructor(
    private readonly automationsRepo: SpaceAutomationsRepository,
    private readonly automationService: SpaceAutomationService,
    private readonly configService: ConfigService,
    private readonly errorReporter: ErrorReporter,
    private readonly automationRunsRepo: SpaceAutomationRunsRepository = new SpaceAutomationRunsRepository(),
  ) {}

  /**
   * Compute the first fire after `from` for a saved automation, or `null` when
   * the trigger isn't a schedule trigger. Used by the controller on create/update.
   */
  computeInitialNextFireAt(
    automation: Record<string, unknown>,
    from: Date = new Date(),
  ): Date | null {
    if (automation.enabled !== true || automation.is_draft === true) return null
    const trigger = automation.trigger as Record<string, unknown> | undefined
    if (!trigger || trigger.type !== 'schedule') return null
    return this.computeNextFireAt(trigger, from)
  }

  /**
   * Compute the next fire strictly after `from`. Throws on an invalid cron
   * expression or missing required fields — the controller surfaces this so
   * the user sees the validation error before the row is saved.
   */
  computeNextFireAt(trigger: Record<string, unknown>, from: Date): Date {
    const cron = scheduleToCron(trigger.schedule as ScheduleConfig | undefined)
    const tz = String(trigger.timezone ?? '').trim() || DEFAULT_TIMEZONE
    const interval = parser.parseExpression(cron, { tz, currentDate: from })
    return interval.next().toDate()
  }

  /**
   * Cron entry: run every minute, find automations that are due, fire them,
   * and roll `schedule_next_fire_at` forward.
   */
  async processDueSchedules(): Promise<void> {
    const admin = this.getServiceClient()
    if (!admin) return

    try {
      await this.reseedMissingNextFireAt(admin)
    } catch (err) {
      this.logger.error(
        `Schedule next-fire repair scan failed; continuing with due rows: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
    const dueRows = await this.automationsRepo.findDueSchedules(admin, new Date(), DUE_BATCH_SIZE)
    if (dueRows.length === 0) return

    for (const row of dueRows) {
      try {
        await this.processOne(admin, row)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        this.logger.error(
          `Schedule fire failed for automation ${String(row.id)}: ${message}`,
        )
        reportAppError(
          this.errorReporter,
          {
            app: process.env.APP_NAME ?? 'api',
            category: 'worker',
            feature: 'spaces/automation_scheduler',
            error_code: 'schedule_fire_failed',
            message,
            user_id: row.user_id ? String(row.user_id) : undefined,
            context: {
              automationId: String(row.id ?? ''),
              spaceId: String(row.space_id ?? ''),
            },
            stack: err instanceof Error ? err.stack : undefined,
          },
          err,
        )
        // Roll forward anyway so a bad row does not block subsequent fires.
        await this.rollNextFireForward(admin, row)
      }
    }
  }

  private async processOne(admin: SupabaseClient, row: Record<string, unknown>): Promise<void> {
    const automationId = String(row.id ?? '')
    const spaceId = String(row.space_id ?? '')
    const userId = String(row.user_id ?? '')
    const orgId = row.org_id ? String(row.org_id) : null
    const trigger = row.trigger as Record<string, unknown> | undefined
    if (!automationId || !spaceId || !userId || !trigger || trigger.type !== 'schedule') {
      await this.rollNextFireForward(admin, row)
      return
    }

    const expectedNextFireAt = String(row.schedule_next_fire_at ?? '')
    if (!expectedNextFireAt) return

    const firedAt = new Date()
    // Compute the next fire BEFORE running actions so a slow run cannot block
    // the row from being claimed atomically.
    const next = this.computeNextFireAt(trigger, firedAt)

    // Compare-and-swap: only the worker that successfully advances
    // `schedule_next_fire_at` from the value we read is allowed to execute.
    // Concurrent cron ticks (or replicas) lose the swap and bail out, so the
    // same scheduled rule cannot fire twice for one due time.
    const claimed = await this.automationsRepo.claimSchedule(
      admin,
      spaceId,
      automationId,
      expectedNextFireAt,
      next.toISOString(),
      firedAt.toISOString(),
    )
    if (!claimed) return

    const event: TriggerEvent = { type: 'schedule', fired_at: firedAt.toISOString() }

    const queued =
      typeof this.automationService.enqueueAutomationRuntimeJob === 'function'
        ? await this.automationService.enqueueAutomationRuntimeJob(
            automationId,
            event,
            { supabase: admin, userId, orgId, spaceId, depth: 0 },
            'itemless',
          )
        : false
    this.logger.log(
      `Claimed schedule for automation ${automationId}; execution=${queued ? 'queue' : 'inline'}`,
    )
    if (!queued) {
      await this.automationService.executeAutomationItemless(
        row as unknown as Parameters<SpaceAutomationService['executeAutomationItemless']>[0],
        event,
        { supabase: admin, userId, orgId, spaceId, depth: 0 },
      )
    }
  }

  private async rollNextFireForward(
    admin: SupabaseClient,
    row: Record<string, unknown>,
  ): Promise<void> {
    const automationId = String(row.id ?? '')
    const spaceId = String(row.space_id ?? '')
    const trigger = row.trigger as Record<string, unknown> | undefined
    if (!automationId || !spaceId || !trigger) return
    let next: Date
    try {
      next = this.computeNextFireAt(trigger, new Date())
    } catch (err) {
      // Only an invalid saved schedule disables future fires. Persistence
      // failures below must leave the existing due timestamp untouched.
      this.logger.warn(
        `Disabling schedule for automation ${automationId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      await this.automationsRepo.updateScheduleFields(admin, spaceId, automationId, {
        schedule_next_fire_at: null,
      })
      return
    }

    try {
      await this.automationsRepo.updateScheduleFields(admin, spaceId, automationId, {
        schedule_next_fire_at: next.toISOString(),
      })
    } catch (err) {
      this.logger.error(
        `Failed to persist next fire for automation ${automationId}; leaving it due: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
    }
  }

  private async reseedMissingNextFireAt(admin: SupabaseClient): Promise<void> {
    const rows = await this.automationsRepo.findSchedulesMissingNextFire(
      admin,
      DUE_BATCH_SIZE,
    )
    const now = new Date()
    for (const row of rows) {
      const automationId = String(row.id ?? '')
      const spaceId = String(row.space_id ?? '')
      if (!automationId || !spaceId) continue
      try {
        const next = this.computeInitialNextFireAt(row, now)
        if (!next) continue
        await this.automationsRepo.updateScheduleFields(admin, spaceId, automationId, {
          schedule_next_fire_at: next.toISOString(),
        })
      } catch (err) {
        this.logger.warn(
          `Could not reseed schedule for automation ${automationId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
      }
    }
  }

  private getServiceClient(): SupabaseClient | null {
    return this.automationRunsRepo.createOptionalServiceRoleClient(this.configService)
  }
}

// ---------------------------------------------------------------------------
// Preset → 5-field cron string conversion
// ---------------------------------------------------------------------------

/**
 * Translate a {@link ScheduleConfig} into a 5-field cron expression
 * (`m h dom mon dow`). For preset mode, only the cron fields the preset cares
 * about are populated; cron-parser handles the rest correctly because every
 * unspecified field becomes `*`.
 */
export function scheduleToCron(config: ScheduleConfig | undefined): string {
  if (!config) {
    throw new Error('Schedule config is required')
  }
  if (config.mode === 'custom') {
    const expr = config.cron.trim()
    if (!expr) throw new Error('Custom cron expression is empty')
    // Validate by parsing once with a fixed tz.
    parser.parseExpression(expr, { tz: 'UTC' })
    return expr
  }

  const interval = Math.max(1, Math.floor(config.interval ?? 1))
  switch (config.preset) {
    case 'minutes': {
      const n = Math.min(59, interval)
      if (n === 1) return '* * * * *'
      return `*/${n} * * * *`
    }
    case 'hourly':
      return interval === 1 ? '0 * * * *' : `0 */${interval} * * *`
    case 'daily': {
      const [h, m] = parseTime(config.time)
      return interval === 1 ? `${m} ${h} * * *` : `${m} ${h} */${interval} * *`
    }
    case 'weekly': {
      const [h, minute] = parseTime(config.time)
      const fromWeekdays =
        config.weekdays && config.weekdays.length > 0
          ? [...new Set(config.weekdays)].sort((a, b) => a - b)
          : [config.day_of_week ?? 1]
      const dow = fromWeekdays.join(',')
      // cron-parser only supports `*/n` on numeric fields, not weekdays.
      // Weekly repeats every week only (no "every N weeks" in presets).
      if (interval !== 1) {
        throw new Error('Weekly schedule does not support interval > 1')
      }
      return `${minute} ${h} * * ${dow}`
    }
    case 'monthly': {
      const [h, m] = parseTime(config.time)
      const dom = config.day_of_month ?? 1
      return interval === 1 ? `${m} ${h} ${dom} * *` : `${m} ${h} ${dom} */${interval} *`
    }
    case 'yearly': {
      const [h, minute] = parseTime(config.time)
      const dom = config.day_of_month ?? 1
      const month = config.month ?? 1
      return `${minute} ${h} ${dom} ${month} *`
    }
    default: {
      // Exhaustive
      const _exhaustive: never = config.preset
      throw new Error(`Unsupported preset: ${String(_exhaustive)}`)
    }
  }
}

function parseTime(value: string | undefined): [number, number] {
  const v = (value ?? '').trim()
  if (!v) return [9, 0]
  const match = v.match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) throw new Error(`Invalid time of day: ${v} (expected HH:MM)`)
  return [Number(match[1]), Number(match[2])]
}
