import type { TaskRollupItem } from '@/lib/tasks'

export type TaskBoardGroup = {
  id: 'todo' | 'in_progress' | 'attention' | 'other'
  label: string
  items: TaskRollupItem[]
}

const TODO_STATUSES = new Set(['todo', 'pending', 'queued', 'not_started'])
const ACTIVE_STATUSES = new Set(['in_progress', 'working', 'executing', 'starting'])
const ATTENTION_STATUSES = new Set([
  'blocked',
  'failed',
  'awaiting_human',
  'awaiting_access_approval',
  'awaiting_approval',
])

export function formatTaskDue(value: string | null): string {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function groupTasksForBoard(items: TaskRollupItem[]): TaskBoardGroup[] {
  const groups: TaskBoardGroup[] = [
    { id: 'todo', label: 'To do', items: [] },
    { id: 'in_progress', label: 'In progress', items: [] },
    { id: 'attention', label: 'Needs attention', items: [] },
    { id: 'other', label: 'Other', items: [] },
  ]
  for (const item of items) {
    const status = item.status.toLowerCase()
    const group = TODO_STATUSES.has(status)
      ? groups[0]
      : ACTIVE_STATUSES.has(status)
        ? groups[1]
        : ATTENTION_STATUSES.has(status)
          ? groups[2]
          : groups[3]
    if (group) group.items.push(item)
  }
  return groups.filter((group) => group.items.length > 0)
}

export type TaskCalendarGroup = {
  key: string
  label: string
  items: TaskRollupItem[]
}

export function groupTasksForCalendar(items: TaskRollupItem[]): TaskCalendarGroup[] {
  const groups = new Map<string, TaskCalendarGroup>()
  const sorted = [...items].sort((left, right) => {
    if (!left.due_at) return 1
    if (!right.due_at) return -1
    return new Date(left.due_at).getTime() - new Date(right.due_at).getTime()
  })
  for (const item of sorted) {
    const parsed = item.due_at ? new Date(item.due_at) : null
    const valid = parsed && !Number.isNaN(parsed.getTime())
    const key = valid ? parsed.toISOString().slice(0, 10) : 'unscheduled'
    const label = valid
      ? parsed.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
      : 'No due date'
    const group = groups.get(key) ?? { key, label, items: [] }
    group.items.push(item)
    groups.set(key, group)
  }
  return [...groups.values()]
}
