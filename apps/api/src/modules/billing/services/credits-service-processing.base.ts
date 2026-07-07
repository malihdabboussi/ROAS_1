import { CreditsAutoRechargeBase } from './credits-service-auto-recharge.base'
import type {
  CreditBalance,
  CreditCalculation,
  TextBillingContext,
  TokenUsage,
} from './credits.types'

export abstract class CreditsProcessingBase extends CreditsAutoRechargeBase {
  // ============================================================
  // FULL FLOW: Calculate + Log + Deduct
  // ============================================================

  /**
   * Process usage after an AI response.
   * Reads transcript, calculates cost, logs event, deducts credits.
   * Returns updated balance for SSE emission.
   */
  async processUsage(params: {
    userId: string
    sessionKey: string
    conversationId?: string
    campaignId?: string
    orgId?: string
    feature: string
    action?: string
    modelName?: string
    preComputedCost?: number
    costSource?: string
    contextWindowTokens?: number
    requestedModelId?: string
    resolvedModelId?: string
    modelSettings?: unknown
  }): Promise<{
    credits: number
    balance: CreditBalance
    apiCost: number
  } | null> {
    const model = params.modelName ?? 'claude-opus-4-6'
    const owner = await this.resolveCreditsOwner(params.userId, params.orgId)
    const billedUserId = owner.creditsOwnerId

    // 1. Read usage from transcript
    const usage = await this.getUsageFromTranscript(params.sessionKey)
    if (!usage) {
      this.logger.debug(`No usage data from transcript for ${params.sessionKey}`)
      return null
    }

    // 2. Calculate credits
    const billingContext: TextBillingContext = {
      contextWindowTokens: params.contextWindowTokens,
      requestedModelId: params.requestedModelId,
      resolvedModelId: params.resolvedModelId,
      modelSettings: params.modelSettings,
    }
    const calc = await this.calculateTextCredits(
      usage,
      model,
      params.preComputedCost,
      billingContext,
    )
    const discount = await this.getCreditDiscount(owner)
    const finalCredits = this.applyDiscount(calc.credits, discount)
    const debitResult =
      finalCredits > 0
        ? owner.billingType === 'org' && owner.orgId
          ? await this.deductIncurredOrgCredits(owner.orgId, finalCredits)
          : await this.deductIncurredCredits(billedUserId, finalCredits)
        : {
            balance:
              owner.billingType === 'org' && owner.orgId
                ? await this.getOrgBalance(owner.orgId)
                : await this.getBalance(billedUserId),
            overdraftCredits: 0,
          }

    // 3. Log the usage event
    await this.creditsRepository.insertUsageEvent({
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      campaign_id: params.campaignId || null,
      conversation_id: params.conversationId || null,
      feature: params.feature,
      action: params.action || 'generate',
      provider: this.deriveProvider(model),
      model_name: model,
      service_type: 'text',
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_tokens: usage.cacheRead,
      cache_write_tokens: usage.cacheWrite,
      total_tokens: usage.totalTokens,
      computed_cost: calc.apiCost,
      cost_source:
        params.costSource ??
        (params.preComputedCost !== undefined ? 'precomputed' : 'transcript_pricing'),
      credits_charged: finalCredits,
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
        ...this.buildTextBillingMetadata(calc, billingContext),
      },
    })

    await this.incrementOrgMemberUsage(owner, finalCredits)

    this.logger.log(
      `Processed ${params.feature}: ${finalCredits} credits ($${calc.apiCost.toFixed(4)})${discount > 0 ? ` [${discount}% discount]` : ''} overdraft=${debitResult.overdraftCredits} | Balance: ${debitResult.balance.totalAvailable}`,
    )

