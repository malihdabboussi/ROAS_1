import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { readFieldValue, readItemAssignees } from '../components/space-item-values'
import type { SpaceItem } from '../types'
import type { FieldDef } from '../types/space-schema'

export interface GroupData {
  key: string
  label: string
  color: string
  items: SpaceItem[]
  /** Set for assignee groups — glass chip is hidden in favor of avatar + name */
  assigneeAvatarUrl?: string | null
}

/** Resolve roster row from group bucket key (participant_id, or legacy user_id / agent_key). */
export function rosterEntryForAssigneeKey(
  key: string,
  roster: TeamRosterEntry[],
): TeamRosterEntry | null {
  if (key === '__unassigned__') return null
  return (
    roster.find((r) => r.participant_id === key) ??
    roster.find((r) => r.kind === 'human' && r.user_id === key) ??
    roster.find((r) => r.kind === 'agent' && r.agent_key === key) ??
    null
  )
}

export function assigneeFieldValueForGroupKey(
  key: string,
  roster: TeamRosterEntry[],
): Array<{ type: 'human' | 'agent'; id: string }> {
  if (key === '__unassigned__') return []
  const e = rosterEntryForAssigneeKey(key, roster)
  if (!e) return []
  if (e.kind === 'agent' && e.agent_key) return [{ type: 'agent', id: e.agent_key }]
  if (e.kind === 'human' && e.user_id) return [{ type: 'human', id: e.user_id }]
  return []
}

function groupBySelect(
  items: SpaceItem[],
  field: FieldDef,
  sortDir: 'asc' | 'desc',
  showEmpty = false,
): GroupData[] {
  const options = field.options ?? []
  const ordered = sortDir === 'desc' ? [...options].reverse() : options
  const buckets = new Map<string, SpaceItem[]>()
  for (const opt of ordered) buckets.set(opt.id, [])

  for (const item of items) {
    const raw = readFieldValue(item, field.id)
    const val = raw == null || raw === '' ? '' : String(raw)
    if (!buckets.has(val)) buckets.set(val, [])
    buckets.get(val)!.push(item)
  }

  const groups: GroupData[] = []
  for (const opt of ordered) {
    const bucket = buckets.get(opt.id) ?? []
    if (bucket.length > 0 || showEmpty) {
      groups.push({ key: opt.id, label: opt.label, color: opt.color ?? 'muted', items: bucket })
    }
  }

  const noValueLabel = `No ${field.name ?? field.id}`
  for (const [key, bucket] of buckets) {
    if (bucket.length > 0 && !ordered.some((o) => o.id === key)) {
      const label = key === '' ? noValueLabel : key
      groups.push({ key: key || '__none__', label, color: 'muted', items: bucket })
    }
  }

  return groups
}

function groupByAssignee(
  items: SpaceItem[],
  roster: TeamRosterEntry[],
  sortDir: 'asc' | 'desc',
): GroupData[] {
  const buckets = new Map<string, SpaceItem[]>()

  for (const item of items) {
    const key = readItemAssignees(item)[0]?.id ?? '__unassigned__'
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(item)
  }

  const groups: GroupData[] = []

  const unassigned = buckets.get('__unassigned__')
  if (unassigned && unassigned.length > 0) {
    groups.push({ key: '__unassigned__', label: 'Unassigned', color: 'muted', items: unassigned })
  }

  const sorted = [...buckets.entries()]
    .filter(([k]) => k !== '__unassigned__')
    .sort(([a], [b]) => {
      const nameA = rosterEntryForAssigneeKey(a, roster)?.display_name ?? a
      const nameB = rosterEntryForAssigneeKey(b, roster)?.display_name ?? b
      return nameA.localeCompare(nameB)
    })

  if (sortDir === 'desc') sorted.reverse()

  for (const [key, bucket] of sorted) {
    const entry = rosterEntryForAssigneeKey(key, roster)
    groups.push({
      key,
      label: entry?.display_name ?? 'Unknown',
      color: entry?.kind === 'agent' ? 'violet' : 'blue',
      items: bucket,
      assigneeAvatarUrl: entry?.avatar_url ?? null,
    })
  }

  return groups
}

