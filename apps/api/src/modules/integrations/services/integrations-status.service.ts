import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { RequestScope } from '@vibey/api-shared'
import { OrgScopeService } from '@vibey/api-shared'
import { ComposioService } from '../../composio/services/composio.service'
import { VaultService } from '../../vault/services/vault.service'
import { IntegrationsRepository } from '../repositories/integrations.repository'
import { IntegrationsComposioHealthService } from './integrations-composio-health.service'
import { IntegrationsCoreService } from './integrations-core.service'

/** Canonical DB integration ids use snake_case; agent/tool callers sometimes pass `activecampaign`. */
const INTEGRATION_ID_ALIASES: Record<string, string> = {
  activecampaign: 'active_campaign',
  'active-campaign': 'active_campaign',
  googledrive: 'google_drive',
  'google-drive': 'google_drive',
  googlesheets: 'google_sheets',
  'google-sheets': 'google_sheets',
  googledocs: 'google_docs',
  'google-docs': 'google_docs',
  googleads: 'google_ads',
  'google-ads': 'google_ads',
  googleanalytics: 'google_analytics',
  'google-analytics': 'google_analytics',
  googlecalendar: 'google_calendar',
  'google-calendar': 'google_calendar',
  'google-search-console': 'google_search_console',
  googlesearchconsole: 'google_search_console',
  'openai-codex': 'openai_codex',
  openaicodex: 'openai_codex',
  'anthropic-claude': 'anthropic_claude',
  anthropicclaude: 'anthropic_claude',
  claude: 'anthropic_claude',
}

function canonicalizeIntegrationId(id: string): string {
  return INTEGRATION_ID_ALIASES[id] ?? id
}

/** Personal-only integrations visible in org workspace (see fathom-org-sharing plan). */
const PERSONAL_CROSS_CONTEXT_PROVIDERS = new Set([
  'fathom',
  'fireflies',
  'slack',
  'page_grader',
  'openai_codex',
  'anthropic_claude',
])

