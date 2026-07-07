import type { SupabaseClient } from '@supabase/supabase-js'
import {
  canonicalizeIntegrationId,
  toAgentFacingIntegrationId,
} from '../../shared/utils/integration-id.util'
import {
  inferCapabilityDomain,
  resolveCapabilityPolicy,
  type ArtifactAgentRecord,
  type ArtifactCapabilityDomain,
} from './artifact-capability.policy'
import { ArtifactComposioRuntimeService } from './artifact-composio-runtime.service'
import {
  providerDisplayLabel,
  resolveIntegrationConnectionState,
} from './artifact-integration-connection-resolution'
import { buildIntegrationUsageExample } from './artifact-integration-usage-example'

type ComposioConfig = {
  integration_id: string
  toolkit_slug: string
  auth_config_id: string | null
  enabled: boolean
  execution_mode: 'legacy' | 'composio'
}

type ArtifactIntegrationHost = Record<string, any>

export class ArtifactIntegrationOrchestratorService {
  private readonly composioRuntime = new ArtifactComposioRuntimeService()

  async useComposioTool(
    host: ArtifactIntegrationHost,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const resolveConfig =
      typeof host.resolveComposioConfig === 'function'
        ? (integrationId: string, toolkit: string) =>
            host.resolveComposioConfig(integrationId, toolkit)
        : (integrationId: string, toolkit: string) =>
            this.resolveComposioConfig(host, integrationId, toolkit)
    return this.composioRuntime.useComposioTool(host, data, sessionKey, (integrationId, toolkit) =>
      resolveConfig(integrationId, toolkit),
    )
  }

  async getIntegration(
    host: ArtifactIntegrationHost,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const service = canonicalizeIntegrationId(String(data.service ?? data.integration_id ?? ''))
    if (!service) return { success: false, error: 'service is required' }
    const agentFacingService = toAgentFacingIntegrationId(service)

    try {
      const serviceClient = host.serviceClient as SupabaseClient
      const agentDomain = await host.resolveAgentDomain(sessionKey)

      const { data: capabilities } = await host.integrationsRepository.listDetailedCapabilities(
        serviceClient,
        { integrationId: service, domain: agentDomain },
      )

      if (!capabilities || capabilities.length === 0) {
        return {
          success: true,
          integration_id: agentFacingService,
          connected: false,
          actions: [],
          hint: 'No capabilities found. Try search_available_integrations for broader discovery, or initiate_integration_connect to connect this provider.',
        }
      }

      let connectionState: Record<string, unknown> = { connected: false, status: 'disconnected' }
      if (service === 'scrapecreators' || service === 'dataforseo') {
        connectionState = { connected: true, status: 'connected' }
      } else {
        try {
          const userId = host.resolveUserId(sessionKey)
          const orgId =
            typeof host.resolveOrgId === 'function' ? host.resolveOrgId(sessionKey) : null
          const userClient = (await host.getUserClient(
            userId,
            sessionKey as string,
          )) as SupabaseClient
          const { data: intRows } = await host.integrationsRepository.listIntegrationStatusRows(
            userClient,
            { integrationId: service, userId, orgId },
          )
          const syncedRows = await this.syncComposioConnectionRows(host, userClient, {
            rows: (intRows ?? []) as Array<Record<string, unknown>>,
            service,
          })
          const isMissionCtx =
            sessionKey && typeof host.isMissionSessionKey === 'function'
              ? host.isMissionSessionKey(sessionKey)
              : false
          connectionState = resolveIntegrationConnectionState({
            rows: syncedRows,
            userId,
            orgId,
            providerLabel: providerDisplayLabel(agentFacingService),
            service,
            isMission: isMissionCtx,
          })
        } catch {
          /* session resolution failed */
        }
      }

      return {
        success: true,
        integration_id: agentFacingService,
        connected: Boolean(connectionState.connected),
        status: connectionState.status,
        ...(connectionState.integration_doctor
          ? { integration_doctor: connectionState.integration_doctor }
          : {}),
        ...(connectionState.repair ? { repair: connectionState.repair } : {}),
        ...(connectionState.connection_resolution
          ? { connection_resolution: connectionState.connection_resolution }
          : {}),
        ...(connectionState.selected_connection_id
          ? { selected_connection_id: connectionState.selected_connection_id }
          : {}),
        ...(connectionState.selected_scope
          ? { selected_scope: connectionState.selected_scope }
          : {}),
        execution_mode: capabilities[0]?.execution_mode ?? 'legacy',
        actions: capabilities.map((capability: Record<string, unknown>) => {
          const params =
            capability.parameters &&
            typeof capability.parameters === 'object' &&
            !Array.isArray(capability.parameters)
              ? (capability.parameters as Record<string, unknown>)
              : {}
          const actionSlug = String(capability.action_slug ?? '')
          return {
            action_slug: actionSlug,
            display_name: capability.display_name,
            description: capability.description,
            parameters: capability.parameters,
            usage: buildIntegrationUsageExample(agentFacingService, actionSlug, params),
          }
        }),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get integration',
      }
    }
  }

