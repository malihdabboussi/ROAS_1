import * as path from 'path'
import { HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import type { ErrorReporter } from '@vibey/api-shared'
import { FREE_BASE_CREDITS } from '../constants/credit-allowances'
import { BillingCreditsAutoRechargeRepository } from '../repositories/billing-credits-auto-recharge.repository'
import { BillingCreditsRepository } from '../repositories/billing-credits.repository'
import type { CreditBalance, CreditsOwnerResolution } from './credits.types'

export abstract class CreditsServiceBase {
  protected readonly logger = new Logger('CreditsService')
  protected readonly openclawSessionsDir: string
  protected readonly stripe: Stripe | null
  protected readonly TEXT_MARGIN = 2
  protected readonly IMAGE_MARGIN = 2
  protected readonly CREDITS_PER_DOLLAR = 200

  constructor(
    protected readonly configService: ConfigService,
    protected readonly errorReporter: ErrorReporter,
    protected readonly creditsRepository: BillingCreditsRepository,
    protected readonly creditsAutoRechargeRepository: BillingCreditsAutoRechargeRepository,
  ) {
    // OpenClaw sessions directory for the vibey agent
    this.openclawSessionsDir =
      process.env.OPENCLAW_SESSIONS_DIR ||
      path.join(process.env.HOME || '/root', '.openclaw/agents/vibey/sessions')

    const stripeSecret =
      this.configService.get<string>('STRIPE_SECRET_KEY') ?? process.env.STRIPE_SECRET_KEY
    this.stripe = stripeSecret ? new Stripe(stripeSecret) : null
  }

  abstract getBalance(userId: string): Promise<CreditBalance>

  abstract getOrgBalance(orgId: string): Promise<CreditBalance>

  async resolveCreditsOwner(
    userId: string,
    orgId?: string | null,
  ): Promise<CreditsOwnerResolution> {
    if (orgId) {
      const { data: member, error: memberErr } = await this.creditsRepository.findActiveOrgMember(
        orgId,
        userId,
      )
      if (memberErr) {
        this.logger.warn(
          `resolveCreditsOwner org lookup failed for ${userId}: ${memberErr.message}`,
        )
      }
      return {
        creditsOwnerId: orgId,
        billingType: 'org',
        orgId,
        orgMemberId: member?.id ? String(member.id) : null,
      }
    }

    return {
      creditsOwnerId: userId,
      billingType: 'personal',
      orgId: null,
      orgMemberId: null,
    }
  }

  async assertHasAvailableCredits(userId: string, orgId?: string | null): Promise<CreditBalance> {
    const owner = await this.resolveCreditsOwner(userId, orgId)
    const balance =
      owner.billingType === 'org' && owner.orgId
        ? await this.getOrgBalance(owner.orgId)
        : await this.getBalance(owner.creditsOwnerId)

    if (owner.orgMemberId) {
      const { data: limit, error: limitError } =
        await this.creditsRepository.findOrgMemberCreditLimit(owner.orgMemberId)
      if (limitError) throw new Error(limitError.message)
      if (
        limit &&
        limit.period !== 'uncapped' &&
        Number(limit.credits_used ?? 0) >= Number(limit.credit_limit ?? 0)
      ) {
        throw new HttpException(
          {
            error: 'org_credit_limit_reached',
            toast_key: `CREDIT_LIMIT_REACHED_${String(limit.period).toUpperCase()}`,
            message: `Your ${limit.period} credit limit has been reached.`,
          },
          HttpStatus.PAYMENT_REQUIRED,
        )
      }
    }

    if (balance.totalAvailable <= 0) {
      throw new HttpException(
        {
          error: 'credits_exhausted',
          message:
            'You have run out of credits. Please purchase more credits or upgrade your plan.',
          balance: {
            totalAvailable: 0,
            totalUsed: balance.totalUsed,
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    return balance
  }

  protected async getBalanceForOwner(owner: CreditsOwnerResolution): Promise<CreditBalance> {
    return owner.billingType === 'org' && owner.orgId
      ? this.getOrgBalance(owner.orgId)
      : this.getBalance(owner.creditsOwnerId)
  }

  protected async getChargeableCredits(
    owner: CreditsOwnerResolution,
    requestedCredits: number,
  ): Promise<number> {
    const balance = await this.getBalanceForOwner(owner)
    const available = Math.max(0, balance.totalAvailable)
    if (available <= 0) {
      throw new HttpException(
        {
          error: 'credits_exhausted',
          message:
            'You have run out of credits. Please purchase more credits or upgrade your plan.',
          balance: {
            totalAvailable: 0,
            totalUsed: balance.totalUsed,
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      )
    }
    return Math.min(requestedCredits, available)
  }

  protected async incrementOrgMemberUsage(
    owner: CreditsOwnerResolution,
    credits: number,
  ): Promise<void> {
    if (!owner.orgMemberId || credits <= 0) return
    const { data: limit } = await this.creditsRepository.findOrgMemberCreditsUsed(
      owner.orgMemberId,
    )
    if (!limit) return
    await this.creditsRepository.updateOrgMemberCreditsUsed(
      owner.orgMemberId,
      Number(limit.credits_used ?? 0) + credits,
    )
  }

  protected deriveProvider(modelName: string): string {
    if (modelName.includes('gemini') || modelName.includes('imagen')) return 'google'
    if (modelName.includes('claude') || modelName.includes('anthropic')) return 'anthropic'
    if (modelName.includes('deepgram')) return 'deepgram'
    if (modelName.includes('gpt') || modelName.includes('openai')) return 'openai'
    if (modelName.startsWith('scrapecreators/')) return 'scrapecreators'
    if (modelName.startsWith('dataforseo/')) return 'dataforseo'
    if (modelName.includes('/')) return modelName.split('/')[0]
    return 'unknown'
  }

  // ============================================================
  // PUBLIC QUERY METHODS (for BillingController)
  // ============================================================

  /**
   * Get user's plan info for billing status display.
   */
  async getPlanInfo(userId: string): Promise<{
    name: string
    slug: string
    price: number
    billingPeriod: string
    baseCredits: number
  }> {
    const plan = await this.getUserPlan(userId)
    return {
      name: String(plan?.name ?? 'Free'),
      slug: String(plan?.slug ?? 'free'),
      price: parseFloat(String(plan?.price ?? '0')),
      billingPeriod: String(plan?.billing_period ?? 'monthly'),
      baseCredits: this.getStackedBaseAllowance(plan),
    }
  }

  /**
   * Get all active subscription plans.
   */
  async getActivePlans(): Promise<unknown[]> {
    const { data } = await this.creditsRepository.listActivePlans()
    return data ?? []
  }

  /**
   * Get available credit packs.
   */
  async getCreditPacks(): Promise<unknown[]> {
    const { data } = await this.creditsRepository.listActiveCreditPacks()
    return data ?? []
  }

  /**
   * Get recent usage events for a user.
   */
  async getRecentUsage(userId: string, limit = 50): Promise<unknown[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data } = await this.creditsRepository.listRecentUserUsage(
      userId,
      thirtyDaysAgo.toISOString(),
      limit,
    )

    return data ?? []
  }

  // ============================================================
  // HELPERS
  // ============================================================

  protected readonly creditDiscountCache = new Map<string, { percent: number; ts: number }>()

  async getCreditDiscount(owner: CreditsOwnerResolution): Promise<number> {
    const cacheKey =
      owner.billingType === 'org' && owner.orgId
        ? `org:${owner.orgId}`
        : `user:${owner.creditsOwnerId}`
    const cached = this.creditDiscountCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < 60_000) return cached.percent

    let percent = 0
    if (owner.billingType === 'org' && owner.orgId) {
      const { data } = await this.creditsRepository.findOrgCreditDiscount(owner.orgId)
      percent = data?.credit_discount_percent ?? 0
    } else {
      const { data } = await this.creditsRepository.findUserCreditDiscount(owner.creditsOwnerId)
      percent = data?.credit_discount_percent ?? 0
    }

    this.creditDiscountCache.set(cacheKey, { percent, ts: Date.now() })
    return percent
  }

  protected applyDiscount(credits: number, discountPercent: number): number {
    if (discountPercent <= 0) return credits
    return Math.max(1, Math.ceil(credits * (1 - discountPercent / 100)))
  }

  /**
   * Compute stacked base allowance: free tier credits + paid plan credits.
   * Free users get FREE_BASE_CREDITS. Paid users get FREE_BASE_CREDITS + plan.base_credits.
   */
  protected getStackedBaseAllowance(plan: { slug: string; base_credits: number } | null): number {
    if (!plan || plan.slug === 'free') return FREE_BASE_CREDITS
    return FREE_BASE_CREDITS + plan.base_credits
  }

  /**
   * Get user's current subscription plan.
   */
  protected async getUserPlan(userId: string): Promise<{
    slug: string
    base_credits: number
    rollover_cap: number
    [key: string]: unknown
  } | null> {
    // Check for active subscription
    const { data: sub } = await this.creditsRepository.findActiveUserSubscription(userId)

    if (sub) {
      const { data: plan } = await this.creditsRepository.findPlanById(sub.plan_id)

      if (plan) return plan
    }

    // Check for active trial
    const { data: trial } = await this.creditsRepository.findUserTrial(userId)

    if (trial && new Date(trial.trial_end_date) > new Date()) {
      const slug = trial.trial_type === 'paid' ? 'pro-monthly' : 'starter-monthly'
      const { data: plan } = await this.creditsRepository.findPlanBySlug(slug)

      if (plan) return plan
    }

    // Default to free plan
    const { data: freePlan } = await this.creditsRepository.findPlanBySlug('free')

    return freePlan
  }

  /**
   * Normalize OpenRouter model ID (provider/model-name) for DB pricing lookup.
   * token_providers_pricing has provider and model_name as separate columns.
   */
  protected normalizeModelForPricing(modelId: string): {
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
