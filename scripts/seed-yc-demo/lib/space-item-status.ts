/**
 * Remap generic mission / legacy task statuses onto a space schema's status options.
 */

export type StatusOption = {
  id: string
  label: string
  color?: string
  group?: 'not_started' | 'active' | 'closed'
}

export function statusOptionsFromSchema(schema: {
  fields?: Array<{ id: string; options?: StatusOption[] }>
}): StatusOption[] {
  const statusField = schema?.fields?.find((f) => f.id === 'status')
  return statusField?.options ?? []
}

export function remapToSpaceStatus(current: string | null, options: StatusOption[]): string | null {
  if (!options.length) return current
  const ids = options.map((o) => o.id)
  if (current && ids.includes(current)) return current

  const byGroup = {
    not_started: options.filter((o) => o.group === 'not_started').map((o) => o.id),
    active: options.filter((o) => o.group === 'active').map((o) => o.id),
    closed: options.filter((o) => o.group === 'closed').map((o) => o.id),
  }
  const pick = (arr: string[]) => arr[0] ?? ids[0]!

  switch (current) {
    case 'todo':
      return pick(byGroup.not_started.length > 0 ? byGroup.not_started : byGroup.active)
    case 'in_progress':
      return pick(byGroup.active.length > 0 ? byGroup.active : byGroup.not_started)
    case 'done':
      return pick(byGroup.closed.length > 0 ? byGroup.closed : byGroup.active)
    case 'cancelled':
      return byGroup.closed[byGroup.closed.length - 1] ?? pick(byGroup.closed)
    case 'doc':
      return current
    default:
      return pick(byGroup.active.length > 0 ? byGroup.active : ids)
  }
}

export function mapMissionBriefStatus(
  briefStatus: 'queued' | 'in_progress' | 'completed' | 'cancelled',
): string {
  switch (briefStatus) {
    case 'queued':
      return 'todo'
    case 'in_progress':
      return 'in_progress'
    case 'completed':
      return 'done'
    case 'cancelled':
      return 'cancelled'
    default: {
      const _exhaustive: never = briefStatus
      throw new Error(`Unhandled mission brief status: ${String(_exhaustive)}`)
    }
  }
}
