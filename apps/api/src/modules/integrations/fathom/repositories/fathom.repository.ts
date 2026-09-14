import { BadRequestException, Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { FathomOAuthTokenResponse, FathomUserIntegration } from '../types/fathom.types'

type FathomScope = {
  scopeMode: 'personal' | 'org_shared'
  orgId: string | null
}

@Injectable()
export class FathomRepository {
  constructor(private readonly serviceClient: SupabaseServiceClient) {}

  getServiceClient(): SupabaseClient {
    return this.serviceClient.client
  }

  async getIntegrationMetadata(userId: string): Promise<Record<string, unknown>> {
    const { data } = await this.serviceClient.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .is('org_id', null)
      .maybeSingle()
    return (data?.metadata as Record<string, unknown>) ?? {}
  }

  async upsertConnection(
    userId: string,
    tokens: FathomOAuthTokenResponse,
    metadata: Record<string, unknown>,
    scope: FathomScope,
  ): Promise<void> {
    const admin = this.serviceClient.client
    const now = new Date().toISOString()
    const row = {
      user_id: userId,
      integration_id: 'fathom',
      provider: 'fathom',
      status: 'connected',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata,
      connection_label:
        typeof metadata.team_name === 'string' ? metadata.team_name.trim() || null : null,
      scope_mode: scope.scopeMode,
      updated_at: now,
    }

    const { data: existingRows } = await admin
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .order('updated_at', { ascending: false })
      .limit(1)
    const existingRow = (existingRows ?? [])[0] ?? null

    let error
    if (existingRow) {
      ;({ error } = await admin
        .from('user_integrations')
        .update({ ...row, org_id: scope.orgId })
        .eq('id', existingRow.id))
    } else {
      ;({ error } = await admin
        .from('user_integrations')
        .insert({ ...row, org_id: scope.orgId, is_default: false }))
    }

    if (error) throw new BadRequestException(`Failed to save Fathom connection: ${error.message}`)
  }

  async getStatus(client: SupabaseClient, userId: string) {
    const { data, error } = await client
      .from('user_integrations')
      .select('status, connected_at, metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .maybeSingle()
    return { data, error }
  }

  async getRequestMetadata(
    client: SupabaseClient,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const { data } = await client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .maybeSingle()
    return (data?.metadata as Record<string, unknown>) ?? {}
  }

  async updateRequestMetadata(
    client: SupabaseClient,
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await client
      .from('user_integrations')
      .update({ metadata, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')

    if (error)
      throw new BadRequestException(`Failed to update Fathom auto-ingest: ${error.message}`)
  }

  async getRequestProfilePreferences(
    client: SupabaseClient,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await client
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new BadRequestException(`Failed to load Agenda settings: ${error.message}`)
    return (data?.preferences as Record<string, unknown>) ?? {}
  }

  async updateRequestProfilePreferences(
    client: SupabaseClient,
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await client.from('profiles').update({ preferences }).eq('id', userId)
    if (error) throw new BadRequestException(`Failed to update Agenda settings: ${error.message}`)
  }

  async getLatestIntegrationId(
    client: SupabaseClient,
    userId: string,
  ): Promise<string | undefined> {
    const { data: rowsBefore } = await client
      .from('user_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .order('updated_at', { ascending: false })
      .limit(1)
    return (rowsBefore ?? [])[0]?.id as string | undefined
  }

  async disconnect(client: SupabaseClient, userId: string): Promise<void> {
    const { error } = await client
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
      .eq('integration_id', 'fathom')

    if (error) throw new BadRequestException(`Failed to disconnect Fathom: ${error.message}`)
  }

  async getConnectedIntegration(
    client: SupabaseClient,
    userId: string,
  ): Promise<FathomUserIntegration | null> {
    // Prefer personal (org_id null) then newest — never maybeSingle: multiple
    // connected rows (personal + org_shared) would error and look "disconnected".
    const { data, error } = await client
      .from('user_integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .eq('status', 'connected')
      .order('org_id', { ascending: true, nullsFirst: true })
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) return null
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return null
    return row as unknown as FathomUserIntegration
  }

  async updateTokens(userId: string, tokens: FathomOAuthTokenResponse): Promise<void> {
    const { error } = await this.serviceClient.client
      .from('user_integrations')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')

    if (error) throw new BadRequestException(`Failed to refresh Fathom tokens: ${error.message}`)
  }

  async updateWebhookMetadata(
    userId: string,
    webhook: { id: string; secret: string; key?: string },
  ): Promise<void> {
    const admin = this.serviceClient.client
    const { data } = await admin
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .maybeSingle()

    const existingMeta = (data?.metadata as Record<string, unknown>) ?? {}
    await admin
      .from('user_integrations')
      .update({
        metadata: {
          ...existingMeta,
          webhook_secret: webhook.secret,
          webhook_id: webhook.id,
          ...(webhook.key ? { webhook_key: webhook.key } : {}),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
  }

  async getConnectedMetadata(userId: string): Promise<Record<string, unknown>> {
    const { data } = await this.serviceClient.client
      .from('user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', 'fathom')
      .eq('status', 'connected')
      .maybeSingle()
    return (data?.metadata as Record<string, unknown>) ?? {}
  }

  async getProfilePreferences(userId: string): Promise<Record<string, unknown>> {
    const { data } = await this.serviceClient.client
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()
    return (data?.preferences as Record<string, unknown>) ?? {}
  }

  async listConnectedWebhookRows(): Promise<Array<{ user_id: string; metadata: unknown }>> {
    const { data } = await this.serviceClient.client
      .from('user_integrations')
      .select('user_id, metadata')
      .eq('integration_id', 'fathom')
      .eq('status', 'connected')
    return (data ?? []) as Array<{ user_id: string; metadata: unknown }>
  }

  async getFathomAliases(userId: string): Promise<string[]> {
    const { data } = await this.serviceClient.client
      .from('profiles')
      .select('fathom_aliases')
      .eq('id', userId)
      .maybeSingle()
    return Array.isArray(data?.fathom_aliases) ? (data.fathom_aliases as string[]) : []
  }

  async getProfileIdentity(
    userId: string,
  ): Promise<{ email: string | null; full_name: string | null } | null> {
    const { data } = await this.serviceClient.client
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle()
    if (!data) return null
    return {
      email: typeof data.email === 'string' ? data.email : null,
      full_name: typeof data.full_name === 'string' ? data.full_name : null,
    }
  }

  async updateFathomAliases(
    userId: string,
    aliases: string[],
  ): Promise<{ message?: string } | null> {
    const { error } = await this.serviceClient.client
      .from('profiles')
      .update({ fathom_aliases: aliases })
      .eq('id', userId)
    return error
  }

  async enqueueBrainOpsOutboxRows(
    rows: Array<Record<string, unknown>>,
  ): Promise<{ message?: string } | null> {
    const { error } = await this.serviceClient.client.from('brain_ops_outbox').upsert(rows, {
      onConflict: 'dedupe_key',
      ignoreDuplicates: true,
    })
    return error
  }

  async listConnectedIntegrationUserIds(): Promise<{
    data: Array<{ user_id: string }> | null
    error: { message?: string } | null
  }> {
    const { data, error } = await this.serviceClient.client
      .from('user_integrations')
      .select('user_id')
      .eq('integration_id', 'fathom')
      .eq('status', 'connected')
      .limit(50)
    return { data: (data ?? null) as Array<{ user_id: string }> | null, error }
  }

  async listProfilesForUserIds(
    userIds: string[],
  ): Promise<Array<{ id?: string; email?: string | null; fathom_aliases?: string[] }>> {
    const { data } = await this.serviceClient.client
      .from('profiles')
      .select('id, email, fathom_aliases')
      .in('id', userIds)
    return (data ?? []) as Array<{ id?: string; email?: string | null; fathom_aliases?: string[] }>
  }

  async findActiveOrgMember(client: SupabaseClient, userId: string, orgId: string | null) {
    if (!orgId) return { data: null, error: null }
    const { data, error } = await client
      .from('org_members')
      .select('role, status')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('status', 'active')
      .maybeSingle()
    return {
      data: data as { role?: string | null; status?: string | null } | null,
      error,
    }
  }
}
