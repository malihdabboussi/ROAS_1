/** View types that can show space tasks in the main canvas. */
export const TASK_CAPABLE_VIEW_TYPES = new Set(['list', 'table', 'kanban', 'calendar'])

const TASK_VIEW_PREFERENCE = ['list', 'table', 'kanban', 'calendar'] as const

/**
 * If the current view cannot show tasks (e.g. Media), return the id of a
 * list/table/kanban/calendar view to switch to. Returns null when already on
 * a task-capable view or none exists.
 */
export function resolveTaskCapableViewId(
  views: Array<{ id: string; type: string }> | undefined,
  currentViewId: string | null | undefined,
): string | null {
  if (!views || views.length === 0) return null
  const current = currentViewId ? views.find((view) => view.id === currentViewId) : undefined
  if (current && TASK_CAPABLE_VIEW_TYPES.has(current.type)) return null
  for (const type of TASK_VIEW_PREFERENCE) {
    const match = views.find((view) => view.type === type)
    if (match) return match.id
  }
  return null
}
