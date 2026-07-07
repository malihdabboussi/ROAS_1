import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AutoRechargeSettings,
  SubscriptionPlan,
  UpdateAutoRechargeBody,
  UsageEvent,
  UserSubscription,
} from '../billing-http.types'
import {
  type CreditHistoryEnrichedItem,
  type CreditHistoryRawRow,
} from '../utils/credit-history-enrich'
import { CreditHistoryEnrichmentRepository } from './credit-history-enrichment.repository'

type ActiveAddonRow = {
  addon_slug: string
  agent_id: string | null
  status: string
}

type BillingProfileRow = {
  role: string
  credit_discount_percent: number
}

type BillingQueryError = {
  message: string
}

type QueryResponse<T> = {
  data: T | null
  error: BillingQueryError | null
  count?: number | null
}

type CountResult = {
  count: number | null
}

@Injectable()
export class BillingUserDataRepository {
  constructor(
    private readonly creditHistoryEnrichmentRepository: CreditHistoryEnrichmentRepository,
  ) {}

  async findActiveSubscription(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<QueryResponse<UserSubscription>> {
    return supabase
      .from('user_subscriptions')
      .select(
        'plan_id, status, stripe_subscription_id, stripe_customer_id, current_period_start, current_period_end, cancel_at_period_end',
      )
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle<UserSubscription>()
  }

  async findPlanById(
    supabase: SupabaseClient,
    planId: string,
  ): Promise<QueryResponse<SubscriptionPlan>> {
    return supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single<SubscriptionPlan>()
  }

  async countUserResources(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{
    campaigns: CountResult
    funnels: CountResult
    domains: CountResult
    presentations: CountResult
    offers: CountResult
    sequences: CountResult
    brain: CountResult
    themes: CountResult
  }> {
    const [campaigns, funnels, domains, presentations, offers, sequences, brain, themes] =
      await Promise.all([
        supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .neq('status', 'archived'),
        supabase
          .from('funnels')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'published'),
        supabase.from('domains').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase
          .from('presentations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase.from('offers').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase
          .from('sequences')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('memories')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        supabase
          .from('branding_themes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

    return { campaigns, funnels, domains, presentations, offers, sequences, brain, themes }
  }

  async findAutoRechargeSettings(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<QueryResponse<AutoRechargeSettings>> {
    return supabase
      .from('user_credit_auto_recharge')
      .select('is_enabled, trigger_credits, topup_credits, last_recharged_at, monthly_cap_cents')
      .eq('user_id', userId)
      .maybeSingle<AutoRechargeSettings>()
  }

  async findActiveAddons(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<QueryResponse<ActiveAddonRow[]>> {
    return supabase
      .from('user_addons')
      .select('addon_slug, agent_id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
  }

  async findBillingProfile(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<QueryResponse<BillingProfileRow>> {
    return supabase
      .from('user_profiles')
      .select('role, credit_discount_percent')
      .eq('id', userId)
      .maybeSingle<BillingProfileRow>()
  }

  async saveAutoRechargeSettings(
    supabase: SupabaseClient,
    userId: string,
    body: UpdateAutoRechargeBody,
  ): Promise<QueryResponse<AutoRechargeSettings>> {
    const upsertPayload: {
      user_id: string
      is_enabled: boolean
      trigger_credits: number
      topup_credits: number
      monthly_cap_cents?: number | null
    } = {
      user_id: userId,
      is_enabled: body.enabled,
      trigger_credits: body.triggerCredits,
      topup_credits: body.topupCredits,
    }

    if (body.monthlyCap !== undefined) {
      upsertPayload.monthly_cap_cents = body.monthlyCap
    }

    return supabase
      .from('user_credit_auto_recharge')
      .upsert(upsertPayload, { onConflict: 'user_id' })
      .select('is_enabled, trigger_credits, topup_credits, last_recharged_at, monthly_cap_cents')
      .single<AutoRechargeSettings>()
  }

  async findActivePlans(supabase: SupabaseClient): Promise<QueryResponse<SubscriptionPlan[]>> {
    return supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_amount', { ascending: true })
  }

  async findRecentUsageEvents(
    supabase: SupabaseClient,
    userId: string,
    sinceIso: string,
  ): Promise<QueryResponse<UsageEvent[]>> {
    return supabase
      .from('ai_usage_events')
      .select(
        'id, feature, action, credits_charged, computed_cost, model_name, service_type, created_at',
      )
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(50)
  }

  async getUsageAnalyticsPersonal(
    supabase: SupabaseClient,
    startIso: string,
    endIso: string,
  ): Promise<QueryResponse<Record<string, unknown>>> {
    return supabase.rpc('billing_usage_analytics_personal', {
      p_start: startIso,
      p_end: endIso,
    })
  }

  async getAgentSpendingPersonal(
    supabase: SupabaseClient,
    startIso: string,
    endIso: string,
  ): Promise<QueryResponse<Record<string, unknown>>> {
    return supabase.rpc('billing_agent_spending_personal', {
      p_start: startIso,
      p_end: endIso,
    })
  }

  async countCreditHistoryEvents(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<QueryResponse<Array<{ id: string }>>> {
    return supabase
      .from('ai_usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
  }

  async findCreditHistoryEvents(
    supabase: SupabaseClient,
    userId: string,
    offset: number,
    limit: number,
  ): Promise<QueryResponse<CreditHistoryRawRow[]>> {
    return supabase
      .from('ai_usage_events')
      .select(
        'id, feature, action, model_name, credits_charged, created_at, conversation_id, campaign_id',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  }

  enrichCreditHistoryRows(
    supabase: SupabaseClient,
    rows: CreditHistoryRawRow[],
  ): Promise<CreditHistoryEnrichedItem[]> {
    return this.creditHistoryEnrichmentRepository.enrichCreditHistoryRows(supabase, rows)
  }
}
