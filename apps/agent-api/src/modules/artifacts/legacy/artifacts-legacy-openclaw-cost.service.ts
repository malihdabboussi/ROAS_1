import { Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CreditsService } from '../../billing/services/credits.service'
import type { ProviderBillingAttemptsService } from '../../billing/services/provider-billing-attempts.service'
import {
  OpenRouterCostService,
  type CompletedGenerationCostInput,
  type CostSource,
} from '../../chat/services/openrouter-cost.service'
import { ArtifactLegacyRepository } from '../repositories/artifact-legacy.repository'
import { recordLegacyOpenClawProviderAttempts } from './artifacts-legacy-openclaw-billing-attempts'

export class ArtifactsLegacyOpenClawCostService {
  constructor(
    private readonly credits: CreditsService,
    private readonly legacyRepository: ArtifactLegacyRepository,
    private readonly serviceClient: SupabaseClient,
    private readonly logger: Logger,
    private readonly openRouterCostService?: OpenRouterCostService,
    private readonly providerBillingAttempts?: ProviderBillingAttemptsService,
  ) {}

  resolveUsageLabels(params: {
    missionId?: string
    agentKey?: string
    sessionKey?: string
    workloadChannel?: unknown
    workloadAction?: unknown
  }): {
    feature: string
    action: string
  } {
    const workloadAction =
      typeof params.workloadAction === 'string' && params.workloadAction.trim()
        ? params.workloadAction
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
        : null
    if (params.workloadChannel === 'brain-ops') {
      return { feature: 'brain', action: workloadAction || 'execute' }
    }
    if (params.workloadChannel === 'dream-ops') {
      return { feature: 'dream', action: workloadAction || 'execute' }
    }
    const agentAction = params.agentKey?.trim() || 'execute'
    if (params.sessionKey?.includes('-brain-job-')) {
      return { feature: 'brain', action: agentAction }
    }
    if (params.missionId?.trim()) {
      return { feature: 'mission', action: workloadAction || agentAction }
    }
    return { feature: 'agent_chat', action: agentAction }
  }

  async logChatCompletionsUsage(params: {
    parsed: Record<string, unknown>
    body: Record<string, unknown>
    headers: Record<string, string>
    userId: string
    orgId?: string | null
    missionId?: string
    agentKey?: string
    sessionKey: string
  }): Promise<void> {
    const usageData = params.parsed.usage as
      | {
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          prompt_tokens_details?: { cached_tokens?: number }
        }
      | undefined
    const modelName = (params.parsed.model as string) || (params.body?.model as string) || 'unknown'
    const inputTokens = usageData?.prompt_tokens ?? 0
    const outputTokens = usageData?.completion_tokens ?? 0
    const cacheReadTokens = usageData?.prompt_tokens_details?.cached_tokens ?? 0
    const totalTokens = usageData?.total_tokens ?? inputTokens + outputTokens
    if (totalTokens <= 0) return

    const meta = (params.parsed.metadata ?? {}) as Record<string, unknown>
    const labels = this.resolveUsageLabels({
      missionId: params.missionId,
      agentKey: params.agentKey,
      sessionKey: params.sessionKey,
      workloadChannel: meta.workload_channel,
      workloadAction: meta.workload_action,
    })

    try {
      const costResult = await this.resolveProviderCost(meta, modelName)
      if (costResult.costUsd === undefined || !costResult.costSource) {
        await this.writeBillingHealthLog({
          feature: labels.feature,
          action: labels.action,
          userId: params.userId,
          modelName,
          reason: 'openrouter_provider_cost_missing',
          usageJson: { input: inputTokens, output: outputTokens, cacheReadTokens, totalTokens },
          metadata: {
            proxy: 'chat_completions',
            mission_id: params.missionId,
            correlation_id: params.headers['x-correlation-id'],
            provider_generation_ids: costResult.generationIds,
            provider_generations_count: costResult.providerGenerations.length,
          },
        })
        return
      }

      await this.credits.processDirectTextUsage({
        userId: params.userId,
        orgId: params.orgId ?? undefined,
        feature: labels.feature,
        action: labels.action,
        modelName,
        usage: {
          input: Math.max(0, inputTokens - cacheReadTokens),
          output: outputTokens,
          cacheRead: cacheReadTokens,
          cacheWrite: 0,
          totalTokens,
        },
        costSource: costResult.costSource,
        preComputedCost: costResult.costUsd,
        generationIds: costResult.generationIds,
        metadata: {
          mission_id: params.missionId,
          correlation_id: params.headers['x-correlation-id'],
          agent_key: params.agentKey,
          provider_billing: 'openrouter',
          provider_cost: costResult.costUsd,
          provider_generation_ids: costResult.generationIds,
        },
      })
    } catch (err) {
      this.logger.warn(`Mission usage tracking failed: ${err}`)
      await this.writeBillingHealthLog({
        feature: labels.feature,
        action: labels.action,
        userId: params.userId,
        modelName,
        reason: 'proxy_billing_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
        usageJson: { input: inputTokens, output: outputTokens, totalTokens },
        metadata: { proxy: 'chat_completions', mission_id: params.missionId },
      })
      throw err
    }
  }

