export function selectDirectoryIdentitiesForTeamPull<T extends { vibey_user_id?: string | null }>(
  eligible: T[],
  limit: number,
  preferVibeyUserId?: string | null,
): { pulled: T[]; capped: T[] } {
  const preferredId = preferVibeyUserId?.trim() || ''
  const preferred = preferredId ? eligible.filter((row) => row.vibey_user_id === preferredId) : []
  const rest = preferredId ? eligible.filter((row) => row.vibey_user_id !== preferredId) : eligible
  const ordered = [...preferred, ...rest]
  const safeLimit = Math.max(1, limit)
  return {
    pulled: ordered.slice(0, safeLimit),
    capped: ordered.slice(safeLimit),
  }
}

/** Mine must use the Directory mailbox, not login Gmail that is not on Workspace. */
export function selectCallerDirectoryIdentity<
  T extends {
    calendar_email: string
    match_status?: string | null
    vibey_user_id?: string | null
    suggested_vibey_user_id?: string | null
  },
>(eligible: T[], caller: { vibeyUserId?: string | null; email?: string | null }): T | null {
  const open = eligible.filter((row) => row.match_status !== 'rejected')
  const userId = caller.vibeyUserId?.trim() || ''
  const email = caller.email?.trim().toLowerCase() || ''
  if (userId) {
    const linked = open.find((row) => row.vibey_user_id === userId)
    if (linked) return linked
    const suggested = open.find((row) => row.suggested_vibey_user_id === userId)
    if (suggested) return suggested
  }
  if (!email) return null
  return open.find((row) => row.calendar_email.trim().toLowerCase() === email) ?? null
}