  private async syncComposioConnectionRows(
    host: ArtifactIntegrationHost,
    userClient: SupabaseClient,
    input: { rows: Array<Record<string, unknown>>; service: string },
  ): Promise<Array<Record<string, unknown>>> {
    if (typeof host.composioService?.getConnectedAccount !== 'function') return input.rows
    const syncedRows: Array<Record<string, unknown>> = []

    for (const row of input.rows) {
      const metadata =
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {}
      const connectionId = String(metadata.composio_connected_account_id ?? '').trim()
      const rowId = String(row.id ?? '').trim()
      if (!connectionId || !rowId) {
        syncedRows.push(row)
        continue
      }

      try {
        const account = (await host.composioService.getConnectedAccount(connectionId)) as Record<
          string,
          unknown
        > | null
        const accountStatus = String(account?.status ?? '')
          .trim()
          .toUpperCase()
        if (accountStatus === 'ACTIVE') {
          const nextRow = {
            ...row,
            status: 'connected',
            metadata: {
              ...metadata,
              composio_connected_account_id: connectionId,
              composio_status: 'ACTIVE',
            },
          }
          if (String(row.status ?? '').toLowerCase() !== 'connected') {
            await host.integrationsRepository.updateComposioIntegrationRow(userClient, {
              id: rowId,
              payload: {
                status: 'connected',
                error_message: null,
                metadata: nextRow.metadata,
                updated_at: new Date().toISOString(),
              },
            })
          }
          syncedRows.push(nextRow)
          continue
        }

        if (accountStatus === 'EXPIRED' || accountStatus === 'INACTIVE') {
          const nextRow = {
            ...row,
            status: 'needs_reconnect',
            metadata: {
              ...metadata,
              composio_connected_account_id: connectionId,
              composio_status: accountStatus,
            },
          }
          if (String(row.status ?? '').toLowerCase() !== 'needs_reconnect') {
            await host.integrationsRepository.updateComposioIntegrationRow(userClient, {
              id: rowId,
              payload: {
                status: 'needs_reconnect',
                error_message: `${input.service} connection ${accountStatus.toLowerCase()}; reconnect required`,
                metadata: nextRow.metadata,
                updated_at: new Date().toISOString(),
              },
            })
          }
          syncedRows.push(nextRow)
          continue
        }
      } catch {
        // Keep the local row when Composio status lookup is unavailable.
      }

      syncedRows.push(row)
    }

    return syncedRows
  }

