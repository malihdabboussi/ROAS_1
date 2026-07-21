import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { OrgScopeService } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { VaultService } from '../../vault/services/vault.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import { IntegrationsComposioHealthService } from './integrations-composio-health.service'
import { IntegrationsCoreService } from './integrations-core.service'
import { backfillIntegrationConnectionLabels } from './integrations-label-backfill'
import { IntegrationsOrgAccountsService } from './integrations-org-accounts.service'
import { getRowComposioConnectionId } from './integrations-overview-composio-row'
import { buildGroupedIntegrations } from './integrations-overview-groups'
import { syncPersonalComposioOverviewAccounts } from './integrations-overview-personal-composio-sync'
import { personalCrossContextOverviewIds } from './personal-cross-context-providers'

const INTEGRATION_IDS_FOR_OVERVIEW = [
  'meta',
  'stripe',
  'github',
  'cursor',
  'openai_codex',
  'anthropic_claude',
  'google_drive',
  'google_docs',
  'google_sheets',
  'airtable',
  'google_ads',
  'google_search_console',
  'dropbox',
  'calendly',
  'gohighlevel',
  'fathom',
  'fireflies',
  'linkedin',
  'instagram',
  'twitter',
  'youtube',
  'tiktok',
  'slack',
  'google_analytics',
  'google_calendar',
  'google_workspace',
  'outlook',
  'gmail',
  'clickup',
  'notion',
  'facebook',
  'reddit',
  'mailchimp',
  'kit',
  'klaviyo',
  'hubspot',
  'salesforce',
  'canva',
  'vercel',
  'zoom',
  'active_campaign',
  'page_grader',
  'whop',
  'fanbasis',
  'paypal',
  'wordpress',
] as const

