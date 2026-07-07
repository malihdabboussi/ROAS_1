import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { ComposioService } from '../../../composio/services/composio.service'
import {
  GoogleDriveRepository,
  type GoogleDriveConnectionRow,
} from '../repositories/google-drive.repository'

function pickBestDriveStatusRow(
  rows: GoogleDriveConnectionRow[],
  userId: string,
  orgId: string | null,
): GoogleDriveConnectionRow | null {
  if (rows.length === 0) return null
  if (!orgId) return rows[0] ?? null
  const connectedRows = rows.filter((row) => String(row.status ?? '').toLowerCase() === 'connected')
  const personalConnected = connectedRows.find(
    (row) => String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
  )
  if (personalConnected) return personalConnected
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

@Injectable()
export class GoogleDriveConnectionService {
  constructor(
    private readonly composio: ComposioService,
    private readonly repo: GoogleDriveRepository,
  ) {}

  async status(supabase: SupabaseClient, user: { id: string }, scope: RequestScope) {
    const rows = await this.repo.listConnectionStatusRows(supabase, user.id, scope)
    if (rows.length === 0) {
      return {
        success: true,
        connected: false,
        status: null,
        email: null,
        displayName: null,
        connectedAt: null,
      }
    }

    const row = pickBestDriveStatusRow(rows, user.id, scope.orgId ?? null)
    if (!row) {
      return {
        success: true,
        connected: false,
        status: null,
        email: null,
        displayName: null,
        connectedAt: null,
      }
    }

    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null
    const status = row.status ?? null
    const hasComposioAccount =
      typeof metadata?.composio_connected_account_id === 'string' &&
      (metadata.composio_connected_account_id as string).length > 0

    return {
      success: true,
      connected: status === 'connected' && hasComposioAccount,
      status,
      email: (metadata?.email as string | undefined) ?? null,
      displayName: (metadata?.display_name as string | undefined) ?? null,
      connectedAt: row.connected_at ?? null,
    }
  }

  async connect(supabase: SupabaseClient, user: { id: string }, body: { redirectTo?: string }) {
    const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : ''
    const callbackUrl =
      typeof process !== 'undefined'
        ? `${process.env.APP_URL || 'http://localhost:3000'}/api/proxy/integrations/composio/callback?redirect_to=${encodeURIComponent(redirectTo)}&integration_id=google_drive`
        : ''

    const config = await this.repo.getToolkitConfig(supabase, 'google_drive')

    if (!config?.enabled || !config.auth_config_id) {
      throw new HttpException(
        { success: false, error: 'Google Drive Composio config not found or not enabled' },
        HttpStatus.BAD_REQUEST,
      )
    }

    const initiated = await this.composio.initiateConnectedAccount(user.id, config.auth_config_id, {
      callbackUrl,
      longRedirectUrl: true,
      allowMultiple: true,
    })

    const now = new Date().toISOString()
    const driveRow = {
      user_id: user.id,
      integration_id: 'google_drive',
      provider: 'google_drive',
      status: 'pending',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      error_message: null,
      metadata: {
        composio_connected_account_id: initiated.id,
        composio_auth_config_id: config.auth_config_id,
        composio_toolkit_slug: config.toolkit_slug,
      },
      updated_at: now,
    }

    await this.repo.upsertPersonalConnection(supabase, user.id, 'google_drive', {
      ...driveRow,
      updated_at: now,
    })

    return { success: true, authorizeUrl: initiated.redirectUrl }
  }

  async disconnect(supabase: SupabaseClient, user: { id: string }) {
    const metadata = await this.repo.getPersonalConnectionMetadata(
      supabase,
      user.id,
      'google_drive',
    )
    const connectionId =
      typeof metadata?.composio_connected_account_id === 'string'
        ? (metadata.composio_connected_account_id as string)
        : null

    if (connectionId) {
      try {
        await this.composio.disconnectConnectedAccount(connectionId)
      } catch {
        // Best-effort Composio disconnect
      }
    }

    await this.repo.markPersonalConnectionDisconnected(supabase, user.id, 'google_drive')

    return { success: true }
  }
}