  async searchAvailableIntegrations(
    host: ArtifactIntegrationHost,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const query = String(data.query ?? data.search ?? '').trim()
    if (!query) return { success: false, error: 'query is required' }

    const requestedLimit = Number(data.limit ?? 15)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 15

    try {
      const serviceClient = host.serviceClient as SupabaseClient
      const embeddingService = host.embeddingService as {
        getEmbedding: (
          input: string,
          options?: { billing?: { userId: string; orgId?: string | null } },
        ) => Promise<number[] | null>
      }
      const agentDomain = await host.resolveAgentDomain(sessionKey)

      const userId = host.resolveUserId(sessionKey) as string
      const orgId = host.resolveOrgId?.(sessionKey) ?? null
      const queryEmbedding = await embeddingService.getEmbedding(query, {
        billing: { userId, orgId },
      })

      if (Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
        const { data: rows } = await host.integrationsRepository.searchCapabilitiesByEmbedding(
          serviceClient,
          {
            queryEmbedding,
            matchCount: limit,
            filterIntegrationId: null,
            filterDomain: agentDomain ?? null,
          },
        )

        if (Array.isArray(rows) && rows.length > 0) {
          const grouped = new Map<
            string,
            Array<{
              action_slug: string
              display_name: string
              description: string
              parameters: Record<string, unknown>
              similarity: number
            }>
          >()

          for (const row of rows as Array<Record<string, unknown>>) {
            const integrationId = String(row.integration_id ?? '').trim()
            if (!integrationId) continue
            const bucket = grouped.get(integrationId) ?? []
            bucket.push({
              action_slug: String(row.action_slug ?? ''),
              display_name: String(row.display_name ?? ''),
              description: String(row.description ?? ''),
              parameters: (row.parameters as Record<string, unknown>) ?? {},
              similarity: Number(row.similarity ?? 0),
            })
            grouped.set(integrationId, bucket)
          }

          const integrations = Array.from(grouped.entries()).map(([integrationId, actions]) => ({
            integration_id: toAgentFacingIntegrationId(integrationId),
            execution_mode:
              (rows as Array<Record<string, unknown>>).find(
                (r) => String(r.integration_id) === integrationId,
              )?.execution_mode ?? 'legacy',
            actions: actions.slice(0, 10).map((action) => ({
              ...action,
              usage: buildIntegrationUsageExample(
                toAgentFacingIntegrationId(integrationId),
                action.action_slug,
                action.parameters,
              ),
            })),
          }))

          return { success: true, query, source: 'capabilities_vector', integrations }
        }
      }

      const { data: fallbackRows } = await host.integrationsRepository.searchCapabilitiesByText(
        serviceClient,
        { query, limit, domain: agentDomain },
      )

      const grouped = new Map<string, Array<Record<string, unknown>>>()
      for (const row of (fallbackRows ?? []) as Array<Record<string, unknown>>) {
        const integrationId = String(row.integration_id ?? '').trim()
        if (!integrationId) continue
        const bucket = grouped.get(integrationId) ?? []
        bucket.push(row)
        grouped.set(integrationId, bucket)
      }

      const integrations = Array.from(grouped.entries()).map(([integrationId, actions]) => ({
        integration_id: toAgentFacingIntegrationId(integrationId),
        execution_mode: String(actions[0]?.execution_mode ?? 'legacy'),
        actions: actions.slice(0, 10).map((action) => ({
          action_slug: String(action.action_slug ?? ''),
          display_name: String(action.display_name ?? ''),
          description: String(action.description ?? ''),
          parameters: (action.parameters as Record<string, unknown>) ?? {},
          usage: buildIntegrationUsageExample(
            toAgentFacingIntegrationId(integrationId),
            String(action.action_slug ?? ''),
            (action.parameters as Record<string, unknown>) ?? {},
          ),
        })),
      }))

      return { success: true, query, source: 'capabilities_text', integrations }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search integrations',
      }
    }
  }

  async initiateIntegrationConnect(
    host: ArtifactIntegrationHost,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> {
    const integrationId = canonicalizeIntegrationId(String(data.integration_id ?? ''))
    const toolkitSlug = String(data.toolkit_slug ?? '')
      .trim()
      .toLowerCase()
    if (!integrationId && !toolkitSlug) {
      return { success: false, error: 'integration_id or toolkit_slug is required' }
    }

    try {
      const userId = host.resolveUserId(sessionKey)
      const supabase = (await host.getUserClient(userId, sessionKey as string)) as SupabaseClient

      const config = await this.resolveComposioConfig(host, integrationId, toolkitSlug)
      if (!config) return { success: false, error: 'No Composio toolkit config found' }
      if (!config.enabled)
        return { success: false, error: `Integration ${config.integration_id} is not enabled` }
      if (config.execution_mode === 'legacy') {
        return {
          success: false,
          error: `Integration ${config.integration_id} does not use Composio. The connect card already renders the correct flow — ask the user to use it, or open Settings → Integrations.`,
          integration_id: config.integration_id,
          execution_mode: 'legacy',
        }
      }
      if (!config.auth_config_id)
        return { success: false, error: `Auth config missing for ${config.integration_id}` }

      const connectOrgId =
        typeof host.resolveOrgId === 'function' ? host.resolveOrgId(sessionKey) : null
      const activeAccounts =
        typeof host.composioService?.listConnectedAccounts === 'function'
          ? ((await host.composioService.listConnectedAccounts({
              userId,
              toolkitSlugs: [config.toolkit_slug],
              statuses: ['ACTIVE'],
              authConfigIds: [config.auth_config_id],
            })) as Array<Record<string, unknown>>)
          : []
      const reusableAccount = activeAccounts.find((account) => {
        const toolkitSlug = String(
          account.toolkitSlug ??
            account.toolkit_slug ??
            (account.toolkit as Record<string, unknown> | undefined)?.slug ??
            '',
        )
          .trim()
          .toLowerCase()
        return toolkitSlug === config.toolkit_slug.toLowerCase()
      })
      const reusableConnectionId = String(reusableAccount?.id ?? '').trim()
      if (reusableConnectionId) {
        const now = new Date().toISOString()
        const { error } = await host.integrationsRepository.upsertPendingComposioIntegration(
          supabase,
          {
            user_id: userId,
            org_id: connectOrgId ?? null,
            integration_id: config.integration_id,
            provider: config.integration_id,
            status: 'connected',
            scope_mode: 'personal',
            access_token: null,
            refresh_token: null,
            token_expires_at: null,
            connected_at: now,
            error_message: null,
            metadata: {
              composio_connected_account_id: reusableConnectionId,
              composio_auth_config_id: config.auth_config_id,
              composio_toolkit_slug: config.toolkit_slug,
              composio_status: 'ACTIVE',
            },
            updated_at: now,
          },
        )
        if (error) return { success: false, error: error.message }
        return {
          success: true,
          integration_id: config.integration_id,
          connection_id: reusableConnectionId,
          redirect_url: null,
          status: 'connected',
          reused: true,
        }
      }

      const callbackUrl =
        typeof data.callback_url === 'string' && data.callback_url.trim().length > 0
          ? data.callback_url.trim()
          : undefined

      const initiated = await host.composioService.initiateConnectedAccount(
        userId,
        config.auth_config_id,
        {
          callbackUrl,
          allowMultiple: true,
        },
      )

      const now = new Date().toISOString()
      const { error } = await host.integrationsRepository.upsertPendingComposioIntegration(
        supabase,
        {
          user_id: userId,
          org_id: connectOrgId ?? null,
          integration_id: config.integration_id,
          provider: config.integration_id,
          status: 'pending',
          scope_mode: 'personal',
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          connected_at: null,
          error_message: null,
          metadata: {
            composio_connected_account_id: initiated.id,
            composio_auth_config_id: config.auth_config_id,
            composio_toolkit_slug: config.toolkit_slug,
          },
          updated_at: now,
        },
      )
      if (error) return { success: false, error: error.message }

      return {
        success: true,
        integration_id: config.integration_id,
        connection_id: initiated.id,
        redirect_url: initiated.redirectUrl,
        status: initiated.status,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate integration connection',
      }
    }
  }

  async resolveComposioConfig(
    host: ArtifactIntegrationHost,
    integrationId: string,
    toolkitSlug: string,
  ): Promise<ComposioConfig | null> {
    const serviceClient = host.serviceClient as SupabaseClient

    const mapRow = (data: Record<string, unknown>): ComposioConfig => {
      const metadata =
        data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
          ? (data.metadata as Record<string, unknown>)
          : {}
      const mode =
        String(metadata.execution_mode ?? '').toLowerCase() === 'legacy'
          ? ('legacy' as const)
          : ('composio' as const)
      return {
        integration_id: String(data.integration_id),
        toolkit_slug: String(data.toolkit_slug),
        auth_config_id: (data.auth_config_id as string | null) ?? null,
        enabled: Boolean(data.enabled),
        execution_mode: mode,
      }
    }

    if (integrationId) {
      const { data } = await host.integrationsRepository.findComposioConfigByIntegrationId(
        serviceClient,
        integrationId,
      )
      if (data) return mapRow(data as Record<string, unknown>)
    }

    if (toolkitSlug) {
      const { data } = await host.integrationsRepository.findComposioConfigByToolkitSlug(
        serviceClient,
        toolkitSlug,
      )
      if (data) return mapRow(data as Record<string, unknown>)
    }

    return null
  }

  pickPreferredIntegrationRow(
    rows: Array<Record<string, unknown>>,
    requestedRowId: string,
    userId: string,
  ): Record<string, unknown> | null {
    return this.composioRuntime.pickPreferredIntegrationRow(rows, requestedRowId, userId)
  }

  async resolveAgentDomain(
    host: ArtifactIntegrationHost,
    sessionKey?: string,
  ): Promise<ArtifactCapabilityDomain | null> {
    if (!sessionKey) return null
    try {
      const agentKey = host.parseAgentIdFromSessionKey(sessionKey)
      if (!agentKey) return null
      if (agentKey === 'vibey') return null

      const userId = host.resolveUserId(sessionKey)
      const supabase = (await host.getUserClient(userId, sessionKey)) as SupabaseClient
      const convId = host.parseConversationIdFromSessionKey?.(sessionKey)
      const ctxOrgId = convId ? host.requestContext?.get(convId)?.orgId : undefined
      const { data: agentRow } = await host.integrationsRepository.findAgentCapabilityRecord(
        supabase,
        { userId, agentKey, orgId: ctxOrgId },
      )

      if (!agentRow) return inferCapabilityDomain(agentKey)
      if (agentRow.level === 'system') return null

      const policy = resolveCapabilityPolicy(agentRow as ArtifactAgentRecord)
      return policy?.domain ?? inferCapabilityDomain(agentKey, String(agentRow.role ?? ''))
    } catch {
      return null
    }
  }
}