@Injectable()
export class IntegrationsOverviewService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly orgScope: OrgScopeService,
    private readonly vault: VaultService,
    private readonly core: IntegrationsCoreService,
    private readonly orgAccounts: IntegrationsOrgAccountsService,
    private readonly composioHealth: IntegrationsComposioHealthService,
  ) {}

  async getOverview(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
  ): Promise<{
    success: boolean
    connectedProviders: string[]
    integrations: Array<Record<string, unknown>>
    groupedIntegrations?: Array<Record<string, unknown>>
    providerModes?: Record<string, 'legacy' | 'composio'>
  }> {
    const integrationIds = [...INTEGRATION_IDS_FOR_OVERVIEW]

    const baseQuery = this.repository
      .table(supabase, 'user_integrations')
      .select(
        'id, user_id, org_id, integration_id, provider, status, agent_enabled, metadata, scope_mode, is_default, connection_label, connected_at, updated_at',
      )
      .in('integration_id', integrationIds)
    const { data: rawData, error } = await this.orgScope.applyScope(baseQuery, scope)

    if (error) {
      return { success: false, connectedProviders: [], integrations: [] }
    }
    const data = ((rawData ?? []) as Array<Record<string, unknown>>).filter((row) => {
      if (!scope.orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') {
        return String(row.user_id ?? '') === user.id
      }
      return false
    })

    if (scope.orgId) {
      const { data: personalRows } = await this.repository
        .table(supabase, 'user_integrations')
        .select(
          'id, user_id, org_id, integration_id, provider, status, agent_enabled, metadata, scope_mode, is_default, connection_label, connected_at, updated_at',
        )
        .in('integration_id', personalCrossContextOverviewIds())
        .eq('user_id', user.id)
        .is('org_id', null)
      if (personalRows) {
        const existingIds = new Set(data.map((r) => String(r.integration_id ?? '')))
        for (const row of personalRows as Array<Record<string, unknown>>) {
          if (!existingIds.has(String(row.integration_id ?? ''))) {
            data.push(row)
          }
        }
      }
    }

    const adminRows = [
      await this.repository.findAdminPersonalOpenAICodexIntegration(user.id),
      await this.repository.findAdminPersonalAnthropicClaudeIntegration(user.id),
    ]
    for (const row of adminRows) {
      if (row) this.mergeIntegrationRow(data, row)
    }

    const { data: composioConfigRows } = await this.repository
      .table(supabase, 'project_composio_toolkit_config')
      .select('integration_id, enabled, metadata')

    const composioExecutionModeByIntegrationId = new Map<string, 'legacy' | 'composio'>()
    for (const row of (composioConfigRows ?? []) as Array<{
      integration_id: string
      enabled: boolean
      metadata?: Record<string, unknown> | null
    }>) {
      const metadata =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      // Absent / empty execution_mode means native/legacy. Only explicit
      // metadata.execution_mode = 'composio' opts into Composio routing.
      const modeRaw = String(metadata.execution_mode ?? '')
        .trim()
        .toLowerCase()
      const mode: 'legacy' | 'composio' = modeRaw === 'composio' ? 'composio' : 'legacy'
      composioExecutionModeByIntegrationId.set(row.integration_id, mode)
    }

    const isOrgContext = this.orgScope.isOrgContext(scope)

    let activeComposioAccounts: Array<{
      integrationId: string
      connectionId: string
      toolkitSlug: string
    }> = []
    let pendingComposioAccounts: Array<{
      integrationId: string
      connectionId: string
      toolkitSlug: string
    }> = []
    let activeComposioConnectionIds = new Set<string>()
    let activeComposioIntegrationIds = new Set<string>()
    let pendingComposioIntegrationIds = new Set<string>()
    const activatedOrgRowIds = new Set<string>()

    if (!isOrgContext) {
      const synced = await syncPersonalComposioOverviewAccounts({
        supabase,
        userId: user.id,
        scope,
        data,
        composio: this.composio,
        core: this.core,
      })
      activeComposioAccounts = synced.activeComposioAccounts
      pendingComposioAccounts = synced.pendingComposioAccounts
      activeComposioConnectionIds = synced.activeComposioConnectionIds
      activeComposioIntegrationIds = synced.activeComposioIntegrationIds
      pendingComposioIntegrationIds = synced.pendingComposioIntegrationIds
    } else {
      const pendingOrgRows = (
        data as Array<{
          id: string
          integration_id: string
          status: string
          metadata?: Record<string, unknown> | null
        }>
      ).filter((row) => {
        if (row.status === 'connected') return false
        const meta =
          row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
            ? row.metadata
            : {}
        return typeof (meta as Record<string, unknown>).composio_connected_account_id === 'string'
      })

      for (const row of pendingOrgRows) {
        const meta = row.metadata as Record<string, unknown>
        const connId = meta.composio_connected_account_id as string
        try {
          const account = (await this.composio.getConnectedAccount(connId)) as Record<
            string,
            unknown
          > | null
          const accountStatus = String(account?.status ?? '')
            .trim()
            .toUpperCase()
          if (accountStatus === 'ACTIVE') {
            const toolkitSlug = String(meta.composio_toolkit_slug ?? '')
              .trim()
              .toLowerCase()
            activeComposioAccounts.push({
              integrationId: row.integration_id,
              connectionId: connId,
              toolkitSlug,
            })
            activeComposioConnectionIds.add(connId)
            activeComposioIntegrationIds.add(row.integration_id)
            const rowId = String(row.id ?? '').trim()
            if (!rowId) continue
            const existingLabel = (row as Record<string, unknown>).connection_label as string | null
            const updateData: Record<string, unknown> = {
              status: 'connected',
              metadata: { ...meta, composio_connected_account_id: connId },
            }

            if (!existingLabel) {
              const identity = await this.core.resolveConnectionIdentity(
                row.integration_id,
                user.id,
                connId,
              )
              if (identity) updateData.connection_label = identity
            }

            const { error: updateError } = await this.core.updateIntegrationById(
              supabase,
              rowId,
              updateData,
            )
            if (!updateError) activatedOrgRowIds.add(rowId)
          }
        } catch {
          // Composio lookup failed — leave row as-is
        }
      }
    }

    const connectedComposioWithoutLabel = (
      data as Array<{
        id: string
        integration_id: string
        status: string
        connection_label?: string | null
        metadata?: Record<string, unknown> | null
      }>
    ).filter((row) => {
      if (row.status !== 'connected') return false
      if (row.connection_label) return false
      const meta =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? row.metadata
          : {}
      return typeof meta.composio_connected_account_id === 'string'
    })

    for (const row of connectedComposioWithoutLabel) {
      const meta = row.metadata as Record<string, unknown>
      const connId = meta.composio_connected_account_id as string
      try {
        const identity = await this.core.resolveConnectionIdentity(
          row.integration_id,
          user.id,
          connId,
        )
        if (identity) {
          await this.core.updateIntegrationById(supabase, row.id, { connection_label: identity })
          ;(row as Record<string, unknown>).connection_label = identity
        }
      } catch {
        // identity resolution failed — skip, will retry next overview load
      }
    }

    const expiredComposioRowStatusById = await this.composioHealth.syncExpiredConnectedRows(
      supabase,
      data as Array<{
        id: string
        integration_id: string
        status: string
        metadata?: Record<string, unknown> | null
      }>,
      activatedOrgRowIds,
    )

    const activeCampaignVaultLinked =
      (await this.vault.hasSecret(user.id, 'active_campaign', 'api_url')) &&
      (await this.vault.hasSecret(user.id, 'active_campaign', 'api_key'))
    const pageGraderVaultLinked =
      (await this.vault.hasSecret(user.id, 'page_grader', 'base_url')) &&
      (await this.vault.hasSecret(user.id, 'page_grader', 'api_key'))

    const integrations = (
      data as Array<{
        id: string
        integration_id: string
        provider: string
        status: string
        agent_enabled: boolean
        metadata?: Record<string, unknown> | null
      }>
    ).map((row) => {
      const integrationId = row.integration_id
      const rowId = String(row.id ?? '').trim()
      const expiredStatus = rowId ? expiredComposioRowStatusById.get(rowId) : null
      if (expiredStatus) {
        return {
          ...row,
          status: 'needs_reconnect',
          metadata: {
            ...(row.metadata ?? {}),
            composio_status: expiredStatus,
          },
        }
      }
      const rowConnectionId = getRowComposioConnectionId(row as Record<string, unknown>)
      const rowStatus = String(row.status ?? '').toLowerCase()
      // Never resurrect intentionally disconnected rows just because Composio still
      // lists their old connected_account_id as ACTIVE (duplicate collapse leaves
      // those rows in DB with the shared id until metadata is cleared).
      if (
        rowStatus !== 'disconnected' &&
        ((rowConnectionId && activeComposioConnectionIds.has(rowConnectionId)) ||
          (!rowConnectionId && !isOrgContext && activeComposioIntegrationIds.has(integrationId)) ||
          (rowId && activatedOrgRowIds.has(rowId)))
      ) {
        return {
          ...row,
          status: 'connected',
        }
      }
      if (
        !isOrgContext &&
        pendingComposioIntegrationIds.has(integrationId) &&
        row.status !== 'connected' &&
        (!rowConnectionId ||
          pendingComposioAccounts.some((account) => account.connectionId === rowConnectionId))
      ) {
        return {
          ...row,
          status: 'pending',
        }
      }

      const metadata =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const hasComposioAccount =
        typeof metadata.composio_connected_account_id === 'string' &&
        metadata.composio_connected_account_id.length > 0

      const NATIVE_OAUTH_OVERRIDES = ['slack']
      if (
        composioExecutionModeByIntegrationId.get(row.integration_id) === 'composio' &&
        row.status === 'connected' &&
        !hasComposioAccount &&
        !NATIVE_OAUTH_OVERRIDES.includes(row.integration_id) &&
        !(row.integration_id === 'active_campaign' && activeCampaignVaultLinked) &&
        !(row.integration_id === 'page_grader' && pageGraderVaultLinked)
      ) {
        return {
          ...row,
          status: 'disconnected',
          metadata: {
            ...metadata,
            execution_mode: 'composio',
          },
        }
      }

      const executionMode = composioExecutionModeByIntegrationId.get(row.integration_id) ?? 'legacy'
      return {
        ...row,
        metadata: {
          ...metadata,
          execution_mode: executionMode,
        },
      }
    })

    if (!isOrgContext) {
      const existingConnectionIds = new Set(
        integrations
          .map((item) => getRowComposioConnectionId(item as Record<string, unknown>))
          .filter(Boolean),
      )
      for (const account of activeComposioAccounts) {
        if (existingConnectionIds.has(account.connectionId)) continue
        integrations.push({
          id: '',
          integration_id: account.integrationId,
          provider: account.integrationId,
          status: 'connected',
          agent_enabled: true,
          metadata: {
            composio_inferred: true,
            composio_connected_account_id: account.connectionId,
            composio_toolkit_slug: account.toolkitSlug,
            execution_mode: 'composio',
          },
        })
        existingConnectionIds.add(account.connectionId)
      }
      for (const account of pendingComposioAccounts) {
        if (activeComposioConnectionIds.has(account.connectionId)) continue
        if (existingConnectionIds.has(account.connectionId)) continue
        integrations.push({
          id: '',
          integration_id: account.integrationId,
          provider: account.integrationId,
          status: 'pending',
          agent_enabled: true,
          metadata: {
            composio_inferred: true,
            composio_connected_account_id: account.connectionId,
            composio_toolkit_slug: account.toolkitSlug,
            execution_mode: 'composio',
          },
        })
        existingConnectionIds.add(account.connectionId)
      }
    }

    const connectedSet = new Set(
      integrations.filter((item) => item.status === 'connected').map((item) => item.integration_id),
    )
    const providerModes = Object.fromEntries(
      integrationIds.map((id) => [id, composioExecutionModeByIntegrationId.get(id) ?? 'legacy']),
    )
    if (connectedSet.has('fireflies')) {
      const { data: firefliesSecret } = await this.repository
        .table(supabase, 'vault_secrets')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'fireflies')
        .eq('label', 'api_key')
        .maybeSingle()

      if (!firefliesSecret) {
        connectedSet.delete('fireflies')
      }
    }
    if (connectedSet.has('fanbasis')) {
      const { data: fanbasisSecret } = await this.repository
        .table(supabase, 'vault_secrets')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'fanbasis')
        .eq('label', 'api_key')
        .maybeSingle()

      if (!fanbasisSecret) {
        connectedSet.delete('fanbasis')
      }
    }
    if (connectedSet.has('google_workspace') && scope.orgId) {
      const { data: workspaceRow } = await this.repository
        .table(supabase, 'user_integrations')
        .select('user_id, metadata')
        .eq('org_id', scope.orgId)
        .eq('integration_id', 'google_workspace')
        .eq('status', 'connected')
        .eq('scope_mode', 'org_shared')
        .limit(1)
        .maybeSingle()
      const vaultUserId = String(
        (workspaceRow?.metadata as Record<string, unknown> | null | undefined)?.vault_user_id ??
          workspaceRow?.user_id ??
          '',
      )
      if (!vaultUserId) {
        connectedSet.delete('google_workspace')
      } else {
        const { data: workspaceSecret } = await this.repository
          .table(supabase, 'vault_secrets')
          .select('id')
          .eq('user_id', vaultUserId)
          .eq('provider', 'google_workspace')
          .eq('label', 'service_account')
          .maybeSingle()
        if (!workspaceSecret) connectedSet.delete('google_workspace')
      }
    }
    for (const item of [
      { integrationId: 'openai_codex', provider: 'openai-codex', label: 'oauth:default' },
      { integrationId: 'anthropic_claude', provider: 'anthropic', label: 'setup-token:default' },
    ]) {
      if (!connectedSet.has(item.integrationId)) continue
      const hasSecret = await this.vault.hasSecret(user.id, item.provider, item.label)
      if (!hasSecret) {
        connectedSet.delete(item.integrationId)
        integrations.forEach((row) => {
          if (row.integration_id === item.integrationId) row.status = 'disconnected'
        })
      }
    }

    return {
      success: true,
      connectedProviders: Array.from(connectedSet),
      integrations,
      groupedIntegrations: buildGroupedIntegrations(integrations),
      providerModes,
    }
  }

  listOrgConnectedAccounts(supabase: SupabaseClient, scope: RequestScope) {
    return this.orgAccounts.listOrgConnectedAccounts(supabase, scope)
  }

  private mergeIntegrationRow(
    rows: Array<Record<string, unknown>>,
    incoming: Record<string, unknown>,
  ): void {
    const rowId = String(incoming.id ?? '')
    const integrationId = String(incoming.integration_id ?? '')
    const index = rows.findIndex(
      (row) => String(row.id ?? '') === rowId || String(row.integration_id ?? '') === integrationId,
    )
    if (index >= 0) rows[index] = { ...rows[index], ...incoming }
    else rows.push(incoming)
  }

  async backfillConnectionLabels(
    supabase: SupabaseClient,
    limit: number,
  ): Promise<{ success: boolean; updated: number; failed: number; skipped: number }> {
    return backfillIntegrationConnectionLabels(this.repository, this.core, supabase, limit)
  }
}
