/**
 * Org Billing Service
 *
 * ISOLATED from personal billing. Reads ONLY from org_* tables.
 * Never touches user_subscriptions, monthly_credit_usage, or credit_purchases.
 *
 * Tables used:
 * - org_subscriptions (org plan + stripe)
 * - org_monthly_credit_usage (org credit balance)
 * - org_credit_purchases (org credit top-ups)
 * - org_credit_auto_recharge (org auto-recharge config)
 * - org_member_credit_limits (per-member caps)
 * - ai_usage_events WHERE org_id = X (org usage history)
 */

import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { CreditHistoryEnrichmentRepository } from '../../billing/repositories/credit-history-enrichment.repository'
import type { CreditHistoryRawRow } from '../../billing/utils/credit-history-enrich'
import { OrgBillingRepository, type OrgPlan } from '../repositories/org-billing.repository'

export interface OrgCreditBalance {
  baseCredits: number
  baseCreditsUsed: number
  rolloverCredits: number
  purchasedCredits: number
  purchasedCreditsUsed: number
  totalAvailable: number
  totalUsed: number
}

export interface OrgAutoRechargeSettings {
  is_enabled: boolean
  trigger_credits: number
  topup_credits: number
  last_recharged_at: string | null
  monthly_cap_cents: number | null
}

interface UpdateOrgAutoRechargeBody {
  enabled: boolean
  triggerCredits: number
  topupCredits: number
  monthlyCap?: number | null
}

@Injectable()
export class OrgBillingService {
  private readonly logger = new Logger(OrgBillingService.name)
  private readonly supabase: SupabaseClient
  private readonly CREDITS_PER_DOLLAR = 200
  private readonly UNLIMITED_MONTHLY_RECHARGES = 2_147_483_647

  constructor(
    private readonly svc: SupabaseServiceClient,
    private readonly billingRepo: OrgBillingRepository,
    private readonly creditHistoryEnrichmentRepository: CreditHistoryEnrichmentRepository,
  ) {
    this.supabase = svc.client
  }

