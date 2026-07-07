/**
 * Credits Service
 *
 * Public billing facade for credit calculation, balance checks, and usage deduction.
 */

import { Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { BillingCreditsRepository } from '../repositories/billing-credits.repository'
import { CreditsBalanceService } from './credits-balance.service'
import { CreditsPricingService } from './credits-pricing.service'
import { CreditsTranscriptService } from './credits-transcript.service'
import { CreditsUsageProcessingService } from './credits-usage-processing.service'
import type {
  CreditBalance,
  CreditCalculation,
  CreditsOwnerResolution,
  TextBillingContext,
  TokenUsage,
} from './credits.types'

export type {
  CreditBalance,
  CreditCalculation,
  CreditsOwnerResolution,
  TextBillingContext,
  TextPricingTierSelection,
  TokenUsage,
} from './credits.types'

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name)
  private readonly supabase: SupabaseClient
  private readonly openclawSessionsDir: string
  private readonly TEXT_MARGIN = 2
  private readonly IMAGE_MARGIN = 2
  private readonly BRAIN_MARGIN = 2
  private readonly CREDITS_PER_DOLLAR = 200
  private readonly FREE_BASE_CREDITS = 3_000
  private readonly creditDiscountCache = new Map<string, { percent: number; ts: number }>()

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly repository: BillingCreditsRepository = new BillingCreditsRepository(),
    private readonly transcriptService: CreditsTranscriptService = new CreditsTranscriptService(),
    private readonly pricingService: CreditsPricingService = new CreditsPricingService(),
    private readonly balanceService: CreditsBalanceService = new CreditsBalanceService(),
    private readonly usageProcessingService: CreditsUsageProcessingService = new CreditsUsageProcessingService(),
  ) {
    this.supabase = svc.client
    this.openclawSessionsDir = this.transcriptService.resolveSessionsDir()
  }

  getRawSupabase(): SupabaseClient {
    return this.supabase
  }

  isSubscriptionBackedModelId(modelId: unknown): boolean {
    if (typeof modelId !== 'string') return false
    const normalized = modelId.trim().replace(/^openrouter\//, '')
    return (
      normalized.startsWith('openai-codex/') ||
      normalized.startsWith('anthropic-subscription/')
    )
  }

  async resolveCreditsOwner(
    userId: string,
    orgId?: string | null,
  ): Promise<CreditsOwnerResolution> {
    return this.balanceService.resolveCreditsOwner(this.runtime(), userId, orgId)
  }

  async assertHasAvailableCredits(userId: string, orgId?: string | null): Promise<CreditBalance> {
    return this.balanceService.assertHasAvailableCredits(this.runtime(), userId, orgId)
  }

  async getUsageFromTranscript(sessionKey: string): Promise<TokenUsage | null> {
    return this.transcriptService.getUsageFromTranscript(
      sessionKey,
      this.openclawSessionsDir,
      this.logger,
    )
  }

  async calculateTextCredits(
    usage: TokenUsage,
    modelName = 'claude-opus-4-6',
    preComputedCost?: number,
    marginOverride?: number,
    _billingContext?: TextBillingContext,
  ): Promise<CreditCalculation> {
    return this.pricingService.calculateTextCredits(
      this.runtime(),
      usage,
      modelName,
      preComputedCost,
      marginOverride,
    )
  }

  async calculateImageCredits(
    modelName = 'gemini-3.1-flash-image-preview',
  ): Promise<CreditCalculation> {
    return this.pricingService.calculateImageCredits(this.runtime(), modelName)
  }

  async calculateTranscribeCredits(
    durationMinutes: number,
    modelName = 'nova-2',
  ): Promise<CreditCalculation> {
    return this.pricingService.calculateTranscribeCredits(
      this.runtime(),
      durationMinutes,
      modelName,
    )
  }

  calculateFixedCostCredits(apiCostUsd: number, margin: number): CreditCalculation {
    return this.pricingService.calculateFixedCostCredits(
      this.CREDITS_PER_DOLLAR,
      apiCostUsd,
      margin,
    )
  }

  async getUnitCost(modelName: string, unitType: string): Promise<number | null> {
    return this.pricingService.getUnitCost(this.runtime(), modelName, unitType)
  }

  async getBalance(userId: string): Promise<CreditBalance> {
    return this.balanceService.getBalance(this.runtime(), userId)
  }

  async resolvePersonalMonthlyUsageLedgerRowId(userId: string): Promise<string | null> {
    return this.balanceService.resolvePersonalMonthlyUsageLedgerRowId(this.runtime(), userId)
  }

  async getOrgBalance(orgId: string): Promise<CreditBalance> {
    return this.balanceService.getOrgBalance(this.runtime(), orgId)
  }

  async hasCredits(userId: string, creditsNeeded: number): Promise<boolean> {
    return this.balanceService.hasCredits(this.runtime(), userId, creditsNeeded)
  }

  async deductCredits(userId: string, creditsToDeduct: number): Promise<CreditBalance> {
    return this.balanceService.deductCredits(this.runtime(), userId, creditsToDeduct)
  }

  async deductOrgCredits(orgId: string, creditsToDeduct: number): Promise<CreditBalance> {
    return this.balanceService.deductOrgCredits(this.runtime(), orgId, creditsToDeduct)
  }

  async deductIncurredCredits(
    userId: string,
    creditsToDeduct: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }> {
    return this.balanceService.deductIncurredCredits(this.runtime(), userId, creditsToDeduct)
  }

  async deductIncurredOrgCredits(
    orgId: string,
    creditsToDeduct: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }> {
    return this.balanceService.deductIncurredOrgCredits(this.runtime(), orgId, creditsToDeduct)
  }

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
    const result = await this.usageProcessingService.processUsage(
      this.runtime(),
      this as unknown as any,
      params,
    )
    if (!result) {
      this.logger.debug(`No usage data from transcript for ${params.sessionKey}`)
    }
    return result
  }

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
    return this.usageProcessingService.processDirectTextUsage(
      this.runtime(),
      this as unknown as any,
      params,
    )
  }

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
    return this.usageProcessingService.processImageUsage(
      this.runtime(),
      this as unknown as any,
      params,
    )
  }

  async processFixedCostUsage(params: {
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
  }): Promise<{
    credits: number
    balance: CreditBalance
    apiCost: number
  }> {
    return this.usageProcessingService.processFixedCostUsage(
      this.runtime(),
      this as unknown as any,
      this.IMAGE_MARGIN,
      params,
    )
  }

  async getPlanInfo(userId: string): Promise<{
    name: string
    slug: string
    price: number
    billingPeriod: string
    baseCredits: number
  }> {
    return this.balanceService.getPlanInfo(this.runtime(), userId)
  }

  async getActivePlans(): Promise<unknown[]> {
    return this.balanceService.getActivePlans(this.runtime())
  }

  async getCreditPacks(): Promise<unknown[]> {
    return this.balanceService.getCreditPacks(this.runtime())
  }

  async getRecentUsage(userId: string, limit = 50): Promise<unknown[]> {
    return this.balanceService.getRecentUsage(this.runtime(), userId, limit)
  }

  async getCreditDiscount(owner: CreditsOwnerResolution): Promise<number> {
    return this.balanceService.getCreditDiscount(this.runtime(), owner)
  }

  private getBalanceForOwner(owner: CreditsOwnerResolution): Promise<CreditBalance> {
    return this.balanceService.getBalanceForOwner(this.runtime(), owner)
  }

  private getChargeableCredits(
    owner: CreditsOwnerResolution,
    requestedCredits: number,
  ): Promise<number> {
    return this.balanceService.getChargeableCredits(this.runtime(), owner, requestedCredits)
  }

  private incrementOrgMemberUsage(
    owner: CreditsOwnerResolution,
    credits: number,
  ): Promise<void> {
    return this.balanceService.incrementOrgMemberUsage(this.runtime(), owner, credits)
  }

  private applyDiscount(credits: number, discountPercent: number): number {
    return this.balanceService.applyDiscount(credits, discountPercent)
  }

  private buildTextBillingMetadata(
    calc: CreditCalculation,
    billingContext?: TextBillingContext,
  ): Record<string, unknown> {
    return this.pricingService.buildTextBillingMetadata(calc, billingContext)
  }

  private isSubscriptionBillingContext(
    modelName: string,
    billingContext: TextBillingContext,
  ): boolean {
    return this.pricingService.isSubscriptionBillingContext(
      modelName,
      billingContext,
      this.isSubscriptionBackedModelId.bind(this),
    )
  }

  private resolveTextCostSource(params: {
    costSource?: string
    preComputedCost?: number
  }): string {
    return this.pricingService.resolveTextCostSource(params)
  }

  private deriveProvider(modelId: string): string {
    return this.pricingService.deriveProvider(modelId)
  }

  private runtime() {
    return {
      creditDiscountCache: this.creditDiscountCache,
      creditsPerDollar: this.CREDITS_PER_DOLLAR,
      freeBaseCredits: this.FREE_BASE_CREDITS,
      imageMargin: this.IMAGE_MARGIN,
      logger: this.logger,
      repository: this.repository,
      supabase: this.supabase,
      textMargin: this.TEXT_MARGIN,
    }
  }
}
