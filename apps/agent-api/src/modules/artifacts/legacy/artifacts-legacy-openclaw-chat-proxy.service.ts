import { HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { ErrorReporter } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { ArtifactsLegacyOpenClawGatewayClient } from '../integrations/artifacts-legacy-openclaw-gateway.client'
import { ArtifactsLegacyOpenClawCostService } from './artifacts-legacy-openclaw-cost.service'

type ResolveOrgId = (sessionKey?: string) => string | null

export class ArtifactsLegacyOpenClawChatProxyService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger,
    private readonly credits: CreditsService,
    private readonly cost: ArtifactsLegacyOpenClawCostService,
    private readonly errorReporter?: ErrorReporter,
    private readonly gatewayClient = new ArtifactsLegacyOpenClawGatewayClient(),
  ) {}

  async proxyOpenClawChatCompletions(
    body: Record<string, unknown>,
    sessionKey: string,
    gatewayAgentId: string,
    orgIdHeader: string | undefined,
    resolveOrgId: ResolveOrgId,
  ): Promise<unknown> {
    if (!sessionKey) throw new Error('x-session-key is required')
    if (!gatewayAgentId) throw new Error('x-openclaw-agent-id is required')

    const gatewayUrl = this.config.get<string>('OPENCLAW_GATEWAY_URL') || 'http://127.0.0.1:18789'
    const gatewayToken = this.config.get<string>('OPENCLAW_GATEWAY_TOKEN') || ''
    if (!gatewayToken) throw new Error('OPENCLAW_GATEWAY_TOKEN is not configured')

    const headers: Record<string, string> = {
      Authorization: `Bearer ${gatewayToken}`,
      'Content-Type': 'application/json',
      'x-openclaw-session-key': sessionKey,
      'x-openclaw-agent-id': gatewayAgentId,
    }
    const correlationId = body?.metadata
      ? ((body.metadata as Record<string, unknown>).correlation_id as string | undefined)
      : undefined
    if (typeof correlationId === 'string' && correlationId.trim().length > 0) {
      headers['x-correlation-id'] = correlationId
    }
    const resolvedOrgId =
      resolveOrgId(sessionKey) ??
      this.normalizeOrgId(orgIdHeader) ??
      this.normalizeOrgId((body?.metadata as Record<string, unknown> | undefined)?.org_id)
    if (resolvedOrgId) headers['x-org-id'] = resolvedOrgId

    const missionId = body?.metadata
      ? ((body.metadata as Record<string, unknown>).mission_id as string | undefined)
      : undefined
    const agentKey = body?.metadata
      ? ((body.metadata as Record<string, unknown>).agent_key as string | undefined)
      : undefined
    const modelName = (body?.model as string) || 'unknown'
    const userId = body?.metadata
      ? ((body.metadata as Record<string, unknown>).user_id as string | undefined)
      : undefined
    await this.assertOpenClawProxyCredits({ userId, orgId: resolvedOrgId })

    let response: Response
    try {
      response = await this.gatewayClient.postChatCompletions({
        gatewayUrl,
        headers,
        body,
        timeoutMs: this.gatewayFetchTimeoutMs(),
      })
    } catch (fetchErr) {
      this.reportOpenClawProxyFailure({
        scope: 'responses',
        errorCode: 'proxy_fetch_error',
        message: `Artifacts proxy fetch failed: ${(fetchErr as Error).message}`,
        severity: 'critical',
        missionId,
        correlationId,
        modelName,
        agentKey,
        userId,
        stack: fetchErr instanceof Error ? fetchErr.stack : undefined,
      })
      throw this.markAppErrorReported(
        fetchErr instanceof Error ? fetchErr : new Error(String(fetchErr)),
      )
    }
    const raw = await response.text().catch(() => '')
    if (!response.ok) {
      const msg = raw ? raw.slice(0, 500) : `Gateway returned ${response.status}`
      this.reportOpenClawProxyFailure({
        scope: 'responses',
        errorCode: `proxy_gateway_${response.status}`,
        message: `Artifacts proxy gateway ${response.status}: ${msg.slice(0, 200)}`,
        severity: response.status >= 500 ? 'error' : 'warn',
        missionId,
        correlationId,
        modelName,
        agentKey,
        statusCode: response.status,
        responseBody: raw.slice(0, 1000),
        userId,
      })
      if (response.status >= 500) {
        throw this.markAppErrorReported(
          new HttpException(
            {
              message: `Agent gateway error (${response.status}): ${msg}`,
              retryAfter: 10,
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          ),
        )
      }
      throw this.markAppErrorReported(
        new HttpException(
          { message: `Agent gateway error (${response.status}): ${msg}` },
          response.status,
        ),
      )
    }
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null

    if (parsed && userId) {
      void this.cost.logChatCompletionsUsage({
        parsed,
        body,
        headers,
        userId,
        orgId: resolvedOrgId,
        missionId,
        agentKey,
        sessionKey,
      })
    }

    return parsed ?? { success: true }
  }

  private gatewayFetchTimeoutMs(): number {
    const raw = this.config.get<string>('OPENCLAW_GATEWAY_FETCH_TIMEOUT_MS', '')
    const n = parseInt(raw || '5400000', 10)
    return Number.isFinite(n) && n > 0 ? n : 5_400_000
  }

  private markAppErrorReported<T extends Error>(error: T): T {
    ;(error as T & { __appErrorReported?: true }).__appErrorReported = true
    return error
  }

  private async assertOpenClawProxyCredits(params: {
    userId?: string
    orgId?: string | null
  }): Promise<void> {
    if (!params.userId?.trim()) return
    await this.credits.assertHasAvailableCredits(params.userId.trim(), params.orgId ?? null)
  }

  private reportOpenClawProxyFailure(params: {
    scope: 'responses'
    errorCode: string
    message: string
    severity?: 'error' | 'warn' | 'critical'
    missionId?: string
    correlationId?: string
    modelName?: string
    userId?: string
    agentKey?: string
    statusCode?: number
    responseBody?: string
    stack?: string
  }): void {
    this.errorReporter?.report({
      app: 'agent-api',
      severity: params.severity ?? 'error',
      feature: 'mission_proxy',
      error_code: params.errorCode,
      message: params.message,
      category: 'infra',
      context: {
        scope: params.scope,
        missionId: params.missionId ?? null,
        subtaskId: null,
        correlationId: params.correlationId ?? null,
        model: params.modelName ?? null,
        statusCode: params.statusCode ?? null,
        body: params.responseBody ?? null,
      },
      stack: params.stack,
      user_id: params.userId,
      agent_key: params.agentKey,
    })
  }

  private normalizeOrgId(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
}
