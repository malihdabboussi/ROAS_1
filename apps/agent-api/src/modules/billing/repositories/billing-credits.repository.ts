import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface TextPricingTierRow {
  provider: string
  model_name: string
  pricing_profile: string
  token_threshold_min: number
  token_threshold_max: number | null
  input_tokens_1k: string | number | null
  output_tokens_1k: string | number | null
  cache_read_1k: string | number | null
  cache_write_1k: string | number | null
}

export interface MonthlyCreditUsageRow {
  id: string
  month: string
  base_allowance?: number | null
  base_credits_used?: number | null
  rollover_credits?: number | null
  purchased_credits_used?: number | null
  total_credits_used?: number | null
  total_credits_purchased?: number | null
}

export type BillingPlanRow = {
  slug: string
  base_credits: number
  rollover_cap: number
  [key: string]: unknown
}

type QueryError = { message?: string }
type QueryResult<T> = { data: T | null; error: QueryError | null }
type ListResult = { data: unknown[] | null; error: QueryError | null }

type ListQuery = PromiseLike<ListResult> & {
  eq(field: string, value: unknown): ListQuery
  gte(field: string, value: unknown): ListQuery
  in(field: string, values: unknown[]): ListQuery
  limit(count: number): ListQuery
  lt(field: string, value: unknown): ListQuery
  not(field: string, operator: string, value: unknown): ListQuery
  order(field: string, options?: { ascending?: boolean }): ListQuery
  maybeSingle<T = Record<string, unknown>>(): Promise<QueryResult<T>>
  single<T = Record<string, unknown>>(): Promise<QueryResult<T>>
}

type MutateQuery = PromiseLike<{ data: unknown | null; error: QueryError | null }> & {
  eq(field: string, value: unknown): MutateQuery
}

type TableQuery = {
  insert(payload: Record<string, unknown>): MutateQuery
  select(columns: string): ListQuery
  update(payload: Record<string, unknown>): MutateQuery
}

@Injectable()
export class BillingCreditsRepository {
  async findActiveOrgMember(
    supabase: SupabaseClient,
    input: { orgId: string; userId: string },
  ): Promise<{ id?: unknown } | null> {
    const { data } = await this.table(supabase, 'org_members')
      .select('id')
      .eq('org_id', input.orgId)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .maybeSingle()
    return data
  }

  async findOrgMemberCreditLimit(
    supabase: SupabaseClient,
    memberId: string,
  ): Promise<{
    limit: Record<string, unknown> | null
    errorMessage: string | null
  }> {
    const { data, error } = await this.table(supabase, 'org_member_credit_limits')
      .select('period, credit_limit, credits_used')
      .eq('member_id', memberId)
      .maybeSingle()
    return { limit: data, errorMessage: error?.message ?? null }
  }

  async findOrgMemberCreditsUsed(
    supabase: SupabaseClient,
    memberId: string,
  ): Promise<{ credits_used: number | null } | null> {
    const { data } = await this.table(supabase, 'org_member_credit_limits')
      .select('credits_used')
      .eq('member_id', memberId)
      .maybeSingle<{ credits_used: number | null }>()
    return data
  }

  async updateOrgMemberCreditsUsed(
    supabase: SupabaseClient,
    memberId: string,
    creditsUsed: number,
  ): Promise<void> {
    await this.table(supabase, 'org_member_credit_limits')
      .update({ credits_used: creditsUsed })
      .eq('member_id', memberId)
  }

  async listTextPricingTiers(
    supabase: SupabaseClient,
    input: { modelName: string; provider: string | null },
  ): Promise<TextPricingTierRow[]> {
    let query = this.table(supabase, 'llm_model_pricing_tiers')
      .select(
        'provider, model_name, pricing_profile, token_threshold_min, token_threshold_max, input_tokens_1k, output_tokens_1k, cache_read_1k, cache_write_1k',
      )
      .eq('model_name', input.modelName)
      .eq('is_active', true)
    if (input.provider) query = query.eq('provider', input.provider)
    const { data } = await query.order('token_threshold_min', { ascending: true })
    return (data ?? []) as TextPricingTierRow[]
  }

