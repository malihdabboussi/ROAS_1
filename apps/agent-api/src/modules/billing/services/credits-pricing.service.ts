import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  BillingCreditsRepository,
  type TextPricingTierRow,
} from '../repositories/billing-credits.repository'
import type {
  CreditCalculation,
  TextBillingContext,
  TextPricingTierSelection,
  TokenUsage,
} from './credits.types'

export interface CreditsPricingRuntime {
  creditsPerDollar: number
  imageMargin: number
  repository: BillingCreditsRepository
  supabase: SupabaseClient
  textMargin: number
}

@Injectable()
export class CreditsPricingService {
  async calculateTextCredits(
    runtime: CreditsPricingRuntime,
    usage: TokenUsage,
    modelName = 'claude-opus-4-6',
    preComputedCost?: number,
    marginOverride?: number,
  ): Promise<CreditCalculation> {
    let apiCost: number
    let breakdown: CreditCalculation['breakdown']
    let pricingTier: TextPricingTierSelection | undefined

    if (preComputedCost !== undefined) {
      apiCost = preComputedCost
      const normalized = this.normalizeModelForPricing(modelName)
      pricingTier = {
        provider: normalized.provider,
        modelName: normalized.modelName,
        pricingProfile: 'provider_precomputed',
        tokenThresholdMin: 0,
        tokenThresholdMax: null,
        inputSideTokens: this.getInputSideTokens(usage),
        source: 'precomputed',
      }
      breakdown = {
        inputCost: apiCost,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
      }
    } else {
      const { modelName: dbModelName, provider: dbProvider } =
        this.normalizeModelForPricing(modelName)
      const tierPricing = await this.fetchTextPricingTier(
        runtime,
        usage,
        dbModelName,
        dbProvider,
      )
      const priceMap =
        tierPricing?.priceMap ?? (await this.fetchFlatTextPricing(runtime, dbModelName, dbProvider))
      pricingTier = tierPricing?.selection

      const inputPrice = priceMap.input_tokens_1k ?? 0.005
      const outputPrice = priceMap.output_tokens_1k ?? 0.025
      const cacheReadPrice = priceMap.cache_read_1k ?? 0.0005
      const cacheWritePrice = priceMap.cache_write_1k ?? 0.00625

      const inputCost = (usage.input / 1000) * inputPrice
      const outputCost = (usage.output / 1000) * outputPrice
      const cacheReadCost = (usage.cacheRead / 1000) * cacheReadPrice
      const cacheWriteCost = (usage.cacheWrite / 1000) * cacheWritePrice
      apiCost = inputCost + outputCost + cacheReadCost + cacheWriteCost
      breakdown = { inputCost, outputCost, cacheReadCost, cacheWriteCost }
    }

    const margin = marginOverride ?? runtime.textMargin
    const credits = Math.max(1, Math.ceil(apiCost * margin * runtime.creditsPerDollar))

    return { apiCost, credits, breakdown, pricingTier }
  }

  async calculateImageCredits(
    runtime: CreditsPricingRuntime,
    modelName = 'gemini-3.1-flash-image-preview',
  ): Promise<CreditCalculation> {
    const pricing = await runtime.repository.findUnitCost(runtime.supabase, {
      modelName,
      unitType: 'images_1',
    })
    const costPerImage = pricing ? parseFloat(String(pricing.cost_per_unit)) : 0.067
    const credits = Math.max(
      1,
      Math.ceil(costPerImage * runtime.imageMargin * runtime.creditsPerDollar),
    )

    return {
      apiCost: costPerImage,
      credits,
      breakdown: {
        inputCost: costPerImage,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
      },
    }
  }

  async calculateTranscribeCredits(
    runtime: CreditsPricingRuntime,
    durationMinutes: number,
    modelName = 'nova-2',
  ): Promise<CreditCalculation> {
    const pricing = await runtime.repository.findUnitCost(runtime.supabase, {
      modelName,
      unitType: 'audio_minutes',
    })
    const costPerMinute = pricing ? parseFloat(String(pricing.cost_per_unit)) : 0.0043
    const apiCost = costPerMinute * durationMinutes
    const credits = Math.max(1, Math.ceil(apiCost * runtime.textMargin * runtime.creditsPerDollar))

    return {
      apiCost,
      credits,
      breakdown: {
        inputCost: apiCost,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
      },
    }
  }

  calculateFixedCostCredits(
    creditsPerDollar: number,
    apiCostUsd: number,
    margin: number,
  ): CreditCalculation {
    const credits = Math.max(1, Math.ceil(apiCostUsd * margin * creditsPerDollar))
    return {
      apiCost: apiCostUsd,
      credits,
      breakdown: {
        inputCost: apiCostUsd,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
      },
    }
  }

  async getUnitCost(
    runtime: CreditsPricingRuntime,
    modelName: string,
    unitType: string,
  ): Promise<number | null> {
    const pricing = await runtime.repository.findUnitCost(runtime.supabase, { modelName, unitType })
    return pricing ? parseFloat(String(pricing.cost_per_unit)) : null
  }

