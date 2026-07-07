import { Injectable, Logger } from '@nestjs/common'
import { RecurrenceSpecSchema, type RecurrenceSpecDto } from '../dto'
import {
  SpaceRecurrenceRepository,
  type RecurringSpaceItemRow,
} from '../repositories/space-recurrence.repository'

type CloneInc = NonNullable<RecurrenceSpecDto['clone_include']>

function createNewFromSpec(r: RecurrenceSpecDto): boolean {
  if (r.create_new_task !== undefined) return r.create_new_task
  return r.mode !== 'update_status'
}

function updateSameFromSpec(r: RecurrenceSpecDto): boolean {
  if (r.update_same_item !== undefined) return r.update_same_item
  return r.mode === 'update_status'
}

function shouldCopy(inc: CloneInc | undefined, key: keyof CloneInc): boolean {
  if (!inc) return true
  if (inc.include_everything) return true
  return inc[key] === true
}

function customDataForClone(
  row: RecurringSpaceItemRow,
  inc: CloneInc | undefined,
): Record<string, unknown> | null {
  const raw = row.custom_data
  if (raw == null || typeof raw !== 'object') return null
  const d = { ...(raw as Record<string, unknown>) }
  if (!inc || inc.include_everything) return d
  if (shouldCopy(inc, 'custom_fields')) return d
  if (shouldCopy(inc, 'tags')) {
    if (d.tags === undefined) return null
    return { tags: d.tags }
  }
  return null
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function skipToWeekday(date: Date): Date {
  const day = date.getDay()
  if (day === 6) date.setDate(date.getDate() + 2)
  else if (day === 0) date.setDate(date.getDate() + 1)
  return date
}

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  const first = new Date(year, month, 1)
  const firstOccurrence = ((weekday - first.getDay() + 7) % 7) + 1
  const day = firstOccurrence + (nth - 1) * 7
  const lastDay = new Date(year, month + 1, 0).getDate()
  if (day > lastDay) return new Date(year, month, lastDay)
  return new Date(year, month, day)
}

function computeMonthlyAnchor(base: Date, interval: number, anchor: string | undefined): Date {
  const next = new Date(base)
  switch (anchor) {
    case 'first_day': {
      next.setMonth(next.getMonth() + interval, 1)
      return next
    }
    case 'last_day': {
      next.setMonth(next.getMonth() + interval + 1, 0)
      return next
    }
    case 'nth_weekday': {
      const weekday = base.getDay()
      const dayOfMonth = base.getDate()
      const nth = Math.ceil(dayOfMonth / 7)
      const targetMonth = base.getMonth() + interval
      const targetYear = base.getFullYear() + Math.floor(targetMonth / 12)
      const normalizedMonth = ((targetMonth % 12) + 12) % 12
      const result = getNthWeekdayOfMonth(targetYear, normalizedMonth, weekday, nth)
      result.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds())
      return result
    }
    default:
      next.setMonth(next.getMonth() + interval)
      return next
  }
}

