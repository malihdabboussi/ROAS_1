import type { SupabaseClient } from '@supabase/supabase-js'
import { canonicalizeIntegrationId } from '../../shared/utils/integration-id.util'
import {
  providerDisplayLabel,
  resolveIntegrationConnectionState,
} from './artifact-integration-connection-resolution'

type ComposioConfig = {
  integration_id: string
  toolkit_slug: string
  auth_config_id: string | null
  enabled: boolean
  execution_mode: 'legacy' | 'composio'
}

type ComposioAccessResult = {
  allowed: boolean
  integrationId?: string
  toolkitSlug?: string
  connectedAccountId?: string
  userIntegrationId?: string
  scopeMode?: 'personal' | 'org_shared'
  composioUserId?: string
  status?: string
  repair?: Record<string, unknown>
  integrationDoctor?: Record<string, unknown>
  reason?: string
}

type ArtifactComposioHost = Record<string, any>

export class ArtifactComposioRuntimeService {
  private static readonly YOUTUBE_ANALYTICS_ACTIONS = new Set(['get_analytics_report'])

  async useComposioTool(
    host: ArtifactComposioHost,
    data: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveConfig: (integrationId: string, toolkitSlug: string) => Promise<ComposioConfig | null>,
  ): Promise<unknown> {
    const toolSlug = String(data.tool_slug ?? data.tool ?? '').trim()
    if (!toolSlug) return { success: false, error: 'tool_slug is required' }

    const argumentsPayload =
      data.arguments && typeof data.arguments === 'object' && !Array.isArray(data.arguments)
        ? (data.arguments as Record<string, unknown>)
        : data.params && typeof data.params === 'object' && !Array.isArray(data.params)
          ? (data.params as Record<string, unknown>)
          : {}

    try {
      const userId = host.resolveUserId(sessionKey)
      const integrationCheck = await this.ensureComposioExecutionAllowed(
        host,
        userId,
        data,
        sessionKey,
        resolveConfig,
      )
      if (!integrationCheck.allowed) {
        return {
          success: false,
          error: integrationCheck.reason ?? 'Integration not available for execution',
          ...(integrationCheck.integrationId
            ? { integration_id: integrationCheck.integrationId }
            : {}),
          ...(integrationCheck.status ? { status: integrationCheck.status } : {}),
          ...(integrationCheck.repair ? { repair: integrationCheck.repair } : {}),
          ...(integrationCheck.integrationDoctor
            ? { integration_doctor: integrationCheck.integrationDoctor }
            : {}),
        }
      }

      const execUserId = integrationCheck.composioUserId ?? userId

      if (this.isYouTubeAnalyticsAction(toolSlug)) {
        return this.executeYouTubeAnalytics(
          host,
          argumentsPayload,
          execUserId,
          integrationCheck.connectedAccountId,
        )
      }

      const result = await host.composioService.executeTool(
        toolSlug,
        execUserId,
        argumentsPayload,
        integrationCheck.connectedAccountId,
      )
      return {
        success: true,
        tool_slug: toolSlug,
        integration_id: integrationCheck.integrationId,
        user_integration_id: integrationCheck.userIntegrationId,
        connection_scope: integrationCheck.scopeMode,
        toolkit_slug: integrationCheck.toolkitSlug,
        result,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Composio tool execution failed',
      }
    }
  }

