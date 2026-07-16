export type CalendarConnectionRef = {
  userIntegrationId: string
  composioAccountId: string
  label: string
  isDefault: boolean
  provider: 'google_calendar' | 'outlook'
}

export function getRowComposioAccountId(row: Record<string, unknown>): string {
  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  return String(meta.composio_connected_account_id ?? '').trim()
}

export function pickBestCalendarConnectionRow(
  rows: Array<Record<string, unknown>>,
  userId: string,
  orgId: string | null,
): Record<string, unknown> | null {
  if (rows.length === 0) return null
  const connectedRows = rows.filter(
    (row) => String(row.status ?? '').toLowerCase() === 'connected',
  )
  const pool = connectedRows.length > 0 ? connectedRows : rows

  if (!orgId) {
    const defaultConnected = pool.find((row) => Boolean(row.is_default))
    if (defaultConnected) return defaultConnected
    return pool[0] ?? null
  }

  const personalConnected = connectedRows.find(
    (row) => String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
  )
  if (personalConnected) {
    const personalRows = connectedRows.filter(
      (row) => String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
    )
    const personalDefault = personalRows.find((row) => Boolean(row.is_default))
    return personalDefault ?? personalConnected
  }

  const sharedDefaultConnected = connectedRows.find(
    (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
  )
  if (sharedDefaultConnected) return sharedDefaultConnected

  const latestSharedConnected = connectedRows.find(
    (row) => String(row.scope_mode ?? '') === 'org_shared',
  )
  if (latestSharedConnected) return latestSharedConnected

  const personalAny = rows.find(
    (row) => String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
  )
  if (personalAny) return personalAny

  const sharedDefaultAny = rows.find(
    (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
  )
  if (sharedDefaultAny) return sharedDefaultAny
  return rows[0] ?? null
}

export function listConnectedCalendarAccounts(
  rows: Array<Record<string, unknown>>,
  provider: 'google_calendar' | 'outlook',
): CalendarConnectionRef[] {
  const accounts: CalendarConnectionRef[] = []
  for (const row of rows) {
    if (String(row.status ?? '').toLowerCase() !== 'connected') continue
    const composioAccountId = getRowComposioAccountId(row)
    if (!composioAccountId) continue
    const userIntegrationId = String(row.id ?? '').trim()
    if (!userIntegrationId) continue
    const label =
      String(row.connection_label ?? '').trim() ||
      (provider === 'google_calendar' ? 'Google Calendar' : 'Outlook')
    accounts.push({
      userIntegrationId,
      composioAccountId,
      label,
      isDefault: Boolean(row.is_default),
      provider,
    })
  }
  accounts.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.label.localeCompare(b.label))
  if (accounts.length > 0 && !accounts.some((account) => account.isDefault)) {
    accounts[0]!.isDefault = true
  }
  return accounts
}
