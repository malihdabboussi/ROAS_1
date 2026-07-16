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
import { buildGroupedIntegrations } from './integrations-overview-groups'

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
        'id, user_id, integration_id, provider, status, agent_enabled, metadata, scope_mode, is_default, connection_label, connected_at, updated_at',
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

    const PERSONAL_CROSS_CONTEXT_PROVIDERS = [
      'fathom',
      'fireflies',
      'slack',
      'page_grader',
      'openai_codex',
      'anthropic_claude',
    ]
    if (scope.orgId) {
      const { data: personalRows } = await this.repository
        .table(supabase, 'user_integrations')
        .select(
          'id, user_id, integration_id, provider, status, agent_enabled, metadata, scope_mode, is_default, connection_label, connected_at, updated_at',
        )
        .in('integration_id', PERSONAL_CROSS_CONTEXT_PROVIDERS)
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
      const modeRaw = String(metadata.execution_mode ?? '')
        .trim()
        .toLowerCase()
      const mode: 'legacy' | 'composio' = modeRaw === 'legacy' ? 'legacy' : 'composio'
      composioExecutionModeByIntegrationId.set(row.integration_id, mode)
    }

    const isOrgContext = this.orgScope.isOrgContext(scope)

    const activeComposioByIntegrationId = new Map<
      string,
      { connection_id: string; toolkit_slug: string }
    >()
    const activatedOrgRowIds = new Set<string>()
    const pendingComposioByIntegrationId = new Map<
      string,
      { connection_id: string; toolkit_slug: string }
    >()

    if (!isOrgContext) {
      const composioAccounts = (await this.composio.listConnectedAccounts({
        userId: user.id,
      })) as Array<Record<string, unknown>>

      for (const account of composioAccounts) {
        const status = String(account.status ?? '')
          .trim()
          .toUpperCase()
        const toolkitSlug = String(
          account.toolkitSlug ??
            account.toolkit_slug ??
            (account.toolkit as Record<string, unknown> | undefined)?.slug ??
            '',
        )
          .trim()
          .toLowerCase()
        const integrationId = this.core.mapComposioToolkitToIntegrationId(toolkitSlug)
        if (!integrationId) continue
        const connectionId = String(account.id ?? '').trim()
        if (status === 'ACTIVE') {
          activeComposioByIntegrationId.set(integrationId, {
            connection_id: connectionId,
            toolkit_slug: toolkitSlug,
          })
        }
        if (status === 'PENDING' || status === 'INITIATED') {
          pendingComposioByIntegrationId.set(integrationId, {
            connection_id: connectionId,
            toolkit_slug: toolkitSlug,
          })
        }
      }

      for (const [integrationId, account] of activeComposioByIntegrationId.entries()) {
        const upsertMeta: Record<string, unknown> = {
          composio_connected_account_id: account.connection_id,
          composio_toolkit_slug: account.toolkit_slug,
        }

        if (integrationId === 'linkedin') {
          const existingRow = (
            data as Array<{
              integration_id: string
              metadata?: Record<string, unknown> | null
            }>
          ).find((r) => r.integration_id === 'linkedin')
          const existingMeta =
            existingRow?.metadata &&
            typeof existingRow.metadata === 'object' &&
            !Array.isArray(existingRow.metadata)
              ? (existingRow.metadata as Record<string, unknown>)
              : {}
          if (typeof existingMeta.linkedin_author_urn === 'string') {
            upsertMeta.linkedin_author_urn = existingMeta.linkedin_author_urn
          } else {
            const urn = await this.core.resolveLinkedInAuthorUrn(user.id)
            if (urn) upsertMeta.linkedin_author_urn = urn
          }
        }

        const existingRow = (
          data as Array<{ integration_id: string; connection_label?: string | null }>
        ).find((r) => r.integration_id === integrationId)
        const hasLabel = !!existingRow?.connection_label

        await this.core.upsertPersonalScopedIntegration(supabase, scope, {
          integration_id: integrationId,
          provider: integrationId,
          status: 'connected',
          metadata: upsertMeta,
        })

        if (!hasLabel) {
          const identity = await this.core.resolveConnectionIdentity(
            integrationId,
            user.id,
            account.connection_id,
          )
          if (identity) {
            await this.core.upsertPersonalScopedIntegration(supabase, scope, {
              integration_id: integrationId,
              provider: integrationId,
              status: 'connected',
              metadata: upsertMeta,
              connection_label: identity,
            })
          }
        }
      }
      for (const [integrationId, account] of pendingComposioByIntegrationId.entries()) {
        if (activeComposioByIntegrationId.has(integrationId)) continue
        await this.core.upsertPersonalScopedIntegration(supabase, scope, {
          integration_id: integrationId,
          provider: integrationId,
          status: 'pending',
          metadata: {
            composio_connected_account_id: account.connection_id,
            composio_toolkit_slug: account.toolkit_slug,
          },
        })
      }
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
            activeComposioByIntegrationId.set(row.integration_id, {
              connection_id: connId,
              toolkit_slug: toolkitSlug,
            })
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
      if (
        activeComposioByIntegrationId.has(integrationId) ||
        (rowId && activatedOrgRowIds.has(rowId))
      ) {
        return {
          ...row,
          status: 'connected',
        }
      }
      if (
        !isOrgContext &&
        pendingComposioByIntegrationId.has(integrationId) &&
        row.status !== 'connected'
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
        !(row.integration_id === 'active_campaign' && activeCampaignVaultLinked)
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
      const existingIntegrationIds = new Set(integrations.map((item) => item.integration_id))
      for (const [integrationId, account] of activeComposioByIntegrationId.entries()) {
        if (existingIntegrationIds.has(integrationId)) continue
        integrations.push({
          id: '',
          integration_id: integrationId,
          provider: integrationId,
          status: 'connected',
          agent_enabled: true,
          metadata: {
            composio_inferred: true,
            composio_connected_account_id: account.connection_id,
            composio_toolkit_slug: account.toolkit_slug,
            execution_mode: 'composio',
          },
        })
        existingIntegrationIds.add(integrationId)
      }
      for (const [integrationId, account] of pendingComposioByIntegrationId.entries()) {
        if (existingIntegrationIds.has(integrationId)) continue
        integrations.push({
          id: '',
          integration_id: integrationId,
          provider: integrationId,
          status: 'pending',
          agent_enabled: true,
          metadata: {
            composio_inferred: true,
            composio_connected_account_id: account.connection_id,
            composio_toolkit_slug: account.toolkit_slug,
            execution_mode: 'composio',
          },
        })
        existingIntegrationIds.add(integrationId)
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
