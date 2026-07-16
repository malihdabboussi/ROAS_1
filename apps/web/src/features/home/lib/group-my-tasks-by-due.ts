import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'

export type MyTasksDueGroupId = 'overdue' | 'today' | 'upcoming' | 'no_due'

export type MyTasksDueGroup = {
  id: MyTasksDueGroupId
  label: string
  items: YourTurnItem[]
}

const GROUP_ORDER: MyTasksDueGroupId[] = ['overdue', 'today', 'upcoming', 'no_due']

const GROUP_LABELS: Record<MyTasksDueGroupId, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  no_due: 'No due date',
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

export function classifyMyTaskDueBucket(
  dueAt: string | null,
  now: Date = new Date(),
): MyTasksDueGroupId {
  if (!dueAt) return 'no_due'
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) return 'no_due'
  const dayStart = startOfLocalDay(now)
  const dayEnd = endOfLocalDay(now)
  if (due.getTime() < dayStart.getTime()) return 'overdue'
  if (due.getTime() <= dayEnd.getTime()) return 'today'
  return 'upcoming'
}

export function filterMyTaskItems(items: YourTurnItem[]): YourTurnItem[] {
  return items.filter((item) => item.kind === 'space_item' || item.kind === 'mission_subtask')
}

function sortByDueThenTitle(a: YourTurnItem, b: YourTurnItem, ascending: boolean): number {
  const aMs = a.due_at ? new Date(a.due_at).getTime() : Number.POSITIVE_INFINITY
  const bMs = b.due_at ? new Date(b.due_at).getTime() : Number.POSITIVE_INFINITY
  if (aMs !== bMs) return ascending ? aMs - bMs : bMs - aMs
  return a.title.localeCompare(b.title)
}

/** Group personal tasks by due window for the Home My tasks expand panel. */
export function groupMyTasksByDue(
  items: YourTurnItem[],
  now: Date = new Date(),
): MyTasksDueGroup[] {
  const buckets: Record<MyTasksDueGroupId, YourTurnItem[]> = {
    overdue: [],
    today: [],
    upcoming: [],
    no_due: [],
  }

  for (const item of filterMyTaskItems(items)) {
    buckets[classifyMyTaskDueBucket(item.due_at, now)].push(item)
  }

  buckets.overdue.sort((a, b) => sortByDueThenTitle(a, b, true))
  buckets.today.sort((a, b) => sortByDueThenTitle(a, b, true))
  buckets.upcoming.sort((a, b) => sortByDueThenTitle(a, b, true))
  buckets.no_due.sort((a, b) => a.title.localeCompare(b.title))

  return GROUP_ORDER.filter((id) => buckets[id].length > 0).map((id) => ({
    id,
    label: GROUP_LABELS[id],
    items: buckets[id],
  }))
}

export function filterMyTasksBySearch(items: YourTurnItem[], search: string): YourTurnItem[] {
  const q = search.trim().toLowerCase()
  if (!q) return filterMyTaskItems(items)
  return filterMyTaskItems(items).filter((item) => {
    const hay = `${item.title}\n${item.preview ?? ''}`.toLowerCase()
    return hay.includes(q)
  })
}
