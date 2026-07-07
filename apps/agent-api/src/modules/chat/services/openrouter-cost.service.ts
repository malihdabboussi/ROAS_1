import { Injectable, Logger } from '@nestjs/common'

interface ModelPricing {
  prompt: number
  completion: number
  inputCacheRead: number
  inputCacheWrite: number
}

interface CostInput {
  inputTokens?: number
  outputTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
}

export type CostSource =
  | 'openrouter_api'
  | 'openrouter_calc'
  | 'provider_direct'
  | 'mixed'
  | 'missing'
  | 'none'

export interface CompletedGenerationCostInput {
  generationId?: string
  modelId?: string
  usage?: CostInput
  providerCost?: number
}

@Injectable()
export class OpenRouterCostService {
  private readonly logger = new Logger(OpenRouterCostService.name)
  private pricingCache = new Map<string, { pricing: ModelPricing; fetchedAt: number }>()
  private readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
  /** OpenRouter generation metadata often 404s until indexed; need a long tail of retries. */
  private readonly MAX_RETRIES = 10
  private readonly RETRY_DELAYS = [2000, 4000, 8000, 16000, 16000, 16000, 24000, 24000, 24000]

  /**
   * PRIMARY: Fetch actual cost from OpenRouter generation API.
   * Returns the exact USD amount OpenRouter charged for this generation.
   * Retries with backoff (404 = not indexed yet); window ~2.5 minutes before last attempt.
   */
  async fetchGenerationCost(generationId: string): Promise<number | undefined> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set — cannot fetch generation cost')
      return undefined
    }

    if (!generationId.startsWith('gen-') && !generationId.startsWith('gen_')) {
      this.logger.debug(
        `Skipping OpenRouter API fetch for non-generation ID: "${generationId.slice(0, 20)}…"`,
      )
      return undefined
    }

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(
          `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        )

        if (res.status === 404) {
          if (attempt < this.MAX_RETRIES - 1) {
            await this.sleep(this.RETRY_DELAYS[attempt])
            continue
          }
          this.logger.warn(
            `[credit-debug] fetchGenerationCost undefined: generationId=${generationId} reason=404_after_retries`,
          )
          return undefined
        }

        if (!res.ok) {
          const bodySnippet = (await res.text()).slice(0, 200)
          this.logger.warn(
            `[credit-debug] fetchGenerationCost undefined: generationId=${generationId} status=${res.status} body=${bodySnippet}`,
          )
          if (attempt < this.MAX_RETRIES - 1) {
            await this.sleep(this.RETRY_DELAYS[attempt])
            continue
          }
          return undefined
        }

        const json = (await res.json()) as { data?: Record<string, unknown> }
        const d = json.data
        const cost =
          (typeof d?.total_cost === 'number' ? d.total_cost : undefined) ??
          (typeof d?.usage === 'number' ? d.usage : undefined) ??
          (typeof (d?.usage as Record<string, unknown>)?.cost === 'number'
            ? ((d?.usage as Record<string, unknown>).cost as number)
            : undefined)

        if (typeof cost === 'number') {
          this.logger.debug(`Generation ${generationId} actual cost: $${cost}`)
          return cost
        }

        this.logger.warn(
          `[credit-debug] fetchGenerationCost undefined: generationId=${generationId} reason=no_cost_field responseKeys=${Object.keys(d ?? {}).join(',')}`,
        )
        return undefined
      } catch (err) {
        this.logger.warn(
          `[credit-debug] fetchGenerationCost attempt ${attempt + 1} failed: generationId=${generationId} err=${err}`,
        )
        if (attempt < this.MAX_RETRIES - 1) {
          await this.sleep(this.RETRY_DELAYS[attempt])
        }
      }
    }

    this.logger.warn(
      `[credit-debug] fetchGenerationCost undefined: generationId=${generationId} reason=exhausted_retries`,
    )
    return undefined
  }

  /**
   * FALLBACK: Calculate cost locally from token counts and OpenRouter model pricing.
   *
   * IMPORTANT: input_tokens from Anthropic/OpenRouter includes ALL input tokens
   * (non-cached + cache reads + cache writes). Cache tokens are a SUBSET, not additional.
   * We must subtract cache tokens from inputTokens to get non-cached input count.
   */
  async calculateCost(modelId: string, usage: CostInput): Promise<number | undefined> {
    const pricing = await this.getModelPricing(modelId)
    if (!pricing) return undefined

    const totalInput = usage.inputTokens ?? 0
    const outputTokens = usage.outputTokens ?? 0
    const cacheRead = usage.cacheReadTokens ?? 0
    const cacheWrite = usage.cacheWriteTokens ?? 0

    // Non-cached input = total input minus cache tokens (they're a subset)
    const nonCachedInput = Math.max(0, totalInput - cacheRead - cacheWrite)

    const cost =
      nonCachedInput * pricing.prompt +
      outputTokens * pricing.completion +
      cacheRead * pricing.inputCacheRead +
      cacheWrite * pricing.inputCacheWrite

    return Math.round(cost * 1_000_000) / 1_000_000
  }

  /**
   * Sum costs across multiple OpenRouter generations (tool loops).
   * We prefer the generation-cost API per generation; if unavailable, we fall back to local calculation.
   */
  async sumGenerationCosts(
    generations: CompletedGenerationCostInput[],
    fallbackModelId?: string,
  ): Promise<{
    totalUsd?: number
    costSource: CostSource
    generationIds: string[]
  }> {
    const generationIds = generations
      .map((g) => g.generationId)
      .filter((id): id is string => typeof id === 'string' && /^gen[-_]/.test(id))

    if (generations.length === 0) {
      return { totalUsd: undefined, costSource: 'none', generationIds: [] }
    }

    let usedProviderDirect = false
    let usedApi = false
    let usedCalc = false
    let missingAny = false
    let total = 0

    for (const gen of generations) {
      // Priority 1: provider-reported cost (forwarded from OpenRouter via OpenClaw)
      const providerCost = gen.providerCost
      if (this.isUsableProviderCost(providerCost, gen.modelId ?? fallbackModelId)) {
        total += providerCost
        usedProviderDirect = true
        continue
      }

      const id =
        typeof gen.generationId === 'string' && /^gen[-_]/.test(gen.generationId)
          ? gen.generationId
          : undefined

      // Priority 2: fetch actual cost from OpenRouter generation API
      if (id) {
        const apiCost = await this.fetchGenerationCost(id)
        if (apiCost !== undefined) {
          total += apiCost
          usedApi = true
          continue
        }
      }

      // Priority 3: calculate from token counts + model pricing
      const modelId = (gen.modelId ?? fallbackModelId ?? '').trim()
      if (modelId && gen.usage) {
        const calc = await this.calculateCost(modelId, gen.usage)
        if (calc !== undefined) {
          total += calc
          usedCalc = true
          continue
        }
      }

      missingAny = true
    }

    if (missingAny) {
      return { totalUsd: undefined, costSource: 'missing', generationIds }
    }

    const costSource: CostSource = usedProviderDirect
      ? 'provider_direct'
      : usedApi && usedCalc
        ? 'mixed'
        : usedApi
          ? 'openrouter_api'
          : 'openrouter_calc'
    return {
      totalUsd: Math.round(total * 1_000_000) / 1_000_000,
      costSource,
      generationIds,
    }
  }

  private isUsableProviderCost(
    providerCost: number | undefined,
    modelId: string | undefined,
  ): providerCost is number {
    if (typeof providerCost !== 'number' || !Number.isFinite(providerCost)) return false
    if (providerCost !== 0) return true
    return this.isKnownFreeOpenRouterModel(modelId)
  }

  private isKnownFreeOpenRouterModel(modelId: string | undefined): boolean {
    return typeof modelId === 'string' && modelId.includes(':free')
  }

  private async getModelPricing(modelId: string): Promise<ModelPricing | undefined> {
    const cached = this.pricingCache.get(modelId)
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      return cached.pricing
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/models')
      if (!res.ok) {
        this.logger.warn(`OpenRouter models API: ${res.status}`)
        return cached?.pricing
      }

      const data = (await res.json()) as { data?: Array<Record<string, unknown>> }
      const models = data.data ?? []
      const model = models.find((m) => m.id === modelId)
      if (!model?.pricing) {
        this.logger.warn(`Model ${modelId} not found in OpenRouter`)
        return cached?.pricing
      }

      const p = model.pricing as Record<string, string>
      const pricing: ModelPricing = {
        prompt: parseFloat(p.prompt ?? '0'),
        completion: parseFloat(p.completion ?? '0'),
        inputCacheRead: parseFloat(p.input_cache_read ?? '0'),
        inputCacheWrite: parseFloat(p.input_cache_write ?? '0'),
      }

      this.pricingCache.set(modelId, { pricing, fetchedAt: Date.now() })
      return pricing
    } catch (err) {
      this.logger.warn(`Failed to fetch pricing: ${err}`)
      return cached?.pricing
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