  async getOrgBalance(orgId: string): Promise<OrgCreditBalance> {
    const now = new Date()

    const plan = await this.getOrgPlan(orgId)
    const hasPaidPlan = plan && plan.slug !== 'free'
    const baseAllowance = hasPaidPlan ? plan.base_credits : 0
    const rolloverCap = plan?.rollover_cap ?? 0

    const orgSub = await this.billingRepo.findSubscriptionPeriodStart(this.supabase, orgId)

    const stripePeriodStart = orgSub?.current_period_start
      ? new Date(orgSub.current_period_start).toISOString().split('T')[0]
      : null

    const latestRow = await this.billingRepo.findLatestMonthlyCreditUsage(this.supabase, orgId)

    const purchases = await this.billingRepo.listCompletedCreditPurchases(this.supabase, orgId)

    const totalPurchased =
      purchases?.reduce(
        (sum: number, p: { credits_purchased: number }) => sum + p.credits_purchased,
        0,
      ) ?? 0

    let needsNewRow = false
    let periodStart = ''

    if (!latestRow) {
      needsNewRow = true
      periodStart = stripePeriodStart ?? now.toISOString().split('T')[0]
    } else if (stripePeriodStart) {
      if (stripePeriodStart !== latestRow.month) {
        needsNewRow = true
        periodStart = stripePeriodStart
      }
    } else {
      const rowDate = new Date(latestRow.month + 'T00:00:00Z')
      if (now.getTime() - rowDate.getTime() >= 30 * 24 * 60 * 60 * 1000) {
        needsNewRow = true
        periodStart = now.toISOString().split('T')[0]
      }
    }

    if (needsNewRow) {
      let rolloverCredits = 0
      if (latestRow && plan) {
        const unusedBase = Math.max(
          0,
          (latestRow.base_allowance ?? 0) - (latestRow.base_credits_used ?? 0),
        )
        rolloverCredits = Math.min(unusedBase, rolloverCap)
      }

      const carryPurchasedUsed = latestRow?.purchased_credits_used ?? 0

      await this.billingRepo.insertMonthlyCreditUsage(this.supabase, {
        org_id: orgId,
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

    const usage = latestRow!
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

  async deductOrgCredits(orgId: string, creditsToDeduct: number): Promise<OrgCreditBalance> {
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

    const plan = await this.getOrgPlan(orgId)
    const hasPaidPlan = plan && plan.slug !== 'free'
    const baseAllowance = hasPaidPlan ? plan.base_credits : 0

    const usage = await this.billingRepo.findLatestMonthlyCreditUsage(this.supabase, orgId)

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

    const { error } = await this.billingRepo.updateMonthlyCreditUsage(this.supabase, usage.id, {
      base_credits_used: (usage.base_credits_used ?? 0) + fromBase,
      rollover_credits: (usage.rollover_credits ?? 0) - fromRollover,
      purchased_credits_used: (usage.purchased_credits_used ?? 0) + fromPurchased,
      total_credits_used: (usage.total_credits_used ?? 0) + creditsToDeduct,
    })

    if (error) {
      this.logger.error(`Failed to deduct org credits for ${orgId}: ${error.message}`)
    }

    this.logger.log(
      `Deducted ${creditsToDeduct} org credits from ${orgId} (base=${fromBase}, rollover=${fromRollover}, purchased=${fromPurchased})`,
    )

    return this.getOrgBalance(orgId)
  }

  async getOrgPlan(orgId: string): Promise<OrgPlan | null> {
    const sub = await this.billingRepo.findActiveSubscriptionPlan(this.supabase, orgId)

    if (sub?.plan_id) {
      const plan = await this.billingRepo.findPlanById(this.supabase, sub.plan_id)
      if (plan) return plan as OrgPlan
    }

    const freePlan = await this.billingRepo.findFreePlan(this.supabase)

    return freePlan as OrgPlan | null
  }

  async getOrgUsageHistory(orgId: string, limit = 50, offset = 0) {
    const count = await this.billingRepo.countUsageEvents(this.supabase, orgId)

    const { data: events, error } = await this.billingRepo.listUsageEvents(
      this.supabase,
      orgId,
      limit,
      offset,
    )

    if (error) {
      this.logger.error(`Failed to fetch org usage: ${error.message}`)
      return { items: [], total: 0, hasMore: false }
    }

    const items = await this.creditHistoryEnrichmentRepository.enrichCreditHistoryRows(
      this.supabase,
      (events ?? []) as CreditHistoryRawRow[],
    )

    return {
      items,
      total: count,
      hasMore: offset + limit < count,
    }
  }

  async getMemberUsageSummary(orgId: string) {
    const now = new Date()
    const monthKey = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .split('T')[0]

    const members = await this.billingRepo.listActiveMembers(this.supabase, orgId)

    if (!members || members.length === 0) return []

    const memberUserIds = members.map((m: any) => String(m.user_id))

    const usageRows = await this.billingRepo.listUsageEventsSince(
      this.supabase,
      orgId,
      `${monthKey}T00:00:00.000Z`,
    )

    const usageByUser = new Map<string, number>()
    for (const row of usageRows ?? []) {
      const uid = (row.metadata_json as any)?.requesting_user_id
      if (uid && memberUserIds.includes(uid)) {
        usageByUser.set(uid, (usageByUser.get(uid) ?? 0) + (row.credits_charged ?? 0))
      }
    }

    const limits = await this.billingRepo.listMemberCreditLimits(this.supabase, orgId)

    const limitByMemberId = new Map<string, any>()
    for (const l of limits ?? []) {
      limitByMemberId.set(String(l.member_id), l)
    }

    return members.map((m: any) => {
      const limit = limitByMemberId.get(String(m.id))
      return {
        memberId: m.id,
        userId: m.user_id,
        role: m.role,
        profile: m.profiles,
        creditsUsedThisMonth: usageByUser.get(String(m.user_id)) ?? 0,
        creditLimit: limit
          ? { period: limit.period, limit: limit.credit_limit, used: limit.credits_used }
          : null,
      }
    })
  }

  async getUsageAnalytics(
    requestSupabase: SupabaseClient,
    orgId: string,
    p_start: string,
    p_end: string,
  ) {
    let raw: Record<string, unknown> | null
    try {
      raw = await this.billingRepo.getUsageAnalytics(requestSupabase, orgId, p_start, p_end)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`org usage-analytics rpc: ${message}`)
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ea8738' },
        body: JSON.stringify({
          sessionId: 'ea8738',
          location: 'org-billing.service.ts:getUsageAnalytics',
          message: 'org usage-analytics rpc failed',
          data: { orgId, p_start, p_end, error: message },
          timestamp: Date.now(),
          hypothesisId: 'H5',
        }),
      }).catch(() => {})
      // #endregion
      throw new BadRequestException('Failed to fetch usage analytics')
    }
    if (!raw || typeof raw !== 'object') {
      return {
        success: true,
        dailySpending: [],
        categoryBreakdown: [],
        totalCreditsSpent: 0,
        totalEvents: 0,
      }
    }
    return {
      success: true,
      dailySpending: (raw.dailySpending as Array<{ date: string; credits: number }>) ?? [],
      categoryBreakdown:
        (raw.categoryBreakdown as Array<{ feature: string; credits: number; count: number }>) ?? [],
      totalCreditsSpent: Number(raw.totalCreditsSpent ?? 0),
      totalEvents: Number(raw.totalEvents ?? 0),
    }
  }

  async getAgentSpending(
    requestSupabase: SupabaseClient,
    orgId: string,
    p_start: string,
    p_end: string,
    p_campaign_ids: string[] | null,
  ) {
    let raw: Record<string, unknown> | null
    try {
      raw = await this.billingRepo.getAgentSpending(
        requestSupabase,
        orgId,
        p_start,
        p_end,
        p_campaign_ids,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`org agent-spending rpc: ${message}`)
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ea8738' },
        body: JSON.stringify({
          sessionId: 'ea8738',
          location: 'org-billing.service.ts:getAgentSpending',
          message: 'org agent-spending rpc failed',
          data: { orgId, p_start, p_end, p_campaign_ids, error: message },
          timestamp: Date.now(),
          hypothesisId: 'H5',
        }),
      }).catch(() => {})
      // #endregion
      throw new BadRequestException('Failed to fetch agent spending')
    }
    const agents = (raw?.agents as Array<Record<string, unknown>>) ?? []
    return {
      success: true,
      agents: agents.map((a) => ({
        agentKey: String(a.agentKey ?? ''),
        agentName: String(a.agentName ?? ''),
        imageUrl:
          a.imageUrl != null && String(a.imageUrl).trim() !== '' ? String(a.imageUrl) : null,
        credits: Number(a.credits ?? 0),
        costUsd: Number(a.costUsd ?? 0),
        eventCount: Number(a.eventCount ?? 0),
      })),
    }
  }

  async getHumanSpending(
    requestSupabase: SupabaseClient,
    orgId: string,
    p_start: string,
    p_end: string,
    p_campaign_ids: string[] | null,
  ) {
    let raw: Record<string, unknown> | null
    try {
      raw = await this.billingRepo.getHumanSpending(
        requestSupabase,
        orgId,
        p_start,
        p_end,
        p_campaign_ids,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`org human-spending rpc: ${message}`)
      throw new BadRequestException('Failed to fetch human spending')
    }
    const humans = (raw?.humans as Array<Record<string, unknown>>) ?? []
    return {
      success: true,
      humans: humans.map((h) => ({
        userId: String(h.userId ?? ''),
        credits: Number(h.credits ?? 0),
        costUsd: Number(h.costUsd ?? 0),
        computedCost: Number(h.computedCost ?? 0),
        eventCount: Number(h.eventCount ?? 0),
        lastActiveAt: h.lastActiveAt != null ? String(h.lastActiveAt) : null,
      })),
    }
  }

  async getOrgAutoRecharge(orgId: string): Promise<OrgAutoRechargeSettings> {
    const data = await this.billingRepo.findAutoRecharge(this.supabase, orgId)

    if (!data) {
      return {
        is_enabled: false,
        trigger_credits: 500,
        topup_credits: 2000,
        last_recharged_at: null,
        monthly_cap_cents: null,
      }
    }

    const amountCents = data.recharge_amount / (this.CREDITS_PER_DOLLAR / 100)
    const monthlyCapCents =
      data.max_monthly_recharges >= this.UNLIMITED_MONTHLY_RECHARGES
        ? null
        : Math.floor(amountCents * data.max_monthly_recharges)

    return {
      is_enabled: data.is_enabled,
      trigger_credits: data.threshold_credits,
      topup_credits: data.recharge_amount,
      last_recharged_at: null,
      monthly_cap_cents: monthlyCapCents,
    }
  }

  async updateOrgAutoRecharge(
    orgId: string,
    body: UpdateOrgAutoRechargeBody,
  ): Promise<OrgAutoRechargeSettings> {
    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException('enabled must be a boolean')
    }
    if (!Number.isInteger(body.triggerCredits) || body.triggerCredits < 0) {
      throw new BadRequestException('triggerCredits must be an integer >= 0')
    }
    if (!Number.isInteger(body.topupCredits) || body.topupCredits < 2000) {
      throw new BadRequestException('topupCredits must be an integer >= 2000')
    }
    if (body.topupCredits % 200 !== 0) {
      throw new BadRequestException('topupCredits must be a multiple of 200')
    }
    if (
      body.monthlyCap !== undefined &&
      body.monthlyCap !== null &&
      (!Number.isInteger(body.monthlyCap) || body.monthlyCap < 1000)
    ) {
      throw new BadRequestException('monthlyCap must be null or an integer >= 1000')
    }

    const amountCents = body.topupCredits / (this.CREDITS_PER_DOLLAR / 100)
    const maxMonthlyRecharges =
      body.monthlyCap === undefined || body.monthlyCap === null
        ? this.UNLIMITED_MONTHLY_RECHARGES
        : Math.floor(body.monthlyCap / amountCents)

    const { error } = await this.billingRepo.upsertAutoRecharge(this.supabase, orgId, {
      is_enabled: body.enabled,
      threshold_credits: body.triggerCredits,
      recharge_amount: body.topupCredits,
      max_monthly_recharges: maxMonthlyRecharges,
    })

    if (error) {
      this.logger.error(`Failed to save org auto recharge for ${orgId}: ${error.message}`)
      throw new BadRequestException('Failed to save org auto-recharge settings')
    }

    return this.getOrgAutoRecharge(orgId)
  }
}