function groupByDate(items: SpaceItem[], field: FieldDef, sortDir: 'asc' | 'desc'): GroupData[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000)
  const monthEnd = new Date(
    todayStart.getFullYear(),
    todayStart.getMonth() + 1,
    todayStart.getDate(),
  )

  const bucketDefs = [
    { key: 'overdue', label: 'Overdue', color: 'red' },
    { key: 'today', label: 'Today', color: 'amber' },
    { key: 'this_week', label: 'This Week', color: 'blue' },
    { key: 'this_month', label: 'This Month', color: 'cyan' },
    { key: 'later', label: 'Later', color: 'slate' },
    { key: 'no_date', label: 'No Date', color: 'muted' },
  ]

  const buckets = new Map<string, SpaceItem[]>(bucketDefs.map((b) => [b.key, []]))

  for (const item of items) {
    const raw = readFieldValue(item, field.id) as string | null
    if (!raw) {
      buckets.get('no_date')!.push(item)
      continue
    }
    const d = new Date(raw)
    if (d < todayStart) buckets.get('overdue')!.push(item)
    else if (d < todayEnd) buckets.get('today')!.push(item)
    else if (d < weekEnd) buckets.get('this_week')!.push(item)
    else if (d < monthEnd) buckets.get('this_month')!.push(item)
    else buckets.get('later')!.push(item)
  }

  const ordered = sortDir === 'desc' ? [...bucketDefs].reverse() : bucketDefs
  return ordered
    .filter((b) => (buckets.get(b.key)?.length ?? 0) > 0)
    .map((b) => ({ key: b.key, label: b.label, color: b.color, items: buckets.get(b.key)! }))
}

/**
 * When the list has no top-level rows, real groupers often return [] (no buckets with items).
 * One synthetic empty group keeps `GroupSection` + inline `SpaceQuickAdd` on screen.
 */
function syntheticEmptyGroup(field: FieldDef, sortDir: 'asc' | 'desc'): GroupData {
  if (field.type === 'select' || field.type === 'multi_select') {
    const options = field.options ?? []
    if (options.length === 0)
      return { key: '__none__', label: field.name ?? field.id, color: 'muted', items: [] }
    const ordered = sortDir === 'desc' ? [...options].reverse() : options
    const first = ordered[0]!
    return { key: first.id, label: first.label, color: first.color ?? 'muted', items: [] }
  }
  if (field.type === 'assignee') {
    return { key: '__unassigned__', label: 'Unassigned', color: 'muted', items: [] }
  }
  if (field.type === 'date' || field.type === 'created_at' || field.type === 'updated_at') {
    return { key: 'no_date', label: 'No Date', color: 'muted', items: [] }
  }
  return { key: '__all__', label: 'All', color: 'muted', items: [] }
}

export function groupItems(
  items: SpaceItem[],
  field: FieldDef | undefined,
  sortDir: 'asc' | 'desc',
  roster: TeamRosterEntry[],
  showEmpty = false,
): GroupData[] {
  const topLevel = items.filter((i) => !i.parent_item_id)

  if (!field) return [{ key: '__all__', label: 'All', color: 'muted', items: topLevel }]

  let result: GroupData[]
  if (field.type === 'select' || field.type === 'multi_select') {
    result = groupBySelect(topLevel, field, sortDir, showEmpty)
  } else if (field.type === 'assignee') {
    result = groupByAssignee(topLevel, roster, sortDir)
  } else if (field.type === 'date' || field.type === 'created_at' || field.type === 'updated_at') {
    result = groupByDate(topLevel, field, sortDir)
  } else {
    result = [{ key: '__all__', label: 'All', color: 'muted', items: topLevel }]
  }

  if (result.length === 0 && topLevel.length === 0) {
    return [syntheticEmptyGroup(field, sortDir)]
  }

  return result
}
