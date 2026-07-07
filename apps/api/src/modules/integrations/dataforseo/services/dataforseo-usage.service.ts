import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ErrorReporter, reportAppError } from '@vibey/api-shared'
import { CreditsService } from '../../../billing/services/credits.service'
import {
  DATAFORSEO_ACTIONS,
  dataForSeoFallbackCostUsd,
  type DataForSeoActionSlug,
} from '../dataforseo.constants'
import type { DataForSeoTaskDto } from '../dto/dataforseo.dto'
import { DataForSeoApiService } from './dataforseo-api.service'

type DataForSeoBody = {
  status_code?: unknown
  status_message?: unknown
  cost?: unknown
  tasks?: Array<{ status_code?: unknown; status_message?: unknown; cost?: unknown }>
}

@Injectable()
export class DataForSeoUsageService {
  private readonly logger = new Logger(DataForSeoUsageService.name)

  constructor(
    private readonly api: DataForSeoApiService,
    private readonly credits: CreditsService,
    private readonly errorReporter: ErrorReporter,
  ) {}

  async run(
    userId: string,
    actionSlug: DataForSeoActionSlug,
    task: DataForSeoTaskDto,
    orgId?: string,
  ) {
    const action = DATAFORSEO_ACTIONS[actionSlug]
    const { status, body } = await this.api.forwardPost(
      action.upstreamPath,
      task as Record<string, unknown>,
    )

    if (status < 200 || status >= 300 || this.hasProviderFailure(body)) {
      const msg = this.extractProviderMessage(body, status)
      const httpStatus = status >= 200 && status < 300 ? HttpStatus.BAD_GATEWAY : status
      const httpError = new HttpException({ success: false, error: msg, status }, httpStatus)
      reportAppError(
        this.errorReporter,
        {
          app: process.env.APP_NAME ?? 'api',
          category: 'integration',
          feature: 'integrations/dataforseo',
          error_code:
            status >= 200 && status < 300 ? 'upstream_status_failed' : `upstream_http_${status}`,
          message: msg,
          user_id: userId,
          context: { actionSlug, upstreamPath: action.upstreamPath, status, orgId: orgId ?? null },
        },
        httpError,
      )
      throw httpError
    }

    const responseCost = this.extractProviderCost(body)
    const providerCost = responseCost ?? dataForSeoFallbackCostUsd(actionSlug)
    await this.chargeUsage({
      userId,
      orgId,
      actionSlug,
      providerCost,
      usedFallbackCost: responseCost === null,
    })

    return { success: true, action: actionSlug, data: body }
  }

  private isSuccessStatus(value: unknown): boolean {
    const code = Number(value)
    return Number.isFinite(code) && code >= 20000 && code < 30000
  }

  private extractProviderCost(body: unknown): number | null {
    if (!body || typeof body !== 'object') return null
    const responseBody = body as DataForSeoBody
    const topCost = Number(responseBody.cost)
    if (Number.isFinite(topCost) && topCost > 0) return topCost

    const taskCost = (responseBody.tasks ?? []).reduce((sum, task) => {
      const cost = Number(task.cost)
      return Number.isFinite(cost) && cost > 0 ? sum + cost : sum
    }, 0)
    return taskCost > 0 ? taskCost : null
  }

  private extractProviderMessage(body: unknown, status: number): string {
    if (!body || typeof body !== 'object') {
      return typeof body === 'string' ? body : `SEO Research error (${status})`
    }
    const responseBody = body as DataForSeoBody
    const taskMessage = responseBody.tasks?.find((task) => task.status_message)?.status_message
    return String(responseBody.status_message ?? taskMessage ?? `SEO Research error (${status})`)
  }

  private hasProviderFailure(body: unknown): boolean {
    if (!body || typeof body !== 'object') return false
    const responseBody = body as DataForSeoBody
    if (!this.isSuccessStatus(responseBody.status_code)) return true
    return (responseBody.tasks ?? []).some((task) => !this.isSuccessStatus(task.status_code))
  }

  private async chargeUsage(params: {
    userId: string
    orgId?: string
    actionSlug: DataForSeoActionSlug
    providerCost: number
    usedFallbackCost: boolean
  }) {
    try {
      await this.credits.processDirectTextUsage({
        userId: params.userId,
        orgId: params.orgId,
        feature: 'dataforseo',
        action: params.actionSlug,
        modelName: `dataforseo/${params.actionSlug}`,
        usage: {
          input: 1,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 1,
        },
        preComputedCost: params.providerCost,
        costSource: params.usedFallbackCost
          ? 'dataforseo_fallback_cost'
          : 'dataforseo_response_cost',
        metadata: {
          provider_cost_usd: params.providerCost,
          provider_cost_fallback: params.usedFallbackCost,
        },
      })
    } catch (err) {
      this.logger.warn(
        `dataforseo credit charge failed action=${params.actionSlug} user=${params.userId} err=${err instanceof Error ? err.message : String(err)}`,
      )
      throw err
    }
  }
}