@Injectable()
export class IntegrationsStatusService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly composio: ComposioService,
    private readonly orgScope: OrgScopeService,
    private readonly vault: VaultService,
    private readonly core: IntegrationsCoreService,
    private readonly composioHealth: IntegrationsComposioHealthService,
  ) {}

  async getIntegrationStatus(
    supabase: SupabaseClient,
    user: { id: string },
    scope: RequestScope,
    integrationIdRaw: string,
  ): Promise<Record<string, unknown>> {
    const integrationId = canonicalizeIntegrationId(integrationIdRaw?.trim().toLowerCase() ?? '')
    if (!integrationId)
      return { success: false, connected: false, error: 'integration_id required' }

    let statusQuery = this.repository
      .table(supabase, 'user_integrations')
      .select('id, user_id, status, connected_at, metadata, scope_mode, is_default')
      .eq('integration_id', integrationId)
    if (scope.orgId) {
      statusQuery = statusQuery.eq('org_id', scope.orgId)
    } else {
      statusQuery = statusQuery.eq('user_id', scope.userId).is('org_id', null)
    }
    const { data: allRows } = await statusQuery.order('updated_at', { ascending: false })
    const scopedRows = ((allRows ?? []) as Array<Record<string, unknown>>).filter((row) => {
      if (!scope.orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === user.id
      return false
    })

    if (scope.orgId && PERSONAL_CROSS_CONTEXT_PROVIDERS.has(integrationId)) {
      const { data: personalRow } = await this.repository
        .table(supabase, 'user_integrations')
        .select('id, user_id, status, connected_at, metadata, scope_mode, is_default')
        .eq('integration_id', integrationId)
        .eq('user_id', user.id)
        .is('org_id', null)
        .maybeSingle()
      if (personalRow) {
        const personalId = String((personalRow as Record<string, unknown>).id ?? '')
        const alreadyIncluded = scopedRows.some((row) => String(row.id ?? '') === personalId)
        if (!alreadyIncluded) scopedRows.push(personalRow as Record<string, unknown>)
      }
    }

    if (integrationId === 'openai_codex') {
      const openAICodexRow = await this.repository.findAdminPersonalOpenAICodexIntegration(user.id)
      if (openAICodexRow) {
        const rowId = String(openAICodexRow.id ?? '')
        const existingIndex = scopedRows.findIndex(
          (row) =>
            String(row.id ?? '') === rowId || String(row.integration_id ?? '') === integrationId,
        )
        if (existingIndex >= 0) {
          scopedRows[existingIndex] = { ...scopedRows[existingIndex], ...openAICodexRow }
        } else {
          scopedRows.push(openAICodexRow)
        }
      }
    }
    if (integrationId === 'anthropic_claude') {
      const anthropicClaudeRow = await this.repository.findAdminPersonalAnthropicClaudeIntegration(
        user.id,
      )
      if (anthropicClaudeRow) {
        const rowId = String(anthropicClaudeRow.id ?? '')
        const existingIndex = scopedRows.findIndex(
          (row) =>
            String(row.id ?? '') === rowId || String(row.integration_id ?? '') === integrationId,
        )
        if (existingIndex >= 0) {
          scopedRows[existingIndex] = { ...scopedRows[existingIndex], ...anthropicClaudeRow }
        } else {
          scopedRows.push(anthropicClaudeRow)
        }
      }
    }

    const row = this.pickBestStatusRow(scopedRows, user.id, scope.orgId)

    const { data: config } = await this.repository
      .table(supabase, 'project_composio_toolkit_config')
      .select('toolkit_slug, enabled, metadata')
      .eq('integration_id', integrationId)
      .maybeSingle()

    const configMetadata =
      config?.metadata && typeof config.metadata === 'object' && !Array.isArray(config.metadata)
        ? (config.metadata as Record<string, unknown>)
        : {}
    const executionMode = config
      ? String(configMetadata.execution_mode ?? 'composio').toLowerCase() === 'legacy'
        ? 'legacy'
        : 'composio'
      : 'legacy'

    let connected = String(row?.status ?? '').toLowerCase() === 'connected'
    let forcedStatus: string | null = null

    if (
      !this.orgScope.isOrgContext(scope) &&
      config &&
      executionMode === 'composio' &&
      config.enabled
    ) {
      const accounts = (await this.composio.listConnectedAccounts({
        userId: user.id,
        toolkitSlugs: [config.toolkit_slug as string],
        statuses: ['ACTIVE'],
      })) as Array<Record<string, unknown>>
      const hasActive = accounts.length > 0
      if (hasActive && !connected) {
        const connectionId = String(accounts[0]?.id ?? '').trim()
        const statusMeta: Record<string, unknown> = {
          composio_connected_account_id: connectionId,
          composio_toolkit_slug: config.toolkit_slug,
        }

        if (integrationId === 'linkedin') {
          const existingMeta =
            row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : {}
          if (typeof existingMeta.linkedin_author_urn === 'string') {
            statusMeta.linkedin_author_urn = existingMeta.linkedin_author_urn
          } else {
            const urn = await this.core.resolveLinkedInAuthorUrn(user.id)
            if (urn) statusMeta.linkedin_author_urn = urn
          }
        }

        if (row?.id && typeof row.id === 'string') {
          await this.core.updateIntegrationById(supabase, row.id, {
            status: 'connected',
            metadata: statusMeta,
          })
        } else {
          await this.core.upsertPersonalScopedIntegration(supabase, scope, {
            integration_id: integrationId,
            provider: integrationId,
            status: 'connected',
            metadata: statusMeta,
          })
        }
      }
      if (integrationId === 'active_campaign') {
        const hasVault =
          (await this.vault.hasSecret(user.id, 'active_campaign', 'api_url')) &&
          (await this.vault.hasSecret(user.id, 'active_campaign', 'api_key'))
        const dbConnected = String(row?.status ?? '').toLowerCase() === 'connected'
        connected = hasActive || (dbConnected && hasVault)
      } else {
        connected = hasActive
      }
      if (!hasActive && row) {
        const expiredStatus = await this.composioHealth.syncExpiredConnectionRow(supabase, {
          id: String(row.id ?? ''),
          integration_id: integrationId,
          status: String(row.status ?? ''),
          metadata:
            row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : {},
        })
        if (expiredStatus) {
          connected = false
          forcedStatus = 'needs_reconnect'
        }
      }
    } else if (this.orgScope.isOrgContext(scope) && !connected && row) {
      const rowMeta =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const connId =
        typeof rowMeta.composio_connected_account_id === 'string'
          ? rowMeta.composio_connected_account_id
          : null
      if (connId) {
        try {
          const account = (await this.composio.getConnectedAccount(connId)) as Record<
            string,
            unknown
          > | null
          const accountStatus = String(account?.status ?? '')
            .trim()
            .toUpperCase()
          if (accountStatus === 'ACTIVE') {
            const rowId = String(row.id ?? '').trim()
            if (rowId) {
              await this.core.updateIntegrationById(supabase, rowId, {
                status: 'connected',
                metadata: { ...rowMeta, composio_connected_account_id: connId },
              })
            }
            connected = true
          }
        } catch {
          // Composio lookup failed — leave status as-is
        }
      }
    }

    if (integrationId === 'openai_codex' && connected) {
      connected = await this.vault.hasSecret(user.id, 'openai-codex', 'oauth:default')
    }
    if (integrationId === 'anthropic_claude' && connected) {
      connected = await this.vault.hasSecret(user.id, 'anthropic', 'setup-token:default')
    }
    const statusValue =
      forcedStatus ??
      ((integrationId === 'openai_codex' || integrationId === 'anthropic_claude') && !connected
        ? 'disconnected'
        : connected
          ? 'connected'
          : (row?.status ?? null))

    return {
      success: true,
      connected,
      status: statusValue,
      execution_mode: executionMode,
    }
  }

  async getAgentToggles(
    supabase: SupabaseClient,
    scope: RequestScope,
  ): Promise<{ success: boolean; integrations: unknown[] }> {
    const toggleQuery = this.repository
      .table(supabase, 'user_integrations')
      .select(
        'id, user_id, integration_id, provider, status, agent_enabled, scope_mode, is_default',
      )
    const { data, error } = await this.orgScope.applyScope(toggleQuery, scope)

    if (error) return { success: false, integrations: [] }
    const rows = ((data ?? []) as Array<Record<string, unknown>>).filter((row) => {
      if (!scope.orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === scope.userId
      return false
    })
    return { success: true, integrations: rows }
  }

  async toggleAgentEnabled(
    supabase: SupabaseClient,
    scope: RequestScope,
    body: { integration_id?: string; user_integration_id?: string; agent_enabled: boolean },
  ): Promise<Record<string, unknown>> {
    const { integration_id, user_integration_id, agent_enabled } = body
    if ((!integration_id && !user_integration_id) || typeof agent_enabled !== 'boolean') {
      return {
        success: false,
        error: 'user_integration_id (or integration_id) and agent_enabled (boolean) required',
      }
    }

    if (user_integration_id) {
      const row = await this.core.getIntegrationRowForScope(supabase, scope, user_integration_id)
      if (!row) return { success: false, error: 'Integration connection not found' }
      const { error } = await this.core.updateIntegrationById(supabase, user_integration_id, {
        agent_enabled,
      })
      if (error) return { success: false, error: error.message }
      return {
        success: true,
        user_integration_id,
        integration_id: String(row.integration_id ?? integration_id ?? ''),
        agent_enabled,
      }
    }

    const updateQuery = this.repository
      .table(supabase, 'user_integrations')
      .update({ agent_enabled })
      .eq('integration_id', integration_id!)
    const { error } = await this.orgScope.applyScope(updateQuery, scope)

    if (error) return { success: false, error: error.message }
    return { success: true, integration_id, agent_enabled }
  }

  private pickBestStatusRow(
    rows: Array<Record<string, unknown>>,
    userId: string,
    orgId: string | null,
  ): Record<string, unknown> | null {
    if (rows.length === 0) return null
    if (!orgId) return rows[0]
    const connectedRows = rows.filter(
      (row) => String(row.status ?? '').toLowerCase() === 'connected',
    )
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
    return rows[0]
  }
}