function addInterval(base: Date, recurrence: RecurrenceSpecDto, now?: Date): Date {
  const interval = Math.max(1, recurrence.interval)

  if (recurrence.frequency === 'days_after') {
    const anchor = now ?? base
    const next = new Date(anchor)
    next.setDate(next.getDate() + (recurrence.days_after_count ?? 1))
    return next
  }

  if (recurrence.frequency === 'custom') {
    const unit = recurrence.custom_unit ?? 'week'
    const next = new Date(base)
    switch (unit) {
      case 'day':
        next.setDate(next.getDate() + interval)
        if (recurrence.skip_weekends) skipToWeekday(next)
        return next
      case 'week': {
        if (recurrence.weekdays && recurrence.weekdays.length > 0) {
          const weekdays = [...new Set(recurrence.weekdays)].sort((a, b) => a - b)
          const currentDay = next.getDay()
          const laterDay = weekdays.find((day) => day > currentDay)
          if (laterDay !== undefined) {
            next.setDate(next.getDate() + (laterDay - currentDay))
            return next
          }
          const firstDay = weekdays[0] ?? currentDay
          next.setDate(next.getDate() + 7 * interval - (currentDay - firstDay))
          return next
        }
        next.setDate(next.getDate() + 7 * interval)
        return next
      }
      case 'month':
        return computeMonthlyAnchor(base, interval, recurrence.monthly_anchor)
      case 'year':
        next.setFullYear(next.getFullYear() + interval)
        return next
      default:
        return next
    }
  }

  const next = new Date(base)
  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      if (recurrence.skip_weekends) skipToWeekday(next)
      return next
    case 'weekly': {
      if (recurrence.weekdays && recurrence.weekdays.length > 0) {
        const weekdays = [...new Set(recurrence.weekdays)].sort((a, b) => a - b)
        const currentDay = next.getDay()
        const laterDay = weekdays.find((day) => day > currentDay)
        if (laterDay !== undefined) {
          next.setDate(next.getDate() + (laterDay - currentDay))
          return next
        }
        const firstDay = weekdays[0] ?? currentDay
        next.setDate(next.getDate() + 7 * interval - (currentDay - firstDay))
        return next
      }
      next.setDate(next.getDate() + 7 * interval)
      return next
    }
    case 'monthly':
      return computeMonthlyAnchor(base, interval, recurrence.monthly_anchor)
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      return next
    default:
      return next
  }
}

function shouldFire(
  item: RecurringSpaceItemRow,
  recurrence: RecurrenceSpecDto,
  lastMaterializedAt: Date | null,
  now: Date,
): boolean {
  if (recurrence.trigger === 'status_change') {
    if (!recurrence.trigger_status) return false
    if (item.status !== recurrence.trigger_status) return false
    const updatedAt = parseDate(item.updated_at)
    if (!updatedAt) return true
    if (!lastMaterializedAt) return true
    return updatedAt.getTime() > lastMaterializedAt.getTime()
  }

  const dueDate = parseDate(item.due_date)
  if (!dueDate) return false
  if (now.getTime() <= dueDate.getTime()) return false
  if (!lastMaterializedAt) return true
  return lastMaterializedAt.getTime() < dueDate.getTime()
}

function hasReachedEnd(
  recurrence: RecurrenceSpecDto,
  occurrencesCreated: number,
  nextDueDate: Date,
): boolean {
  if (recurrence.end.type === 'count') {
    return occurrencesCreated >= recurrence.end.count
  }
  if (recurrence.end.type === 'until') {
    const until = parseDate(recurrence.end.until)
    if (!until) return false
    return nextDueDate.getTime() > until.getTime()
  }
  return false
}

@Injectable()
export class SpaceRecurrenceService {
  private readonly logger = new Logger(SpaceRecurrenceService.name)

  constructor(private readonly recurrenceRepo: SpaceRecurrenceRepository) {}

