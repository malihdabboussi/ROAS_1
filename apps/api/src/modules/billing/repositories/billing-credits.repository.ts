import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { MonthlyCreditUsageRow, TextPricingTierRow } from '../services/credits.types'

type BillingDbResult<T = any> = Promise<{ data: T | null; error: any }>

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due']

@Injectable()
export class BillingCreditsRepository {
  private fallbackClient: SupabaseClient | null = null

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly serviceClient?: SupabaseServiceClient,
  ) {}

  getClient(): SupabaseClient {
    if (this.serviceClient) return this.serviceClient.client
    if (!this.fallbackClient) {
      this.fallbackClient = createClient(
        this.configService.get<string>('SUPABASE_URL') ||
          this.configService.get<string>('supabase.url') ||
          process.env.SUPABASE_URL ||
          '',
        this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
          this.configService.get<string>('supabase.serviceRoleKey') ||
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          '',
      )
    }
    return this.fallbackClient
  }

  async findActiveOrgMember(orgId: string, userId: string): BillingDbResult {
    return await this.getClient()
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle<{ id: string }>()
  }

  async findOrgMemberCreditLimit(memberId: string): BillingDbResult {
    return await this.getClient()
      .from('org_member_credit_limits')
      .select('period, credit_limit, credits_used')
      .eq('member_id', memberId)
      .maybeSingle<{ period: string; credit_limit: number | null; credits_used: number | null }>()
  }

  async findOrgMemberCreditsUsed(memberId: string): BillingDbResult {
    return await this.getClient()
      .from('org_member_credit_limits')
      .select('credits_used')
      .eq('member_id', memberId)
      .maybeSingle<{ credits_used: number | null }>()
  }

  async updateOrgMemberCreditsUsed(memberId: string, creditsUsed: number): BillingDbResult {
    return await this.getClient()
      .from('org_member_credit_limits')
      .update({ credits_used: creditsUsed })
      .eq('member_id', memberId)
  }

  async listActivePlans(): BillingDbResult {
    return await this.getClient()
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
  }

  async listActiveCreditPacks(): BillingDbResult {
    return await this.getClient()
      .from('credit_packs')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })
  }

  async listRecentUserUsage(userId: string, sinceIso: string, limit: number): BillingDbResult {
    return await this.getClient()
      .from('ai_usage_events')
      .select('id, feature, action, model_name, credits_charged, computed_cost, created_at')
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  async findOrgCreditDiscount(orgId: string): BillingDbResult {
    return await this.getClient()
      .from('organizations')
      .select('credit_discount_percent')
      .eq('id', orgId)
      .maybeSingle<{ credit_discount_percent: number }>()
  }

  async findUserCreditDiscount(userId: string): BillingDbResult {
    return await this.getClient()
      .from('user_profiles')
      .select('credit_discount_percent')
      .eq('id', userId)
      .maybeSingle<{ credit_discount_percent: number }>()
  }

  async findActiveUserSubscription(userId: string): BillingDbResult {
    return await this.getClient()
      .from('user_subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
      .maybeSingle<{ plan_id: string; status: string }>()
  }

  async findActiveSubscriptionPeriodStart(userId: string): BillingDbResult {
    return await this.getClient()
      .from('user_subscriptions')
      .select('current_period_start')
      .eq('user_id', userId)
      .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
      .not('current_period_start', 'is', null)
      .maybeSingle<{ current_period_start: string }>()
  }

  async findPlanById(planId: string): BillingDbResult {
    return await this.getClient().from('subscription_plans').select('*').eq('id', planId).single()
  }

  async findPlanBySlug(slug: string): BillingDbResult {
    return await this.getClient().from('subscription_plans').select('*').eq('slug', slug).single()
  }

  async findUserTrial(userId: string): BillingDbResult {
    return await this.getClient()
      .from('user_trials')
      .select('trial_type, trial_end_date')
      .eq('user_id', userId)
      .single<{ trial_type: string; trial_end_date: string }>()
  }

  async listCompletedCreditPurchases(userId: string): BillingDbResult {
    return await this.getClient()
      .from('credit_purchases')
      .select('credits_purchased')
      .eq('user_id', userId)
      .eq('status', 'completed')
  }

  async findPersonalUsageByMonth(userId: string, month: string): BillingDbResult {
    return await this.getClient()
      .from('monthly_credit_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle<MonthlyCreditUsageRow>()
  }

  async listPersonalUsageSinceMonth(userId: string, month: string): BillingDbResult {
    return await this.getClient()
      .from('monthly_credit_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('month', month)
  }

  async findLatestPersonalUsage(userId: string): BillingDbResult {
    return await this.getClient()
      .from('monthly_credit_usage')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle<MonthlyCreditUsageRow>()
  }

  async findPreviousPersonalUsageBefore(userId: string, month: string): BillingDbResult {
    return await this.getClient()
      .from('monthly_credit_usage')
      .select('*')
      .eq('user_id', userId)
      .lt('month', month)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle<MonthlyCreditUsageRow>()
  }

  async listPersonalPurchasedUsage(userId: string): BillingDbResult {
    return await this.getClient()
      .from('monthly_credit_usage')
      .select('purchased_credits_used')
      .eq('user_id', userId)
  }

  async insertPersonalUsage(row: Record<string, unknown>): BillingDbResult {
    return await this.getClient().from('monthly_credit_usage').insert(row)
  }

  async updatePersonalUsageDeduction(id: string, patch: Record<string, unknown>): BillingDbResult {
    return await this.getClient().from('monthly_credit_usage').update(patch).eq('id', id)
  }

  async findLatestOrgUsage(orgId: string): BillingDbResult {
    return await this.getClient()
      .from('org_monthly_credit_usage')
      .select('*')
      .eq('org_id', orgId)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle<MonthlyCreditUsageRow>()
  }

  async listCompletedOrgCreditPurchases(orgId: string): BillingDbResult {
    return await this.getClient()
      .from('org_credit_purchases')
      .select('credits_purchased')
      .eq('org_id', orgId)
      .eq('status', 'completed')
  }

  async findActiveOrgSubscription(orgId: string): BillingDbResult {
    return await this.getClient()
      .from('org_subscriptions')
      .select('plan_id, status')
      .eq('org_id', orgId)
      .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
      .maybeSingle<{ plan_id: string; status: string }>()
  }

  async updateOrgUsageDeduction(id: string, patch: Record<string, unknown>): BillingDbResult {
    return await this.getClient().from('org_monthly_credit_usage').update(patch).eq('id', id)
  }

  async insertOrgUsage(row: Record<string, unknown>): BillingDbResult {
    return await this.getClient().from('org_monthly_credit_usage').insert(row)
  }

  async listTextPricingTiers(modelName: string, provider: string | null) {
    let query = this.getClient()
      .from('llm_model_pricing_tiers')
      .select(
        'provider, model_name, pricing_profile, token_threshold_min, token_threshold_max, input_tokens_1k, output_tokens_1k, cache_read_1k, cache_write_1k',
      )
      .eq('model_name', modelName)
      .eq('is_active', true)
    if (provider) query = query.eq('provider', provider)
    const { data, error } = await query.order('token_threshold_min', { ascending: true })
    return { data: (data ?? null) as TextPricingTierRow[] | null, error }
  }

  async listFlatTextPricing(modelName: string, provider: string | null) {
    let query = this.getClient()
      .from('token_providers_pricing')
      .select('unit_type, cost_per_unit')
      .eq('model_name', modelName)
      .eq('is_active', true)
    if (provider) query = query.eq('provider', provider)
    const { data, error } = await query
    return {
      data: (data ?? null) as Array<{ unit_type: string; cost_per_unit: string | number }> | null,
      error,
    }
  }

  async findUnitPricing(modelName: string, unitType: string, single = false) {
    const query = this.getClient()
      .from('token_providers_pricing')
      .select('cost_per_unit')
      .eq('model_name', modelName)
      .eq('unit_type', unitType)
      .eq('is_active', true)
    return await single
      ? query.single<{ cost_per_unit: string | number }>()
      : query.maybeSingle<{ cost_per_unit: string | number }>()
  }

  async insertUsageEvent(payload: Record<string, unknown>): BillingDbResult {
    return await this.getClient().from('ai_usage_events').insert(payload)
  }

  async insertUsageEventReturningId(
    payload: Record<string, unknown>,
  ): Promise<{ data: { id: string } | null; error: any }> {
    return await this.getClient()
      .from('ai_usage_events')
      .insert(payload)
      .select('id')
      .single<{ id: string }>()
  }
}
