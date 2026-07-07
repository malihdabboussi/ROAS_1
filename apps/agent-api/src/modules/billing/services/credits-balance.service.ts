import { HttpException, HttpStatus, Injectable, type Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  BillingCreditsRepository,
  type BillingPlanRow,
  type MonthlyCreditUsageRow,
} from '../repositories/billing-credits.repository'
import { throwCreditsExhausted, throwInsufficientCredits } from './credits-balance-errors'
import type { CreditBalance, CreditsOwnerResolution } from './credits.types'

export interface CreditsBalanceRuntime {
  creditDiscountCache: Map<string, { percent: number; ts: number }>
  freeBaseCredits: number
  logger: Logger
  repository: BillingCreditsRepository
  supabase: SupabaseClient
}

@Injectable()
export class CreditsBalanceService {
  async resolveCreditsOwner(
    runtime: CreditsBalanceRuntime,
    userId: string,
    orgId?: string | null,
  ): Promise<CreditsOwnerResolution> {
    if (orgId) {
      const member = await runtime.repository.findActiveOrgMember(runtime.supabase, { orgId, userId })
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

  async assertHasAvailableCredits(
    runtime: CreditsBalanceRuntime,
    userId: string,
    orgId?: string | null,
  ): Promise<CreditBalance> {
    const owner = await this.resolveCreditsOwner(runtime, userId, orgId)
    const balance = await this.getBalanceForOwner(runtime, owner)

    if (owner.orgMemberId) {
      const { limit, errorMessage } = await runtime.repository.findOrgMemberCreditLimit(
        runtime.supabase,
        owner.orgMemberId,
      )
      if (errorMessage) throw new Error(errorMessage)
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

    this.assertPositiveBalance(balance)
    return balance
  }

  async getBalanceForOwner(
    runtime: CreditsBalanceRuntime,
    owner: CreditsOwnerResolution,
  ): Promise<CreditBalance> {
    return owner.billingType === 'org' && owner.orgId
      ? this.getOrgBalance(runtime, owner.orgId)
      : this.getBalance(runtime, owner.creditsOwnerId)
  }

  async getChargeableCredits(
    runtime: CreditsBalanceRuntime,
    owner: CreditsOwnerResolution,
    requestedCredits: number,
  ): Promise<number> {
    const balance = await this.getBalanceForOwner(runtime, owner)
    this.assertPositiveBalance(balance)
    return Math.min(requestedCredits, Math.max(0, balance.totalAvailable))
  }

  async incrementOrgMemberUsage(
    runtime: CreditsBalanceRuntime,
    owner: CreditsOwnerResolution,
    credits: number,
  ): Promise<void> {
    if (!owner.orgMemberId || credits <= 0) return
    const limit = await runtime.repository.findOrgMemberCreditsUsed(runtime.supabase, owner.orgMemberId)
    if (!limit) return
    await runtime.repository.updateOrgMemberCreditsUsed(
      runtime.supabase,
      owner.orgMemberId,
      Number(limit.credits_used ?? 0) + credits,
    )
  }

  async getBalance(runtime: CreditsBalanceRuntime, userId: string): Promise<CreditBalance> {
    const now = new Date()
    const plan = await this.getUserPlan(runtime, userId)
    const baseAllowance = this.getStackedBaseAllowance(runtime, plan)
    const rolloverCap = plan?.rollover_cap ?? 0
    const stripePeriodStart = await this.getActiveSubscriptionPeriodStartIso(runtime, userId)
    const purchases = await runtime.repository.listCompletedCreditPurchases(runtime.supabase, userId)
    const totalPurchased = purchases.reduce((sum, p) => sum + p.credits_purchased, 0)
    const period = await this.resolvePersonalUsagePeriod(runtime, {
      userId,
      stripePeriodStart,
    })
    const newPeriodStart = this.resolveNewPersonalPeriodStart(period.latestRowFree, {
      now,
      stripePeriodStart,
      periodAnchorRow: period.periodAnchorRow,
    })

    if (newPeriodStart) {
      const carry = await this.resolveCarryForwardUsage(runtime, {
        userId,
        stripePeriodStart,
        periodStart: newPeriodStart,
        latestRowFree: period.latestRowFree,
        plan,
        rolloverCap,
      })
      await runtime.repository.insertMonthlyUsage(runtime.supabase, {
        user_id: userId,
        month: newPeriodStart,
        base_allowance: baseAllowance,
        base_credits_used: 0,
        purchased_credits_used: carry.purchasedUsed,
        total_credits_used: 0,
        total_credits_purchased: totalPurchased,
        rollover_credits: carry.rolloverCredits,
      })

      const purchasedAvailable = Math.max(0, totalPurchased - carry.purchasedUsed)
      return {
        baseCredits: baseAllowance,
        baseCreditsUsed: 0,
        rolloverCredits: carry.rolloverCredits,
        purchasedCredits: totalPurchased,
        purchasedCreditsUsed: carry.purchasedUsed,
        totalAvailable: baseAllowance + carry.rolloverCredits + purchasedAvailable,
        totalUsed: 0,
      }
    }

    return this.buildPersonalBalance(baseAllowance, totalPurchased, period.usageRowForBalance!)
  }

  async resolvePersonalMonthlyUsageLedgerRowId(
    runtime: CreditsBalanceRuntime,
    userId: string,
  ): Promise<string | null> {
    const row = await this.getPersonalMonthlyUsageRowForDeduction(runtime, userId)
    return row?.id ?? null
  }

  async getOrgBalance(runtime: CreditsBalanceRuntime, orgId: string): Promise<CreditBalance> {
    const orgPlan = await this.getOrgPlan(runtime, orgId)
    const hasPaidPlan = orgPlan && orgPlan.slug !== 'free'
    const baseAllowance = hasPaidPlan ? orgPlan.base_credits : 0
    const usage = await runtime.repository.findLatestOrgMonthlyUsage(runtime.supabase, orgId)
    const orgPurchases = await runtime.repository.listCompletedOrgCreditPurchases(
      runtime.supabase,
      orgId,
    )
    const totalPurchased = orgPurchases.reduce((sum, p) => sum + p.credits_purchased, 0)

    if (!usage) {
      return {
        baseCredits: baseAllowance,
        baseCreditsUsed: 0,
        rolloverCredits: 0,
        purchasedCredits: totalPurchased,
        purchasedCreditsUsed: 0,
        totalAvailable: baseAllowance + totalPurchased,
        totalUsed: 0,
      }
    }

    const baseAvailable = Math.max(0, baseAllowance - (usage.base_credits_used ?? 0))
    const rolloverAvailable = usage.rollover_credits ?? 0
    const purchasedAvailable = Math.max(0, totalPurchased - (usage.purchased_credits_used ?? 0))
    return {
      baseCredits: baseAllowance,
      baseCreditsUsed: usage.base_credits_used ?? 0,
      rolloverCredits: rolloverAvailable,
      purchasedCredits: totalPurchased,
      purchasedCreditsUsed: usage.purchased_credits_used ?? 0,
      totalAvailable: baseAvailable + rolloverAvailable + purchasedAvailable,
      totalUsed: usage.total_credits_used ?? 0,
    }
  }

  async hasCredits(runtime: CreditsBalanceRuntime, userId: string, creditsNeeded: number): Promise<boolean> {
    const balance = await this.getBalance(runtime, userId)
    return balance.totalAvailable >= creditsNeeded
  }

  async deductCredits(
    runtime: CreditsBalanceRuntime,
    userId: string,
    creditsToDeduct: number,
  ): Promise<CreditBalance> {
    const currentBalance = await this.getBalance(runtime, userId)
    this.assertEnoughCredits(currentBalance, creditsToDeduct)
    const plan = await this.getUserPlan(runtime, userId)
    const baseAllowance = this.getStackedBaseAllowance(runtime, plan)
    const usage = await this.getPersonalMonthlyUsageRowForDeduction(runtime, userId)

    if (!usage) {
      runtime.logger.error(`No usage record for ${userId}`)
      return this.getBalance(runtime, userId)
    }

    const allocation = this.allocateDeduction({
      creditsToDeduct,
      baseAllowance,
      baseUsed: usage.base_credits_used ?? 0,
      rolloverCredits: usage.rollover_credits ?? 0,
      purchasedUsed: usage.purchased_credits_used ?? 0,
      totalUsed: usage.total_credits_used ?? 0,
    })
    await runtime.repository.updateMonthlyUsage(runtime.supabase, usage.id, allocation.payload)
    runtime.logger.log(
      `Deducted ${creditsToDeduct} credits from ${userId} (base=${allocation.fromBase}, rollover=${allocation.fromRollover}, purchased=${allocation.fromPurchased})`,
    )

    const updatedBalance = await this.getBalance(runtime, userId)
    return this.runAutoRechargeViaMainApi(runtime, { user_id: userId }, updatedBalance)
  }

  async deductIncurredCredits(
    runtime: CreditsBalanceRuntime,
    userId: string,
    creditsToDeduct: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }> {
    const currentBalance = await this.getBalance(runtime, userId)
    const overdraftCredits = Math.max(0, creditsToDeduct - currentBalance.totalAvailable)
    const plan = await this.getUserPlan(runtime, userId)
    const baseAllowance = this.getStackedBaseAllowance(runtime, plan)
    const usage = await this.getPersonalMonthlyUsageRowForDeduction(runtime, userId)

    if (!usage) {
      runtime.logger.error(`No usage record for incurred debit ${userId}`)
      return { balance: await this.getBalance(runtime, userId), overdraftCredits }
    }

    const allocation = this.allocateDeduction({
      creditsToDeduct,
      baseAllowance,
      baseUsed: usage.base_credits_used ?? 0,
      rolloverCredits: usage.rollover_credits ?? 0,
      purchasedUsed: usage.purchased_credits_used ?? 0,
      totalUsed: usage.total_credits_used ?? 0,
    })
    await runtime.repository.updateMonthlyUsage(runtime.supabase, usage.id, allocation.payload)
    runtime.logger.log(
      `Deducted incurred ${creditsToDeduct} credits from ${userId} (base=${allocation.fromBase}, rollover=${allocation.fromRollover}, purchased=${allocation.fromPurchased}, overdraft=${overdraftCredits})`,
    )

    const updatedBalance = await this.getBalance(runtime, userId)
    return {
      balance: await this.runAutoRechargeViaMainApi(runtime, { user_id: userId }, updatedBalance),
      overdraftCredits,
    }
  }

  async deductOrgCredits(
    runtime: CreditsBalanceRuntime,
    orgId: string,
    creditsToDeduct: number,
  ): Promise<CreditBalance> {
    const currentBalance = await this.getOrgBalance(runtime, orgId)
    this.assertEnoughCredits(currentBalance, creditsToDeduct)
    const orgPlan = await this.getOrgPlan(runtime, orgId)
    const hasPaidPlan = orgPlan && orgPlan.slug !== 'free'
    const baseAllowance = hasPaidPlan ? orgPlan.base_credits : 0
    const usage = await runtime.repository.findLatestOrgMonthlyUsage(runtime.supabase, orgId)

    if (!usage) {
      runtime.logger.error(`No org usage record for ${orgId}`)
      return this.getOrgBalance(runtime, orgId)
    }

    const allocation = this.allocateDeduction({
      creditsToDeduct,
      baseAllowance,
      baseUsed: usage.base_credits_used ?? 0,
      rolloverCredits: usage.rollover_credits ?? 0,
      purchasedUsed: usage.purchased_credits_used ?? 0,
      totalUsed: usage.total_credits_used ?? 0,
    })
    await runtime.repository.updateOrgMonthlyUsage(runtime.supabase, usage.id, allocation.payload)
    runtime.logger.log(
      `Deducted ${creditsToDeduct} org credits from ${orgId} (base=${allocation.fromBase}, rollover=${allocation.fromRollover}, purchased=${allocation.fromPurchased})`,
    )

    const updatedBalance = await this.getOrgBalance(runtime, orgId)
    return this.runAutoRechargeViaMainApi(runtime, { org_id: orgId }, updatedBalance)
  }

  async deductIncurredOrgCredits(
    runtime: CreditsBalanceRuntime,
    orgId: string,
    creditsToDeduct: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }> {
    const currentBalance = await this.getOrgBalance(runtime, orgId)
    const overdraftCredits = Math.max(0, creditsToDeduct - currentBalance.totalAvailable)
    const orgPlan = await this.getOrgPlan(runtime, orgId)
    const hasPaidPlan = orgPlan && orgPlan.slug !== 'free'
    const baseAllowance = hasPaidPlan ? orgPlan.base_credits : 0
    const usage = await runtime.repository.findLatestOrgMonthlyUsage(runtime.supabase, orgId)

    if (!usage) {
      runtime.logger.error(`No org usage record for incurred debit ${orgId}`)
      return { balance: await this.getOrgBalance(runtime, orgId), overdraftCredits }
    }

    const allocation = this.allocateDeduction({
      creditsToDeduct,
      baseAllowance,
      baseUsed: usage.base_credits_used ?? 0,
      rolloverCredits: usage.rollover_credits ?? 0,
      purchasedUsed: usage.purchased_credits_used ?? 0,
      totalUsed: usage.total_credits_used ?? 0,
    })
    await runtime.repository.updateOrgMonthlyUsage(runtime.supabase, usage.id, allocation.payload)
    runtime.logger.log(
      `Deducted incurred ${creditsToDeduct} org credits from ${orgId} (base=${allocation.fromBase}, rollover=${allocation.fromRollover}, purchased=${allocation.fromPurchased}, overdraft=${overdraftCredits})`,
    )

    const updatedBalance = await this.getOrgBalance(runtime, orgId)
    return {
      balance: await this.runAutoRechargeViaMainApi(runtime, { org_id: orgId }, updatedBalance),
      overdraftCredits,
    }
  }

  async getPlanInfo(runtime: CreditsBalanceRuntime, userId: string) {
    const plan = await this.getUserPlan(runtime, userId)
    return {
      name: String(plan?.name ?? 'Free'),
      slug: String(plan?.slug ?? 'free'),
      price: parseFloat(String(plan?.price ?? '0')),
      billingPeriod: String(plan?.billing_period ?? 'monthly'),
      baseCredits: this.getStackedBaseAllowance(runtime, plan),
    }
  }

  async getActivePlans(runtime: CreditsBalanceRuntime): Promise<unknown[]> {
    return runtime.repository.listActivePlans(runtime.supabase)
  }

  async getCreditPacks(runtime: CreditsBalanceRuntime): Promise<unknown[]> {
    return runtime.repository.listCreditPacks(runtime.supabase)
  }

  async getRecentUsage(runtime: CreditsBalanceRuntime, userId: string, limit = 50): Promise<unknown[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return runtime.repository.listRecentUsage(runtime.supabase, {
      userId,
      sinceIso: thirtyDaysAgo.toISOString(),
      limit,
    })
  }

  async getCreditDiscount(
    runtime: CreditsBalanceRuntime,
    owner: CreditsOwnerResolution,
  ): Promise<number> {
    const cacheKey =
      owner.billingType === 'org' && owner.orgId
        ? `org:${owner.orgId}`
        : `user:${owner.creditsOwnerId}`
    const cached = runtime.creditDiscountCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < 60_000) return cached.percent

    const percent =
      owner.billingType === 'org' && owner.orgId
        ? await runtime.repository.findOrgCreditDiscount(runtime.supabase, owner.orgId)
        : await runtime.repository.findUserCreditDiscount(runtime.supabase, owner.creditsOwnerId)
    runtime.creditDiscountCache.set(cacheKey, { percent, ts: Date.now() })
    return percent
  }

  applyDiscount(credits: number, discountPercent: number): number {
    if (discountPercent <= 0) return credits
    return Math.max(1, Math.ceil(credits * (1 - discountPercent / 100)))
  }

  private async getActiveSubscriptionPeriodStartIso(
    runtime: CreditsBalanceRuntime,
    userId: string,
  ): Promise<string | null> {
    const activeSub = await runtime.repository.findActiveSubscriptionPeriodStart(
      runtime.supabase,
      userId,
    )
    return activeSub?.current_period_start
      ? new Date(activeSub.current_period_start).toISOString().split('T')[0]
      : null
  }

  private async getPersonalMonthlyUsageRowForDeduction(
    runtime: CreditsBalanceRuntime,
    userId: string,
  ): Promise<MonthlyCreditUsageRow | null> {
    const stripePeriodStart = await this.getActiveSubscriptionPeriodStartIso(runtime, userId)
    if (stripePeriodStart) {
      const gte = await runtime.repository.listMonthlyUsageSince(runtime.supabase, {
        userId,
        month: stripePeriodStart,
      })
      return gte.length === 0 ? null : gte.reduce((a, b) => (a.month > b.month ? a : b))
    }
    return runtime.repository.findLatestMonthlyUsage(runtime.supabase, userId)
  }

  private async getOrgPlan(runtime: CreditsBalanceRuntime, orgId: string): Promise<BillingPlanRow | null> {
    const sub = await runtime.repository.findActiveOrgSubscription(runtime.supabase, orgId)
    if (sub?.plan_id) {
      const plan = await runtime.repository.findPlanById(runtime.supabase, sub.plan_id)
      if (plan) return plan
    }
    return runtime.repository.findPlanBySlug(runtime.supabase, 'free')
  }

  private getStackedBaseAllowance(
    runtime: CreditsBalanceRuntime,
    plan: { slug: string; base_credits: number } | null,
  ): number {
    if (!plan || plan.slug === 'free') return runtime.freeBaseCredits
    return runtime.freeBaseCredits + plan.base_credits
  }

  private async getUserPlan(
    runtime: CreditsBalanceRuntime,
    userId: string,
  ): Promise<BillingPlanRow | null> {
    const sub = await runtime.repository.findActiveUserSubscription(runtime.supabase, userId)
    if (sub) {
      const plan = await runtime.repository.findPlanById(runtime.supabase, sub.plan_id)
      if (plan) return plan
    }

    const trial = await runtime.repository.findUserTrial(runtime.supabase, userId)
    if (trial && new Date(trial.trial_end_date) > new Date()) {
      const slug = trial.trial_type === 'paid' ? 'pro-monthly' : 'starter-monthly'
      const plan = await runtime.repository.findPlanBySlug(runtime.supabase, slug)
      if (plan) return plan
    }

    return runtime.repository.findPlanBySlug(runtime.supabase, 'free')
  }

  private async resolvePersonalUsagePeriod(
    runtime: CreditsBalanceRuntime,
    input: { userId: string; stripePeriodStart: string | null },
  ): Promise<{
    latestRowFree: MonthlyCreditUsageRow | null
    periodAnchorRow: MonthlyCreditUsageRow | null
    usageRowForBalance: MonthlyCreditUsageRow | null
  }> {
    if (input.stripePeriodStart) {
      const periodAnchorRow = await runtime.repository.findMonthlyUsageByMonth(runtime.supabase, {
        userId: input.userId,
        month: input.stripePeriodStart,
      })
      const gteRows = await runtime.repository.listMonthlyUsageSince(runtime.supabase, {
        userId: input.userId,
        month: input.stripePeriodStart,
      })
      return {
        latestRowFree: null,
        periodAnchorRow,
        usageRowForBalance:
          gteRows.length === 0
            ? periodAnchorRow
            : gteRows.reduce((a, b) => (a.month > b.month ? a : b)),
      }
    }

    const latestRowFree = await runtime.repository.findLatestMonthlyUsage(
      runtime.supabase,
      input.userId,
    )
    return { latestRowFree, periodAnchorRow: latestRowFree, usageRowForBalance: latestRowFree }
  }

  private resolveNewPersonalPeriodStart(
    latestRowFree: MonthlyCreditUsageRow | null,
    input: {
      now: Date
      periodAnchorRow: MonthlyCreditUsageRow | null
      stripePeriodStart: string | null
    },
  ): string | null {
    if (input.stripePeriodStart) {
      return input.periodAnchorRow ? null : input.stripePeriodStart
    }
    if (!latestRowFree) return input.now.toISOString().split('T')[0]

    const rowDate = new Date(latestRowFree.month + 'T00:00:00Z')
    return input.now.getTime() - rowDate.getTime() >= 30 * 24 * 60 * 60 * 1000
      ? input.now.toISOString().split('T')[0]
      : null
  }

  private async resolveCarryForwardUsage(
    runtime: CreditsBalanceRuntime,
    input: {
      latestRowFree: MonthlyCreditUsageRow | null
      periodStart: string
      plan: BillingPlanRow | null
      rolloverCap: number
      stripePeriodStart: string | null
      userId: string
    },
  ): Promise<{ rolloverCredits: number; purchasedUsed: number }> {
    if (input.stripePeriodStart) {
      const prevRow = await runtime.repository.findPreviousMonthlyUsageBefore(runtime.supabase, {
        userId: input.userId,
        month: input.periodStart,
      })
      const rolloverCredits =
        prevRow && input.plan && input.plan.slug !== 'free'
          ? Math.min(
              Math.max(0, (prevRow.base_allowance ?? 0) - (prevRow.base_credits_used ?? 0)),
              input.rolloverCap,
            )
          : 0
      const purchRows = await runtime.repository.listMonthlyPurchasedUsage(
        runtime.supabase,
        input.userId,
      )
      const purchasedUsed = Math.max(
        0,
        ...purchRows.map((r) => Number(r.purchased_credits_used ?? 0)),
      )
      return { rolloverCredits, purchasedUsed }
    }

    const rolloverCredits =
      input.latestRowFree && input.plan && input.plan.slug !== 'free'
        ? Math.min(
            Math.max(
              0,
              (input.latestRowFree.base_allowance ?? 0) -
                (input.latestRowFree.base_credits_used ?? 0),
            ),
            input.rolloverCap,
          )
        : 0
    return {
      rolloverCredits,
      purchasedUsed: input.latestRowFree?.purchased_credits_used ?? 0,
    }
  }

  private buildPersonalBalance(
    baseAllowance: number,
    totalPurchased: number,
    usage: MonthlyCreditUsageRow,
  ): CreditBalance {
    const baseAvailable = Math.max(0, baseAllowance - (usage.base_credits_used ?? 0))
    const rolloverAvailable = usage.rollover_credits ?? 0
    const purchasedAvailable = Math.max(0, totalPurchased - (usage.purchased_credits_used ?? 0))
    return {
      baseCredits: baseAllowance,
      baseCreditsUsed: usage.base_credits_used ?? 0,
      rolloverCredits: rolloverAvailable,
      purchasedCredits: totalPurchased,
      purchasedCreditsUsed: usage.purchased_credits_used ?? 0,
      totalAvailable: baseAvailable + rolloverAvailable + purchasedAvailable,
      totalUsed: usage.total_credits_used ?? 0,
    }
  }

  private allocateDeduction(input: {
    baseAllowance: number
    baseUsed: number
    creditsToDeduct: number
    purchasedUsed: number
    rolloverCredits: number
    totalUsed: number
  }) {
    let remaining = input.creditsToDeduct
    const baseAvailable = Math.max(0, input.baseAllowance - input.baseUsed)
    const fromBase = Math.min(remaining, baseAvailable)
    remaining -= fromBase
    const fromRollover = Math.min(remaining, input.rolloverCredits)
    remaining -= fromRollover
    const fromPurchased = remaining

    return {
      fromBase,
      fromRollover,
      fromPurchased,
      payload: {
        base_credits_used: input.baseUsed + fromBase,
        rollover_credits: input.rolloverCredits - fromRollover,
        purchased_credits_used: input.purchasedUsed + fromPurchased,
        total_credits_used: input.totalUsed + input.creditsToDeduct,
      },
    }
  }

  private assertPositiveBalance(balance: CreditBalance): void {
    if (balance.totalAvailable > 0) return
    throwCreditsExhausted(balance)
  }

  private assertEnoughCredits(balance: CreditBalance, creditsToDeduct: number): void {
    if (creditsToDeduct <= balance.totalAvailable) return
    throwInsufficientCredits(balance)
  }

  private async runAutoRechargeViaMainApi(
    runtime: CreditsBalanceRuntime,
    payload: { org_id: string } | { user_id: string },
    balance: CreditBalance,
  ): Promise<CreditBalance> {
    const mainApiUrlRaw = process.env.MAIN_API_URL
    const internalApiToken = process.env.INTERNAL_API_TOKEN
    if (!mainApiUrlRaw || !internalApiToken) return balance

    const mainApiUrl = mainApiUrlRaw.replace(/\/$/, '')
    const ownerId = 'user_id' in payload ? payload.user_id : payload.org_id
    try {
      const response = await fetch(`${mainApiUrl}/api/internal/billing/auto-recharge`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${internalApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        runtime.logger.warn(`Auto recharge API call failed for ${ownerId}: status=${response.status}`)
        return balance
      }

      const responsePayload = (await response.json()) as { balance?: CreditBalance }
      return responsePayload.balance ?? balance
    } catch (err) {
      runtime.logger.warn(
        `Auto recharge API call failed for ${ownerId}: ${err instanceof Error ? err.message : String(err)}`,
      )
      return balance
    }
  }
}
