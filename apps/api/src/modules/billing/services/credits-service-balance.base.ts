import { HttpException, HttpStatus } from '@nestjs/common'
import type { CreditBalance, MonthlyCreditUsageRow } from './credits.types'
import { CreditsCalculationBase } from './credits-service-calculation.base'

export abstract class CreditsBalanceBase extends CreditsCalculationBase {
  protected abstract runAutoRechargeIfNeeded(
    userId: string,
    balance: CreditBalance,
  ): Promise<CreditBalance>

  protected abstract runOrgAutoRechargeIfNeeded(
    orgId: string,
    balance: CreditBalance,
  ): Promise<CreditBalance>

  // ============================================================
  // BALANCE & DEDUCTION
  // ============================================================

  /**
   * Get current credit balance for a user.
   *
   * Period logic:
   *  - Paid users (active Stripe subscription): new row when billing period changes
   *  - Free / trial users: new row every rolling 30 days
   *  - Purchased credits are a lifetime wallet — never reset
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    const now = new Date()

    const plan = await this.getUserPlan(userId)
    const baseAllowance = this.getStackedBaseAllowance(plan)
    const rolloverCap = plan?.rollover_cap ?? 0

    const stripePeriodStart = await this.getActiveSubscriptionPeriodStartIso(userId)

    const { data: purchases } = await this.creditsRepository.listCompletedCreditPurchases(userId)

    const totalPurchased =
      purchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    let periodAnchorRow: MonthlyCreditUsageRow | null = null
    let usageRowForBalance: MonthlyCreditUsageRow | null = null
    let latestRowFree: MonthlyCreditUsageRow | null = null

    if (stripePeriodStart) {
      const { data: anchor } = await this.creditsRepository.findPersonalUsageByMonth(
        userId,
        stripePeriodStart,
      )

      const { data: gteRows } = await this.creditsRepository.listPersonalUsageSinceMonth(
        userId,
        stripePeriodStart,
      )

      const gte = (gteRows ?? []) as MonthlyCreditUsageRow[]
      periodAnchorRow = (anchor ?? null) as MonthlyCreditUsageRow | null
      usageRowForBalance =
        gte.length === 0 ? periodAnchorRow : gte.reduce((a, b) => (a.month > b.month ? a : b))
    } else {
      const { data: latestRow } = await this.creditsRepository.findLatestPersonalUsage(userId)
      latestRowFree = (latestRow ?? null) as MonthlyCreditUsageRow | null
      usageRowForBalance = latestRowFree
      periodAnchorRow = latestRowFree
    }

    let needsNewRow = false
    let periodStart = ''

    if (stripePeriodStart) {
      needsNewRow = !periodAnchorRow
      if (needsNewRow) periodStart = stripePeriodStart
    } else {
      if (!latestRowFree) {
        needsNewRow = true
        periodStart = now.toISOString().split('T')[0]
      } else {
        const rowDate = new Date(latestRowFree.month + 'T00:00:00Z')
        if (now.getTime() - rowDate.getTime() >= 30 * 24 * 60 * 60 * 1000) {
          needsNewRow = true
          periodStart = now.toISOString().split('T')[0]
        }
      }
    }

    if (needsNewRow) {
      let rolloverCredits = 0
      let carryPurchasedUsed = 0

      if (stripePeriodStart) {
        const { data: prevRow } = await this.creditsRepository.findPreviousPersonalUsageBefore(
          userId,
          stripePeriodStart,
        )

        if (prevRow && plan && plan.slug !== 'free') {
          const unusedBase = Math.max(
            0,
            (prevRow.base_allowance ?? 0) - (prevRow.base_credits_used ?? 0),
          )
          rolloverCredits = Math.min(unusedBase, rolloverCap)
        }

        const { data: purchRows } = await this.creditsRepository.listPersonalPurchasedUsage(userId)
        carryPurchasedUsed = Math.max(
          0,
          ...(purchRows ?? []).map((r) =>
            Number((r as { purchased_credits_used?: number }).purchased_credits_used ?? 0),
          ),
        )
      } else {
        if (latestRowFree && plan && plan.slug !== 'free') {
          const unusedBase = Math.max(
            0,
            (latestRowFree.base_allowance ?? 0) - (latestRowFree.base_credits_used ?? 0),
          )
          rolloverCredits = Math.min(unusedBase, rolloverCap)
        }
        carryPurchasedUsed = latestRowFree?.purchased_credits_used ?? 0
      }

      await this.creditsRepository.insertPersonalUsage({
        user_id: userId,
        month: periodStart,
        base_allowance: baseAllowance,
        base_credits_used: 0,
        purchased_credits_used: carryPurchasedUsed,
        total_credits_used: 0,
        total_credits_purchased: totalPurchased,
        rollover_credits: rolloverCredits,
      })

      const purchasedAvailable = Math.max(0, totalPurchased - carryPurchasedUsed)

      return {
        baseCredits: baseAllowance,
        baseCreditsUsed: 0,
        rolloverCredits,
        purchasedCredits: totalPurchased,
        purchasedCreditsUsed: carryPurchasedUsed,
        totalAvailable: baseAllowance + rolloverCredits + purchasedAvailable,
        totalUsed: 0,
      }
    }

    const usage = usageRowForBalance!
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

  /**
   * Row id that should receive ledger updates for purchased totals (matches getBalance / deduct).
   */
  async resolvePersonalMonthlyUsageLedgerRowId(userId: string): Promise<string | null> {
    const row = await this.getPersonalMonthlyUsageRowForDeduction(userId)
    return row?.id ?? null
  }

