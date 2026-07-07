/**
 * Org Stripe Service
 *
 * ISOLATED from personal Stripe. Creates Stripe customers per org,
 * handles org checkout sessions and credit purchases.
 * Uses org_subscriptions and org_credit_purchases tables exclusively.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { OrgStripeRepository } from '../repositories/org-stripe.repository'

@Injectable()
export class OrgStripeService implements OnModuleInit {
  private readonly logger = new Logger(OrgStripeService.name)
  private stripe!: Stripe
  private readonly supabase: SupabaseClient
  private isTestMode = false

  constructor(
    private readonly configService: ConfigService,
    private readonly svc: SupabaseServiceClient,
    private readonly orgStripeRepository: OrgStripeRepository,
  ) {
    this.supabase = svc.client
  }

  onModuleInit(): void {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY not configured -- org Stripe disabled')
      return
    }
    this.stripe = new Stripe(secretKey)
    this.isTestMode = secretKey.startsWith('sk_test_')
  }

  async findOrCreateOrgCustomer(orgId: string, ownerEmail: string): Promise<string> {
    const existingCustomerId = await this.orgStripeRepository.findOrgCustomerId(
      this.supabase,
      orgId,
    )

    if (existingCustomerId) return existingCustomerId

    const orgName = await this.orgStripeRepository.findOrgName(this.supabase, orgId)

    const customer = await this.stripe.customers.create({
      email: ownerEmail,
      name: orgName ?? 'Organization',
      metadata: { org_id: orgId, type: 'organization' },
    })

    await this.orgStripeRepository.upsertOrgCustomer(this.supabase, orgId, customer.id)

    this.logger.log(`Created Stripe customer ${customer.id} for org ${orgId}`)
    return customer.id
  }

  async createOrgCheckoutSession(
    orgId: string,
    ownerEmail: string,
    planSlug: string,
    billingPeriod: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe) throw new Error('Stripe not initialized')

    const slug =
      billingPeriod === 'annual' ? `${planSlug.replace(/-monthly$/, '')}-annual` : planSlug
    const plan = await this.orgStripeRepository.findActivePlanBySlug(this.supabase, slug)
    if (!plan) throw new Error(`Plan ${slug} not found`)

    const priceId = this.isTestMode
      ? (plan.stripe_test_price_id ?? plan.stripe_price_id)
      : plan.stripe_price_id
    if (!priceId) throw new Error(`No Stripe price ID for plan ${slug}`)

    const customerId = await this.findOrCreateOrgCustomer(orgId, ownerEmail)

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: orgId,
      metadata: { org_id: orgId, plan_slug: slug, type: 'org_subscription' },
    })

    return { sessionId: session.id, url: session.url ?? '' }
  }

  async createOrgCreditPurchaseSession(
    orgId: string,
    ownerEmail: string,
    packId: string,
    successUrl: string,
    cancelUrl: string,
    quantity = 1,
    purchasedBy?: string,
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe) throw new Error('Stripe not initialized')

    const pack = await this.orgStripeRepository.findActiveCreditPackBySlug(this.supabase, packId)
    if (!pack) throw new Error('Credit pack not found')

    const priceId = this.isTestMode
      ? (pack.stripe_test_price_id ?? pack.stripe_price_id)
      : pack.stripe_price_id
    if (!priceId) throw new Error('No Stripe price ID for credit pack')

    const customerId = await this.findOrCreateOrgCustomer(orgId, ownerEmail)

    const metadata: Record<string, string> = {
      org_id: orgId,
      pack_id: packId,
      credits: String((pack.credits ?? 0) * quantity),
      type: 'org_credit_purchase',
    }
    if (purchasedBy) {
      metadata.purchased_by = purchasedBy
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [{ price: priceId, quantity }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: orgId,
      metadata,
      payment_intent_data: {
        metadata,
      },
    })

    return { sessionId: session.id, url: session.url ?? '' }
  }

  async createOrgPortalSession(orgId: string, returnUrl: string): Promise<{ url: string }> {
    if (!this.stripe) throw new Error('Stripe not initialized')

    const customerId = await this.orgStripeRepository.findExistingOrgCustomerId(
      this.supabase,
      orgId,
    )

    if (!customerId) throw new Error('No Stripe customer for this organization')

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return { url: session.url }
  }

  async getOrgCustomerId(orgId: string): Promise<string | null> {
    return this.orgStripeRepository.findOrgCustomerId(this.supabase, orgId)
  }

  async listOrgInvoices(orgId: string, limit = 12) {
    if (!this.stripe) return []
    const customerId = await this.getOrgCustomerId(orgId)
    if (!customerId) return []

    const invoices = await this.stripe.invoices.list({ customer: customerId, limit })
    return invoices.data.map((inv) => ({
      stripe_invoice_id: inv.id,
      amount_paid: (inv.amount_paid ?? 0) / 100,
      amount_due: (inv.amount_due ?? 0) / 100,
      currency: inv.currency ?? 'usd',
      status: inv.status ?? 'unknown',
      invoice_pdf: inv.invoice_pdf ?? null,
      hosted_invoice_url: inv.hosted_invoice_url ?? null,
      created: inv.created,
    }))
  }
}
