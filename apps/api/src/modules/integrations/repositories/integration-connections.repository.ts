import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'

type ScopeMode = 'personal' | 'org_shared'
type IntegrationRow = Record<string, unknown>

@Injectable()
export class IntegrationConnectionsRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  async getStatus(
    client: SupabaseClient,
    integrationId: string,
    userId: string,
    orgId?: string | null,
  ): Promise<IntegrationRow | null> {
    const { data: rows, error } = await this.buildScopedRowsQuery(
      client,
      integrationId,
      userId,
      orgId,
      'id, user_id, status, connected_at, metadata, scope_mode, is_default, updated_at',
    )
    if (error) return null
    return this.pickPreferredRow((rows ?? []) as unknown as IntegrationRow[], userId, orgId ?? null)
  }

  async getSimpleStatus(integrationId: string, userId: string): Promise<IntegrationRow | null> {
    const { data } = await this.serviceClient.client
      .from('user_integrations')
      .select('status, connected_at')
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .maybeSingle()
    return (data as IntegrationRow | null) ?? null
  }

  async getConnectedIntegration<T extends IntegrationRow>(
    client: SupabaseClient,
    integrationId: string,
    userId: string,
    orgId: string | null | undefined,
    missingMessage: string,
  ): Promise<T> {
    const { data: rows, error } = await this.buildScopedRowsQuery(
      client,
      integrationId,
      userId,
      orgId,
      '*',
      true,
    )
    const data = this.pickPreferredRow(
      (rows ?? []) as unknown as IntegrationRow[],
      userId,
      orgId ?? null,
    )
    if (error || !data) throw new BadRequestException(missingMessage)
    return data as T
  }

  async markDisconnectedById(
    client: SupabaseClient,
    id: unknown,
    errorPrefix: string,
  ): Promise<void> {
    const { error } = await client
      .from('user_integrations')
      .update(this.disconnectedPayload())
      .eq('id', id)
    if (error) throw new BadRequestException(`${errorPrefix}: ${error.message}`)
  }

  async markPersonalDisconnected(integrationId: string, userId: string): Promise<void> {
    await this.serviceClient.client
      .from('user_integrations')
      .update(this.disconnectedPayload())
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
      .is('org_id', null)
  }

  async markPersonalDisconnectedWithClient(
    client: SupabaseClient,
    integrationId: string,
    userId: string,
    errorPrefix: string,
  ): Promise<void> {
    const { error } = await client
      .from('user_integrations')
      .update(this.disconnectedPayload())
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
    if (error) throw new BadRequestException(`${errorPrefix}: ${error.message}`)
  }

  async updateTokens(
    client: SupabaseClient,
    id: unknown,
    payload: IntegrationRow,
    errorPrefix: string,
  ): Promise<void> {
    const { error } = await client.from('user_integrations').update(payload).eq('id', id)
    if (error) throw new BadRequestException(`${errorPrefix}: ${error.message}`)
  }

  async updatePersonalTokens(
    integrationId: string,
    userId: string,
    payload: IntegrationRow,
    errorPrefix: string,
  ): Promise<void> {
    const { error } = await this.serviceClient.client
      .from('user_integrations')
      .update(payload)
      .eq('user_id', userId)
      .eq('integration_id', integrationId)
    if (error) throw new BadRequestException(`${errorPrefix}: ${error.message}`)
  }

  async updateServiceTokensById(
    id: unknown,
    payload: IntegrationRow,
    errorPrefix: string,
  ): Promise<void> {
    await this.updateTokens(this.serviceClient.client, id, payload, errorPrefix)
  }

  async upsertConnection(
    integrationId: string,
    userId: string,
    row: IntegrationRow,
    orgId?: string | null,
    scopeMode: ScopeMode = 'personal',
    errorPrefix?: string,
  ): Promise<void> {
    const admin = this.serviceClient.client
    let error

    if (orgId && scopeMode === 'org_shared') {
      const { data: existingDefault } = await admin
        .from('user_integrations')
        .select('id')
        .eq('org_id', orgId)
        .eq('integration_id', integrationId)
        .eq('scope_mode', 'org_shared')
        .eq('is_default', true)
        .maybeSingle()
      ;({ error } = await admin
        .from('user_integrations')
        .insert({ ...row, is_default: !existingDefault?.id }))
      this.throwIfError(error, errorPrefix)
      return
    }

    let existingQuery = admin
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', integrationId)

    if (Object.prototype.hasOwnProperty.call(row, 'scope_mode')) {
      existingQuery = existingQuery.eq('scope_mode', 'personal')
    }
    if (orgId) existingQuery = existingQuery.eq('org_id', orgId)
    else existingQuery = existingQuery.is('org_id', null)

    const { data: existing } = await existingQuery.maybeSingle()
    if (existing?.id) {
      ;({ error } = await admin
        .from('user_integrations')
        .update({ ...row, updated_at: new Date().toISOString(), is_default: false })
        .eq('id', existing.id))
    } else {
      ;({ error } = await admin
        .from('user_integrations')
        .insert({ ...row, is_default: false, org_id: orgId ?? null }))
    }
    this.throwIfError(error, errorPrefix)
  }

  async ensureAvailable(row: IntegrationRow): Promise<void> {
    const { error } = await this.serviceClient.client
      .from('integrations_available')
      .upsert(row, { onConflict: 'id' })
    if (error) throw new BadRequestException(error.message)
  }

  async markMetaDataDeleted(metaUserId: string): Promise<void> {
    await this.serviceClient.client
      .from('user_integrations')
      .update({
        status: 'disconnected',
        access_token: null,
        refresh_token: null,
        token_expires_at: null,
        metadata: {},
        updated_at: new Date().toISOString(),
      })
      .eq('integration_id', 'meta')
      .eq('metadata->>meta_user_id', metaUserId)
  }

  async updateLeadGhlContactId(
    client: SupabaseClient,
    leadId: string,
    ghlContactId: string,
    errorPrefix: string,
  ): Promise<void> {
    const { error } = await client
      .from('leads')
      .update({ ghl_contact_id: ghlContactId, updated_at: new Date().toISOString() })
      .eq('id', leadId)
    if (error) throw new BadRequestException(`${errorPrefix}: ${error.message}`)
  }

  private buildScopedRowsQuery(
    client: SupabaseClient,
    integrationId: string,
    userId: string,
    orgId: string | null | undefined,
    select: string,
    connectedOnly = false,
  ) {
    let query = client
      .from('user_integrations')
      .select(select)
      .eq('integration_id', integrationId)
      .order('updated_at', { ascending: false })
    if (connectedOnly) query = query.eq('status', 'connected')
    if (orgId) query = query.eq('org_id', orgId)
    else query = query.eq('user_id', userId).is('org_id', null)
    return query
  }

  private pickPreferredRow(
    rows: IntegrationRow[],
    userId: string,
    orgId: string | null,
  ): IntegrationRow | null {
    if (!rows.length) return null
    if (!orgId) return rows[0]
    const scopedRows = rows.filter((row) => {
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      return false
    })
    if (!scopedRows.length) return null
    const connected = (row: IntegrationRow) =>
      String(row.status ?? '').toLowerCase() === 'connected'
    return (
      scopedRows.find(
        (row) =>
          connected(row) &&
          String(row.scope_mode ?? '') === 'personal' &&
          String(row.user_id ?? '') === userId,
      ) ??
      scopedRows.find(
        (row) =>
          connected(row) &&
          String(row.scope_mode ?? '') === 'org_shared' &&
          Boolean(row.is_default),
      ) ??
      scopedRows.find((row) => connected(row) && String(row.scope_mode ?? '') === 'org_shared') ??
      scopedRows.find(
        (row) =>
          String(row.scope_mode ?? '') === 'personal' && String(row.user_id ?? '') === userId,
      ) ??
      scopedRows.find(
        (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
      ) ??
      scopedRows[0]
    )
  }

  private disconnectedPayload(): IntegrationRow {
    return {
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      error_message: null,
      metadata: {},
      updated_at: new Date().toISOString(),
    }
  }

  private throwIfError(error: { message?: string } | null | undefined, errorPrefix?: string): void {
    if (!error) return
    if (errorPrefix) throw new BadRequestException(`${errorPrefix}: ${error.message}`)
    throw new BadRequestException(error.message)
  }
}
