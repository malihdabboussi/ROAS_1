import type { YourTurnItem } from '@/features/spaces/services/your-turn.service'

function diffLocalDays(older: Date, newer: Date): number {
  const o = new Date(older.getFullYear(), older.getMonth(), older.getDate()).getTime()
  const n = new Date(newer.getFullYear(), newer.getMonth(), newer.getDate()).getTime()
  return Math.round((n - o) / 864e5)
}

function monthRank(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth()
}

export type DateGroupDescriptor = { id: string; label: string; order: number }

/** Shared date-bucket logic: Today / Yesterday / This week / Earlier this month / month names. */
export function bucketForDate(t: Date, now: Date): DateGroupDescriptor {
  const d = diffLocalDays(t, now)

  if (d === 0) {
    return { id: 'today', label: 'Today', order: 0 }
  }
  if (d === 1) {
    return { id: 'yesterday', label: 'Yesterday', order: 1 }
  }
  const sameMonth = t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth()
  if (d >= 2 && d <= 6 && sameMonth) {
    return { id: 'this-week', label: 'This week', order: 2 }
  }

  if (sameMonth) {
    return { id: 'earlier-this-month', label: 'Earlier this month', order: 3 }
  }

  const y = t.getFullYear()
  const m = t.getMonth()
  const label =
    y === now.getFullYear()
      ? t.toLocaleString('en-US', { month: 'long' })
      : t.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const order = 4 + (monthRank(now) - monthRank(t))

  return { id: `month-${y}-${m}`, label, order }
}

export type DateGroup<T> = {
  id: string
  label: string
  order: number
  items: T[]
}

/** Generic helper: groups any list by a caller-provided date selector into named buckets. */
export function groupByDateBucket<T>(
  items: T[],
  getDate: (item: T) => Date,
  now: Date = new Date(),
): DateGroup<T>[] {
  const sorted = [...items].sort((a, b) => getDate(b).getTime() - getDate(a).getTime())

  const map = new Map<string, { label: string; order: number; items: T[] }>()
  for (const item of sorted) {
    const { id, label, order } = bucketForDate(getDate(item), now)
    const g = map.get(id)
    if (g) g.items.push(item)
    else map.set(id, { label, order, items: [item] })
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, label: v.label, order: v.order, items: v.items }))
    .sort((a, b) => a.order - b.order)
}

export type InboxDateGroup = DateGroup<YourTurnItem>

export function itemActivityDate(item: YourTurnItem): Date {
  const raw = item.updated_at ?? item.created_at
  return new Date(raw)
}

export function groupInboxByDate(items: YourTurnItem[], now: Date = new Date()): InboxDateGroup[] {
  return groupByDateBucket(items, itemActivityDate, now)
}
