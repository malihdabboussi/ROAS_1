import { Injectable } from '@nestjs/common'
import type { AutoRechargeConfig, OrgAutoRechargeConfig } from '../services/credits.types'
import { BillingCreditsRepository } from './billing-credits.repository'

type BillingDbResult<T = any> = Promise<{ data: T | null; error: any }>

@Injectable()
export class BillingCreditsAutoRechargeRepository {
  constructor(private readonly creditsRepository: BillingCreditsRepository) {}

  async findEnabledUserAutoRecharge(userId: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('user_credit_auto_recharge')
      .select('is_enabled, trigger_credits, topup_credits, last_recharged_at, monthly_cap_cents')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .maybeSingle<AutoRechargeConfig>()
  }

  async findUserStripeCustomerId(userId: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle<{ stripe_customer_id: string | null }>()
  }

  async listUserAutoRechargePurchases(userId: string, startIso: string, endIso: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('credit_purchases')
      .select('amount_paid')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .like('stripe_checkout_session_id', 'auto_recharge:%')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
  }

  async findCreditPurchaseByPaymentIntent(paymentIntentId: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('credit_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle<{ id: string }>()
  }

  async insertCreditPurchase(payload: Record<string, unknown>): BillingDbResult {
    return await this.creditsRepository.getClient().from('credit_purchases').insert(payload)
  }

  async findPersonalUsagePurchasedTotalById(id: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('monthly_credit_usage')
      .select('id, total_credits_purchased')
      .eq('id', id)
      .maybeSingle<{ id: string; total_credits_purchased: number }>()
  }

  async updatePersonalUsageTotalPurchased(id: string, totalCreditsPurchased: number): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('monthly_credit_usage')
      .update({ total_credits_purchased: totalCreditsPurchased })
      .eq('id', id)
  }

  async updateUserAutoRechargeLastRecharged(userId: string, lastRechargedAt: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('user_credit_auto_recharge')
      .update({ last_recharged_at: lastRechargedAt })
      .eq('user_id', userId)
  }

  async findEnabledOrgAutoRecharge(orgId: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('org_credit_auto_recharge')
      .select('is_enabled, threshold_credits, recharge_amount, max_monthly_recharges')
      .eq('org_id', orgId)
      .eq('is_enabled', true)
      .maybeSingle<OrgAutoRechargeConfig>()
  }

  async listOrgAutoRechargePurchases(orgId: string, startIso: string, endIso: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('org_credit_purchases')
      .select('id')
      .eq('org_id', orgId)
      .eq('status', 'completed')
      .like('stripe_checkout_session_id', 'auto_recharge:%')
      .gte('created_at', startIso)
      .lt('created_at', endIso)
  }

  async findOrgStripeSubscription(orgId: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('org_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('org_id', orgId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle<{ stripe_customer_id: string | null; stripe_subscription_id: string | null }>()
  }

  async findOrgOwner(orgId: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .maybeSingle<{ owner_id: string }>()
  }

  async findOrgCreditPurchaseByPaymentIntent(paymentIntentId: string): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('org_credit_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle<{ id: string }>()
  }

  async insertOrgCreditPurchase(payload: Record<string, unknown>): BillingDbResult {
    return await this.creditsRepository.getClient().from('org_credit_purchases').insert(payload)
  }

  async updateOrgUsageTotalPurchased(id: string, totalCreditsPurchased: number): BillingDbResult {
    return await this.creditsRepository
      .getClient()
      .from('org_monthly_credit_usage')
      .update({ total_credits_purchased: totalCreditsPurchased })
      .eq('id', id)
  }
}
