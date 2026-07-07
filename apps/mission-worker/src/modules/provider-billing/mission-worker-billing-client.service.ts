import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export type MissionWorkerDirectTextUsage = {
  input: number
  output: number
  cacheRead?: number
  cacheWrite?: number
  totalTokens: number
}

@Injectable()
export class MissionWorkerBillingClientService {
  private readonly logger = new Logger(MissionWorkerBillingClientService.name)

  constructor(private readonly config: ConfigService) {}

  async chargeDirectTextUsage(params: {
    userId: string
    orgId?: string | null
    campaignId?: string | null
    conversationId?: string | null
    feature: string
    action: string
    modelName: string
    usage: MissionWorkerDirectTextUsage
    costSource: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    if (!params.userId) throw new Error('mission_worker_billing_missing_user')
    if ((params.usage.totalTokens ?? 0) <= 0) return

    const baseUrl = this.config.get<string>('missionApi.mainApiUrl') || ''
    const token = this.config.get<string>('missionApi.internalToken') || ''
    if (!baseUrl || !token) {
      throw new Error('mission_worker_billing_internal_api_not_configured')
    }

    const response = await fetch(
      `${baseUrl.replace(/\/$/, '')}/api/internal/billing/direct-text-usage`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _user_id: params.userId,
          _org_id: params.orgId ?? null,
          campaign_id: params.campaignId ?? null,
          conversation_id: params.conversationId ?? null,
          feature: params.feature,
          action: params.action,
          model_name: params.modelName,
          usage: {
            input: params.usage.input,
            output: params.usage.output,
            cacheRead: params.usage.cacheRead ?? 0,
            cacheWrite: params.usage.cacheWrite ?? 0,
            totalTokens: params.usage.totalTokens,
          },
          cost_source: params.costSource,
          metadata: params.metadata,
        }),
      },
    )

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      this.logger.error(
        `Mission worker billing failed status=${response.status} body=${body.slice(0, 500)}`,
      )
      throw new Error(`mission_worker_billing_failed:${response.status}`)
    }
  }
}

