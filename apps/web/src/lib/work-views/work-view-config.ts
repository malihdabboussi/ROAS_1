export const TASK_WORK_VIEW_IDS = ['list', 'board', 'calendar'] as const
export type TaskWorkViewId = (typeof TASK_WORK_VIEW_IDS)[number]

export const PROGRAM_WORK_VIEW_IDS = ['overview', ...TASK_WORK_VIEW_IDS] as const
export type ProgramWorkViewId = (typeof PROGRAM_WORK_VIEW_IDS)[number]

export const DEFAULT_PROGRAM_WORK_VIEWS: ProgramWorkViewId[] = [...PROGRAM_WORK_VIEW_IDS]

export const WORK_VIEW_LABELS: Record<ProgramWorkViewId, string> = {
  overview: 'Overview',
  list: 'List',
  board: 'Board',
  calendar: 'Calendar',
}

export function normalizeWorkViewId(value: string): TaskWorkViewId | null {
  return TASK_WORK_VIEW_IDS.includes(value as TaskWorkViewId) ? (value as TaskWorkViewId) : null
}

export function normalizeProgramWorkViewId(value: string): ProgramWorkViewId | null {
  return PROGRAM_WORK_VIEW_IDS.includes(value as ProgramWorkViewId)
    ? (value as ProgramWorkViewId)
    : null
}

export function readVisibleProgramWorkViews(config: unknown): ProgramWorkViewId[] {
  const raw = (config as Record<string, unknown> | null | undefined)?.visible_program_views
  if (!Array.isArray(raw)) return [...DEFAULT_PROGRAM_WORK_VIEWS]
  const selected = new Set(
    raw
      .map((value) => (typeof value === 'string' ? normalizeProgramWorkViewId(value) : null))
      .filter((value): value is ProgramWorkViewId => value !== null),
  )
  const ordered = PROGRAM_WORK_VIEW_IDS.filter((viewId) => selected.has(viewId))
  return ordered.length > 0 ? ordered : [...DEFAULT_PROGRAM_WORK_VIEWS]
}

export function resolveWorkViewFromSearch(
  input: { view: string | null; tab: string | null },
  fallback: TaskWorkViewId,
): TaskWorkViewId {
  return normalizeWorkViewId(input.view ?? '') ?? normalizeWorkViewId(input.tab ?? '') ?? fallback
}
