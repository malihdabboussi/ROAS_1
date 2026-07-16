export function getRowComposioConnectionId(row: Record<string, unknown>): string {
  const meta =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {}
  return String(meta.composio_connected_account_id ?? '').trim()
}

export type OverviewComposioAccountRef = {
  integrationId: string
  connectionId: string
  toolkitSlug: string
}
