import type { YourTurnItem, YourTurnKind } from '@/features/spaces/services/your-turn.service'
import { itemActivityDate } from './group-inbox-by-date'
import { formatInboxStatusLabel } from './inbox-status-label'

export type InboxSort =
  | 'activity.desc'
  | 'activity.asc'
  | 'created_at.desc'
  | 'created_at.asc'
  | 'title.asc'
  | 'title.desc'
  | 'due_at.asc'
  | 'due_at.desc'

export function matchesInboxSearch(item: YourTurnItem, q: string): boolean {
  const t = q.trim().toLowerCase()
  if (!t) return true
  if (item.title.toLowerCase().includes(t)) return true
  if (item.status.toLowerCase().includes(t)) return true
  if (formatInboxStatusLabel(item.status).toLowerCase().includes(t)) return true
  if (item.preview && item.preview.toLowerCase().includes(t)) return true
  return false
}

export function filterInboxByKind(
  items: YourTurnItem[],
  kind: 'all' | YourTurnKind,
): YourTurnItem[] {
  if (kind === 'all') return items
  return items.filter((i) => i.kind === kind)
}

function dueMs(item: YourTurnItem): number | null {
  if (!item.due_at) return null
  return new Date(item.due_at).getTime()
}

export function sortInboxItems(items: YourTurnItem[], sort: InboxSort): YourTurnItem[] {
  const copy = [...items]
  const activity = (i: YourTurnItem) => itemActivityDate(i).getTime()
  const created = (i: YourTurnItem) => new Date(i.created_at).getTime()
  const title = (i: YourTurnItem) => i.title.toLowerCase()

  copy.sort((x, y) => {
    switch (sort) {
      case 'activity.desc':
        return activity(y) - activity(x)
      case 'activity.asc':
        return activity(x) - activity(y)
      case 'created_at.desc':
        return created(y) - created(x)
      case 'created_at.asc':
        return created(x) - created(y)
      case 'title.asc':
        return title(x).localeCompare(title(y))
      case 'title.desc':
        return title(y).localeCompare(title(x))
      case 'due_at.asc': {
        const dx = dueMs(x)
        const dy = dueMs(y)
        if (dx == null && dy == null) return 0
        if (dx == null) return 1
        if (dy == null) return -1
        return dx - dy
      }
      case 'due_at.desc': {
        const dx = dueMs(x)
        const dy = dueMs(y)
        if (dx == null && dy == null) return 0
        if (dx == null) return 1
        if (dy == null) return -1
        return dy - dx
      }
    }
  })
  return copy
}

export function applyInboxQuery(
  items: YourTurnItem[],
  opts: {
    kind: 'all' | YourTurnKind
    search: string
    sort: InboxSort
  },
): YourTurnItem[] {
  let list = filterInboxByKind(items, opts.kind)
  if (opts.search.trim()) {
    list = list.filter((i) => matchesInboxSearch(i, opts.search))
  }
  return sortInboxItems(list, opts.sort)
}
