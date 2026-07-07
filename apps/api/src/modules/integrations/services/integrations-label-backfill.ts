import type { SupabaseClient } from '@supabase/supabase-js'
import type { IntegrationsRepository } from '../repositories/integrations.repository'
import type { IntegrationsCoreService } from './integrations-core.service'

export async function backfillIntegrationConnectionLabels(
  repository: IntegrationsRepository,
  core: IntegrationsCoreService,
  supabase: SupabaseClient,
  limit: number,
): Promise<{ success: boolean; updated: number; failed: number; skipped: number }> {
  const { data: rows } = await repository
    .table(supabase, 'user_integrations')
    .select('id, user_id, integration_id, metadata, connection_label')
    .eq('status', 'connected')
    .is('connection_label', null)
    .not('metadata->>composio_connected_account_id', 'is', null)
    .limit(limit)

  if (!rows || rows.length === 0) return { success: true, updated: 0, failed: 0, skipped: 0 }

  let updated = 0
  let failed = 0
  let skipped = 0

  for (const row of rows as Array<Record<string, unknown>>) {
    const integrationId = String(row.integration_id ?? '')
    const userId = String(row.user_id ?? '')
    const rowId = String(row.id ?? '')
    const meta = (row.metadata ?? {}) as Record<string, unknown>
    const connId = String(meta.composio_connected_account_id ?? '')
    if (!integrationId || !userId || !rowId || !connId) {
      skipped++
      continue
    }
    try {
      const identity = await core.resolveConnectionIdentity(integrationId, userId, connId)
      if (identity) {
        await core.updateIntegrationById(supabase, rowId, { connection_label: identity })
        updated++
      } else {
        skipped++
      }
    } catch {
      failed++
    }
  }

  return { success: true, updated, failed, skipped }
}
