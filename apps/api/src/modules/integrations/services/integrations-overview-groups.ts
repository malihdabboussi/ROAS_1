export function buildGroupedIntegrations(
  integrations: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const grouped = new Map<string, Array<Record<string, unknown>>>()
  for (const row of integrations) {
    const integrationId = String(row.integration_id ?? '').trim()
    if (!integrationId) continue
    const bucket = grouped.get(integrationId) ?? []
    bucket.push(row)
    grouped.set(integrationId, bucket)
  }
  return Array.from(grouped.entries()).map(([integrationId, rows]) => ({
    integration_id: integrationId,
    provider: String(rows[0]?.provider ?? integrationId),
    connected_count: rows.filter((row) => String(row.status ?? '').toLowerCase() === 'connected')
      .length,
    connections: rows,
  }))
}
