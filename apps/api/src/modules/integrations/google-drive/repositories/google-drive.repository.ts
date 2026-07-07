import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'

export type GoogleDriveConnectionRow = {
  id: string
  user_id: string
  status: string | null
  scope_mode: string | null
  is_default: boolean | null
  connected_at: string | null
  metadata: Record<string, unknown> | null
}

@Injectable()
export class GoogleDriveRepository {
  async findConnectionMode(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<{ status: string | null; metadata: unknown } | null> {
    let query = supabase
      .from('user_integrations')
      .select('status, metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'google_drive')
      .eq('status', 'connected')
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.is('org_id', null)
    const { data, error } = await query.maybeSingle()
    if (error || !data) return null
    return data as { status: string | null; metadata: unknown }
  }

  async listConnectionStatusRows(
    supabase: SupabaseClient,
    userId: string,
    scope: RequestScope,
  ): Promise<GoogleDriveConnectionRow[]> {
    let query = supabase
      .from('user_integrations')
      .select('id, user_id, status, scope_mode, is_default, connected_at, metadata')
      .eq('integration_id', 'google_drive')
    if (scope.orgId) {
      query = query.eq('org_id', scope.orgId)
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.order('updated_at', { ascending: false })
    if (error || !data) return []
    return (data as Array<Record<string, unknown>>).filter((row) => {
      if (!scope.orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      return false
    }) as GoogleDriveConnectionRow[]
  }

  async getToolkitConfig(supabase: SupabaseClient, integrationId: string) {
    const { data } = await supabase
      .from('project_composio_toolkit_config')
      .select('auth_config_id, toolkit_slug, enabled')
      .eq('integration_id', integrationId)
      .maybeSingle()
    return data as
      | { auth_config_id?: string | null; toolkit_slug?: string | null; enabled?: boolean | null }
      | null
  }

  async findPersonalConnectionId(supabase: SupabaseClient, userId: string, integrationId: string) {
    const { data } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .is('org_id', null)
      .maybeSingle()
    return data?.id as string | undefined
  }

  async upsertPersonalConnection(
    supabase: SupabaseClient,
    userId: string,
    integrationId: string,
    row: Record<string, unknown>,
  ): Promise<void> {
    const existingId = await this.findPersonalConnectionId(supabase, userId, integrationId)
    if (existingId) {
      await supabase
        .from('user_integrations')
        .update(row)
        .eq('user_id', userId)
        .eq('integration_id', integrationId)
        .is('org_id', null)
      return
    }

    await supabase.from('user_integrations').insert({ ...row, org_id: null })
  }

  async getPersonalConnectionMetadata(
    supabase: SupabaseClient,
    userId: string,
    integrationId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data } = await supabase
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .maybeSingle()
    return data?.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
      ? (data.metadata as Record<string, unknown>)
      : null
  }

  async markPersonalConnectionDisconnected(
    supabase: SupabaseClient,
    userId: string,
    integrationId: string,
  ): Promise<void> {
    await supabase
      .from('user_integrations')
      .update({
        status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        error_message: null,
        metadata: {},
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
  }
}