  async writeBillingHealthLog(params: {
    feature: string
    action: string
    userId?: string
    modelName: string
    reason: string
    errorMessage?: string
    usageJson?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }): Promise<void> {
    try {
      await this.legacyRepository.insertBillingHealthLog(this.serviceClient, params)
    } catch {
      // Billing-health logging must not break the user-facing proxy response.
    }
  }

  async logOpenClawResponseUsage(params: {
    completedResponse: Record<string, unknown>
    userId: string
    orgId?: string | null
    missionId?: string
    agentKey?: string
    correlationId?: string
    sessionKey: string
    streamed: boolean
  }): Promise<void> {
    const { completedResponse, userId, orgId, missionId, agentKey, correlationId, sessionKey } =
      params
    const rawModelName = (completedResponse.model as string) || 'unknown'
    const meta = (completedResponse.metadata ?? {}) as Record<string, unknown>
    const labels = this.resolveUsageLabels({
      missionId,
      agentKey,
      sessionKey,
      workloadChannel: meta.workload_channel,
      workloadAction: meta.workload_action,
    })
    const usage = completedResponse.usage as
      | {
          input_tokens?: number
          output_tokens?: number
          total_tokens?: number
          cache_read_input_tokens?: number
          cache_creation_input_tokens?: number
        }
      | undefined

    if (!usage) {
      await this.writeBillingHealthLog({
        feature: labels.feature,
        action: labels.action,
        userId,
        modelName: rawModelName,
        reason: 'proxy_missing_usage',
        metadata: {
          proxy: params.streamed ? 'responses_stream' : 'responses',
          mission_id: missionId,
        },
      })
      return
    }

    const cacheRead = usage.cache_read_input_tokens ?? 0
    const cacheWrite = usage.cache_creation_input_tokens ?? 0
    const inputTokens = usage.input_tokens ?? 0
    const outputTokens = usage.output_tokens ?? 0
    const totalTokens = usage.total_tokens ?? inputTokens + cacheRead + cacheWrite + outputTokens
    if (totalTokens <= 0) return

    const providerGenerations = this.providerGenerationsFromMetadata(meta, rawModelName)
    try {
      if (
        await recordLegacyOpenClawProviderAttempts({
          providerBillingAttempts: this.providerBillingAttempts,
          providerGenerations,
          aggregateCostUsd: this.finiteNumber(meta.provider_cost),
          aggregateUsage: { inputTokens, outputTokens, cacheRead, cacheWrite, totalTokens },
          userId,
          orgId,
          feature: labels.feature,
          action: labels.action,
          requestedModel: rawModelName,
          missionId,
          agentKey,
          correlationId,
          streamed: params.streamed,
        })
      ) {
        return
      }
    } catch (err) {
      await this.writeBillingHealthLog({
        feature: labels.feature,
        action: labels.action,
        userId,
        modelName: rawModelName,
        reason: 'provider_attempt_write_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
        usageJson: { input: inputTokens, output: outputTokens, cacheRead, cacheWrite, totalTokens },
        metadata: {
          proxy: params.streamed ? 'responses_stream' : 'responses',
          mission_id: missionId,
          correlation_id: correlationId,
          provider_generation_ids: providerGenerations
            .map((generation) => generation.generationId)
            .filter(Boolean),
        },
      })
      return
    }

    let costResult: {
      costUsd?: number
      costSource?: CostSource
      generationIds: string[]
      providerGenerations: CompletedGenerationCostInput[]
    }
    try {
      costResult = await this.resolveProviderCost(meta, rawModelName)
    } catch (err) {
      await this.writeBillingHealthLog({
        feature: labels.feature,
        action: labels.action,
        userId,
        modelName: rawModelName,
        reason: 'openrouter_cost_lookup_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
        usageJson: { input: inputTokens, output: outputTokens, cacheRead, cacheWrite, totalTokens },
        metadata: {
          proxy: params.streamed ? 'responses_stream' : 'responses',
          mission_id: missionId,
          correlation_id: correlationId,
        },
      })
      return
    }

    if (costResult.costUsd === undefined || !costResult.costSource) {
      await this.writeBillingHealthLog({
        feature: labels.feature,
        action: labels.action,
        userId,
        modelName: rawModelName,
        reason: 'openrouter_provider_cost_missing',
        usageJson: { input: inputTokens, output: outputTokens, cacheRead, cacheWrite, totalTokens },
        metadata: {
          proxy: params.streamed ? 'responses_stream' : 'responses',
          mission_id: missionId,
          correlation_id: correlationId,
          agent_key: agentKey,
          provider_generation_ids: costResult.generationIds,
          provider_generations_count: costResult.providerGenerations.length,
        },
      })
      return
    }

    try {
      await this.credits.processDirectTextUsage({
        userId,
        orgId: orgId ?? undefined,
        feature: labels.feature,
        action: labels.action,
        modelName: rawModelName,
        usage: { input: inputTokens, output: outputTokens, cacheRead, cacheWrite, totalTokens },
        costSource: costResult.costSource,
        preComputedCost: costResult.costUsd,
        generationIds: costResult.generationIds,
        metadata: {
          mission_id: missionId,
          correlation_id: correlationId,
          agent_key: agentKey,
          streamed: params.streamed,
          provider_billing: 'openrouter',
          provider_cost: costResult.costUsd,
          provider_generation_ids: costResult.generationIds,
          provider_generations_count: costResult.providerGenerations.length,
        },
      })
    } catch (err) {
      this.logger.warn(`Mission usage tracking failed: ${err}`)
      await this.writeBillingHealthLog({
        feature: labels.feature,
        action: labels.action,
        userId,
        modelName: rawModelName,
        reason: 'proxy_billing_failed',
        errorMessage: err instanceof Error ? err.message : String(err),
        usageJson: { input: inputTokens, output: outputTokens, cacheRead, cacheWrite, totalTokens },
        metadata: {
          proxy: params.streamed ? 'responses_stream' : 'responses',
          mission_id: missionId,
          correlation_id: correlationId,
        },
      })
      throw err
    }
  }

