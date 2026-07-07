import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface OrgPlan {
  slug: string
  name: string
  base_credits: number
  rollover_cap: number
  price_amount: number
  billing_period: string
  [key: string]: unknown
}

export interface OrgMonthlyCreditUsageRow {
  id: string
  month: string
  base_allowance?: number | null
  base_credits_used?: number | null
  purchased_credits_used?: number | null
  total_credits_used?: number | null
  total_credits_purchased?: number | null
  rollover_credits?: number | null
}

export interface OrgAutoRechargeRow {
  is_enabled: boolean
  threshold_credits: number
  recharge_amount: number
  max_monthly_recharges: number
}

export interface OrgMemberRow {
  id: string
  user_id: string
  role: string
  profiles: unknown
}

export interface OrgUsageEventRow {
  metadata_json: Record<string, unknown> | null
  credits_charged: number | null
}

export interface OrgMemberCreditLimitRow {
  member_id: string
  period: string
  credit_limit: number | null
  credits_used: number | null
}

type OrgQueryError = {
  message: string
}

type QueryResponse<T> = {
  data: T | null
  error: OrgQueryError | null
  count?: number | null
}

@Injectable()
export class OrgBillingRepository {
  async findActiveSubscriptionPlan(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<{ plan_id: string | null; status: string } | null> {
    const { data } = await supabase
      .from('org_subscriptions')
      .select('plan_id, status')
      .eq('org_id', orgId)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle<{ plan_id: string | null; status: string }>()

    return data ?? null
  }

  async findSubscriptionPeriodStart(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<{ current_period_start: string } | null> {
    const { data } = await supabase
      .from('org_subscriptions')
      .select('current_period_start')
      .eq('org_id', orgId)
      .in('status', ['active', 'trialing', 'past_due'])
      .not('current_period_start', 'is', null)
      .maybeSingle<{ current_period_start: string }>()

    return data ?? null
  }

  async findPlanById(supabase: SupabaseClient, planId: string): Promise<OrgPlan | null> {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single<OrgPlan>()

    return data ?? null
  }

  async findFreePlan(supabase: SupabaseClient): Promise<OrgPlan | null> {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('slug', 'free')
      .single<OrgPlan>()

    return data ?? null
  }

  async findLatestMonthlyCreditUsage(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<OrgMonthlyCreditUsageRow | null> {
    const { data } = await supabase
      .from('org_monthly_credit_usage')
      .select('*')
      .eq('org_id', orgId)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle<OrgMonthlyCreditUsageRow>()

    return data ?? null
  }

  async listCompletedCreditPurchases(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<Array<{ credits_purchased: number }>> {
    const { data } = await supabase
      .from('org_credit_purchases')
      .select('credits_purchased')
      .eq('org_id', orgId)
      .eq('status', 'completed')

    return (data ?? []) as Array<{ credits_purchased: number }>
  }

  async insertMonthlyCreditUsage(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<QueryResponse<unknown>> {
    return await supabase.from('org_monthly_credit_usage').insert(payload)
  }

  async updateMonthlyCreditUsage(
    supabase: SupabaseClient,
    usageId: string,
    payload: Record<string, unknown>,
  ): Promise<QueryResponse<unknown>> {
    return await supabase.from('org_monthly_credit_usage').update(payload).eq('id', usageId)
  }

  async countUsageEvents(supabase: SupabaseClient, orgId: string): Promise<number> {
    const { count } = await supabase
      .from('ai_usage_events')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)

    return count ?? 0
  }

  async listUsageEvents(
    supabase: SupabaseClient,
    orgId: string,
    limit: number,
    offset: number,
  ): Promise<QueryResponse<unknown[]>> {
    return await supabase
      .from('ai_usage_events')
      .select(
        'id, feature, action, model_name, credits_charged, created_at, conversation_id, campaign_id',
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
  }

  async listActiveMembers(supabase: SupabaseClient, orgId: string): Promise<OrgMemberRow[]> {
    const { data } = await supabase
      .from('org_members')
      .select('id, user_id, role, profiles(id, full_name, avatar_url)')
      .eq('org_id', orgId)
      .eq('status', 'active')

    return (data ?? []) as OrgMemberRow[]
  }

  async listUsageEventsSince(
    supabase: SupabaseClient,
    orgId: string,
    sinceIso: string,
  ): Promise<OrgUsageEventRow[]> {
    const { data } = await supabase
      .from('ai_usage_events')
      .select('metadata_json, credits_charged')
      .eq('org_id', orgId)
      .gte('created_at', sinceIso)

    return (data ?? []) as OrgUsageEventRow[]
  }

  async listMemberCreditLimits(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<OrgMemberCreditLimitRow[]> {
    const { data } = await supabase
      .from('org_member_credit_limits')
      .select('member_id, period, credit_limit, credits_used')
      .eq('org_id', orgId)

    return (data ?? []) as OrgMemberCreditLimitRow[]
  }

  async findAutoRecharge(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<OrgAutoRechargeRow | null> {
    const { data } = await supabase
      .from('org_credit_auto_recharge')
      .select('is_enabled, threshold_credits, recharge_amount, max_monthly_recharges')
      .eq('org_id', orgId)
      .maybeSingle<OrgAutoRechargeRow>()

    return data ?? null
  }

  async upsertAutoRecharge(
    supabase: SupabaseClient,
    orgId: string,
    payload: {
      is_enabled: boolean
      threshold_credits: number
      recharge_amount: number
      max_monthly_recharges: number
    },
  ): Promise<QueryResponse<unknown>> {
    return await supabase
      .from('org_credit_auto_recharge')
      .upsert({ org_id: orgId, ...payload }, { onConflict: 'org_id' })
  }

  async getUsageAnalytics(
    supabase: SupabaseClient,
    orgId: string,
    p_start: string,
    p_end: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase.rpc('billing_usage_analytics_org', {
      p_org_id: orgId,
      p_start,
      p_end,
    })
    if (error) throw error
    return data as Record<string, unknown> | null
  }

  async getAgentSpending(
    supabase: SupabaseClient,
    orgId: string,
    p_start: string,
    p_end: string,
    p_campaign_ids: string[] | null,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase.rpc('billing_agent_spending_org', {
      p_org_id: orgId,
      p_start,
      p_end,
      p_campaign_ids,
    })
    if (error) throw error
    return data as Record<string, unknown> | null
  }

  async getHumanSpending(
    supabase: SupabaseClient,
    orgId: string,
    p_start: string,
    p_end: string,
    p_campaign_ids: string[] | null,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await supabase.rpc('billing_human_spending_org', {
      p_org_id: orgId,
      p_start,
      p_end,
      p_campaign_ids,
    })
    if (error) throw error
    return data as Record<string, unknown> | null
  }
}
