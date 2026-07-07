import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { readFieldValue, toFieldPatch } from '../components/space-item-values'
import type { SpaceItem } from '../types'
import type { FieldDef } from '../types/space-schema'

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a == null || b == null) return a === b
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return false
}

/** Merge partial updates (nested custom_data). */
export function mergeSpaceItemPartials(
  a: Partial<SpaceItem>,
  b: Partial<SpaceItem>,
): Partial<SpaceItem> {
  const out: Partial<SpaceItem> = { ...a, ...b }
  if (a.custom_data && b.custom_data) {
    out.custom_data = { ...a.custom_data, ...b.custom_data }
  }
  return out
}

/**
 * When the list is grouped by `field`, keep the placed item in the same bucket as the row it was dropped on
 * (status, assignee, custom select, date field, etc.).
 */
export function getGroupByFieldSyncPatch(
  active: SpaceItem,
  over: SpaceItem,
  field: FieldDef,
): Partial<SpaceItem> | null {
  const overVal = readFieldValue(over, field.id)
  const activeVal = readFieldValue(active, field.id)
  if (valuesEqual(activeVal, overVal)) return null
  return toFieldPatch(active, field.id, overVal)
}

function valueForEmptyGroupKey(
  field: FieldDef,
  groupKey: string,
  roster: TeamRosterEntry[],
): unknown {
  if (field.type === 'select') {
    return groupKey
  }
  if (field.type === 'multi_select') {
    return [groupKey]
  }
  if (field.type === 'assignee') {
    if (groupKey === '__unassigned__') {
      return []
    }
    const e = roster.find((r) => r.participant_id === groupKey)
    if (!e) return null
    if (e.kind === 'agent' && e.agent_key) return [{ type: 'agent' as const, id: e.agent_key }]
    if (e.kind === 'human' && e.user_id) return [{ type: 'human' as const, id: e.user_id }]
    return null
  }
  if (field.type === 'date') {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const iso = (d: Date) => d.toISOString()
    if (groupKey === 'no_date') return null
    if (groupKey === 'overdue') return iso(new Date(todayStart.getTime() - 86400000))
    if (groupKey === 'today') return iso(todayStart)
    if (groupKey === 'this_week') {
      return iso(new Date(todayStart.getTime() + 2 * 86400000))
    }
    if (groupKey === 'this_month') {
      return iso(new Date(todayStart.getFullYear(), todayStart.getMonth(), 15))
    }
    if (groupKey === 'later') {
      return iso(new Date(todayStart.getTime() + 45 * 86400000))
    }
    return iso(todayStart)
  }
  return null
}

/**
 * When dropping on an empty group’s zone (no list rows), derive the field value for that bucket.
 * Returns `null` if the bucket cannot be applied or the value already matches.
 */
export function getFieldPatchForEmptyGroup(
  active: SpaceItem,
  field: FieldDef,
  groupKey: string,
  roster: TeamRosterEntry[],
): Partial<SpaceItem> | null {
  if (
    field.type === 'assignee' &&
    groupKey !== '__unassigned__' &&
    !roster.some((r) => r.participant_id === groupKey)
  ) {
    return null
  }
  const nextVal = valueForEmptyGroupKey(field, groupKey, roster)
  if (field.type === 'assignee' && nextVal == null) return null
  const activeVal = readFieldValue(active, field.id)
  if (valuesEqual(activeVal, nextVal)) return null
  return toFieldPatch(active, field.id, nextVal)
}
