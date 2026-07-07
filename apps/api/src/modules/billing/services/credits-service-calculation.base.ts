import type {
  CreditCalculation,
  TextBillingContext,
  TextPricingTierRow,
  TextPricingTierSelection,
  TokenUsage,
} from './credits.types'
import { CreditsTranscriptBase } from './credits-service-transcript.base'

export abstract class CreditsCalculationBase extends CreditsTranscriptBase {
  // ============================================================
  // COST CALCULATION
  // ============================================================

  /**
   * Calculate credits for text generation from token usage.
   * Looks up pricing from DB, falls back to Opus 4.6 defaults.
   */
  async calculateTextCredits(
    usage: TokenUsage,
    modelName = 'claude-opus-4-6',
    preComputedCost?: number,
    _billingContext?: TextBillingContext,
  ): Promise<CreditCalculation> {
    if (preComputedCost !== undefined) {
      const credits = Math.max(
        1,
        Math.ceil(preComputedCost * this.TEXT_MARGIN * this.CREDITS_PER_DOLLAR),
      )
      const normalized = this.normalizeModelForPricing(modelName)
      return {
        apiCost: preComputedCost,
        credits,
        breakdown: {
          inputCost: preComputedCost,
          outputCost: 0,
          cacheReadCost: 0,
          cacheWriteCost: 0,
        },
        pricingTier: {
          provider: normalized.provider,
          modelName: normalized.modelName,
          pricingProfile: 'provider_precomputed',
          tokenThresholdMin: 0,
          tokenThresholdMax: null,
          inputSideTokens: this.getInputSideTokens(usage),
          source: 'precomputed',
        },
      }
    }

    const { modelName: dbModelName, provider: dbProvider } =
      this.normalizeModelForPricing(modelName)
    const tierPricing = await this.fetchTextPricingTier(usage, dbModelName, dbProvider)
    const priceMap =
      tierPricing?.priceMap ?? (await this.fetchFlatTextPricing(dbModelName, dbProvider))

    const inputPrice = priceMap['input_tokens_1k'] ?? 0.005
    const outputPrice = priceMap['output_tokens_1k'] ?? 0.025
    const cacheReadPrice = priceMap['cache_read_1k'] ?? 0.0005
    const cacheWritePrice = priceMap['cache_write_1k'] ?? 0.00625

    const inputCost = (usage.input / 1000) * inputPrice
    const outputCost = (usage.output / 1000) * outputPrice
    const cacheReadCost = (usage.cacheRead / 1000) * cacheReadPrice
    const cacheWriteCost = (usage.cacheWrite / 1000) * cacheWritePrice
    const apiCost = inputCost + outputCost + cacheReadCost + cacheWriteCost

    const credits = Math.max(1, Math.ceil(apiCost * this.TEXT_MARGIN * this.CREDITS_PER_DOLLAR))

    return {
      apiCost,
      credits,
      breakdown: { inputCost, outputCost, cacheReadCost, cacheWriteCost },
      pricingTier: tierPricing?.selection,
    }
  }

  private async fetchTextPricingTier(
    usage: TokenUsage,
    modelName: string,
    provider: string | null,
  ): Promise<{ priceMap: Record<string, number>; selection: TextPricingTierSelection } | null> {
    const { data } = await this.creditsRepository.listTextPricingTiers(modelName, provider)
    const rows = (data ?? []) as TextPricingTierRow[]
    if (rows.length === 0) return null

    const inputSideTokens = this.getInputSideTokens(usage)
    const selected =
      rows.find(
        (row) =>
          inputSideTokens >= Number(row.token_threshold_min) &&
          (row.token_threshold_max == null || inputSideTokens <= Number(row.token_threshold_max)),
      ) ?? rows[0]
    const priceMap: Record<string, number> = {}
    const inputPrice = this.parseNullableNumber(selected.input_tokens_1k)
    const outputPrice = this.parseNullableNumber(selected.output_tokens_1k)
    const cacheReadPrice = this.parseNullableNumber(selected.cache_read_1k)
    const cacheWritePrice = this.parseNullableNumber(selected.cache_write_1k)
    if (inputPrice != null) priceMap.input_tokens_1k = inputPrice
    if (outputPrice != null) priceMap.output_tokens_1k = outputPrice
    if (cacheReadPrice != null) priceMap.cache_read_1k = cacheReadPrice
    if (cacheWritePrice != null) priceMap.cache_write_1k = cacheWritePrice
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
    modelName: string,
    provider: string | null,
  ): Promise<Record<string, number>> {
    const { data: pricing } = await this.creditsRepository.listFlatTextPricing(
      modelName,
      provider,
    )

    const priceMap: Record<string, number> = {}
    if (pricing) {
      for (const p of pricing) {
        priceMap[p.unit_type] = Number(p.cost_per_unit)
      }
    }
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

  protected buildTextBillingMetadata(
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

  /**
   * Calculate credits for image generation.
   */
  async calculateImageCredits(
    modelName = 'gemini-3.1-flash-image-preview',
  ): Promise<CreditCalculation> {
    const { data: pricing } = await this.creditsRepository.findUnitPricing(
      modelName,
      'images_1',
    )

    const costPerImage = pricing ? Number(pricing.cost_per_unit) : 0.067

    const credits = Math.max(
      1,
      Math.ceil(costPerImage * this.IMAGE_MARGIN * this.CREDITS_PER_DOLLAR),
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

  /**
   * Calculate credits for audio transcription.
   */
  async calculateTranscribeCredits(
    durationMinutes: number,
    modelName = 'nova-2',
  ): Promise<CreditCalculation> {
    const { data: pricing } = await this.creditsRepository.findUnitPricing(
      modelName,
      'audio_minutes',
      true,
    )

    const costPerMinute = pricing ? Number(pricing.cost_per_unit) : 0.0043

    const apiCost = costPerMinute * durationMinutes
    // Use text margin for transcription (it's a text output)
    const credits = Math.max(1, Math.ceil(apiCost * this.TEXT_MARGIN * this.CREDITS_PER_DOLLAR))

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
}
