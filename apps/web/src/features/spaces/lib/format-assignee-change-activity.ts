import type { TeamRosterEntry } from '@/lib/team/team-roster-api'

export type ActivityAssigneeRef = { type: 'human' | 'agent'; id: string }

function parseAssigneeRef(entry: Record<string, unknown>): ActivityAssigneeRef | null {
  const type = entry.type
  const id = entry.id
  if (type !== 'human' && type !== 'agent') return null
  if (typeof id !== 'string' || id.trim().length === 0) return null
  return { type, id: id.trim() }
}

/** Reads assignee list from activity `from` / `to` (array, nested API shape, or legacy flat). */
export function extractAssigneesFromActivitySide(value: unknown): ActivityAssigneeRef[] {
  if (value == null) return []

  if (Array.isArray(value)) {
    return value
      .filter(
        (e): e is Record<string, unknown> => !!e && typeof e === 'object' && !Array.isArray(e),
      )
      .map(parseAssigneeRef)
      .filter((r): r is ActivityAssigneeRef => r != null)
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>

    if (obj.primary && typeof obj.primary === 'object' && !Array.isArray(obj.primary)) {
      const ref = parseAssigneeRef(obj.primary as Record<string, unknown>)
      if (ref) return [ref]
    }

    if (Array.isArray(obj.assignees)) {
      const list = obj.assignees
        .filter(
          (e): e is Record<string, unknown> => !!e && typeof e === 'object' && !Array.isArray(e),
        )
        .map(parseAssigneeRef)
        .filter((r): r is ActivityAssigneeRef => r != null)
      if (list.length > 0) return list
    }

    const flat = parseAssigneeRef(obj)
    if (flat) return [flat]
  }

  return []
}

export function resolveAssigneeDisplayName(
  ref: ActivityAssigneeRef,
  roster: TeamRosterEntry[],
  currentUserId?: string | null,
): string {
  if (ref.type === 'human' && currentUserId && ref.id === currentUserId) return 'Me'
  if (ref.type === 'agent') {
    return roster.find((e) => e.kind === 'agent' && e.agent_key === ref.id)?.display_name ?? ref.id
  }
  return roster.find((e) => e.kind === 'human' && e.user_id === ref.id)?.display_name ?? ref.id
}

export function resolveAssigneeRosterEntries(
  value: unknown,
  roster: TeamRosterEntry[],
): TeamRosterEntry[] {
  return extractAssigneesFromActivitySide(value)
    .map((ref) => {
      if (ref.type === 'agent') {
        return roster.find((e) => e.kind === 'agent' && e.agent_key === ref.id) ?? null
      }
      return roster.find((e) => e.kind === 'human' && e.user_id === ref.id) ?? null
    })
    .filter((entry): entry is TeamRosterEntry => entry != null)
}

export function shouldRenderAssigneeActivityPreview(
  payload: Record<string, unknown> | undefined,
  roster: TeamRosterEntry[],
): boolean {
  const toRaw = payload?.to
  if (typeof toRaw === 'string') return toRaw.trim().length > 0
  return resolveAssigneeRosterEntries(toRaw, roster).length > 0
}

/** Activity row label for `assignee_change` (matches API payload from `diffUpdateActivity`). */
export function formatAssigneeChangeActivityLabel(
  payload: Record<string, unknown> | undefined,
  roster: TeamRosterEntry[],
  currentUserId?: string | null,
): string {
  const toRaw = payload?.to

  if (typeof toRaw === 'string') {
    const label = toRaw.trim()
    return label.length > 0 ? 'assigned' : 'unassigned'
  }

  const toAssignees = extractAssigneesFromActivitySide(toRaw)
  if (toAssignees.length === 0) return 'unassigned'

  if (shouldRenderAssigneeActivityPreview(payload, roster)) return 'assigned'

  const names = toAssignees.map((a) => resolveAssigneeDisplayName(a, roster, currentUserId))
  return names.length === 1 ? `assigned to ${names[0]}` : `assigned to ${names.join(', ')}`
}

/** Agent / server strings when roster is unavailable. */
export function formatAssigneeSideForSystemLog(value: unknown): string {
  if (typeof value === 'string') {
    const label = value.trim()
    return label.length > 0 ? label : 'unassigned'
  }
  const refs = extractAssigneesFromActivitySide(value)
  if (refs.length === 0) return 'unassigned'
  return refs.map((r) => `${r.type}:${r.id}`).join(', ')
}
