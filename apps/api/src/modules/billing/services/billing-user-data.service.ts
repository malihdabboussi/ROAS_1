/**
 * User-scoped billing reads: status, plans, usage, analytics, credit history.
 * Uses request-scoped Supabase client from @Supabase() decorator (passed per call).
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AutoRechargeSettings,
  BillingStatusResponse,
  SubscriptionPlan,
  UpdateAutoRechargeBody,
  UsageEvent,
} from '../billing-http.types'
import { BillingUserDataRepository } from '../repositories/billing-user-data.repository'
import type { CreditHistoryRawRow } from '../utils/credit-history-enrich'
import { parseUsageDateRange } from '../utils/usage-date-range'
import { CreditsService } from './credits.service'

@Injectable()
export class BillingUserDataService {
  private readonly logger = new Logger(BillingUserDataService.name)

  constructor(
    private readonly creditsService: CreditsService,
    private readonly billingUserDataRepository: BillingUserDataRepository,
  ) {}

  async getBillingStatus(userId: string, supabase: SupabaseClient): Promise<BillingStatusResponse> {
    const balance = await this.creditsService.getBalance(userId)

    const { data: sub } = await this.billingUserDataRepository.findActiveSubscription(
      supabase,
      userId,
    )

    let plan: SubscriptionPlan | null = null
    if (sub) {
      const { data: planData } = await this.billingUserDataRepository.findPlanById(
        supabase,
        sub.plan_id,
      )
      plan = planData
    }

    if (plan) {
      plan = { ...plan, max_campaigns: null }
    }

    const { campaigns, funnels, domains, presentations, offers, sequences, brain, themes } =
      await this.billingUserDataRepository.countUserResources(supabase, userId)

    const { data: autoRechargeRow } = await this.billingUserDataRepository.findAutoRechargeSettings(
      supabase,
      userId,
    )

    const autoRecharge: AutoRechargeSettings = autoRechargeRow ?? {
      is_enabled: false,
      trigger_credits: 500,
      topup_credits: 2000,
      last_recharged_at: null,
      monthly_cap_cents: null,
    }

    const { data: activeAddons } = await this.billingUserDataRepository.findActiveAddons(
      supabase,
      userId,
    )

    const { data: profile } = await this.billingUserDataRepository.findBillingProfile(
      supabase,
      userId,
    )

    return {
      balance,
      subscription: sub,
      plan,
      role: profile?.role ?? 'user',
      creditDiscountPercent: profile?.credit_discount_percent ?? 0,
      usage: {
        campaigns: campaigns.count ?? 0,
        publishedFunnels: funnels.count ?? 0,
        customDomains: domains.count ?? 0,
        presentations: presentations.count ?? 0,
        offers: offers.count ?? 0,
        sequences: sequences.count ?? 0,
        brainEntries: brain.count ?? 0,
        storageBytes: 0,
        customThemes: themes.count ?? 0,
      },
      autoRecharge,
      addons: (activeAddons ?? []).map((a) => ({ slug: a.addon_slug, agentId: a.agent_id })),
    }
  }

  async getAutoRechargeSettings(
    userId: string,
    supabase: SupabaseClient,
  ): Promise<AutoRechargeSettings> {
    const { data } = await this.billingUserDataRepository.findAutoRechargeSettings(supabase, userId)

    return (
      data ?? {
        is_enabled: false,
        trigger_credits: 500,
        topup_credits: 2000,
        last_recharged_at: null,
        monthly_cap_cents: null,
      }
    )
  }

  async updateAutoRechargeSettings(
    userId: string,
    supabase: SupabaseClient,
    body: UpdateAutoRechargeBody,
  ): Promise<AutoRechargeSettings> {
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

    const { data, error } = await this.billingUserDataRepository.saveAutoRechargeSettings(
      supabase,
      userId,
      body,
    )

    if (error || !data) {
      throw new BadRequestException(
        `Failed to save auto-recharge settings: ${error?.message ?? 'unknown error'}`,
      )
    }

    return data
  }

  async getPlans(supabase: SupabaseClient): Promise<{ plans: SubscriptionPlan[] }> {
    const { data: plans, error } = await this.billingUserDataRepository.findActivePlans(supabase)

    if (error) {
      this.logger.error(`Failed to fetch plans: ${error.message}`)
      throw new BadRequestException('Failed to fetch subscription plans')
    }

    return { plans: (plans as SubscriptionPlan[]) ?? [] }
  }

  async getUsage(userId: string, supabase: SupabaseClient): Promise<{ events: UsageEvent[] }> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: events, error } = await this.billingUserDataRepository.findRecentUsageEvents(
      supabase,
      userId,
      thirtyDaysAgo.toISOString(),
    )

    if (error) {
      this.logger.error(`Failed to fetch usage: ${error.message}`)
      throw new BadRequestException('Failed to fetch usage events')
    }

    return { events: (events as UsageEvent[]) ?? [] }
  }

  async getUsageAnalytics(
    supabase: SupabaseClient,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    dailySpending: Array<{ date: string; credits: number }>
    categoryBreakdown: Array<{ feature: string; credits: number; count: number }>
    totalCreditsSpent: number
    totalEvents: number
  }> {
    const { p_start, p_end } = parseUsageDateRange(startDate, endDate)
    const { data, error } = await this.billingUserDataRepository.getUsageAnalyticsPersonal(
      supabase,
      p_start,
      p_end,
    )
    if (error) {
      this.logger.error(`usage-analytics rpc: ${error.message}`)
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ea8738'},body:JSON.stringify({sessionId:'ea8738',location:'billing-user-data.service.ts:getUsageAnalytics',message:'personal usage-analytics rpc failed',data:{p_start,p_end,error:error.message},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      throw new BadRequestException('Failed to fetch usage analytics')
    }
    const raw = data as Record<string, unknown> | null
    if (!raw || typeof raw !== 'object') {
      return {
        dailySpending: [],
        categoryBreakdown: [],
        totalCreditsSpent: 0,
        totalEvents: 0,
      }
    }
    return {
      dailySpending: (raw.dailySpending as Array<{ date: string; credits: number }>) ?? [],
      categoryBreakdown:
        (raw.categoryBreakdown as Array<{ feature: string; credits: number; count: number }>) ?? [],
      totalCreditsSpent: Number(raw.totalCreditsSpent ?? 0),
      totalEvents: Number(raw.totalEvents ?? 0),
    }
  }

  async getAgentSpending(
    supabase: SupabaseClient,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    agents: Array<{
      agentKey: string
      agentName: string
      imageUrl: string | null
      credits: number
      costUsd: number
      eventCount: number
    }>
  }> {
    const { p_start, p_end } = parseUsageDateRange(startDate, endDate)
    const { data, error } = await this.billingUserDataRepository.getAgentSpendingPersonal(
      supabase,
      p_start,
      p_end,
    )
    if (error) {
      this.logger.error(`agent-spending rpc: ${error.message}`)
      // #region agent log
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ea8738'},body:JSON.stringify({sessionId:'ea8738',location:'billing-user-data.service.ts:getAgentSpending',message:'personal agent-spending rpc failed',data:{p_start,p_end,error:error.message},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      throw new BadRequestException('Failed to fetch agent spending')
    }
    const raw = data as Record<string, unknown> | null
    const agents = (raw?.agents as Array<Record<string, unknown>>) ?? []
    return {
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

  async getCreditHistory(
    userId: string,
    supabase: SupabaseClient,
    limitParam?: string,
    offsetParam?: string,
  ): Promise<{
    items: Array<{
      id: string
      action: string
      feature: string
      model: string
      credits: number
      timestamp: string
      conversationTitle: string | null
      campaignName: string | null
      agentName: string | null
      agentImageUrl: string | null
    }>
    total: number
    hasMore: boolean
  }> {
    const limit = Math.min(parseInt(limitParam ?? '20', 10) || 20, 100)
    const offset = parseInt(offsetParam ?? '0', 10) || 0

    const { count } = await this.billingUserDataRepository.countCreditHistoryEvents(
      supabase,
      userId,
    )

    const total = count ?? 0

    const { data: events, error } = await this.billingUserDataRepository.findCreditHistoryEvents(
      supabase,
      userId,
      offset,
      limit,
    )

    if (error) {
      this.logger.error(`Failed to fetch credit history: ${error.message}`)
      return { items: [], total: 0, hasMore: false }
    }

    const items = await this.billingUserDataRepository.enrichCreditHistoryRows(
      supabase,
      (events ?? []) as CreditHistoryRawRow[],
    )

    return {
      items,
      total,
      hasMore: offset + limit < total,
    }
  }
}