  private finiteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }

  private openRouterGenerationId(value: unknown): string | undefined {
    return typeof value === 'string' && /^gen[-_]/.test(value) ? value : undefined
  }

  private providerGenerationIdsFromMetadata(meta: Record<string, unknown>): string[] {
    const ids = new Set<string>()
    const collect = (value: unknown) => {
      const id = this.openRouterGenerationId(value)
      if (id) ids.add(id)
    }

    for (const key of ['provider_generation_ids', 'generation_ids']) {
      const raw = meta[key]
      if (Array.isArray(raw)) raw.forEach(collect)
    }
    collect(meta.provider_response_id)

    const generations = Array.isArray(meta.provider_generations) ? meta.provider_generations : []
    for (const generation of generations) {
      if (!generation || typeof generation !== 'object') continue
      const record = generation as Record<string, unknown>
      collect(record.generationId)
      collect(record.generation_id)
      collect(record.providerResponseId)
      collect(record.provider_response_id)
      collect(record.id)
    }

    return [...ids]
  }

  private costInputFromProviderGeneration(
    generation: Record<string, unknown>,
    fallbackModelId: string,
  ): CompletedGenerationCostInput {
    const usage =
      generation.usage && typeof generation.usage === 'object'
        ? (generation.usage as Record<string, unknown>)
        : {}
    const input = this.finiteNumber(
      usage.input ?? usage.input_tokens ?? usage.inputTokens ?? usage.prompt_tokens,
    )
    const output = this.finiteNumber(
      usage.output ?? usage.output_tokens ?? usage.outputTokens ?? usage.completion_tokens,
    )
    const cacheRead = this.finiteNumber(
      usage.cacheRead ?? usage.cache_read ?? usage.cache_read_input_tokens,
    )
    const cacheWrite = this.finiteNumber(
      usage.cacheWrite ?? usage.cache_write ?? usage.cache_creation_input_tokens,
    )
    const rawModel =
      typeof generation.model === 'string'
        ? generation.model
        : typeof generation.modelId === 'string'
          ? generation.modelId
          : fallbackModelId

    const providerCost =
      this.finiteNumber(generation.providerCost) ?? this.finiteNumber(generation.provider_cost)
    const costInput: CompletedGenerationCostInput = {
      generationId:
        this.openRouterGenerationId(generation.generationId) ??
        this.openRouterGenerationId(generation.generation_id) ??
        this.openRouterGenerationId(generation.providerResponseId) ??
        this.openRouterGenerationId(generation.provider_response_id) ??
        this.openRouterGenerationId(generation.id),
      modelId: rawModel.replace(/^openrouter\//, ''),
    }

    if (
      input !== undefined ||
      output !== undefined ||
      cacheRead !== undefined ||
      cacheWrite !== undefined
    ) {
      costInput.usage = {
        inputTokens: (input ?? 0) + (cacheRead ?? 0) + (cacheWrite ?? 0),
        outputTokens: output ?? 0,
        cacheReadTokens: cacheRead ?? 0,
        cacheWriteTokens: cacheWrite ?? 0,
      }
    }
    if (this.isUsableProviderCost(providerCost, rawModel, costInput.usage)) {
      costInput.providerCost = providerCost
    }

    return costInput
  }

  private providerGenerationsFromMetadata(
    meta: Record<string, unknown>,
    fallbackModelId: string,
  ): CompletedGenerationCostInput[] {
    const generations = Array.isArray(meta.provider_generations) ? meta.provider_generations : []
    const indexedGenerationIds = [
      ...(Array.isArray(meta.provider_generation_ids) ? meta.provider_generation_ids : []),
      ...(Array.isArray(meta.generation_ids) ? meta.generation_ids : []),
    ]
      .map((value) => this.openRouterGenerationId(value))
      .filter((value): value is string => typeof value === 'string')
    const costInputs = generations
      .filter((generation): generation is Record<string, unknown> => {
        return Boolean(generation && typeof generation === 'object')
      })
      .map((generation, index) => {
        const costInput = this.costInputFromProviderGeneration(generation, fallbackModelId)
        return {
          ...costInput,
          generationId: costInput.generationId ?? indexedGenerationIds[index],
        }
      })

    const seen = new Set(costInputs.map((generation) => generation.generationId).filter(Boolean))
    for (const generationId of this.providerGenerationIdsFromMetadata(meta)) {
      if (seen.has(generationId)) continue
      seen.add(generationId)
      costInputs.push({ generationId, modelId: fallbackModelId.replace(/^openrouter\//, '') })
    }

    return costInputs
  }

  private async resolveProviderCost(
    meta: Record<string, unknown>,
    modelName: string,
  ): Promise<{
    costUsd?: number
    costSource?: CostSource
    generationIds: string[]
    providerGenerations: CompletedGenerationCostInput[]
  }> {
    const providerGenerations = this.providerGenerationsFromMetadata(meta, modelName)
    const generationIds = [
      ...new Set([
        ...this.providerGenerationIdsFromMetadata(meta),
        ...providerGenerations
          .map((generation) => generation.generationId)
          .filter((id): id is string => typeof id === 'string'),
      ]),
    ]

    const metadataCost = this.finiteNumber(meta.provider_cost)
    if (this.isUsableProviderCost(metadataCost, modelName, undefined)) {
      return {
        costUsd: metadataCost,
        costSource: 'provider_direct',
        generationIds,
        providerGenerations,
      }
    }

    const directCosts = providerGenerations
      .map((generation) =>
        this.isUsableProviderCost(
          generation.providerCost,
          generation.modelId ?? modelName,
          generation.usage,
        )
          ? generation.providerCost
          : undefined,
      )
      .filter((cost): cost is number => cost !== undefined)
    if (providerGenerations.length > 0 && directCosts.length === providerGenerations.length) {
      return {
        costUsd:
          Math.round(directCosts.reduce((sum, cost) => sum + cost, 0) * 1_000_000) / 1_000_000,
        costSource: 'provider_direct',
        generationIds,
        providerGenerations,
      }
    }

    if (this.openRouterCostService && providerGenerations.length > 0) {
      const summed = await this.openRouterCostService.sumGenerationCosts(
        providerGenerations,
        modelName,
      )
      if (summed.totalUsd !== undefined) {
        return {
          costUsd: summed.totalUsd,
          costSource: summed.costSource,
          generationIds: summed.generationIds.length > 0 ? summed.generationIds : generationIds,
          providerGenerations,
        }
      }
      return {
        generationIds: summed.generationIds.length > 0 ? summed.generationIds : generationIds,
        providerGenerations,
      }
    }

    return { generationIds, providerGenerations }
  }

  private isUsableProviderCost(
    providerCost: number | undefined,
    modelName: string,
    usage: CompletedGenerationCostInput['usage'] | undefined,
  ): providerCost is number {
    if (typeof providerCost !== 'number' || !Number.isFinite(providerCost)) return false
    if (providerCost !== 0) return true
    if (modelName.includes(':free')) return true
    if (!usage) return false
    return (
      (usage.inputTokens ?? 0) +
        (usage.outputTokens ?? 0) +
        (usage.cacheReadTokens ?? 0) +
        (usage.cacheWriteTokens ?? 0) <=
      0
    )
  }
}