  async materializeDueRecurrences(): Promise<{ processed: number; materialized: number }> {
    const lock = await this.recurrenceRepo.tryAcquireLock()
    if (lock.errorMessage) {
      this.logger.warn(`Failed to acquire recurrence lock: ${lock.errorMessage}`)
      return { processed: 0, materialized: 0 }
    }
    if (!lock.acquired) return { processed: 0, materialized: 0 }

    try {
      const recurringItems = await this.recurrenceRepo.listRecurringItems()
      if (recurringItems.errorMessage) {
        this.logger.warn(`Failed to load recurring space items: ${recurringItems.errorMessage}`)
        return { processed: 0, materialized: 0 }
      }

      let processed = 0
      let materialized = 0
      const now = new Date()
      const nowIso = now.toISOString()

      for (const row of recurringItems.rows) {
        processed++
        const parsedRecurrence = RecurrenceSpecSchema.safeParse(row.recurrence)
        if (!parsedRecurrence.success) continue
        const recurrence = parsedRecurrence.data
        const dueDate = parseDate(row.due_date)
        if (!dueDate) continue
        const startDate = parseDate(row.start_date)
        const lastMaterializedAt = parseDate(recurrence.last_materialized_at)

        if (!shouldFire(row, recurrence, lastMaterializedAt, now)) continue

        const currentOccurrences = recurrence.occurrences_created ?? 0
        const nextDueDate = addInterval(dueDate, recurrence, now)
        if (hasReachedEnd(recurrence, currentOccurrences, nextDueDate)) continue

        let nextStartDate: Date | null = null
        if (startDate) {
          if (recurrence.sync_to_due_date) {
            const offsetMs = dueDate.getTime() - startDate.getTime()
            nextStartDate = new Date(nextDueDate.getTime() - offsetMs)
          } else {
            nextStartDate = addInterval(startDate, recurrence)
          }
        }

        const nextOccurrences = currentOccurrences + 1
        const nextRecurrence: RecurrenceSpecDto = {
          ...recurrence,
          occurrences_created: nextOccurrences,
          last_materialized_at: nowIso,
        }

        const doCreate = createNewFromSpec(recurrence)
        const doUpdate = updateSameFromSpec(recurrence)
        if (!doCreate && !doUpdate) continue

        if (doCreate) {
          const inc = recurrence.clone_include
          const seriesParentId = row.recurrence_parent_id ?? row.id
          const nextDueIso = nextDueDate.toISOString()
          const existingRow = await this.recurrenceRepo.findMaterializedInstance(
            seriesParentId,
            nextDueIso,
          )

          if (!existingRow) {
            const newStatus = recurrence.reset_status ?? recurrence.new_instance_status ?? 'todo'
            const description = shouldCopy(inc, 'description') ? row.description : null
            const notes = shouldCopy(inc, 'description') ? row.notes : null
            const priority = shouldCopy(inc, 'priority') ? row.priority : 'medium'
            const assignee_type = shouldCopy(inc, 'assignee') ? row.assignee_type : 'unassigned'
            const assignee_id = shouldCopy(inc, 'assignee') ? row.assignee_id : null
            const assignees = shouldCopy(inc, 'assignee') ? (row.assignees ?? []) : []
            const custom_data = customDataForClone(row, inc)

            const insertError = await this.recurrenceRepo.createMaterializedInstance({
              space_id: row.space_id,
              org_id: row.org_id,
              user_id: row.user_id,
              title: row.title,
              status: newStatus,
              priority,
              assignee_type,
              assignee_id,
              assignees,
              start_date: nextStartDate ? nextStartDate.toISOString() : null,
              due_date: nextDueIso,
              description,
              notes,
              source: row.source,
              sort_order: row.sort_order,
              linked_mission_id: null,
              custom_data: custom_data as never,
              recurrence: {
                ...recurrence,
                occurrences_created: nextOccurrences,
              },
              recurrence_parent_id: seriesParentId,
              parent_item_id: null,
            })
            if (insertError) {
              this.logger.warn(`Failed to clone recurring item ${row.id}: ${insertError}`)
              continue
            }
          }
        }

        if (doUpdate) {
          const resetStatus = recurrence.reset_status ?? 'todo'
          const updateError = await this.recurrenceRepo.updateRecurringItem(row.id, {
            status: resetStatus,
            start_date: nextStartDate ? nextStartDate.toISOString() : null,
            due_date: nextDueDate.toISOString(),
            recurrence: nextRecurrence,
            linked_mission_id: null,
          })
          if (updateError) {
            this.logger.warn(`Failed to update recurring item ${row.id}: ${updateError}`)
            continue
          }
          materialized++
          continue
        }

        const updateRecError = await this.recurrenceRepo.updateRecurringItem(row.id, {
          recurrence: nextRecurrence,
        })
        if (updateRecError) {
          this.logger.warn(`Failed to update recurrence metadata for ${row.id}: ${updateRecError}`)
          continue
        }
        materialized++
      }

      if (materialized > 0) {
        this.logger.log(`Materialized ${materialized} recurring space item cycle(s)`)
      }

      return { processed, materialized }
    } finally {
      const unlockError = await this.recurrenceRepo.releaseLock()
      if (unlockError) {
        this.logger.warn(`Failed to release recurrence lock: ${unlockError}`)
      }
    }
  }
}