  async listFlatTextPricingRows(
    supabase: SupabaseClient,
    input: { modelName: string; provider: string | null },
  ): Promise<Array<{ unit_type: string; cost_per_unit: string | number }>> {
    let query = this.table(supabase, 'token_providers_pricing')
      .select('unit_type, cost_per_unit')
      .eq('model_name', input.modelName)
      .eq('is_active', true)
    if (input.provider) query = query.eq('provider', input.provider)
    const { data } = await query
    return (data ?? []) as Array<{ unit_type: string; cost_per_unit: string | number }>
  }

  async findUnitCost(
    supabase: SupabaseClient,
    input: { modelName: string; unitType: string },
  ): Promise<{ cost_per_unit: string | number } | null> {
    const { data } = await this.table(supabase, 'token_providers_pricing')
      .select('cost_per_unit')
      .eq('model_name', input.modelName)
      .eq('unit_type', input.unitType)
      .eq('is_active', true)
      .maybeSingle<{ cost_per_unit: string | number }>()
    return data
  }

  async listCompletedCreditPurchases(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<Array<{ credits_purchased: number }>> {
    const { data } = await this.table(supabase, 'credit_purchases')
      .select('credits_purchased')
      .eq('user_id', userId)
      .eq('status', 'completed')
    return (data ?? []) as Array<{ credits_purchased: number }>
  }

  async findMonthlyUsageByMonth(
    supabase: SupabaseClient,
    input: { userId: string; month: string },
  ): Promise<MonthlyCreditUsageRow | null> {
    const { data } = await this.table(supabase, 'monthly_credit_usage')
      .select('*')
      .eq('user_id', input.userId)
      .eq('month', input.month)
      .maybeSingle<MonthlyCreditUsageRow>()
    return data
  }

  async listMonthlyUsageSince(
    supabase: SupabaseClient,
    input: { userId: string; month: string },
  ): Promise<MonthlyCreditUsageRow[]> {
    const { data } = await this.table(supabase, 'monthly_credit_usage')
      .select('*')
      .eq('user_id', input.userId)
      .gte('month', input.month)
    return (data ?? []) as MonthlyCreditUsageRow[]
  }

  async findLatestMonthlyUsage(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<MonthlyCreditUsageRow | null> {
    const { data } = await this.table(supabase, 'monthly_credit_usage')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle<MonthlyCreditUsageRow>()
    return data
  }

  async findPreviousMonthlyUsageBefore(
    supabase: SupabaseClient,
    input: { userId: string; month: string },
  ): Promise<MonthlyCreditUsageRow | null> {
    const { data } = await this.table(supabase, 'monthly_credit_usage')
      .select('*')
      .eq('user_id', input.userId)
      .lt('month', input.month)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle<MonthlyCreditUsageRow>()
    return data
  }

  async listMonthlyPurchasedUsage(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<Array<{ purchased_credits_used?: number }>> {
    const { data } = await this.table(supabase, 'monthly_credit_usage')
      .select('purchased_credits_used')
      .eq('user_id', userId)
    return (data ?? []) as Array<{ purchased_credits_used?: number }>
  }

  async insertMonthlyUsage(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.table(supabase, 'monthly_credit_usage').insert(payload)
  }

  async findActiveSubscriptionPeriodStart(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ current_period_start: string } | null> {
    const { data } = await this.table(supabase, 'user_subscriptions')
      .select('current_period_start')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .not('current_period_start', 'is', null)
      .maybeSingle<{ current_period_start: string }>()
    return data
  }

  async findLatestOrgMonthlyUsage(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<MonthlyCreditUsageRow | null> {
    const { data } = await this.table(supabase, 'org_monthly_credit_usage')
      .select('*')
      .eq('org_id', orgId)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle<MonthlyCreditUsageRow>()
    return data
  }

  async listCompletedOrgCreditPurchases(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<Array<{ credits_purchased: number }>> {
    const { data } = await this.table(supabase, 'org_credit_purchases')
      .select('credits_purchased')
      .eq('org_id', orgId)
      .eq('status', 'completed')
    return (data ?? []) as Array<{ credits_purchased: number }>
  }

  async findActiveOrgSubscription(
    supabase: SupabaseClient,
    orgId: string,
  ): Promise<{ plan_id?: unknown } | null> {
    const { data } = await this.table(supabase, 'org_subscriptions')
      .select('plan_id, status')
      .eq('org_id', orgId)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()
    return data
  }

  async findPlanById(supabase: SupabaseClient, planId: unknown): Promise<BillingPlanRow | null> {
    const { data } = await this.table(supabase, 'subscription_plans')
      .select('*')
      .eq('id', planId)
      .single<BillingPlanRow>()
    return data
  }

  async findPlanBySlug(supabase: SupabaseClient, slug: string): Promise<BillingPlanRow | null> {
    const { data } = await this.table(supabase, 'subscription_plans')
      .select('*')
      .eq('slug', slug)
      .single<BillingPlanRow>()
    return data
  }

  async updateMonthlyUsage(
    supabase: SupabaseClient,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.table(supabase, 'monthly_credit_usage').update(payload).eq('id', id)
  }

  async updateOrgMonthlyUsage(
    supabase: SupabaseClient,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.table(supabase, 'org_monthly_credit_usage').update(payload).eq('id', id)
  }

  async insertUsageEvent(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.table(supabase, 'ai_usage_events').insert(payload)
  }

  async listActivePlans(supabase: SupabaseClient): Promise<unknown[]> {
    const { data } = await this.table(supabase, 'subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
    return data ?? []
  }

  async listCreditPacks(supabase: SupabaseClient): Promise<unknown[]> {
    const { data } = await this.table(supabase, 'credit_packs')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
    return data ?? []
  }

  async listRecentUsage(
    supabase: SupabaseClient,
    input: { userId: string; sinceIso: string; limit: number },
  ): Promise<unknown[]> {
    const { data } = await this.table(supabase, 'ai_usage_events')
      .select('id, feature, action, model_name, credits_charged, computed_cost, created_at')
      .eq('user_id', input.userId)
      .gte('created_at', input.sinceIso)
      .order('created_at', { ascending: false })
      .limit(input.limit)
    return data ?? []
  }

  async findOrgCreditDiscount(supabase: SupabaseClient, orgId: string): Promise<number> {
    const { data } = await this.table(supabase, 'organizations')
      .select('credit_discount_percent')
      .eq('id', orgId)
      .maybeSingle<{ credit_discount_percent: number }>()
    return data?.credit_discount_percent ?? 0
  }

  async findUserCreditDiscount(supabase: SupabaseClient, userId: string): Promise<number> {
    const { data } = await this.table(supabase, 'user_profiles')
      .select('credit_discount_percent')
      .eq('id', userId)
      .maybeSingle<{ credit_discount_percent: number }>()
    return data?.credit_discount_percent ?? 0
  }

  async findActiveUserSubscription(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ plan_id?: unknown } | null> {
    const { data } = await this.table(supabase, 'user_subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing', 'past_due'])
      .maybeSingle()
    return data
  }

  async findUserTrial(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<{ trial_type: string; trial_end_date: string } | null> {
    const { data } = await this.table(supabase, 'user_trials')
      .select('trial_type, trial_end_date')
      .eq('user_id', userId)
      .single<{ trial_type: string; trial_end_date: string }>()
    return data
  }

  private table(supabase: SupabaseClient, tableName: string): TableQuery {
    return supabase.from(tableName) as unknown as TableQuery
  }
}