  buildTextBillingMetadata(
    calc: CreditCalculation,
    billingContext?: TextBillingContext,
  ): Record<string, unknown> {
    return {
      ...(billingContext?.contextWindowTokens
        ? { context_window_tokens: billingContext.contextWindowTokens }
        : {}),
      ...(billingContext?.requestedModelId
        ? { requested_model_id: billingContext.requestedModelId }
        : {}),
      ...(billingContext?.resolvedModelId
        ? { resolved_model_id: billingContext.resolvedModelId }
        : {}),
      ...(billingContext?.modelSettings ? { model_settings: billingContext.modelSettings } : {}),
      ...(calc.pricingTier
        ? {
            pricing_tier: {
              provider: calc.pricingTier.provider,
              model_name: calc.pricingTier.modelName,
              pricing_profile: calc.pricingTier.pricingProfile,
              token_threshold_min: calc.pricingTier.tokenThresholdMin,
              token_threshold_max: calc.pricingTier.tokenThresholdMax,
              input_side_tokens: calc.pricingTier.inputSideTokens,
              source: calc.pricingTier.source,
            },
          }
        : {}),
    }
  }

  isSubscriptionBillingContext(
    modelName: string,
    billingContext: TextBillingContext,
    isSubscriptionBackedModelId: (modelId: unknown) => boolean,
  ): boolean {
    return [modelName, billingContext.requestedModelId, billingContext.resolvedModelId].some(
      (modelId) => isSubscriptionBackedModelId(modelId),
    )
  }

  resolveTextCostSource(params: { costSource?: string; preComputedCost?: number }): string {
    return params.costSource ?? (params.preComputedCost !== undefined ? 'precomputed' : 'db_pricing')
  }

  deriveProvider(modelId: string): string {
    const stripped = modelId.replace(/^openrouter\//, '')
    if (stripped.includes('/')) {
      return stripped.split('/')[0]
    }
    if (stripped.startsWith('claude')) return 'anthropic'
    if (stripped.startsWith('gpt') || stripped.startsWith('o3') || stripped.startsWith('o1')) {
      return 'openai'
    }
    if (stripped.startsWith('gemini')) return 'google'
    if (stripped.startsWith('nova')) return 'deepgram'
    if (stripped.startsWith('imagen')) return 'google'
    return 'unknown'
  }

  private async fetchTextPricingTier(
    runtime: CreditsPricingRuntime,
    usage: TokenUsage,
    modelName: string,
    provider: string | null,
  ): Promise<{ priceMap: Record<string, number>; selection: TextPricingTierSelection } | null> {
    const rows = await runtime.repository.listTextPricingTiers(runtime.supabase, {
      modelName,
      provider,
    })
    if (rows.length === 0) return null

    const inputSideTokens = this.getInputSideTokens(usage)
    const selected = this.selectPricingTier(rows, inputSideTokens)
    const priceMap = this.buildPricingMap(selected)
    return {
      priceMap,
      selection: {
        provider: selected.provider,
        modelName: selected.model_name,
        pricingProfile: selected.pricing_profile,
        tokenThresholdMin: Number(selected.token_threshold_min),
        tokenThresholdMax:
          selected.token_threshold_max == null ? null : Number(selected.token_threshold_max),
        inputSideTokens,
        source: 'llm_model_pricing_tiers',
      },
    }
  }

  private async fetchFlatTextPricing(
    runtime: CreditsPricingRuntime,
    modelName: string,
    provider: string | null,
  ): Promise<Record<string, number>> {
    const pricing = await runtime.repository.listFlatTextPricingRows(runtime.supabase, {
      modelName,
      provider,
    })
    const priceMap: Record<string, number> = {}
    for (const p of pricing) {
      priceMap[p.unit_type] = parseFloat(String(p.cost_per_unit))
    }
    return priceMap
  }

  private selectPricingTier(rows: TextPricingTierRow[], inputSideTokens: number): TextPricingTierRow {
    return (
      rows.find(
        (row) =>
          inputSideTokens >= Number(row.token_threshold_min) &&
          (row.token_threshold_max == null || inputSideTokens <= Number(row.token_threshold_max)),
      ) ?? rows[0]
    )
  }

  private buildPricingMap(selected: TextPricingTierRow): Record<string, number> {
    const priceMap: Record<string, number> = {}
    const inputPrice = this.parseNullableNumber(selected.input_tokens_1k)
    const outputPrice = this.parseNullableNumber(selected.output_tokens_1k)
    const cacheReadPrice = this.parseNullableNumber(selected.cache_read_1k)
    const cacheWritePrice = this.parseNullableNumber(selected.cache_write_1k)
    if (inputPrice != null) priceMap.input_tokens_1k = inputPrice
    if (outputPrice != null) priceMap.output_tokens_1k = outputPrice
    if (cacheReadPrice != null) priceMap.cache_read_1k = cacheReadPrice
    if (cacheWritePrice != null) priceMap.cache_write_1k = cacheWritePrice
    return priceMap
  }

  private getInputSideTokens(usage: TokenUsage): number {
    return Math.max(0, usage.input + usage.cacheRead + usage.cacheWrite)
  }

  private parseNullableNumber(value: string | number | null): number | null {
    if (value == null) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  private normalizeModelForPricing(modelId: string): {
    modelName: string
    provider: string | null
  } {
    const stripped = modelId.replace(/^openrouter\//, '')
    if (stripped.includes('/')) {
      const [provider, ...rest] = stripped.split('/')
      return { modelName: rest.join('/'), provider: provider || null }
    }
    if (stripped.startsWith('gemini')) {
      return { modelName: stripped, provider: 'google' }
    }
    return { modelName: stripped, provider: null }
  }
}
