import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BillingCreditsRepository } from '../repositories/billing-credits.repository'
import type {
  CreditBalance,
  CreditCalculation,
  CreditsOwnerResolution,
  TextBillingContext,
  TokenUsage,
} from './credits.types'

export interface CreditsUsageRuntime {
  repository: BillingCreditsRepository
  supabase: SupabaseClient
}

type UsageResult = {
  credits: number
  balance: CreditBalance
  apiCost: number
}

type CreditsUsageHost = {
  applyDiscount(credits: number, discountPercent: number): number
  buildTextBillingMetadata(
    calc: CreditCalculation,
    billingContext?: TextBillingContext,
  ): Record<string, unknown>
  calculateFixedCostCredits(apiCostUsd: number, margin: number): CreditCalculation
  calculateImageCredits(modelName?: string): Promise<CreditCalculation>
  calculateTextCredits(
    usage: TokenUsage,
    modelName?: string,
    preComputedCost?: number,
    marginOverride?: number,
    billingContext?: TextBillingContext,
  ): Promise<CreditCalculation>
  deductCredits(userId: string, creditsToDeduct: number): Promise<CreditBalance>
  deductIncurredCredits(
    userId: string,
    creditsToDeduct: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }>
  deductIncurredOrgCredits(
    orgId: string,
    creditsToDeduct: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }>
  deductOrgCredits(orgId: string, creditsToDeduct: number): Promise<CreditBalance>
  deriveProvider(modelId: string): string
  getBalanceForOwner(owner: CreditsOwnerResolution): Promise<CreditBalance>
  getChargeableCredits(owner: CreditsOwnerResolution, requestedCredits: number): Promise<number>
  getCreditDiscount(owner: CreditsOwnerResolution): Promise<number>
  getUsageFromTranscript(sessionKey: string): Promise<TokenUsage | null>
  incrementOrgMemberUsage(owner: CreditsOwnerResolution, credits: number): Promise<void>
  isSubscriptionBillingContext(modelName: string, billingContext: TextBillingContext): boolean
  resolveCreditsOwner(userId: string, orgId?: string | null): Promise<CreditsOwnerResolution>
  resolveTextCostSource(params: { costSource?: string; preComputedCost?: number }): string
}

@Injectable()
export class CreditsUsageProcessingService {
  async processUsage(
    runtime: CreditsUsageRuntime,
    host: CreditsUsageHost,
    params: {
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
      generationIds?: string[]
      contextWindowTokens?: number
      requestedModelId?: string
      resolvedModelId?: string
      modelSettings?: unknown
    },
  ): Promise<UsageResult | null> {
    const model = params.modelName ?? 'claude-opus-4-6'
    const owner = await host.resolveCreditsOwner(params.userId, params.orgId)
    const usage = await host.getUsageFromTranscript(params.sessionKey)
    if (!usage) return null

    const billingContext = this.buildBillingContext(params)
    const calc = await host.calculateTextCredits(
      usage,
      model,
      params.preComputedCost,
      undefined,
      billingContext,
    )
    const provider = host.deriveProvider(model)

    if (host.isSubscriptionBillingContext(model, billingContext)) {
      return this.trackSubscriptionUsage(runtime, host, {
        params,
        owner,
        usage,
        calc,
        provider,
        model,
        billingContext,
      })
    }

    const discount = await host.getCreditDiscount(owner)
    const finalCredits = host.applyDiscount(calc.credits, discount)
    const debitResult = await this.deductIncurredOwnerCredits(host, owner, finalCredits)

    await runtime.repository.insertUsageEvent(runtime.supabase, {
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      campaign_id: params.campaignId || null,
      conversation_id: params.conversationId || null,
      feature: params.feature,
      action: params.action || 'generate',
      provider,
      model_name: model,
      service_type: 'text',
      input_tokens: usage.input,
      output_tokens: usage.output,
      cache_read_tokens: usage.cacheRead,
      cache_write_tokens: usage.cacheWrite,
      total_tokens: usage.totalTokens,
      computed_cost: calc.apiCost,
      cost_source: host.resolveTextCostSource(params),
      generation_ids: params.generationIds ?? undefined,
      credits_charged: finalCredits,
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
        ...host.buildTextBillingMetadata(calc, billingContext),
      },
    })

