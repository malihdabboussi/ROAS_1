import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'

type BillingQueryError = {
  message: string
}

type BillingDbResult<T = unknown> = Promise<{
  data: T | null
  error: BillingQueryError | null
}>

export type PromoCodeRow = {
  id: string
  code?: string
  credits_amount: number
  current_redemptions: number
  max_redemptions: number | null
  expires_at: string | null
  grants_role: string | null
}

type PromoRedemptionRow = {
  id: string
}

type CreditPurchaseCreditsRow = {
  credits_purchased: number
}

type AgentBrainSummaryRow = {
  id: string
  agent_id: string
}

type ActiveAgentBrainAddonRow = {
  agent_id: string
  brain_id: string | null
}

type ActiveAgentBrainStatusRow = {
  id: string
  brain_id: string | null
}

type CreatedBrainRow = {
  id: string
}

type SubscriptionCustomerRow = {
  stripe_customer_id: string | null
}

type SubscriptionCancellationRow = {
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
}

type SubscriptionStripeIdRow = {
  stripe_subscription_id: string | null
}

@Injectable()
export class BillingUserActionsRepository {
  async findActivePromoByCode(
    supabase: SupabaseClient,
    code: string,
  ): BillingDbResult<PromoCodeRow> {
    return supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single<PromoCodeRow>()
  }

  async findPromoRedemption(
    supabase: SupabaseClient,
    promoCodeId: string,
    userId: string,
  ): BillingDbResult<PromoRedemptionRow> {
    return supabase
      .from('promo_redemptions')
      .select('id')
      .eq('promo_code_id', promoCodeId)
      .eq('user_id', userId)
      .maybeSingle<PromoRedemptionRow>()
  }

  async insertPromoRedemption(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): BillingDbResult {
    return supabase.from('promo_redemptions').insert(payload)
  }

  async updatePromoRedemptionCount(
    supabase: SupabaseClient,
    promoCodeId: string,
    currentRedemptions: number,
  ): BillingDbResult {
    return supabase
      .from('promo_codes')
      .update({ current_redemptions: currentRedemptions })
      .eq('id', promoCodeId)
  }

  async insertCreditPurchase(
    supabase: SupabaseClient,
    payload: Record<string, unknown>,
  ): BillingDbResult {
    return supabase.from('credit_purchases').insert(payload)
  }

  async listCompletedCreditPurchases(
    supabase: SupabaseClient,
    userId: string,
  ): BillingDbResult<CreditPurchaseCreditsRow[]> {
    return supabase
      .from('credit_purchases')
      .select('credits_purchased')
      .eq('user_id', userId)
      .eq('status', 'completed')
  }

  async updatePersonalUsageTotalPurchased(
    supabase: SupabaseClient,
    usageId: string,
    totalPurchased: number,
  ): BillingDbResult {
    return supabase
      .from('monthly_credit_usage')
      .update({ total_credits_purchased: totalPurchased })
      .eq('id', usageId)
  }

  async insertPersonalUsage(
    supabase: SupabaseClient,
    row: Record<string, unknown>,
  ): BillingDbResult {
    return supabase.from('monthly_credit_usage').insert(row)
  }

  async updateUserProfile(
    supabase: SupabaseClient,
    userId: string,
    patch: Record<string, unknown>,
  ): BillingDbResult {
    return supabase.from('user_profiles').update(patch).eq('id', userId)
  }

  async listOrgAgentBrains(
    supabase: SupabaseClient,
    orgId: string,
    agentIds: string[],
  ): BillingDbResult<AgentBrainSummaryRow[]> {
    return supabase
      .from('ns_brains')
      .select('id, agent_id')
      .in('agent_id', agentIds)
      .eq('org_id', orgId)
  }

  async listActiveAgentBrainAddons(
    supabase: SupabaseClient,
    userId: string,
    agentIds: string[],
  ): BillingDbResult<ActiveAgentBrainAddonRow[]> {
    return supabase
      .from('user_addons')
      .select('agent_id, brain_id')
      .eq('user_id', userId)
      .eq('addon_slug', 'agent-brain')
      .in('agent_id', agentIds)
      .eq('status', 'active')
  }

  async listOwnedAgentBrains(
    supabase: SupabaseClient,
    userId: string,
    agentIds: string[],
  ): BillingDbResult<AgentBrainSummaryRow[]> {
    return supabase
      .from('ns_brains')
      .select('id, agent_id')
      .in('agent_id', agentIds)
      .eq('owner_id', userId)
  }

  async findOrgAgentBrain(
    supabase: SupabaseClient,
    orgId: string,
    agentId: string,
  ): BillingDbResult<CreatedBrainRow> {
    return supabase
      .from('ns_brains')
      .select('id')
      .eq('agent_id', agentId)
      .eq('org_id', orgId)
      .maybeSingle<CreatedBrainRow>()
  }

  async findActiveAgentBrainAddon(
    supabase: SupabaseClient,
    userId: string,
    agentId: string,
  ): BillingDbResult<ActiveAgentBrainStatusRow> {
    return supabase
      .from('user_addons')
      .select('id, brain_id')
      .eq('user_id', userId)
      .eq('addon_slug', 'agent-brain')
      .eq('agent_id', agentId)
      .eq('status', 'active')
      .maybeSingle<ActiveAgentBrainStatusRow>()
  }

  async createUserAgentBrain(
    supabase: SupabaseClient,
    userId: string,
    agentId: string,
  ): BillingDbResult<CreatedBrainRow> {
    return supabase
      .from('ns_brains')
      .insert({
        owner_id: userId,
        name: `${agentId} Brain`,
        agent_id: agentId,
        is_default: false,
      })
      .select('id')
      .single<CreatedBrainRow>()
  }

  async updateUserAddonBrainId(
    supabase: SupabaseClient,
    addonId: string,
    brainId: string,
  ): BillingDbResult {
    return supabase.from('user_addons').update({ brain_id: brainId }).eq('id', addonId)
  }

  async findSubscriptionCustomerId(
    supabase: SupabaseClient,
    userId: string,
  ): BillingDbResult<SubscriptionCustomerRow> {
    return supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle<SubscriptionCustomerRow>()
  }

  async findSubscriptionForCancellation(
    supabase: SupabaseClient,
    userId: string,
  ): BillingDbResult<SubscriptionCancellationRow> {
    return supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_subscription_id', 'is', null)
      .maybeSingle<SubscriptionCancellationRow>()
  }

  async findSubscriptionStripeId(
    supabase: SupabaseClient,
    userId: string,
  ): BillingDbResult<SubscriptionStripeIdRow> {
    return supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .not('stripe_subscription_id', 'is', null)
      .maybeSingle<SubscriptionStripeIdRow>()
  }

  async updateSubscriptionCancellation(
    supabase: SupabaseClient,
    userId: string,
    patch: Record<string, unknown>,
  ): BillingDbResult {
    return supabase.from('user_subscriptions').update(patch).eq('user_id', userId)
  }
}