  private async getActiveSubscriptionPeriodStartIso(userId: string): Promise<string | null> {
    const { data: activeSub } =
      await this.creditsRepository.findActiveSubscriptionPeriodStart(userId)

    return activeSub?.current_period_start
      ? new Date(activeSub.current_period_start).toISOString().split('T')[0]
      : null
  }

  private async getPersonalMonthlyUsageRowForDeduction(
    userId: string,
  ): Promise<MonthlyCreditUsageRow | null> {
    const stripePeriodStart = await this.getActiveSubscriptionPeriodStartIso(userId)
    if (stripePeriodStart) {
      const { data: gteRows } = await this.creditsRepository.listPersonalUsageSinceMonth(
        userId,
        stripePeriodStart,
      )
      const gte = (gteRows ?? []) as MonthlyCreditUsageRow[]
      return gte.length === 0 ? null : gte.reduce((a, b) => (a.month > b.month ? a : b))
    }
    const { data: usage } = await this.creditsRepository.findLatestPersonalUsage(userId)
    return (usage ?? null) as MonthlyCreditUsageRow | null
  }

  async getOrgBalance(orgId: string): Promise<CreditBalance> {
    const orgPlan = await this.getOrgPlan(orgId)
    const hasPaidPlan = orgPlan && orgPlan.slug !== 'free'
    const baseAllowance = hasPaidPlan ? orgPlan.base_credits : 0

    const { data: usage } = await this.creditsRepository.findLatestOrgUsage(orgId)

    const { data: orgPurchases } =
      await this.creditsRepository.listCompletedOrgCreditPurchases(orgId)

    const totalPurchased =
      orgPurchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

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

  private async getOrgPlan(orgId: string): Promise<{
    slug: string
    base_credits: number
    [key: string]: unknown
  } | null> {
    const { data: sub } = await this.creditsRepository.findActiveOrgSubscription(orgId)

    if (sub?.plan_id) {
      const { data: plan } = await this.creditsRepository.findPlanById(sub.plan_id)
      if (plan) return plan
    }

    const { data: freePlan } = await this.creditsRepository.findPlanBySlug('free')

    return freePlan
  }

  /**
   * Check if user has enough credits.
   */
  async hasCredits(userId: string, creditsNeeded: number): Promise<boolean> {
    const balance = await this.getBalance(userId)
    return balance.totalAvailable >= creditsNeeded
  }

  /**
   * Deduct credits from user's balance.
   * Priority: base → rollover → purchased.
   */
  async deductCredits(userId: string, creditsToDeduct: number): Promise<CreditBalance> {
    const currentBalance = await this.getBalance(userId)
    if (creditsToDeduct > currentBalance.totalAvailable) {
      throw new HttpException(
        {
          error: 'credits_exhausted',
          message:
            'You have run out of credits. Please purchase more credits or upgrade your plan.',
          balance: {
            totalAvailable: currentBalance.totalAvailable,
            totalUsed: currentBalance.totalUsed,
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    const plan = await this.getUserPlan(userId)
    const baseAllowance = this.getStackedBaseAllowance(plan)

    const usage = await this.getPersonalMonthlyUsageRowForDeduction(userId)

    if (!usage) {
      this.logger.error(`No usage record for ${userId}`)
      return this.getBalance(userId)
    }

    let remaining = creditsToDeduct

    const baseUsed = usage.base_credits_used ?? 0
    const baseAvailable = Math.max(0, baseAllowance - baseUsed)
    const fromBase = Math.min(remaining, baseAvailable)
    remaining -= fromBase

    const rolloverAvailable = usage.rollover_credits ?? 0
    const fromRollover = Math.min(remaining, rolloverAvailable)
    remaining -= fromRollover

    const fromPurchased = remaining

    await this.creditsRepository.updatePersonalUsageDeduction(usage.id, {
        base_credits_used: baseUsed + fromBase,
        rollover_credits: (usage.rollover_credits ?? 0) - fromRollover,
        purchased_credits_used: (usage.purchased_credits_used ?? 0) + fromPurchased,
        total_credits_used: (usage.total_credits_used ?? 0) + creditsToDeduct,
      })

    this.logger.log(
      `Deducted ${creditsToDeduct} credits from ${userId} (base=${fromBase}, rollover=${fromRollover}, purchased=${fromPurchased})`,
    )

    const updatedBalance = await this.getBalance(userId)
    return this.runAutoRechargeIfNeeded(userId, updatedBalance)
  }

  async deductIncurredCredits(
    userId: string,
    creditsToDeduct: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }> {
    const currentBalance = await this.getBalance(userId)
    const overdraftCredits = Math.max(0, creditsToDeduct - currentBalance.totalAvailable)

    const plan = await this.getUserPlan(userId)
    const baseAllowance = this.getStackedBaseAllowance(plan)
    const usage = await this.getPersonalMonthlyUsageRowForDeduction(userId)

    if (!usage) {
      this.logger.error(`No usage record for incurred debit ${userId}`)
      return { balance: await this.getBalance(userId), overdraftCredits }
    }

    let remaining = creditsToDeduct
    const baseUsed = usage.base_credits_used ?? 0
    const baseAvailable = Math.max(0, baseAllowance - baseUsed)
    const fromBase = Math.min(remaining, baseAvailable)
    remaining -= fromBase

    const rolloverAvailable = usage.rollover_credits ?? 0
    const fromRollover = Math.min(remaining, rolloverAvailable)
    remaining -= fromRollover

    const fromPurchased = remaining

    await this.creditsRepository.updatePersonalUsageDeduction(usage.id, {
      base_credits_used: baseUsed + fromBase,
      rollover_credits: (usage.rollover_credits ?? 0) - fromRollover,
      purchased_credits_used: (usage.purchased_credits_used ?? 0) + fromPurchased,
      total_credits_used: (usage.total_credits_used ?? 0) + creditsToDeduct,
    })

    this.logger.log(
      `Deducted incurred ${creditsToDeduct} credits from ${userId} (base=${fromBase}, rollover=${fromRollover}, purchased=${fromPurchased}, overdraft=${overdraftCredits})`,
    )

    const updatedBalance = await this.getBalance(userId)
    return {
      balance: await this.runAutoRechargeIfNeeded(userId, updatedBalance),
      overdraftCredits,
    }
  }

  async deductOrgCredits(orgId: string, creditsToDeduct: number): Promise<CreditBalance> {
    const currentBalance = await this.getOrgBalance(orgId)
    if (creditsToDeduct > currentBalance.totalAvailable) {
      throw new HttpException(
        {
          error: 'credits_exhausted',
          message:
            'You have run out of credits. Please purchase more credits or upgrade your plan.',
          balance: {
            totalAvailable: currentBalance.totalAvailable,
            totalUsed: currentBalance.totalUsed,
          },
        },
        HttpStatus.PAYMENT_REQUIRED,
      )
    }

    const orgPlan = await this.getOrgPlan(orgId)
    const hasPaidPlan = orgPlan && orgPlan.slug !== 'free'
    const baseAllowance = hasPaidPlan ? orgPlan.base_credits : 0

    const { data: usage } = await this.creditsRepository.findLatestOrgUsage(orgId)

    if (!usage) {
      this.logger.error(`No org usage record for ${orgId}`)
      return this.getOrgBalance(orgId)
    }

    let remaining = creditsToDeduct

    const baseAvailable = Math.max(0, baseAllowance - (usage.base_credits_used ?? 0))
    const fromBase = Math.min(remaining, baseAvailable)
    remaining -= fromBase

    const rolloverAvailable = usage.rollover_credits ?? 0
    const fromRollover = Math.min(remaining, rolloverAvailable)
    remaining -= fromRollover

    const fromPurchased = remaining

    await this.creditsRepository.updateOrgUsageDeduction(usage.id, {
        base_credits_used: (usage.base_credits_used ?? 0) + fromBase,
        rollover_credits: (usage.rollover_credits ?? 0) - fromRollover,
        purchased_credits_used: (usage.purchased_credits_used ?? 0) + fromPurchased,
        total_credits_used: (usage.total_credits_used ?? 0) + creditsToDeduct,
      })

    this.logger.log(
      `Deducted ${creditsToDeduct} org credits from ${orgId} (base=${fromBase}, rollover=${fromRollover}, purchased=${fromPurchased})`,
    )

    const updatedBalance = await this.getOrgBalance(orgId)
    return this.runOrgAutoRechargeIfNeeded(orgId, updatedBalance)
  }

  async deductIncurredOrgCredits(
    orgId: string,
    creditsToDeduct: number,
  ): Promise<{ balance: CreditBalance; overdraftCredits: number }> {
    const currentBalance = await this.getOrgBalance(orgId)
    const overdraftCredits = Math.max(0, creditsToDeduct - currentBalance.totalAvailable)

    const orgPlan = await this.getOrgPlan(orgId)
    const hasPaidPlan = orgPlan && orgPlan.slug !== 'free'
    const baseAllowance = hasPaidPlan ? orgPlan.base_credits : 0
    const usage = await this.getOrgMonthlyUsageRowForDeduction(orgId, baseAllowance)

    if (!usage) {
      this.logger.error(`No org usage record for incurred debit ${orgId}`)
      return { balance: await this.getOrgBalance(orgId), overdraftCredits }
    }

    let remaining = creditsToDeduct
    const baseAvailable = Math.max(0, baseAllowance - (usage.base_credits_used ?? 0))
    const fromBase = Math.min(remaining, baseAvailable)
    remaining -= fromBase

    const rolloverAvailable = usage.rollover_credits ?? 0
    const fromRollover = Math.min(remaining, rolloverAvailable)
    remaining -= fromRollover

    const fromPurchased = remaining

    await this.creditsRepository.updateOrgUsageDeduction(usage.id, {
      base_credits_used: (usage.base_credits_used ?? 0) + fromBase,
      rollover_credits: (usage.rollover_credits ?? 0) - fromRollover,
      purchased_credits_used: (usage.purchased_credits_used ?? 0) + fromPurchased,
      total_credits_used: (usage.total_credits_used ?? 0) + creditsToDeduct,
    })

    this.logger.log(
      `Deducted incurred ${creditsToDeduct} org credits from ${orgId} (base=${fromBase}, rollover=${fromRollover}, purchased=${fromPurchased}, overdraft=${overdraftCredits})`,
    )

    const updatedBalance = await this.getOrgBalance(orgId)
    return {
      balance: await this.runOrgAutoRechargeIfNeeded(orgId, updatedBalance),
      overdraftCredits,
    }
  }

  private async getOrgMonthlyUsageRowForDeduction(
    orgId: string,
    baseAllowance: number,
  ): Promise<MonthlyCreditUsageRow | null> {
    const { data: existing } = await this.creditsRepository.findLatestOrgUsage(orgId)
    if (existing) return existing as MonthlyCreditUsageRow

    const { data: orgPurchases } =
      await this.creditsRepository.listCompletedOrgCreditPurchases(orgId)
    const totalPurchased =
      orgPurchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    await this.creditsRepository.insertOrgUsage({
      org_id: orgId,
      month: new Date().toISOString().split('T')[0],
      base_allowance: baseAllowance,
      base_credits_used: 0,
      purchased_credits_used: 0,
      total_credits_used: 0,
      total_credits_purchased: totalPurchased,
      rollover_credits: 0,
    })

    const { data: created } = await this.creditsRepository.findLatestOrgUsage(orgId)
    return (created ?? null) as MonthlyCreditUsageRow | null
  }

  async triggerAutoRechargeForUser(userId: string): Promise<CreditBalance> {
    const balance = await this.getBalance(userId)
    return this.runAutoRechargeIfNeeded(userId, balance)
  }

  async triggerAutoRechargeForOrg(orgId: string): Promise<CreditBalance> {
    const balance = await this.getOrgBalance(orgId)
    return this.runOrgAutoRechargeIfNeeded(orgId, balance)
  }
}
