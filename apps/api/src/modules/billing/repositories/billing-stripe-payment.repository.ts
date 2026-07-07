import { Injectable } from '@nestjs/common'
import { BillingStripeCustomerRepository } from './billing-stripe-customer.repository'

type BillingDbResult<T = any> = Promise<{ data: T | null; error: any }>

@Injectable()
export class BillingStripePaymentRepository {
  constructor(private readonly customerRepository: BillingStripeCustomerRepository) {}

  async findCreditPurchaseByPaymentIntent(paymentIntentId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('credit_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .limit(1)
  }

  async findCreditPurchaseByCheckoutSession(sessionId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('credit_purchases')
      .select('id')
      .eq('stripe_checkout_session_id', sessionId)
      .limit(1)
  }

  async findCompletedCreditPurchaseByCheckoutSession(
    sessionId: string,
  ): BillingDbResult<{ credits_purchased: number }> {
    return await this.customerRepository
      .getClient()
      .from('credit_purchases')
      .select('credits_purchased')
      .eq('stripe_checkout_session_id', sessionId)
      .eq('status', 'completed')
      .single<{ credits_purchased: number }>()
  }

  async insertCreditPurchase(payload: Record<string, unknown>): BillingDbResult {
    return await this.customerRepository.getClient().from('credit_purchases').insert(payload)
  }

  async listCompletedCreditPurchases(userId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('credit_purchases')
      .select('credits_purchased')
      .eq('user_id', userId)
      .eq('status', 'completed')
  }

  async updatePersonalUsageTotalPurchased(id: string, totalPurchased: number): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('monthly_credit_usage')
      .update({ total_credits_purchased: totalPurchased })
      .eq('id', id)
  }

  async findOrgCreditPurchaseByPaymentIntent(paymentIntentId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('org_credit_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .limit(1)
  }

  async findOrgCreditPurchaseByCheckoutSession(sessionId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('org_credit_purchases')
      .select('id')
      .eq('stripe_checkout_session_id', sessionId)
      .limit(1)
  }

  async insertOrgCreditPurchase(payload: Record<string, unknown>): BillingDbResult {
    return await this.customerRepository.getClient().from('org_credit_purchases').insert(payload)
  }

  async listCompletedOrgCreditPurchases(orgId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('org_credit_purchases')
      .select('credits_purchased')
      .eq('org_id', orgId)
      .eq('status', 'completed')
  }

  async findLatestOrgUsage(orgId: string): BillingDbResult<{ id: string }> {
    return await this.customerRepository
      .getClient()
      .from('org_monthly_credit_usage')
      .select('id')
      .eq('org_id', orgId)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>()
  }

  async updateOrgUsageTotalPurchased(id: string, totalPurchased: number): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('org_monthly_credit_usage')
      .update({ total_credits_purchased: totalPurchased })
      .eq('id', id)
  }

  async insertDirectInviteCode(code: string, email: string): BillingDbResult<{ id: string }> {
    return await this.customerRepository
      .getClient()
      .from('direct_invite_codes')
      .insert({ code, label: `fast-track:${email}`, max_uses: 1, is_active: true })
      .select('id')
      .single<{ id: string }>()
  }

  async markFastTrackPurchaseFailed(sessionId: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('fast_track_purchases')
      .update({ status: 'failed' })
      .eq('stripe_checkout_session_id', sessionId)
  }

  async markFastTrackPurchasePaid(
    sessionId: string,
    payload: Record<string, unknown>,
  ): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('fast_track_purchases')
      .update(payload)
      .eq('stripe_checkout_session_id', sessionId)
  }

  async markWaitlistInvited(email: string, invitedAt: string): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('waitlist_entries')
      .update({ status: 'invited', invited_at: invitedAt })
      .eq('email', email)
  }

  async upsertOrgSubscription(payload: Record<string, unknown>): BillingDbResult {
    return await this.customerRepository
      .getClient()
      .from('org_subscriptions')
      .upsert(payload, { onConflict: 'org_id' })
  }
}
