import type { ProviderBillingAttemptsService } from '../../billing/services/provider-billing-attempts.service'
import type { CompletedGenerationCostInput } from '../../chat/services/openrouter-cost.service'

export async function recordLegacyOpenClawProviderAttempts(params: {
  providerBillingAttempts?: ProviderBillingAttemptsService
  providerGenerations: CompletedGenerationCostInput[]
  aggregateCostUsd?: number
  aggregateUsage: {
    inputTokens: number
    outputTokens: number
    cacheRead: number
    cacheWrite: number
    totalTokens: number
  }
  userId: string
  orgId?: string | null
  feature: string
  action: string
  requestedModel: string
  missionId?: string
  agentKey?: string
  correlationId?: string
  streamed: boolean
}): Promise<boolean> {
  if (!params.providerBillingAttempts || params.providerGenerations.length === 0) return false
  const generations = params.providerGenerations.filter(
    (generation): generation is CompletedGenerationCostInput & { generationId: string } =>
      typeof generation.generationId === 'string',
  )
  if (generations.length !== params.providerGenerations.length) return false
  const singleGeneration = generations.length === 1
  const ownerType = params.orgId ? 'org' : params.userId ? 'personal' : 'platform'

  await params.providerBillingAttempts.recordAttempts(
    generations.map((generation) => {
      const usage = generation.usage
      const inputTokens =
        usage?.inputTokens ?? (singleGeneration ? params.aggregateUsage.inputTokens : null)
      const outputTokens =
        usage?.outputTokens ?? (singleGeneration ? params.aggregateUsage.outputTokens : null)
      const cacheReadTokens =
        usage?.cacheReadTokens ?? (singleGeneration ? params.aggregateUsage.cacheRead : null)
      const cacheWriteTokens =
        usage?.cacheWriteTokens ?? (singleGeneration ? params.aggregateUsage.cacheWrite : null)
      const totalTokens =
        inputTokens == null || outputTokens == null
          ? singleGeneration
            ? params.aggregateUsage.totalTokens
            : null
          : inputTokens + outputTokens

      return {
        attemptKey: `openclaw-legacy:${generation.generationId}`,
        sourceApp: 'agent-api',
        sourcePath: 'artifacts/openclaw-responses',
        billingOwnerType: ownerType,
        userId: params.userId,
        orgId: params.orgId ?? null,
        feature: params.feature,
        action: params.action,
        serviceType: 'text',
        provider: 'openrouter',
        requestedModel: params.requestedModel,
        resolvedModel: generation.modelId ?? params.requestedModel,
        providerGenerationId: generation.generationId,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheWriteTokens,
        totalTokens,
        providerCostUsd:
          generation.providerCost ?? (singleGeneration ? (params.aggregateCostUsd ?? null) : null),
        metadata: {
          mission_id: params.missionId,
          correlation_id: params.correlationId,
          agent_key: params.agentKey,
          streamed: params.streamed,
          workload: params.feature,
          legacy_direct_billing_replaced: true,
        },
      }
    }),
  )
  return true
}
