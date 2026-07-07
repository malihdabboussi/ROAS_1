import type { SelectOption, StatusCategory } from './space-schema-types'

export const STATUS_CATEGORIES: readonly { id: StatusCategory; label: string }[] = [
  { id: 'not_started', label: 'Not started' },
  { id: 'active', label: 'Active' },
  { id: 'done', label: 'Done' },
  { id: 'closed', label: 'Closed' },
]

/** Same order as `SelectCell` / status editor: category groups, array order within each group. */
export function orderedStatusOptions(options: SelectOption[]): SelectOption[] {
  const result: SelectOption[] = []
  for (const cat of STATUS_CATEGORIES) {
    for (const option of options) {
      if ((option.group ?? 'active') === cat.id) result.push(option)
    }
  }
  return result
}

/** Terminal statuses: chevron skips these; Check button marks done. */
export function isTerminalStatusOption(option: SelectOption): boolean {
  return option.group === 'done' || option.group === 'closed' || option.id === 'done'
}

export function resolveDoneStatusOption(options: SelectOption[]): SelectOption | null {
  return (
    options.find((option) => option.group === 'done' || option.id === 'done') ??
    options.find((option) => option.group === 'closed') ??
    null
  )
}

/** Next workflow status after `currentStatusId`, or null at the last active step. */
export function nextWorkflowStatusOption(
  options: SelectOption[],
  currentStatusId: string,
): SelectOption | null {
  const ordered = orderedStatusOptions(options)
  const currentIdx = ordered.findIndex((option) => option.id === currentStatusId)
  if (currentIdx < 0) return null
  return ordered.slice(currentIdx + 1).find((option) => !isTerminalStatusOption(option)) ?? null
}

export const STATUS_COLORS = [
  { id: 'violet', label: 'Violet' },
  { id: 'blue', label: 'Blue' },
  { id: 'cyan', label: 'Cyan' },
  { id: 'emerald', label: 'Green' },
  { id: 'amber', label: 'Amber' },
  { id: 'orange', label: 'Orange' },
  { id: 'red', label: 'Red' },
  { id: 'slate', label: 'Gray' },
] as const

export type StatusColorId = (typeof STATUS_COLORS)[number]['id']
