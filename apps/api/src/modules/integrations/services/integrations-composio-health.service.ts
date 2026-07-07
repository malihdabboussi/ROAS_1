import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ComposioService } from '../../composio/services/composio.service'
import { IntegrationsCoreService } from './integrations-core.service'

type IntegrationHealthRow = {
  id: string
  integration_id: string
  status: string
  metadata?: Record<string, unknown> | null
}

@Injectable()
export class IntegrationsComposioHealthService {
  constructor(
    private readonly composio: ComposioService,
    private readonly core: IntegrationsCoreService,
  ) {}

  async syncExpiredConnectedRows(
    supabase: SupabaseClient,
    rows: IntegrationHealthRow[],
    skipRowIds = new Set<string>(),
  ): Promise<Map<string, string>> {
    const expiredStatusByRowId = new Map<string, string>()

    for (const row of rows) {
      if (row.status !== 'connected') continue
      const rowId = String(row.id ?? '').trim()
      if (!rowId || skipRowIds.has(rowId)) continue
      const status = await this.syncExpiredConnectionRow(supabase, row)
      if (status) expiredStatusByRowId.set(rowId, status)
    }

    return expiredStatusByRowId
  }

  async syncExpiredConnectionRow(
    supabase: SupabaseClient,
    row: IntegrationHealthRow,
  ): Promise<string | null> {
    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? row.metadata
        : {}
    const connectionId = String(metadata.composio_connected_account_id ?? '').trim()
    const rowId = String(row.id ?? '').trim()
    if (!rowId || !connectionId) return null

    try {
      const account = (await this.composio.getConnectedAccount(connectionId)) as Record<
        string,
        unknown
      > | null
      const accountStatus = String(account?.status ?? '')
        .trim()
        .toUpperCase()
      if (accountStatus !== 'EXPIRED' && accountStatus !== 'INACTIVE') return null

      await this.core.updateIntegrationById(supabase, rowId, {
        status: 'needs_reconnect',
        error_message: `${row.integration_id} connection ${accountStatus.toLowerCase()}; reconnect required`,
        metadata: {
          ...metadata,
          composio_connected_account_id: connectionId,
          composio_status: accountStatus,
        },
      })
      return accountStatus
    } catch {
      return null
    }
  }
}
