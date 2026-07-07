import { Injectable } from '@nestjs/common'
import {
  buildLegacyIntegrationHttpRoute,
  type IntegrationLegacyRouteConfig,
} from '@vibey/api-shared'
import {
  canonicalizeIntegrationId,
  toAgentFacingIntegrationId,
} from '../../shared/utils/integration-id.util'
import { ArtifactLegacyIntegrationsRepository } from '../repositories/artifact-legacy-integrations.repository'

function parseRouteConfig(raw: unknown): IntegrationLegacyRouteConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const method = o.method
  const path = o.path
  if (
    method !== 'GET' &&
    method !== 'POST' &&
    method !== 'PUT' &&
    method !== 'PATCH' &&
    method !== 'DELETE'
  )
    return null
  if (typeof path !== 'string' || !path.startsWith('/')) return null
  const cfg: IntegrationLegacyRouteConfig = {
    method,
    path,
  }
  if (o.query_params && typeof o.query_params === 'object' && !Array.isArray(o.query_params)) {
    cfg.query_params = o.query_params as Record<string, string>
  }
  if (o.fixed_query && typeof o.fixed_query === 'object' && !Array.isArray(o.fixed_query)) {
    cfg.fixed_query = o.fixed_query as Record<string, string>
  }
  if (typeof o.alt_path === 'string') cfg.alt_path = o.alt_path
  if (typeof o.alt_when === 'string') cfg.alt_when = o.alt_when
  if (o.query_remainder === true) cfg.query_remainder = true
  if (o.ghl_proxy && typeof o.ghl_proxy === 'object' && !Array.isArray(o.ghl_proxy)) {
    const gp = o.ghl_proxy as Record<string, unknown>
    const gh_method = gp.gh_method
    const gh_path = gp.gh_path
    if (
      gh_method !== 'GET' &&
      gh_method !== 'POST' &&
      gh_method !== 'PUT' &&
      gh_method !== 'PATCH' &&
      gh_method !== 'DELETE'
    )
      return null
    if (typeof gh_path !== 'string' || !gh_path.startsWith('/')) return null
    cfg.ghl_proxy = {
      gh_method,
      gh_path,
      gh_version: typeof gp.gh_version === 'string' ? gp.gh_version : undefined,
    }
  }
  return cfg
}

@Injectable()
export class ArtifactLegacyIntegrationsService {
  constructor(private readonly repository = new ArtifactLegacyIntegrationsRepository()) {}

