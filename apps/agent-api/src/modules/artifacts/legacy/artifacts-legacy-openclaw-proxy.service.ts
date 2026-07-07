import { Readable } from 'stream'
import { HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import type { ErrorReporter } from '@vibey/api-shared'
import { CreditsService } from '../../billing/services/credits.service'
import { ArtifactsLegacyOpenClawGatewayClient } from '../integrations/artifacts-legacy-openclaw-gateway.client'
import { ArtifactsLegacyOpenClawChatProxyService } from './artifacts-legacy-openclaw-chat-proxy.service'
import { ArtifactsLegacyOpenClawCostService } from './artifacts-legacy-openclaw-cost.service'

type ResolveOrgId = (sessionKey?: string) => string | null
type HopHeaders = { correlationId?: string; missionId?: string; subtaskId?: string; orgId?: string }
type UpstreamTrace = { sentryTrace?: string; baggage?: string }

export class ArtifactsLegacyOpenClawProxyService {
  private readonly chatProxy: ArtifactsLegacyOpenClawChatProxyService

  constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger,
    private readonly credits: CreditsService,
    private readonly cost: ArtifactsLegacyOpenClawCostService,
    private readonly errorReporter?: ErrorReporter,
    private readonly gatewayClient = new ArtifactsLegacyOpenClawGatewayClient(),
  ) {
    this.chatProxy = new ArtifactsLegacyOpenClawChatProxyService(
      this.config,
      this.logger,
      this.credits,
      this.cost,
      this.errorReporter,
      this.gatewayClient,
    )
  }

  async proxyOpenClawChatCompletions(
    body: Record<string, unknown>,
    sessionKey: string,
    gatewayAgentId: string,
    orgIdHeader: string | undefined,
    resolveOrgId: ResolveOrgId,
  ): Promise<unknown> {
    return this.chatProxy.proxyOpenClawChatCompletions(
      body,
      sessionKey,
      gatewayAgentId,
      orgIdHeader,
      resolveOrgId,
    )
  }

  async proxyOpenClawResponsesStream(
    res: import('express').Response,
    body: Record<string, unknown>,
    sessionKey: string,
    gatewayAgentId: string,
    hop: HopHeaders | undefined,
    upstreamTrace: UpstreamTrace | undefined,
    resolveOrgId: ResolveOrgId,
  ): Promise<void> {
    if (!sessionKey) throw new Error('x-session-key is required')
    if (!gatewayAgentId) throw new Error('x-openclaw-agent-id is required')

    const gatewayUrl = this.config.get<string>('OPENCLAW_GATEWAY_URL') || 'http://127.0.0.1:18789'
    const gatewayToken = this.config.get<string>('OPENCLAW_GATEWAY_TOKEN') || ''
    if (!gatewayToken) throw new Error('OPENCLAW_GATEWAY_TOKEN is not configured')

    const headers = this.buildOpenClawResponsesProxyHeaders(
      body,
      sessionKey,
      gatewayAgentId,
      hop,
      upstreamTrace,
      resolveOrgId,
    )

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
    const resolvedOrgId =
      resolveOrgId(sessionKey) ??
      this.normalizeOrgId(hop?.orgId) ??
      this.normalizeOrgId((body?.metadata as Record<string, unknown> | undefined)?.org_id)
    await this.assertOpenClawProxyCredits({ userId, orgId: resolvedOrgId })

    let response: Response
    try {
      response = await this.gatewayClient.postResponses({
        gatewayUrl,
        headers,
        body,
        timeoutMs: this.gatewayFetchTimeoutMs(),
      })
    } catch (fetchErr) {
      this.logger.error(
        `[openclaw_proxy_stream] hop=agent-api->gateway correlation_id=${headers['x-correlation-id'] || ''} mission_id=${missionId || ''} subtask_id=${headers['x-subtask-id'] || ''} ${(fetchErr as Error).message}`,
      )
      this.reportOpenClawProxyFailure({
        scope: 'responses_stream',
        errorCode: 'gateway_connection',
        severity: 'critical',
        message: `Mission gateway connection error: ${(fetchErr as Error).message}`,
        missionId,
        subtaskId: headers['x-subtask-id'],
        correlationId: headers['x-correlation-id'],
        modelName,
        userId,
        agentKey: agentKey ?? gatewayAgentId,
        stack: fetchErr instanceof Error ? fetchErr.stack : undefined,
      })
      if (fetchErr instanceof Error) {
        throw this.markAppErrorReported(fetchErr)
      }
      throw fetchErr
    }

    let raw = ''
    if (!response.ok) {
      raw = await response.text().catch(() => '')
      if (
        response.status === 400 &&
        this.hasOpenClawCompatibilityFields(body) &&
        this.isUnsupportedGatewayPayloadError(raw)
      ) {
        this.logger.warn(
          '[openclaw_proxy_stream] Gateway rejected compatibility payload keys; retrying without them',
        )
        response = await this.gatewayClient.postResponses({
          gatewayUrl,
          headers,
          body: this.stripOpenClawCompatibilityFields(body),
          timeoutMs: this.gatewayFetchTimeoutMs(),
        })
        raw = response.ok ? '' : await response.text().catch(() => '')
      }
    }

    if (!response.ok) {
      const msg = raw ? raw.slice(0, 500) : `Gateway returned ${response.status}`
      this.reportOpenClawProxyFailure({
        scope: 'responses_stream',
        errorCode: `gateway_${response.status}`,
        message: `Mission gateway error (${response.status})`,
        missionId,
        subtaskId: headers['x-subtask-id'],
        correlationId: headers['x-correlation-id'],
        modelName,
        userId,
        agentKey: agentKey ?? gatewayAgentId,
        statusCode: response.status,
        responseBody: raw.slice(0, 1000),
      })
      if (response.status >= 500) {
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          message: `Agent gateway error (${response.status}): ${msg}`,
          retryAfter: 10,
        })
        return
      }
      res
        .status(response.status)
        .json({ message: `Agent gateway error (${response.status}): ${msg}` })
      return
    }

    const ct = response.headers.get('content-type')
    if (ct) res.setHeader('content-type', ct)
    res.status(response.status)

    const webBody = response.body
    if (!webBody) {
      res.end()
      return
    }

    const nodeStream = Readable.fromWeb(webBody as import('stream/web').ReadableStream)

    let sseBuffer = ''
    let completedResponse: Record<string, unknown> | null = null
    nodeStream.on('data', (chunk: Buffer) => {
      sseBuffer += chunk.toString()
      let boundary = sseBuffer.indexOf('\n\n')
      while (boundary >= 0) {
        const eventBlock = sseBuffer.slice(0, boundary)
        sseBuffer = sseBuffer.slice(boundary + 2)
        const responseFromEvent = this.extractCompletedOpenClawSseResponse(eventBlock)
        if (responseFromEvent) {
          completedResponse = responseFromEvent
        }
        boundary = sseBuffer.indexOf('\n\n')
      }
    })

    await new Promise<void>((resolve, reject) => {
      let settled = false
      const resolveOnce = () => {
        if (settled) return
        settled = true

        if (userId && completedResponse) {
          void this.cost.logOpenClawResponseUsage({
            completedResponse,
            userId,
            orgId: resolvedOrgId,
            missionId,
            agentKey,
            correlationId: headers['x-correlation-id'],
            sessionKey,
            streamed: true,
          })
        } else if (userId) {
          const labels = this.cost.resolveUsageLabels({ missionId, agentKey, sessionKey })
          void this.cost.writeBillingHealthLog({
            feature: labels.feature,
            action: labels.action,
            userId,
            modelName,
            reason: 'proxy_missing_completed_response',
            metadata: {
              proxy: 'responses_stream',
              mission_id: missionId,
              correlation_id: headers['x-correlation-id'],
            },
          })
        }

        resolve()
      }
      nodeStream.on('error', (e) => {
        reject(e)
      })
      res.on('error', (e) => {
        reject(e)
      })
      res.on('finish', resolveOnce)
      res.on('close', resolveOnce)
      nodeStream.pipe(res)
    })
  }

  async proxyOpenClawResponses(
    body: Record<string, unknown>,
    sessionKey: string,
    gatewayAgentId: string,
    hop: HopHeaders | undefined,
    upstreamTrace: UpstreamTrace | undefined,
    resolveOrgId: ResolveOrgId,
  ): Promise<unknown> {
    if (!sessionKey) throw new Error('x-session-key is required')
    if (!gatewayAgentId) throw new Error('x-openclaw-agent-id is required')

    const gatewayUrl = this.config.get<string>('OPENCLAW_GATEWAY_URL') || 'http://127.0.0.1:18789'
    const gatewayToken = this.config.get<string>('OPENCLAW_GATEWAY_TOKEN') || ''
    if (!gatewayToken) throw new Error('OPENCLAW_GATEWAY_TOKEN is not configured')

    const headers = this.buildOpenClawResponsesProxyHeaders(
      body,
      sessionKey,
      gatewayAgentId,
      hop,
      upstreamTrace,
      resolveOrgId,
    )

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
    const preflightOrgId =
      resolveOrgId(sessionKey) ??
      this.normalizeOrgId(hop?.orgId) ??
      this.normalizeOrgId((body?.metadata as Record<string, unknown> | undefined)?.org_id)
    await this.assertOpenClawProxyCredits({ userId, orgId: preflightOrgId })

    let response: Response
    try {
      response = await this.gatewayClient.postResponses({
        gatewayUrl,
        headers,
        body,
        timeoutMs: this.gatewayFetchTimeoutMs(),
      })
    } catch (fetchErr) {
      this.logger.error(
        `[openclaw_proxy] hop=agent-api->gateway correlation_id=${headers['x-correlation-id'] || ''} mission_id=${missionId || ''} subtask_id=${headers['x-subtask-id'] || ''} ${(fetchErr as Error).message}`,
      )
      this.reportOpenClawProxyFailure({
        scope: 'responses',
        errorCode: 'gateway_connection',
        severity: 'critical',
        message: `Mission gateway connection error: ${(fetchErr as Error).message}`,
        missionId,
        subtaskId: headers['x-subtask-id'],
        correlationId: headers['x-correlation-id'],
        modelName,
        userId,
        agentKey: agentKey ?? gatewayAgentId,
        stack: fetchErr instanceof Error ? fetchErr.stack : undefined,
      })
      if (fetchErr instanceof Error) {
        throw this.markAppErrorReported(fetchErr)
      }
      throw fetchErr
    }
    let raw = await response.text().catch(() => '')
    if (
      !response.ok &&
      response.status === 400 &&
      this.hasOpenClawCompatibilityFields(body) &&
      this.isUnsupportedGatewayPayloadError(raw)
    ) {
      this.logger.warn(
        '[openclaw_proxy] Gateway rejected compatibility payload keys; retrying without them',
      )
      response = await this.gatewayClient.postResponses({
        gatewayUrl,
        headers,
        body: this.stripOpenClawCompatibilityFields(body),
        timeoutMs: this.gatewayFetchTimeoutMs(),
      })
      raw = await response.text().catch(() => '')
    }
    if (!response.ok) {
      const msg = raw ? raw.slice(0, 500) : `Gateway returned ${response.status}`
      this.logger.error(
        `[openclaw_proxy] hop=agent-api->gateway correlation_id=${headers['x-correlation-id'] || ''} mission_id=${missionId || ''} subtask_id=${headers['x-subtask-id'] || ''} status=${response.status} ${msg.slice(0, 200)}`,
      )
      this.reportOpenClawProxyFailure({
        scope: 'responses',
        errorCode: `gateway_${response.status}`,
        message: `Mission gateway error (${response.status})`,
        missionId,
        subtaskId: headers['x-subtask-id'],
        correlationId: headers['x-correlation-id'],
        modelName,
        userId,
        agentKey: agentKey ?? gatewayAgentId,
        statusCode: response.status,
        responseBody: raw.slice(0, 1000),
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
          {
            message: `Agent gateway error (${response.status}): ${msg}`,
          },
          response.status,
        ),
      )
    }
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null

    if (parsed && userId) {
      const resolvedOrgId =
        resolveOrgId(sessionKey) ??
        this.normalizeOrgId(hop?.orgId) ??
        this.normalizeOrgId((body?.metadata as Record<string, unknown> | undefined)?.org_id)
      void this.cost.logOpenClawResponseUsage({
        completedResponse: parsed,
        userId,
        orgId: resolvedOrgId,
        missionId,
        agentKey,
        correlationId: headers['x-correlation-id'],
        sessionKey,
        streamed: false,
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

  private hasOpenClawCompatibilityFields(body: Record<string, unknown>): boolean {
    return (
      Object.prototype.hasOwnProperty.call(body, 'lane') ||
      Object.prototype.hasOwnProperty.call(body, 'enabled_toolkits') ||
      Object.prototype.hasOwnProperty.call(body, 'disabled_native_actions') ||
      Object.prototype.hasOwnProperty.call(body, 'skill_catalog')
    )
  }

  private stripOpenClawCompatibilityFields(body: Record<string, unknown>): Record<string, unknown> {
    const fallbackBody = { ...body }
    delete fallbackBody.lane
    delete fallbackBody.enabled_toolkits
    delete fallbackBody.disabled_native_actions
    delete fallbackBody.skill_catalog
    return fallbackBody
  }

  private isUnsupportedGatewayPayloadError(raw: string): boolean {
    const normalized = raw.toLowerCase()
    return (
      normalized.includes('unrecognized key') ||
      normalized.includes('unknown field') ||
      normalized.includes('extra inputs are not permitted')
    )
  }

  private reportOpenClawProxyFailure(params: {
    scope: 'responses_stream' | 'responses'
    errorCode: string
    message: string
    severity?: 'error' | 'warn' | 'critical'
    missionId?: string
    subtaskId?: string
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
        subtaskId: params.subtaskId ?? null,
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

  private buildOpenClawResponsesProxyHeaders(
    body: Record<string, unknown>,
    sessionKey: string,
    gatewayAgentId: string,
    hop: HopHeaders | undefined,
    upstreamTrace: UpstreamTrace | undefined,
    resolveOrgId: ResolveOrgId,
  ): Record<string, string> {
    const gatewayToken = this.config.get<string>('OPENCLAW_GATEWAY_TOKEN') || ''
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
    const orgId =
      resolveOrgId(sessionKey) ??
      this.normalizeOrgId(hop?.orgId) ??
      this.normalizeOrgId((body?.metadata as Record<string, unknown> | undefined)?.org_id)
    if (hop?.correlationId?.trim()) headers['x-correlation-id'] = hop.correlationId.trim()
    if (hop?.missionId?.trim()) headers['x-mission-id'] = hop.missionId.trim()
    if (hop?.subtaskId?.trim()) headers['x-subtask-id'] = hop.subtaskId.trim()
    if (orgId) headers['x-org-id'] = orgId
    const st = upstreamTrace?.sentryTrace?.trim()
    if (st) headers['sentry-trace'] = st
    const bg = upstreamTrace?.baggage?.trim()
    if (bg) headers['baggage'] = bg
    return headers
  }

  private extractCompletedOpenClawSseResponse(eventBlock: string): Record<string, unknown> | null {
    const dataText = eventBlock
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim()
    if (!dataText || dataText === '[DONE]') return null

    try {
      const data = JSON.parse(dataText) as Record<string, unknown>
      if (
        (data.type === 'response.completed' || data.type === 'response.failed') &&
        data.response &&
        typeof data.response === 'object'
      ) {
        return data.response as Record<string, unknown>
      }
    } catch {
      return null
    }

    return null
  }

  private normalizeOrgId(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
}
