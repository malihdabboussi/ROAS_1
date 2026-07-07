import type { TeamRosterEntry } from '@/lib/team'

export interface TaskMetaAssigneeValue {
  type: 'human' | 'agent'
  id: string
}

export const CORE_FIELD_IDS = new Set([
  'title',
  'status',
  'priority',
  'assignee',
  'due_date',
  'start_date',
  'tags',
  'category',
])

export const TASK_META_GRID_STYLE = { gridTemplateColumns: '5.5rem 1fr 5.5rem 1fr' }

export const STATUS_BG: Record<string, string> = {
  cyan: 'bg-cyan-500/25 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  amber: 'bg-amber-500/25 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  violet: 'bg-violet-500/25 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  emerald: 'bg-emerald-500/25 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  slate: 'bg-slate-500/25 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
  blue: 'bg-blue-500/25 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  orange: 'bg-orange-500/25 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  red: 'bg-red-500/25 text-red-700 dark:bg-red-500/20 dark:text-red-300',
}

export const STATUS_DIVIDER: Record<string, string> = {
  cyan: 'border-cyan-700/25 dark:border-cyan-500/30',
  amber: 'border-amber-700/25 dark:border-amber-500/30',
  violet: 'border-violet-700/25 dark:border-violet-500/30',
  emerald: 'border-emerald-700/25 dark:border-emerald-500/30',
  slate: 'border-slate-700/25 dark:border-slate-500/30',
  blue: 'border-blue-700/25 dark:border-blue-500/30',
  orange: 'border-orange-700/25 dark:border-orange-500/30',
  red: 'border-red-700/25 dark:border-red-500/30',
}

export const FLAG_COLOR: Record<string, string> = {
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  blue: 'text-blue-600 dark:text-blue-400',
  slate: 'text-slate-600 dark:text-slate-400',
  amber: 'text-amber-600 dark:text-amber-400',
  violet: 'text-violet-600 dark:text-violet-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
}

export const CELL =
  'group/cell flex min-h-[32px] min-w-0 w-full items-center gap-2 rounded-lg px-2.5 py-1 transition-colors hover:bg-[var(--color-hover-subtle)]'
export const CELL_EMPTY = `${CELL} text-[var(--color-muted-foreground)]`
export const CELL_CLEAR =
  'ml-auto shrink-0 rounded p-0.5 text-[var(--color-muted-foreground)] opacity-0 transition-opacity group-hover/cell:opacity-100 hover:text-[var(--color-foreground)]'

function resolveAssignee(
  value: TaskMetaAssigneeValue,
  roster: TeamRosterEntry[],
): TeamRosterEntry | null {
  if (value.type === 'agent')
    return roster.find((e) => e.kind === 'agent' && e.agent_key === value.id) ?? null
  if (value.type === 'human')
    return roster.find((e) => e.kind === 'human' && e.user_id === value.id) ?? null
  return null
}

export function resolveAssignees(
  value: TaskMetaAssigneeValue[],
  roster: TeamRosterEntry[],
): TeamRosterEntry[] {
  return value
    .map((assignee) => resolveAssignee(assignee, roster))
    .filter((entry): entry is TeamRosterEntry => entry != null)
}