  async getIntegrationCapabilities(target: Record<string, any>, sessionKey?: string) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: connected } = await this.repository.listConnectedIntegrations(supabase, {
      userId,
      orgId,
    })

    const isMission =
      sessionKey && typeof target.isMissionSessionKey === 'function'
        ? target.isMissionSessionKey(sessionKey)
        : false
    const filteredRows = ((connected ?? []) as Array<Record<string, unknown>>).filter((row) => {
      if (!(isMission || row.agent_enabled !== false)) return false
      if (!orgId) return true
      const scopeMode = String(row.scope_mode ?? '')
      if (scopeMode === 'org_shared') return true
      if (scopeMode === 'personal') return String(row.user_id ?? '') === userId
      return false
    })
    const connectedIds = Array.from(
      new Set(
        filteredRows
          .map((row) =>
            String(row.integration_id ?? '')
              .trim()
              .toLowerCase(),
          )
          .filter((value) => value.length > 0),
      ),
    )

    const integrations: Record<string, unknown> = {}
    if (connectedIds.length > 0) {
      const { data: capabilityRows } = await this.repository.listCapabilities(
        target.serviceClient,
        connectedIds,
      )

      const grouped = new Map<string, Array<{ action_slug: string; execution_mode: string }>>()
      for (const row of (capabilityRows ?? []) as Array<Record<string, unknown>>) {
        const integrationId = String(row.integration_id ?? '')
          .trim()
          .toLowerCase()
        if (!integrationId) continue
        const bucket = grouped.get(integrationId) ?? []
        bucket.push({
          action_slug: String(row.action_slug ?? '').trim(),
          execution_mode: String(row.execution_mode ?? 'legacy')
            .trim()
            .toLowerCase(),
        })
        grouped.set(integrationId, bucket)
      }

      for (const integrationId of connectedIds) {
        const actions = (grouped.get(integrationId) ?? [])
          .map((item) => item.action_slug)
          .filter((slug) => slug.length > 0)
        const executionMode =
          grouped.get(integrationId)?.[0]?.execution_mode ??
          (await this.resolveIntegrationExecutionMode(target, integrationId))

        integrations[toAgentFacingIntegrationId(integrationId)] = {
          actions,
          connected: true,
          execution_mode: executionMode,
          note:
            actions.length > 0
              ? 'Use these exact action_slug values with use_integration.'
              : 'No action slugs indexed yet. Use get_integration for live provider lookup.',
        }
      }
    }

    return {
      connected_count: connectedIds.length,
      connected_integrations: connectedIds.map(toAgentFacingIntegrationId),
      integrations,
      deprecation_note:
        'get_capabilities is legacy. Prefer get_integration for direct provider lookup and search_available_integrations for intent search.',
    }
  }

  private static readonly USE_INTEGRATION_ROUTING_KEYS = new Set([
    'service',
    'integration_action',
    'action',
    'params',
    'parameters',
    'integration_connection_id',
    'user_integration_id',
    'connected_account_id',
  ])

  private extractParams(data: Record<string, unknown>): Record<string, unknown> {
    if (data.params && typeof data.params === 'object' && !Array.isArray(data.params)) {
      return data.params as Record<string, unknown>
    }
    if (data.parameters && typeof data.parameters === 'object' && !Array.isArray(data.parameters)) {
      return data.parameters as Record<string, unknown>
    }
    const rest: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data)) {
      if (ArtifactLegacyIntegrationsService.USE_INTEGRATION_ROUTING_KEYS.has(k)) continue
      if (v !== undefined && v !== null) rest[k] = v
    }
    return Object.keys(rest).length > 0 ? rest : {}
  }

  private integrationFailureError(
    service: string,
    integrationAction: string,
    params: Record<string, unknown>,
    error: string,
  ): string {
    const paramKeys = Object.keys(params).sort()
    return `Integration action failed for service "${toAgentFacingIntegrationId(service)}" action "${integrationAction}" params [${paramKeys.join(', ')}]: ${error}`
  }

  async useIntegration(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const service = String(data.service ?? '')
    const integrationAction = String(data.integration_action ?? data.action ?? '')
    const rawParams = this.extractParams(data)
    const integrationConnectionId = String(
      data.integration_connection_id ??
        data.user_integration_id ??
        rawParams.integration_connection_id ??
        rawParams.user_integration_id ??
        '',
    ).trim()
    const connectedAccountId = String(
      data.connected_account_id ?? rawParams.connected_account_id ?? '',
    ).trim()
    const params = { ...rawParams }
    delete params.integration_connection_id
    delete params.user_integration_id
    delete params.connected_account_id
    if (!service) return { success: false, error: 'service is required' }
    if (!integrationAction) return { success: false, error: 'integration_action is required' }
    const normalizedService = canonicalizeIntegrationId(service)
    const executionMode = await this.resolveIntegrationExecutionMode(target, normalizedService)

    if (executionMode === 'composio') {
      const result = await this.routeComposioIntegration(
        target,
        normalizedService,
        integrationAction,
        params,
        sessionKey,
        { connectedAccountId, integrationConnectionId },
      )
      if (
        result &&
        typeof result === 'object' &&
        (result as Record<string, unknown>).success === false &&
        typeof (result as Record<string, unknown>).error === 'string'
      ) {
        return {
          ...(result as Record<string, unknown>),
          error: this.integrationFailureError(
            normalizedService,
            integrationAction,
            params,
            (result as Record<string, string>).error,
          ),
        }
      }
      return result
    }

    const route = await this.resolveLegacyIntegrationHttpRoute(
      target,
      normalizedService,
      integrationAction,
      params,
    )
    if (!route) {
      const available = await this.listAvailableActionSlugs(target, normalizedService)
      const hint = available.length > 0 ? ` Available actions: ${available.join(', ')}` : ''
      return {
        success: false,
        error: `Unknown action "${integrationAction}" for service "${toAgentFacingIntegrationId(normalizedService)}".${hint}`,
      }
    }

    try {
      const result = await target.mainApiCall(route.method, route.path, sessionKey, route.body)
      if (
        result &&
        typeof result === 'object' &&
        (result as Record<string, unknown>).success === false &&
        typeof (result as Record<string, unknown>).error === 'string'
      ) {
        return {
          ...(result as Record<string, unknown>),
          error: this.integrationFailureError(
            normalizedService,
            integrationAction,
            params,
            (result as Record<string, string>).error,
          ),
        }
      }
      return result
    } catch (err) {
      return {
        success: false,
        error: this.integrationFailureError(
          normalizedService,
          integrationAction,
          params,
          err instanceof Error ? err.message : String(err),
        ),
      }
    }
  }

  async routeComposioIntegration(
    target: Record<string, any>,
    service: string,
    integrationAction: string,
    params: Record<string, unknown>,
    sessionKey?: string,
    routing?: { connectedAccountId?: string; integrationConnectionId?: string },
  ): Promise<unknown> {
    const delegatedTarget = target as {
      useComposioTool?: (
        data: Record<string, unknown>,
        sessionKey?: string,
      ) => Promise<unknown> | unknown
    }
    if (typeof delegatedTarget.useComposioTool !== 'function') {
      return {
        success: false,
        error: `Composio executor is not available for ${service}`,
      }
    }

    return delegatedTarget.useComposioTool(
      {
        integration_id: service,
        tool_slug: integrationAction,
        arguments: params,
        ...(routing?.integrationConnectionId
          ? { integration_connection_id: routing.integrationConnectionId }
          : {}),
        ...(routing?.connectedAccountId
          ? { connected_account_id: routing.connectedAccountId }
          : {}),
      },
      sessionKey,
    )
  }

  async resolveIntegrationExecutionMode(
    target: Record<string, any>,
    integrationId: string,
  ): Promise<'legacy' | 'composio'> {
    const normalized = integrationId.trim().toLowerCase()
    if (!normalized) return 'composio'

    const { data, error } = await this.repository.findExecutionModeConfig(
      target.serviceClient,
      normalized,
    )

    if (error || !data) return 'composio'

    const metadata =
      data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata)
        ? (data.metadata as Record<string, unknown>)
        : {}
    const executionModeRaw = String(metadata.execution_mode ?? '')
      .trim()
      .toLowerCase()

    if (executionModeRaw === 'legacy') return 'legacy'
    return 'composio'
  }

  private async listAvailableActionSlugs(
    target: Record<string, any>,
    integrationId: string,
  ): Promise<string[]> {
    try {
      const { data } = await this.repository.listActionSlugs(target.serviceClient, integrationId)
      return ((data ?? []) as Array<{ action_slug: string }>).map((r) => r.action_slug)
    } catch {
      return []
    }
  }

  async resolveLegacyIntegrationHttpRoute(
    target: Record<string, any>,
    integrationId: string,
    actionSlug: string,
    params: Record<string, unknown>,
  ): Promise<{
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    body?: Record<string, unknown>
  } | null> {
    const { data, error } = await this.repository.findRouteConfig(target.serviceClient, {
      integrationId,
      actionSlug,
    })

    if (error || !data) return null
    const cfg = parseRouteConfig((data as { route_config?: unknown }).route_config)
    if (!cfg) return null
    return buildLegacyIntegrationHttpRoute(cfg, params)
  }

  mapIntegrationIdToComposioToolkit(integrationId: string): string {
    const mapping: Record<string, string> = {
      google_drive: 'GOOGLEDRIVE',
      linkedin: 'LINKEDIN',
      instagram: 'INSTAGRAM',
      twitter: 'TWITTER',
      youtube: 'YOUTUBE',
      tiktok: 'TIKTOK',
      slack: 'SLACK',
      github: 'GITHUB',
      elevenlabs: 'ELEVENLABS',
    }
    return mapping[integrationId] ?? integrationId.toUpperCase()
  }
}
