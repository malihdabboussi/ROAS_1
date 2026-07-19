import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { OrgScopeService } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import { buildComposioCallbackRedirectUrl } from './integrations-composio-callback-url'
import { IntegrationsComposioCampaignService } from './integrations-composio-campaign.service'
import { IntegrationsComposioWebhookService } from './integrations-composio-webhook.service'
import { IntegrationsCoreService } from './integrations-core.service'

@Injectable()
export class IntegrationsComposioService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly orgScope: OrgScopeService,
    private readonly core: IntegrationsCoreService,
    private readonly campaignConnections: IntegrationsComposioCampaignService,
    private readonly webhooks: IntegrationsComposioWebhookService,
  ) {}

  async connectWithComposio(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: {
      integration_id: string
      callback_url?: string
      long_redirect_url?: boolean
      connection_data?: Record<string, string>
      connection_scope?: 'personal' | 'org_shared'
      connection_label?: string
      force_new?: boolean
    },
  ): Promise<Record<string, unknown>> {
    const integrationId = body.integration_id?.trim().toLowerCase()
    if (!integrationId) return { success: false, error: 'integration_id is required' }
    const scopeMode = this.core.resolveScopeMode(scope, body.connection_scope)
    const forceNewRaw = (body as { force_new?: unknown; forceNew?: unknown }).force_new
    const forceNewCamel = (body as { forceNew?: unknown }).forceNew
    const forceNew =
      forceNewRaw === true ||
      forceNewRaw === 'true' ||
      forceNewCamel === true ||
      forceNewCamel === 'true'

    const PERSONAL_ONLY = ['fathom', 'fireflies']
    if (
      this.orgScope.isOrgContext(scope) &&
      PERSONAL_ONLY.includes(integrationId) &&
      scopeMode === 'org_shared'
    ) {
      return {
        success: false,
        error: `${integrationId} is a personal-only integration. Connect it with Personal scope.`,
      }
    }
    if (
      this.orgScope.isOrgContext(scope) &&
      scopeMode === 'org_shared' &&
      !this.core.isOrgAdminOrOwner(scope)
    ) {
      return {
        success: false,
        error: 'Only org admin/owner can create All Org integration connections.',
      }
    }

    const config = await this.core.resolveIntegrationConfig(supabase, integrationId)
    if (!config) {
      return {
        success: false,
        error: `No Composio toolkit config found for integration ${integrationId}`,
      }
    }
    if (!config.enabled) {
      return {
        success: false,
        error: `Integration ${integrationId} is not enabled for Composio connect`,
      }
    }
    if (!config.auth_config_id) {
      const reason =
        typeof config.metadata?.reason === 'string' ? config.metadata.reason : 'missing_auth_config'
      return { success: false, error: `Auth config missing for ${integrationId} (${reason})` }
    }

    const accountType = scopeMode === 'org_shared' ? ('SHARED' as const) : ('PRIVATE' as const)
    if (!body.connection_data && !forceNew) {
      const reusable = await this.core.resolveReusableComposioConnection(supabase, {
        userId: user.id,
        scope,
        scopeMode,
        integrationId,
        toolkitSlug: config.toolkit_slug,
        authConfigId: config.auth_config_id,
        connectionLabel: body.connection_label ?? null,
        accountType,
      })
      if (reusable) {
        return {
          success: true,
          integration_id: integrationId,
          user_integration_id: reusable.userIntegrationId,
          connection_scope: reusable.connectionScope,
          connection_id: reusable.connectionId,
          redirect_url: null,
          status: reusable.status,
          reused: true,
        }
      }
    }

    let initiated: { id: string; redirectUrl: string | null; status: string | null }
    try {
      initiated = await this.composio.initiateConnectedAccount(user.id, config.auth_config_id, {
        callbackUrl: body.callback_url,
        longRedirectUrl: body.long_redirect_url,
        // Always allow multiple so "Add another account" can open a fresh OAuth link.
        allowMultiple: true,
        ...(forceNew ? { alias: `${integrationId}-${Date.now()}` } : {}),
        ...(body.connection_data ? { connectionData: body.connection_data } : {}),
        ...(!body.connection_data && scopeMode === 'org_shared' ? { accountType } : {}),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        error: `Failed to start ${integrationId} connection: ${message}`,
      }
    }

    const isApiKeyAuth = !!body.connection_data
    const now = new Date().toISOString()
    const rowData = {
      integration_id: integrationId,
      provider: integrationId,
      status: isApiKeyAuth ? 'connected' : 'pending',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: isApiKeyAuth ? now : null,
      error_message: null,
      metadata: {
        composio_connected_account_id: initiated.id,
        composio_auth_config_id: config.auth_config_id,
        composio_toolkit_slug: config.toolkit_slug,
        composio_account_type: accountType,
        ...(body.connection_label ? { connection_label: body.connection_label } : {}),
      },
      connection_label: body.connection_label ?? null,
    }
    const upsertResult =
      scopeMode === 'org_shared'
        ? await this.core.insertOrgSharedIntegration(supabase, scope, rowData)
        : forceNew
          ? await this.core.insertPersonalScopedIntegration(supabase, scope, rowData)
          : await this.core.upsertPersonalScopedIntegration(supabase, scope, rowData)

    if (upsertResult.error) return { success: false, error: upsertResult.error.message }

    if (!isApiKeyAuth && !initiated.redirectUrl) {
      return {
        success: false,
        error: `Failed to start ${integrationId} connection: provider did not return an authorize URL`,
      }
    }

    return {
      success: true,
      integration_id: integrationId,
      user_integration_id: upsertResult.id,
      connection_scope: scopeMode,
      connection_id: initiated.id,
      redirect_url: initiated.redirectUrl,
      status: initiated.status,
    }
  }

  async listComposioAccounts(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
  ): Promise<Record<string, unknown>> {
    let query = this.repository
      .table(supabase, 'user_integrations')
      .select(
        'id,integration_id,status,metadata,connection_label,scope_mode,is_default,user_id,org_id',
      )
      .not('metadata->>composio_connected_account_id', 'is', null)

    query = scope.orgId
      ? query.eq('org_id', scope.orgId)
      : query.eq('user_id', user.id).is('org_id', null)
    const { data, error } = await query
    if (error) return { success: false, error: error.message, accounts: [] }

    const ACTIVE_STATUSES = new Set(['connected', 'pending', 'needs_reconnect'])
    const scopedRows = ((data ?? []) as Array<Record<string, unknown>>).filter((row) => {
      if (!ACTIVE_STATUSES.has(String(row.status ?? '').toLowerCase())) return false
      const scopeMode = String(row.scope_mode ?? '')
      if (scope.orgId) {
        return scopeMode === 'org_shared' || (scopeMode === 'personal' && row.user_id === user.id)
      }
      return scopeMode === 'personal'
    })

    const allowedById = new Map<string, Record<string, unknown>>()
    for (const row of scopedRows) {
      const metadata =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const connectedAccountId = String(metadata.composio_connected_account_id ?? '').trim()
      if (!connectedAccountId) continue
      allowedById.set(connectedAccountId, row)
    }

    if (allowedById.size === 0) return { success: true, accounts: [] }

    const accounts = await this.composio.listConnectedAccounts({ userId: user.id })
    const accountsById = new Map(
      (accounts ?? []).map((account: unknown) => {
        const record = (account ?? {}) as Record<string, unknown>
        return [String(record.id ?? ''), record]
      }),
    )

    return {
      success: true,
      accounts: Array.from(allowedById.entries()).map(([connectedAccountId, row]) => {
        const account = (accountsById.get(connectedAccountId) ?? {}) as Record<string, unknown>
        const integrationId = String(row.integration_id ?? '')
        return {
          ...account,
          id: connectedAccountId,
          user_integration_id: String(row.id ?? ''),
          status: account.status ?? row.status,
          toolkitSlug: account.toolkitSlug ?? account.toolkit_slug ?? integrationId,
          toolkit: account.toolkit ?? { slug: integrationId },
          connection_label: row.connection_label ?? null,
          scope_mode: row.scope_mode ?? null,
          is_default: row.is_default ?? false,
        }
      }),
    }
  }

  async searchComposioToolkits(
    user: { id: string },
    scope: RequestScope,
    query: string,
    limitRaw?: string,
  ): Promise<Record<string, unknown>> {
    const cleanedQuery = String(query ?? '').trim()
    if (!cleanedQuery) return { success: false, error: 'query is required', toolkits: [] }
    const parsedLimit = Number(limitRaw ?? 10)
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 25) : 10
    const toolkits = await this.composio.searchToolkitCatalog(cleanedQuery, limit, {
      userId: user.id,
      orgId: scope.orgId,
    })
    return { success: true, query: cleanedQuery, toolkits }
  }

  async syncComposioToolkitCatalog(
    user: { id: string },
    scope: RequestScope,
    body: { limit?: number },
  ): Promise<unknown> {
    return this.composio.syncToolkitCatalog(body?.limit ?? 400, {
      userId: user.id,
      orgId: scope.orgId,
    })
  }

  async syncIntegrationCapabilities(
    user: { id: string },
    body?: { only?: string[]; force?: boolean },
  ): Promise<unknown> {
    const only = Array.isArray(body?.only)
      ? body.only.map((id) => String(id).trim().toLowerCase()).filter(Boolean)
      : undefined
    return this.composio.syncCapabilities(user.id, {
      ...(only && only.length > 0 ? { only } : {}),
      ...(body?.force != null ? { force: Boolean(body.force) } : {}),
    })
  }

  async executeComposioTool(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: { service: string; action: string; params?: Record<string, unknown> },
  ): Promise<Record<string, unknown>> {
    const service = body.service?.trim().toLowerCase()
    const action = body.action?.trim()
    if (!service || !action) {
      return { success: false, error: 'service and action are required' }
    }

    const statusQuery = this.repository
      .table(supabase, 'user_integrations')
      .select('id, user_id, status, metadata, scope_mode, is_default, updated_at')
      .eq('integration_id', service)
    const { data: rows, error: rowError } = await this.orgScope
      .applyScope(statusQuery, scope)
      .order('updated_at', { ascending: false })

    if (rowError) return { success: false, error: rowError.message }
    const row = this.core.pickPreferredScopedConnectionRow(
      (rows ?? []) as Array<Record<string, unknown>>,
      user.id,
      scope.orgId,
    )
    const status = String(row?.status ?? '').toLowerCase()
    if (status !== 'connected') {
      return {
        success: false,
        error: `${service} is not connected. Connect it in Settings to view your profile.`,
      }
    }

    try {
      const metadata =
        row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const connectedAccountId = String(metadata.composio_connected_account_id ?? '').trim()
      const executionUserId =
        String(row?.scope_mode ?? '') === 'org_shared' ? String(row?.user_id ?? user.id) : user.id
      const result = await this.composio.executeTool(
        action,
        executionUserId,
        body.params && typeof body.params === 'object' && !Array.isArray(body.params)
          ? body.params
          : {},
        connectedAccountId || undefined,
      )
      return { success: true, result }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Integration execution failed'
      return { success: false, error: message }
    }
  }

  async disconnectComposio(
    supabase: SupabaseClient,
    scope: RequestScope,
    body: {
      integration_id?: string
      connection_id?: string
      user_integration_id?: string
    },
  ): Promise<Record<string, unknown>> {
    const integrationId = body.integration_id?.trim().toLowerCase() ?? ''
    const connectionId = body.connection_id?.trim() ?? ''
    const rowId = body.user_integration_id?.trim() ?? ''

    if (!rowId && (!integrationId || !connectionId)) {
      return {
        success: false,
        error:
          'user_integration_id is required (or provide integration_id + connection_id for legacy fallback)',
      }
    }

    let row: Record<string, unknown> | null = null
    if (rowId) {
      row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    } else {
      let query = this.repository
        .table(supabase, 'user_integrations')
        .select('*')
        .eq('integration_id', integrationId)
        .eq('metadata->>composio_connected_account_id', connectionId)
      if (scope.orgId) query = query.eq('org_id', scope.orgId)
      else query = query.eq('user_id', scope.userId).is('org_id', null)
      const { data } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle()
      row = (data as Record<string, unknown> | null) ?? null
    }
    if (!row) return { success: false, error: 'Integration connection not found' }

    const scopeMode = String(row.scope_mode ?? '')
    if (scopeMode === 'org_shared' && scope.orgId && !this.core.isOrgAdminOrOwner(scope)) {
      return {
        success: false,
        error: 'Only org admin/owner can disconnect All Org integration connections.',
      }
    }

    const resolvedConnectionId = String(
      (row.metadata as Record<string, unknown> | undefined)?.composio_connected_account_id ??
        connectionId,
    ).trim()
    if (!resolvedConnectionId) return { success: false, error: 'Missing connected account id' }

    await this.composio.disconnectConnectedAccount(resolvedConnectionId)

    const resolvedRowId = String(row.id ?? '').trim()
    if (!resolvedRowId) return { success: false, error: 'Missing integration row id' }
    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}

    const { error } = await this.core.updateIntegrationById(supabase, resolvedRowId, {
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      error_message: null,
      metadata: {
        ...metadata,
        composio_connected_account_id: resolvedConnectionId,
        disconnected_at: new Date().toISOString(),
      },
    })

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      integration_id: String(row.integration_id ?? integrationId),
      user_integration_id: resolvedRowId,
      connection_id: resolvedConnectionId,
    }
  }

  async removeIntegration(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    integrationIdRaw?: string,
    userIntegrationIdRaw?: string,
  ): Promise<Record<string, unknown>> {
    const integrationId = integrationIdRaw?.trim().toLowerCase() ?? ''
    const rowId = userIntegrationIdRaw?.trim() ?? ''
    if (!integrationId && !rowId) {
      return { success: false, error: 'user_integration_id is required (or legacy integration_id)' }
    }

    let row: Record<string, unknown> | null = null
    if (rowId) {
      row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    } else {
      const rowQuery = this.repository
        .table(supabase, 'user_integrations')
        .select('*')
        .eq('integration_id', integrationId)
      const scoped = this.orgScope.applyScope(rowQuery, scope)
      const { data } = await scoped.order('updated_at', { ascending: false }).limit(1).maybeSingle()
      row = (data as Record<string, unknown> | null) ?? null
    }

    if (!row) return { success: false, error: 'Integration connection not found' }

    const scopeMode = String(row.scope_mode ?? '')
    if (scopeMode === 'org_shared' && scope.orgId && !this.core.isOrgAdminOrOwner(scope)) {
      return {
        success: false,
        error: 'Only org admin/owner can remove All Org integration connections.',
      }
    }

    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {}
    const composioConnectionId =
      typeof metadata.composio_connected_account_id === 'string'
        ? metadata.composio_connected_account_id.trim()
        : null

    if (composioConnectionId) {
      try {
        await this.composio.disconnectConnectedAccount(composioConnectionId)
      } catch {
        // Composio account may already be gone
      }
    }

    const campaignDeleteQuery = this.repository
      .table(supabase, 'campaign_integration_connections')
      .delete()
      .eq('integration_id', String(row.integration_id ?? integrationId))
    if (scope.orgId) {
      campaignDeleteQuery.eq('org_id', scope.orgId)
    } else {
      campaignDeleteQuery.eq('user_id', user.id).is('org_id', null)
    }
    await campaignDeleteQuery

    const resolvedRowId = String(row.id ?? '').trim()
    const deleteQuery = this.repository
      .table(supabase, 'user_integrations')
      .delete()
      .eq('id', resolvedRowId)
    const { error } = await deleteQuery

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      integration_id: String(row.integration_id ?? integrationId),
      user_integration_id: resolvedRowId,
    }
  }

  async setOrgSharedDefaultConnection(
    supabase: SupabaseClient,
    scope: RequestScope,
    body: { user_integration_id: string },
  ): Promise<Record<string, unknown>> {
    const rowId = String(body.user_integration_id ?? '').trim()
    if (!rowId) return { success: false, error: 'user_integration_id is required' }
    const row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) return { success: false, error: 'Integration connection not found' }
    const scopeMode = String(row.scope_mode ?? '')
    if (scopeMode === 'personal') {
      return this.core.setPersonalDefaultConnection(supabase, scope, rowId)
    }
    if (scopeMode !== 'org_shared') {
      return { success: false, error: 'Unsupported connection scope for default' }
    }
    if (!scope.orgId) {
      return { success: false, error: 'Org context is required' }
    }
    if (!this.core.isOrgAdminOrOwner(scope)) {
      return {
        success: false,
        error: 'Only org admin/owner can set default All Org integration connection.',
      }
    }
    return this.core.setOrgSharedDefaultConnection(supabase, scope, rowId)
  }

  async changeConnectionScope(
    supabase: SupabaseClient,
    scope: RequestScope,
    body: { user_integration_id: string; scope_mode: 'personal' | 'org_shared' },
  ): Promise<Record<string, unknown>> {
    const rowId = String(body.user_integration_id ?? '').trim()
    if (!rowId) return { success: false, error: 'user_integration_id is required' }
    if (body.scope_mode === 'org_shared' && !this.core.isOrgAdminOrOwner(scope)) {
      return { success: false, error: 'Only org admin/owner can share a connection with the org.' }
    }
    return this.core.changeConnectionScope(supabase, scope, rowId, body.scope_mode)
  }

  async updateConnectionLabel(
    supabase: SupabaseClient,
    scope: RequestScope,
    body: { user_integration_id: string; connection_label: string },
  ): Promise<Record<string, unknown>> {
    const rowId = String(body.user_integration_id ?? '').trim()
    const label = String(body.connection_label ?? '').trim()
    if (!rowId) return { success: false, error: 'user_integration_id is required' }
    if (!label) return { success: false, error: 'connection_label is required' }
    if (label.length > 120) return { success: false, error: 'connection_label is too long' }

    const row = await this.core.getIntegrationRowForScope(supabase, scope, rowId)
    if (!row) return { success: false, error: 'Integration connection not found' }

    const scopeMode = String(row.scope_mode ?? '')
    if (scopeMode === 'org_shared' && scope.orgId) {
      const isOwner = String(row.user_id ?? '') === scope.userId
      if (!isOwner && !this.core.isOrgAdminOrOwner(scope)) {
        return {
          success: false,
          error: 'Only the connection owner or org admin can rename this connection.',
        }
      }
    }

    const { error } = await this.core.updateIntegrationById(supabase, rowId, {
      connection_label: label,
    })
    if (error) return { success: false, error: error.message }
    return { success: true, user_integration_id: rowId, connection_label: label }
  }

  buildComposioCallbackRedirectUrl(
    redirectToRaw?: string,
    integrationIdRaw?: string,
    errorRaw?: string,
    messageRaw?: string,
  ): string {
    return buildComposioCallbackRedirectUrl(redirectToRaw, integrationIdRaw, errorRaw, messageRaw)
  }

  async getCampaignConnections(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    campaignId: string,
  ): Promise<Record<string, unknown>> {
    return this.campaignConnections.getCampaignConnections(supabase, user, scope, campaignId)
  }

  async handleComposioWebhook(params: {
    rawBody: Buffer | string | undefined
    webhookId?: string
    webhookSignature?: string
    webhookTimestamp?: string
  }): Promise<Record<string, unknown>> {
    return this.webhooks.handleComposioWebhook(params)
  }

  async connectComposioCampaign(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: {
      campaign_id: string
      integration_id: string
      callback_url?: string
      long_redirect_url?: boolean
    },
  ): Promise<Record<string, unknown>> {
    return this.campaignConnections.connectComposioCampaign(supabase, user, scope, body)
  }

  async disconnectComposioCampaign(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    body: { campaign_id: string; integration_id: string; connection_id: string },
  ): Promise<Record<string, unknown>> {
    return this.campaignConnections.disconnectComposioCampaign(supabase, user, scope, body)
  }
}