    return {
      credits: finalCredits,
      balance: debitResult.balance,
      apiCost: calc.apiCost,
    }
  }

  async settleIncurredProviderUsage(params: {
    userId: string
    orgId?: string | null
    campaignId?: string | null
    conversationId?: string | null
    feature: string
    action?: string | null
    provider: string
    modelName: string
    serviceType?: string
    usage?: TokenUsage
    providerCostUsd: number
    costSource?: string
    generationIds?: string[]
    providerBillingAttemptId?: string | null
    metadata?: Record<string, unknown>
    requestedModelId?: string | null
    resolvedModelId?: string | null
  }): Promise<{
    credits: number
    balance: CreditBalance
    apiCost: number
    aiUsageEventId: string | null
    overdraftCredits: number
  }> {
    if (!Number.isFinite(params.providerCostUsd) || params.providerCostUsd < 0) {
      throw new Error('providerCostUsd must be a non-negative finite number')
    }

    const usage = params.usage ?? {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
    }
    const billingContext: TextBillingContext = {
      requestedModelId: params.requestedModelId ?? undefined,
      resolvedModelId: params.resolvedModelId ?? undefined,
    }
    const calc =
      params.providerCostUsd > 0
        ? await this.calculateTextCredits(
            usage,
            params.modelName,
            params.providerCostUsd,
            billingContext,
          )
        : this.zeroCostCalculation(params.providerCostUsd)
    const owner = await this.resolveCreditsOwner(params.userId, params.orgId ?? undefined)
    const discount = await this.getCreditDiscount(owner)
    const finalCredits = calc.credits === 0 ? 0 : this.applyDiscount(calc.credits, discount)

    const debitResult =
      finalCredits > 0
        ? owner.billingType === 'org' && owner.orgId
          ? await this.deductIncurredOrgCredits(owner.orgId, finalCredits)
          : await this.deductIncurredCredits(owner.creditsOwnerId, finalCredits)
        : {
            balance:
              owner.billingType === 'org' && owner.orgId
                ? await this.getOrgBalance(owner.orgId)
                : await this.getBalance(owner.creditsOwnerId),
            overdraftCredits: 0,
          }

    await this.incrementOrgMemberUsage(owner, finalCredits)

    const insertResult = await this.creditsRepository.insertUsageEventReturningId({
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      campaign_id: params.campaignId ?? null,
      conversation_id: params.conversationId ?? null,
      feature: params.feature,
      action: params.action ?? 'generate',
      provider: params.provider,
      model_name: params.modelName,
      service_type: params.serviceType ?? 'text',
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_tokens: usage.cacheRead,
      cache_write_tokens: usage.cacheWrite,
      total_tokens: usage.totalTokens,
      computed_cost: calc.apiCost,
      cost_source: params.costSource ?? 'provider_settlement_exact',
      credits_charged: finalCredits,
      generation_ids: params.generationIds?.length ? params.generationIds : null,
      provider_billing_attempt_id: params.providerBillingAttemptId ?? null,
      billing_settlement_status: 'settled',
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
        provider_billing_attempt_id: params.providerBillingAttemptId ?? null,
        ...(params.metadata ?? {}),
        ...this.buildTextBillingMetadata(calc, billingContext),
      },
    })
    if (insertResult.error) {
      throw new Error(`Failed to insert incurred provider usage: ${insertResult.error.message}`)
    }

    this.logger.log(
      `Settled incurred ${params.feature}: ${finalCredits} credits ($${calc.apiCost.toFixed(4)}) overdraft=${debitResult.overdraftCredits} | Balance: ${debitResult.balance.totalAvailable}`,
    )

    return {
      credits: finalCredits,
      balance: debitResult.balance,
      apiCost: calc.apiCost,
      aiUsageEventId: insertResult.data?.id ?? null,
      overdraftCredits: debitResult.overdraftCredits,
    }
  }

  private zeroCostCalculation(apiCost: number): CreditCalculation {
    return {
      apiCost,
      credits: 0,
      breakdown: {
        inputCost: 0,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
      },
      pricingTier: {
        provider: null,
        modelName: 'provider_no_charge',
        pricingProfile: 'provider_no_charge',
        tokenThresholdMin: 0,
        tokenThresholdMax: null,
        inputSideTokens: 0,
        source: 'precomputed',
      },
    }
  }

  /**
   * Process image generation usage.
   */
  async processImageUsage(params: {
    userId: string
    campaignId?: string
    orgId?: string
    modelName?: string
  }): Promise<{
    credits: number
    balance: CreditBalance
    apiCost: number
  } | null> {
    const model = params.modelName ?? 'gemini-3.1-flash-image-preview'
    const owner = await this.resolveCreditsOwner(params.userId, params.orgId)
    const billedUserId = owner.creditsOwnerId
    const calc = await this.calculateImageCredits(model)
    const discountImg = await this.getCreditDiscount(owner)
    const finalCreditsImg = this.applyDiscount(calc.credits, discountImg)
    const debitResult =
      finalCreditsImg > 0
        ? owner.billingType === 'org' && owner.orgId
          ? await this.deductIncurredOrgCredits(owner.orgId, finalCreditsImg)
          : await this.deductIncurredCredits(billedUserId, finalCreditsImg)
        : {
            balance:
              owner.billingType === 'org' && owner.orgId
                ? await this.getOrgBalance(owner.orgId)
                : await this.getBalance(billedUserId),
            overdraftCredits: 0,
          }

    const provider = model.startsWith('gpt-') ? 'openai' : 'google'

    await this.creditsRepository.insertUsageEvent({
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      campaign_id: params.campaignId || null,
      feature: 'media',
      action: 'generate',
      provider,
      model_name: model,
      service_type: 'image',
      computed_cost: calc.apiCost,
      cost_source: 'fixed_pricing',
      credits_charged: finalCreditsImg,
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
      },
    })

    await this.incrementOrgMemberUsage(owner, finalCreditsImg)

    return { credits: finalCreditsImg, balance: debitResult.balance, apiCost: calc.apiCost }
  }

  /**
   * Process text usage directly from runtime token counters.
   * Used by internal services (brain, transcription, etc.) that don't go through OpenClaw.
   */
  async processDirectTextUsage(params: {
    userId: string
    campaignId?: string
    conversationId?: string
    orgId?: string
    feature: string
    action?: string
    modelName: string
    usage: TokenUsage
    costSource?: string
    metadata?: Record<string, unknown>
    preComputedCost?: number
    generationIds?: string[]
    contextWindowTokens?: number
    requestedModelId?: string
    resolvedModelId?: string
    modelSettings?: unknown
  }): Promise<{
    credits: number
    balance: CreditBalance
    apiCost: number
  } | null> {
    const usage = params.usage
    if ((usage.totalTokens ?? 0) <= 0) return null
    const owner = await this.resolveCreditsOwner(params.userId, params.orgId)
    const billedUserId = owner.creditsOwnerId

    const billingContext: TextBillingContext = {
      contextWindowTokens: params.contextWindowTokens,
      requestedModelId: params.requestedModelId,
      resolvedModelId: params.resolvedModelId,
      modelSettings: params.modelSettings,
    }
    const calc = await this.calculateTextCredits(
      usage,
      params.modelName,
      params.preComputedCost,
      billingContext,
    )
    const discount = await this.getCreditDiscount(owner)
    const finalCredits = this.applyDiscount(calc.credits, discount)
    const debitResult =
      finalCredits > 0
        ? owner.billingType === 'org' && owner.orgId
          ? await this.deductIncurredOrgCredits(owner.orgId, finalCredits)
          : await this.deductIncurredCredits(billedUserId, finalCredits)
        : {
            balance:
              owner.billingType === 'org' && owner.orgId
                ? await this.getOrgBalance(owner.orgId)
                : await this.getBalance(billedUserId),
            overdraftCredits: 0,
          }

    await this.creditsRepository.insertUsageEvent({
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      campaign_id: params.campaignId || null,
      conversation_id: params.conversationId || null,
      feature: params.feature,
      action: params.action || 'process',
      provider: this.deriveProvider(params.modelName),
      model_name: params.modelName,
      service_type: 'text',
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_tokens: usage.cacheRead,
      cache_write_tokens: usage.cacheWrite,
      total_tokens: usage.totalTokens,
      computed_cost: calc.apiCost,
      cost_source: params.costSource ?? 'runtime_tokens',
      generation_ids: params.generationIds ?? undefined,
      credits_charged: finalCredits,
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
        ...this.buildTextBillingMetadata(calc, billingContext),
        ...(params.metadata ?? {}),
      },
    })

    await this.incrementOrgMemberUsage(owner, finalCredits)
    this.logger.log(
      `Processed direct usage ${params.feature}:${params.action ?? 'process'} => ${finalCredits} credits ($${calc.apiCost.toFixed(4)}) overdraft=${debitResult.overdraftCredits}`,
    )

    return { credits: finalCredits, balance: debitResult.balance, apiCost: calc.apiCost }
  }

  /**
   * Process transcription usage based on audio duration.
   */
  async processTranscribeUsage(params: {
    userId: string
    durationMinutes: number
    orgId?: string
    modelName?: string
  }): Promise<{ credits: number; balance: CreditBalance; apiCost: number } | null> {
    if (params.durationMinutes <= 0) return null
    const owner = await this.resolveCreditsOwner(params.userId, params.orgId)
    const billedUserId = owner.creditsOwnerId

    const model = params.modelName ?? 'nova-3'
    const calc = await this.calculateTranscribeCredits(params.durationMinutes, model)
    const discount = await this.getCreditDiscount(owner)
    const finalCredits = this.applyDiscount(calc.credits, discount)
    const debitResult =
      finalCredits > 0
        ? owner.billingType === 'org' && owner.orgId
          ? await this.deductIncurredOrgCredits(owner.orgId, finalCredits)
          : await this.deductIncurredCredits(billedUserId, finalCredits)
        : {
            balance:
              owner.billingType === 'org' && owner.orgId
                ? await this.getOrgBalance(owner.orgId)
                : await this.getBalance(billedUserId),
            overdraftCredits: 0,
          }

    await this.creditsRepository.insertUsageEvent({
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      feature: 'transcribe',
      action: 'transcribe',
      provider: 'deepgram',
      model_name: model,
      service_type: 'audio',
      computed_cost: calc.apiCost,
      cost_source: 'fixed_pricing',
      credits_charged: finalCredits,
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
      },
    })

    await this.incrementOrgMemberUsage(owner, finalCredits)
    this.logger.log(
      `Processed transcribe: ${params.durationMinutes.toFixed(1)} min => ${finalCredits} credits ($${calc.apiCost.toFixed(4)}) overdraft=${debitResult.overdraftCredits}`,
    )

    return { credits: finalCredits, balance: debitResult.balance, apiCost: calc.apiCost }
  }
}