  pickPreferredIntegrationRow(
    rows: Array<Record<string, unknown>>,
    requestedRowId: string,
    userId: string,
  ): Record<string, unknown> | null {
    if (rows.length === 0) return null
    if (!this.isIntegrationScopeResolverV2Enabled()) {
      if (requestedRowId) {
        const requested = rows.find((row) => String(row.id ?? '') === requestedRowId)
        if (requested) return requested
      }
      return rows[0]
    }
    if (requestedRowId) {
      const requested = rows.find((row) => String(row.id ?? '') === requestedRowId)
      if (requested) return requested
    }
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
    const latestConnectedShared = connectedRows.find(
      (row) => String(row.scope_mode ?? '') === 'org_shared',
    )
    if (latestConnectedShared) return latestConnectedShared
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

  private isIntegrationScopeResolverV2Enabled(): boolean {
    return process.env.INTEGRATION_SCOPE_RESOLVER_V2 !== '0'
  }

  private isYouTubeAnalyticsAction(toolSlug: string): boolean {
    return ArtifactComposioRuntimeService.YOUTUBE_ANALYTICS_ACTIONS.has(
      toolSlug.trim().toLowerCase(),
    )
  }

  private async executeYouTubeAnalytics(
    host: ArtifactComposioHost,
    params: Record<string, unknown>,
    userId: string,
    connectedAccountId?: string,
  ): Promise<unknown> {
    const token = await host.composioService.getAccessTokenForToolkit(
      userId,
      'youtube',
      connectedAccountId,
    )
    if (!token) {
      return {
        success: false,
        error: 'YouTube is not connected or analytics access token unavailable',
      }
    }

    const startDate = String(params.startDate ?? params.start_date ?? '').trim()
    const endDate = String(params.endDate ?? params.end_date ?? '').trim()
    const metrics = String(
      params.metrics ??
        'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,shares,comments',
    )

    if (!startDate || !endDate) {
      return {
        success: false,
        error: 'startDate and endDate are required (YYYY-MM-DD format)',
      }
    }

    const qs = new URLSearchParams({
      ids: 'channel==MINE',
      startDate,
      endDate,
      metrics,
    })

    if (params.dimensions) qs.set('dimensions', String(params.dimensions))
    if (params.filters) qs.set('filters', String(params.filters))
    if (params.sort) qs.set('sort', String(params.sort))
    if (params.maxResults) qs.set('maxResults', String(params.maxResults))

    const url = `https://youtubeanalytics.googleapis.com/v2/reports?${qs.toString()}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      return {
        success: false,
        error: `YouTube Analytics API error ${response.status}: ${errorBody}`,
      }
    }

    const report = await response.json()
    return {
      success: true,
      integration_id: 'youtube',
      action: 'get_analytics_report',
      result: report,
    }
  }

  private async ensureComposioExecutionAllowed(
    host: ArtifactComposioHost,
    userId: string,
    data: Record<string, unknown>,
    sessionKey: string | undefined,
    resolveConfig: (integrationId: string, toolkitSlug: string) => Promise<ComposioConfig | null>,
  ): Promise<ComposioAccessResult> {
    const integrationIdInput = canonicalizeIntegrationId(String(data.integration_id ?? ''))
    const toolkitSlugInput = String(data.toolkit_slug ?? '')
      .trim()
      .toLowerCase()
    if (!integrationIdInput && !toolkitSlugInput) {
      return {
        allowed: false,
        reason: 'integration_id or toolkit_slug is required for composio execution',
      }
    }

    const config = await resolveConfig(integrationIdInput, toolkitSlugInput)
    if (!config) return { allowed: false, reason: 'No Composio toolkit config found' }
    if (!config.enabled)
      return { allowed: false, reason: `Integration ${config.integration_id} is disabled` }

    const userClient = (await host.getUserClient(userId, sessionKey as string)) as SupabaseClient
    const execOrgId = typeof host.resolveOrgId === 'function' ? host.resolveOrgId(sessionKey) : null
    const { data: rawRows, error } = await host.integrationsRepository.listComposioIntegrationRows(
      userClient,
      { integrationId: config.integration_id, userId, orgId: execOrgId },
    )
    if (error) return { allowed: false, reason: error.message }

    const scopedRows = ((rawRows ?? []) as Array<Record<string, unknown>>).filter((row) => {
      if (!execOrgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      const rowUserId = String(row.user_id ?? '')
      if (!scopeMode) return !rowUserId || rowUserId === userId
      return false
    })

    const isMission =
      sessionKey && typeof host.isMissionSessionKey === 'function'
        ? host.isMissionSessionKey(sessionKey)
        : false

    const buildUnavailable = (
      reason: string,
      options?: { rows?: Array<Record<string, unknown>>; status?: string },
    ): ComposioAccessResult => {
      const state = resolveIntegrationConnectionState({
        rows: options?.rows ?? scopedRows,
        userId,
        orgId: execOrgId,
        providerLabel: providerDisplayLabel(config.integration_id),
        service: config.integration_id,
        isMission,
      })
      return {
        allowed: false,
        integrationId: config.integration_id,
        toolkitSlug: config.toolkit_slug,
        status: options?.status ?? String(state.status ?? 'disconnected'),
        repair: state.repair as Record<string, unknown> | undefined,
        integrationDoctor: state.integration_doctor as Record<string, unknown> | undefined,
        reason,
      }
    }

    const requestedConnectionRowId = String(
      data.user_integration_id ?? data.integration_connection_id ?? '',
    ).trim()
    const candidateRows = scopedRows
    if (
      requestedConnectionRowId &&
      !candidateRows.some((row) => String(row.id ?? '') === requestedConnectionRowId)
    ) {
      return buildUnavailable(
        `Integration connection ${requestedConnectionRowId} is not available in this context`,
        { status: 'access_denied' },
      )
    }
    const row = this.pickPreferredIntegrationRow(candidateRows, requestedConnectionRowId, userId)

    const agentKeyForPolicy = host.parseAgentIdFromSessionKey?.(sessionKey) as
      | string
      | null
      | undefined
    if (host.agentPolicyService && agentKeyForPolicy) {
      try {
        const allowedByTeam = await host.agentPolicyService.canAgentUseCapability(
          agentKeyForPolicy,
          'integration',
          config.integration_id,
          { orgId: execOrgId ?? null, userId: execOrgId ? null : userId },
        )
        if (!allowedByTeam) {
          const enforce = (process.env.AGENT_TEAMS_ENFORCE ?? 'true').toLowerCase() !== 'false'
          if (enforce) {
            const rows =
              row && String(row.id ?? '').trim()
                ? candidateRows.map((candidate) =>
                    String(candidate.id ?? '') === String(row.id ?? '')
                      ? { ...candidate, agent_enabled: false }
                      : candidate,
                  )
                : candidateRows
            return buildUnavailable(
              `Agent '${agentKeyForPolicy}' team does not grant integration ${config.integration_id}`,
              { rows, status: 'access_denied' },
            )
          }
          try {
            host.logger?.warn?.(
              `[AGENT_TEAMS_ENFORCE=false] would have blocked integration '${config.integration_id}' for agent='${agentKeyForPolicy}'`,
            )
          } catch {
            /* preserve legacy swallow */
          }
        }
      } catch {
        /* policy failure falls back to the legacy connection gate */
      }
    }
    if (row?.agent_enabled === false && !isMission) {
      return buildUnavailable(`Integration ${config.integration_id} is disabled for agent use`, {
        status: 'access_denied',
      })
    }
    if (execOrgId && !requestedConnectionRowId && !row) {
      return buildUnavailable(`Integration ${config.integration_id} is not connected`)
    }

    const composioUserId =
      row && String(row.scope_mode ?? '').toLowerCase() === 'org_shared'
        ? String(row.user_id ?? userId)
        : userId

    const accounts = (await host.composioService.listConnectedAccounts({
      userId: composioUserId,
      toolkitSlugs: [config.toolkit_slug],
      statuses: ['ACTIVE'],
    })) as Array<Record<string, unknown>>

    const activeAccountsForToolkit = accounts.filter((account) => {
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

    const rowConnectionId = String(
      (row?.metadata as Record<string, unknown> | undefined)?.composio_connected_account_id ?? '',
    ).trim()
    const requestedConnectedAccountId = String(data.connected_account_id ?? '').trim()
    const selectedAccount =
      activeAccountsForToolkit.find(
        (account) =>
          requestedConnectedAccountId.length > 0 &&
          String(account.id ?? '').trim() === requestedConnectedAccountId,
      ) ??
      activeAccountsForToolkit.find(
        (account) =>
          rowConnectionId.length > 0 && String(account.id ?? '').trim() === rowConnectionId,
      ) ??
      activeAccountsForToolkit[0]

    if (!selectedAccount) {
      const selectedRowId = String(row?.id ?? '').trim()
      const rows =
        selectedRowId.length > 0
          ? candidateRows.map((candidate) =>
              String(candidate.id ?? '') === selectedRowId
                ? { ...candidate, status: 'needs_reconnect' }
                : candidate,
            )
          : candidateRows
      return buildUnavailable(`Integration ${config.integration_id} is not connected`, {
        rows,
        status: selectedRowId ? 'needs_reconnect' : undefined,
      })
    }

    const activeConnectionId = String(selectedAccount.id ?? '').trim()
    const selectedRowId = String(row?.id ?? '').trim()
    const selectedScopeMode =
      String(row?.scope_mode ?? '')
        .trim()
        .toLowerCase() === 'org_shared'
        ? 'org_shared'
        : 'personal'

    const rowNeedsUpdate =
      String(row?.status ?? '').toLowerCase() !== 'connected' ||
      rowConnectionId !== activeConnectionId
    if (rowNeedsUpdate && selectedRowId) {
      await host.integrationsRepository.updateComposioIntegrationRow(userClient, {
        id: selectedRowId,
        payload: {
          status: 'connected',
          metadata: {
            ...(row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
              ? (row.metadata as Record<string, unknown>)
              : {}),
            composio_connected_account_id: activeConnectionId,
            composio_toolkit_slug: config.toolkit_slug,
          },
          updated_at: new Date().toISOString(),
        },
      })
    } else if (rowNeedsUpdate && !selectedRowId) {
      await host.integrationsRepository.insertComposioIntegrationRow(userClient, {
        user_id: userId,
        org_id: execOrgId ?? null,
        integration_id: config.integration_id,
        provider: config.integration_id,
        status: 'connected',
        scope_mode: execOrgId ? 'personal' : 'personal',
        is_default: false,
        metadata: {
          composio_connected_account_id: activeConnectionId,
          composio_toolkit_slug: config.toolkit_slug,
        },
        updated_at: new Date().toISOString(),
      })
    }

    return {
      allowed: true,
      integrationId: config.integration_id,
      toolkitSlug: config.toolkit_slug,
      connectedAccountId: activeConnectionId || undefined,
      userIntegrationId: selectedRowId || undefined,
      scopeMode: selectedScopeMode,
      composioUserId,
    }
  }
}
