import { Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceClient } from '@vibey/api-shared'
import type { CreditPack, SubscriptionPlan } from '../services/stripe-service.types'

type BillingDbResult<T = any> = Promise<{ data: T | null; error: any }>

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due']

@Injectable()
export class BillingStripeCustomerRepository {
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

  async findCreditPackById(packId: string): BillingDbResult<CreditPack> {
    return await this.getClient()
      .from('credit_packs')
      .select('*')
      .eq('id', packId)
      .maybeSingle<CreditPack>()
  }

  async findCreditPackBySlug(packId: string): BillingDbResult<CreditPack> {
    return await this.getClient()
      .from('credit_packs')
      .select('*')
      .eq('slug', packId)
      .maybeSingle<CreditPack>()
  }

  async findPlanById(planId: string): BillingDbResult<SubscriptionPlan> {
    return await this.getClient()
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle<SubscriptionPlan>()
  }

  async findActivePlanBySlug(slug: string): BillingDbResult<SubscriptionPlan> {
    return await this.getClient()
      .from('subscription_plans')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single<SubscriptionPlan>()
  }

  async findPlanNameById(planId: string): BillingDbResult<{ name: string }> {
    return await this.getClient()
      .from('subscription_plans')
      .select('name')
      .eq('id', planId)
      .maybeSingle<{ name: string }>()
  }

  async findFreePlanId(): BillingDbResult<{ id: string }> {
    return await this.getClient()
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'free')
      .maybeSingle<{ id: string }>()
  }

  async findSubscriptionCustomerId(
    userId: string,
  ): BillingDbResult<{ stripe_customer_id: string | null }> {
    return await this.getClient()
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle<{ stripe_customer_id: string | null }>()
  }

  async findUserSubscriptionStripeId(
    userId: string,
  ): BillingDbResult<{ stripe_subscription_id: string | null }> {
    return await this.getClient()
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle<{ stripe_subscription_id: string | null }>()
  }

  async findAnyUserSubscription(userId: string): BillingDbResult<{ id: string }> {
    return await this.getClient()
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle<{ id: string }>()
  }

  async updateCustomerId(userId: string, customerId: string): BillingDbResult {
    return await this.getClient()
      .from('user_subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', userId)
  }

  async insertCustomerSubscription(
    userId: string,
    planId: string | null,
    customerId: string,
  ): BillingDbResult {
    return await this.getClient().from('user_subscriptions').insert({
      user_id: userId,
      plan_id: planId,
      status: 'canceled',
      stripe_customer_id: customerId,
    })
  }

  async findUserEmail(userId: string): BillingDbResult<{ email: string | null }> {
    return await this.getClient()
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle<{ email: string | null }>()
  }

  async findAuthUser(userId: string): Promise<any> {
    return await this.getClient().auth.admin.getUserById(userId)
  }

  async findActiveUserSubscription(
    userId: string,
  ): BillingDbResult<{
    stripe_subscription_id: string
    plan_id: string
    current_period_end?: string | null
  }> {
    return await this.getClient()
      .from('user_subscriptions')
      .select('stripe_subscription_id, plan_id, current_period_end')
      .eq('user_id', userId)
      .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
      .not('stripe_subscription_id', 'is', null)
      .maybeSingle()
  }

  async findUserSubscriptionForStripeSubscription(
    userId: string,
    stripeSubscriptionId: string,
  ): BillingDbResult<{ plan_id: string | null; status: string }> {
    return await this.getClient()
      .from('user_subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .single<{ plan_id: string | null; status: string }>()
  }

  async upsertUserSubscription(payload: Record<string, unknown>): BillingDbResult {
    return await this.getClient()
      .from('user_subscriptions')
      .upsert(payload, { onConflict: 'user_id' })
  }

  async findUserIdBySubscriptionId(
    subscriptionId: string,
  ): BillingDbResult<{ user_id: string }> {
    return await this.getClient()
      .from('user_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle<{ user_id: string }>()
  }

  async updateUserSubscription(userId: string, patch: Record<string, unknown>): BillingDbResult {
    return await this.getClient()
      .from('user_subscriptions')
      .update(patch)
      .eq('user_id', userId)
  }
}