    await host.incrementOrgMemberUsage(owner, finalCredits)
    return { credits: finalCredits, balance: debitResult.balance, apiCost: calc.apiCost }
  }

  async processDirectTextUsage(
    runtime: CreditsUsageRuntime,
    host: CreditsUsageHost,
    params: {
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
    },
  ): Promise<UsageResult | null> {
    if ((params.usage.totalTokens ?? 0) <= 0) return null

    const margin = params.feature === 'brain' ? 2 : undefined
    const billingContext = this.buildBillingContext(params)
    const calc = await host.calculateTextCredits(
      params.usage,
      params.modelName,
      params.preComputedCost,
      margin,
      billingContext,
    )
    const owner = await host.resolveCreditsOwner(params.userId, params.orgId)
    const discount = await host.getCreditDiscount(owner)
    const finalCredits = host.applyDiscount(calc.credits, discount)
    const debitResult = await this.deductIncurredOwnerCredits(host, owner, finalCredits)
    const provider = host.deriveProvider(params.modelName)

    await runtime.repository.insertUsageEvent(runtime.supabase, {
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      campaign_id: params.campaignId || null,
      conversation_id: params.conversationId || null,
      feature: params.feature,
      action: params.action || 'process',
      provider,
      model_name: params.modelName,
      service_type: 'text',
      input_tokens: params.usage.input,
      output_tokens: params.usage.output,
      cache_read_tokens: params.usage.cacheRead,
      cache_write_tokens: params.usage.cacheWrite,
      total_tokens: params.usage.totalTokens,
      computed_cost: calc.apiCost,
      cost_source: params.costSource ?? 'runtime_tokens',
      generation_ids: params.generationIds ?? undefined,
      credits_charged: finalCredits,
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
        ...host.buildTextBillingMetadata(calc, billingContext),
        ...(params.metadata ?? {}),
      },
    })

    await host.incrementOrgMemberUsage(owner, finalCredits)
    return { credits: finalCredits, balance: debitResult.balance, apiCost: calc.apiCost }
  }

  async processImageUsage(
    runtime: CreditsUsageRuntime,
    host: CreditsUsageHost,
    params: {
      userId: string
      campaignId?: string
      orgId?: string
      modelName?: string
    },
  ): Promise<UsageResult | null> {
    const model = params.modelName ?? 'imagen-4.0-generate-001'
    const owner = await host.resolveCreditsOwner(params.userId, params.orgId)
    const calc = await host.calculateImageCredits(model)
    const discount = await host.getCreditDiscount(owner)
    const finalCredits = host.applyDiscount(calc.credits, discount)
    const debitResult = await this.deductIncurredOwnerCredits(host, owner, finalCredits)

    await runtime.repository.insertUsageEvent(runtime.supabase, {
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      campaign_id: params.campaignId || null,
      feature: 'media',
      action: 'generate',
      provider: 'google',
      model_name: model,
      service_type: 'image',
      computed_cost: calc.apiCost,
      cost_source: 'fixed_pricing',
      credits_charged: finalCredits,
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
      },
    })

    await host.incrementOrgMemberUsage(owner, finalCredits)
    return { credits: finalCredits, balance: debitResult.balance, apiCost: calc.apiCost }
  }

  async processFixedCostUsage(
    runtime: CreditsUsageRuntime,
    host: CreditsUsageHost,
    imageMargin: number,
    params: {
      userId: string
      campaignId?: string
      conversationId?: string
      orgId?: string
      feature: string
      action: string
      provider: string
      modelName: string
      serviceType: 'image' | 'video'
      apiCostUsd: number
      costSource?: string
      metadata?: Record<string, unknown>
    },
  ): Promise<UsageResult> {
    const calc = host.calculateFixedCostCredits(params.apiCostUsd, imageMargin)
    const owner = await host.resolveCreditsOwner(params.userId, params.orgId)
    const discount = await host.getCreditDiscount(owner)
    const finalCredits = host.applyDiscount(calc.credits, discount)
    const debitResult = await this.deductIncurredOwnerCredits(host, owner, finalCredits)

    await runtime.repository.insertUsageEvent(runtime.supabase, {
      user_id: params.userId,
      org_id: owner.orgId ?? null,
      campaign_id: params.campaignId || null,
      conversation_id: params.conversationId || null,
      feature: params.feature,
      action: params.action,
      provider: params.provider,
      model_name: params.modelName,
      service_type: params.serviceType,
      computed_cost: calc.apiCost,
      cost_source: params.costSource ?? 'fixed_pricing',
      credits_charged: finalCredits,
      metadata_json: {
        requesting_user_id: params.userId,
        calculated_credits: calc.credits,
        overdraft_credits: debitResult.overdraftCredits,
        ...(params.metadata ?? {}),
      },
    })

    await host.incrementOrgMemberUsage(owner, finalCredits)
    return { credits: finalCredits, balance: debitResult.balance, apiCost: calc.apiCost }
  }

  private async trackSubscriptionUsage(
    runtime: CreditsUsageRuntime,
    host: CreditsUsageHost,
    input: {
      billingContext: TextBillingContext
      calc: CreditCalculation
      model: string
      owner: CreditsOwnerResolution
      params: {
        action?: string
        campaignId?: string
        conversationId?: string
        costSource?: string
        feature: string
        generationIds?: string[]
        preComputedCost?: number
        userId: string
      }
      provider: string
      usage: TokenUsage
    },
  ): Promise<UsageResult> {
    await runtime.repository.insertUsageEvent(runtime.supabase, {
      user_id: input.params.userId,
      org_id: input.owner.orgId ?? null,
      campaign_id: input.params.campaignId || null,
      conversation_id: input.params.conversationId || null,
      feature: input.params.feature,
      action: input.params.action || 'generate',
      provider: input.provider,
      model_name: input.model,
      service_type: 'text',
      input_tokens: input.usage.input,
      output_tokens: input.usage.output,
      cache_read_tokens: input.usage.cacheRead,
      cache_write_tokens: input.usage.cacheWrite,
      total_tokens: input.usage.totalTokens,
      computed_cost: 0,
      cost_source: 'subscription',
      generation_ids: input.params.generationIds ?? undefined,
      credits_charged: 0,
      metadata_json: {
        requesting_user_id: input.params.userId,
        billing_source: 'subscription',
        actual_cost_usd: 0,
        equivalent_cost_usd: input.calc.apiCost,
        equivalent_cost_source: host.resolveTextCostSource(input.params),
        equivalent_credits: input.calc.credits,
        ...host.buildTextBillingMetadata(input.calc, input.billingContext),
      },
    })

    const balance = await host.getBalanceForOwner(input.owner)
    return { credits: 0, balance, apiCost: 0 }
  }

  private async deductIncurredOwnerCredits(
    host: CreditsUsageHost,
    owner: CreditsOwnerResolution,
    credits: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }> {
    if (credits <= 0) {
      return { balance: await host.getBalanceForOwner(owner), overdraftCredits: 0 }
    }
    return owner.billingType === 'org' && owner.orgId
      ? host.deductIncurredOrgCredits(owner.orgId, credits)
      : host.deductIncurredCredits(owner.creditsOwnerId, credits)
  }

  private buildBillingContext(input: {
    contextWindowTokens?: number
    modelSettings?: unknown
    requestedModelId?: string
    resolvedModelId?: string
  }): TextBillingContext {
    return {
      contextWindowTokens: input.contextWindowTokens,
      requestedModelId: input.requestedModelId,
      resolvedModelId: input.resolvedModelId,
      modelSettings: input.modelSettings,
    }
  }
}
