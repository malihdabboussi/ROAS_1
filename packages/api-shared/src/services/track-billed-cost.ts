/**
 * trackBilledCost — Universal wrapper for ANY cost-generating external API call.
 *
 * Wraps the call, routes billing to the correct CreditsService method based on
 * serviceType, and logs failures to billing_health_log so the admin dashboard
 * shows every missed charge.
 *
 * Usage: see .docs/.code_guidelines_cost.md for examples per service type.
 */

export type BilledServiceType = 'text' | 'image' | 'video' | 'audio' | 'fixed'

export interface TokenUsageData {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  totalTokens: number
}

export type CostData =
  | { type: 'text'; usage: TokenUsageData; providerCost?: number; generationIds?: string[] }
  | { type: 'image'; fixedCostUsd?: number }
  | { type: 'video'; fixedCostUsd: number }
  | { type: 'audio'; durationMinutes: number }
  | { type: 'fixed'; fixedCostUsd: number }

export interface TrackBilledCostOptions {
  feature: string
  action: string
  serviceType: BilledServiceType
  userId: string
  orgId?: string | null
  modelName: string
  provider?: string
  campaignId?: string
  conversationId?: string
  costSource?: string
  metadata?: Record<string, unknown>
}

export interface BilledCostResult<T> {
  result: T
  billingStatus: 'billed' | 'billing_failed' | 'no_cost_data'
  apiCost?: number
  creditsCharged?: number
}

export interface CreditsBillingAdapter {
  processDirectTextUsage(params: {
    userId: string
    orgId?: string | null
    campaignId?: string
    conversationId?: string
    feature: string
    action?: string
    modelName: string
    usage: TokenUsageData
    costSource?: string
    metadata?: Record<string, unknown>
    preComputedCost?: number
    generationIds?: string[]
  }): Promise<{ credits: number; balance: unknown; apiCost: number } | null>

  processImageUsage?(params: {
    userId: string
    orgId?: string | null
    campaignId?: string
    modelName?: string
  }): Promise<{ credits: number; balance: unknown; apiCost: number } | null>

  processFixedCostUsage?(params: {
    userId: string
    orgId?: string | null
    campaignId?: string
    conversationId?: string
    feature: string
    action: string
    provider: string
    modelName: string
    serviceType: 'image' | 'video'
    apiCostUsd: number
    costSource?: string
    metadata?: Record<string, unknown>
  }): Promise<{ credits: number; balance: unknown; apiCost: number }>

  processTranscribeUsage?(params: {
    userId: string
    orgId?: string | null
    durationMinutes: number
    modelName?: string
  }): Promise<{ credits: number; balance: unknown; apiCost: number } | null>
}

export interface HealthLogWriter {
  from(table: 'billing_health_log'): {
    insert(row: Record<string, unknown>): { then?: unknown }
  }
}

async function writeHealthLog(
  healthLog: HealthLogWriter | undefined,
  opts: TrackBilledCostOptions,
  reason: string,
  errorMessage?: string,
  usageJson?: unknown,
): Promise<void> {
  if (!healthLog) return
  try {
    await healthLog.from('billing_health_log').insert({
      feature: opts.feature,
      action: opts.action,
      user_id: opts.userId,
      model_name: opts.modelName,
      reason,
      error_message: errorMessage ?? null,
      usage_json: usageJson ?? null,
      metadata: {
        service_type: opts.serviceType,
        org_id: opts.orgId ?? null,
        campaign_id: opts.campaignId ?? null,
        conversation_id: opts.conversationId ?? null,
        ...(opts.metadata ?? {}),
      },
    })
  } catch {
    /* health logging itself must never block the caller */
  }
}

export async function trackBilledCost<T>(
  opts: TrackBilledCostOptions,
  fn: () => Promise<{ result: T; costData?: CostData }>,
  credits: CreditsBillingAdapter,
  healthLog?: HealthLogWriter,
): Promise<BilledCostResult<T>> {
  const { result, costData } = await fn()

  if (!costData) {
    await writeHealthLog(healthLog, opts, 'no_cost_data', 'Provider returned no usage/cost data')
    return { result, billingStatus: 'no_cost_data' }
  }

  try {
    let billingResult: { credits: number; apiCost: number } | null = null

    switch (costData.type) {
      case 'text': {
        billingResult = await credits.processDirectTextUsage({
          userId: opts.userId,
          orgId: opts.orgId ?? undefined,
          campaignId: opts.campaignId,
          conversationId: opts.conversationId,
          feature: opts.feature,
          action: opts.action,
          modelName: opts.modelName,
          usage: costData.usage,
          costSource:
            opts.costSource ??
            (costData.providerCost !== undefined ? 'provider_direct' : 'gateway_tokens'),
          preComputedCost: costData.providerCost,
          generationIds: costData.generationIds,
          metadata: opts.metadata,
        })
        break
      }

      case 'image': {
        if (costData.fixedCostUsd !== undefined && credits.processFixedCostUsage) {
          billingResult = await credits.processFixedCostUsage({
            userId: opts.userId,
            orgId: opts.orgId ?? undefined,
            campaignId: opts.campaignId,
            feature: opts.feature,
            action: opts.action,
            provider: opts.provider ?? 'google',
            modelName: opts.modelName,
            serviceType: 'image',
            apiCostUsd: costData.fixedCostUsd,
            costSource: opts.costSource ?? 'fixed_pricing',
            metadata: opts.metadata,
          })
        } else if (credits.processImageUsage) {
          billingResult = await credits.processImageUsage({
            userId: opts.userId,
            orgId: opts.orgId ?? undefined,
            campaignId: opts.campaignId,
            modelName: opts.modelName,
          })
        }
        break
      }

      case 'video': {
        if (credits.processFixedCostUsage) {
          billingResult = await credits.processFixedCostUsage({
            userId: opts.userId,
            orgId: opts.orgId ?? undefined,
            campaignId: opts.campaignId,
            feature: opts.feature,
            action: opts.action,
            provider: opts.provider ?? 'google',
            modelName: opts.modelName,
            serviceType: 'video',
            apiCostUsd: costData.fixedCostUsd,
            costSource: opts.costSource ?? 'fixed_pricing',
            metadata: opts.metadata,
          })
        }
        break
      }

      case 'audio': {
        if (credits.processTranscribeUsage) {
          billingResult = await credits.processTranscribeUsage({
            userId: opts.userId,
            orgId: opts.orgId ?? undefined,
            durationMinutes: costData.durationMinutes,
            modelName: opts.modelName,
          })
        }
        break
      }

      case 'fixed': {
        if (credits.processFixedCostUsage) {
          billingResult = await credits.processFixedCostUsage({
            userId: opts.userId,
            orgId: opts.orgId ?? undefined,
            campaignId: opts.campaignId,
            feature: opts.feature,
            action: opts.action,
            provider: opts.provider ?? 'unknown',
            modelName: opts.modelName,
            serviceType: 'image',
            apiCostUsd: costData.fixedCostUsd,
            costSource: opts.costSource ?? 'fixed_pricing',
            metadata: opts.metadata,
          })
        }
        break
      }
    }

    if (!billingResult) {
      await writeHealthLog(
        healthLog,
        opts,
        'billing_returned_null',
        `processUsage returned null for ${costData.type}`,
        costData,
      )
      return { result, billingStatus: 'billing_failed' }
    }

    return {
      result,
      billingStatus: 'billed',
      apiCost: billingResult.apiCost,
      creditsCharged: billingResult.credits,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await writeHealthLog(healthLog, opts, 'billing_failed', msg, costData)
    return { result, billingStatus: 'billing_failed' }
  }
}
