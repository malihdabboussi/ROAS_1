/**
 * Billing HTTP endpoints — contract tests via BillingUserData/Actions + Stripe service spies.
 * Webhook signature and event handling are covered in billing webhook tests, not here.
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { BillingUserActionsService } from '../../modules/billing/services/billing-user-actions.service'
import { BillingUserDataService } from '../../modules/billing/services/billing-user-data.service'
import { StripeService } from '../../modules/billing/services/stripe.service'
import { createMockSupabase, createTestApp } from './test-helpers'

describe('Billing endpoints integration', () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.APP_URL = process.env.APP_URL || 'http://localhost:3000'
    app = await createTestApp(createMockSupabase())
  }, 30_000)

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await app?.close()
  })

  it('GET /api/billing/status returns 200 with plan and balance (credits) shape', async () => {
    const dataService = app.get(BillingUserDataService)
    vi.spyOn(dataService, 'getBillingStatus').mockResolvedValue({
      balance: {
        baseCredits: 1000,
        baseCreditsUsed: 0,
        rolloverCredits: 0,
        purchasedCredits: 0,
        purchasedCreditsUsed: 0,
        totalAvailable: 100,
        totalUsed: 0,
      },
      subscription: null,
      plan: {
        id: 'plan-pro',
        slug: 'pro-monthly',
        name: 'Pro',
        price_amount: 49,
        interval: 'month',
        base_credits: 5000,
        stripe_price_id: 'price_test',
        is_active: true,
        rollover_cap: 0,
        can_buy_credits: true,
        max_campaigns: null,
        max_published_funnels: null,
        max_custom_domains: null,
        max_presentations: null,
        max_offers: null,
        max_sequences: null,
        max_brain_entries: null,
        max_storage_bytes: null,
        max_custom_themes: null,
        can_voice_input: true,
        can_image_gen: true,
        can_advanced_analytics: true,
        can_api_access: true,
        can_white_label: false,
      },
      role: 'user',
      creditDiscountPercent: 0,
      usage: {
        campaigns: 0,
        publishedFunnels: 0,
        customDomains: 0,
        presentations: 0,
        offers: 0,
        sequences: 0,
        brainEntries: 0,
        storageBytes: 0,
        customThemes: 0,
      },
      autoRecharge: {
        is_enabled: false,
        trigger_credits: 500,
        topup_credits: 2000,
        last_recharged_at: null,
        monthly_cap_cents: null,
      },
      addons: [],
    })

    const res = await request(app.getHttpServer()).get('/api/billing/status').expect(200)
    expect(res.body.plan).toBeDefined()
    expect(res.body.plan.slug).toBe('pro-monthly')
    expect(res.body.balance).toBeDefined()
    expect(typeof res.body.balance.totalAvailable).toBe('number')
  })

  it('GET /api/billing/plans returns 200 with plans array', async () => {
    const dataService = app.get(BillingUserDataService)
    vi.spyOn(dataService, 'getPlans').mockResolvedValue({
      plans: [
        {
          id: 'plan-1',
          slug: 'starter-monthly',
          name: 'Starter',
          price_amount: 19,
          interval: 'month',
          base_credits: 1000,
          stripe_price_id: 'price_1',
          is_active: true,
          rollover_cap: 0,
          can_buy_credits: true,
          max_campaigns: null,
          max_published_funnels: null,
          max_custom_domains: null,
          max_presentations: null,
          max_offers: null,
          max_sequences: null,
          max_brain_entries: null,
          max_storage_bytes: null,
          max_custom_themes: null,
          can_voice_input: false,
          can_image_gen: false,
          can_advanced_analytics: false,
          can_api_access: false,
          can_white_label: false,
        },
      ],
    })

    const res = await request(app.getHttpServer()).get('/api/billing/plans').expect(200)
    expect(Array.isArray(res.body.plans)).toBe(true)
    expect(res.body.plans).toHaveLength(1)
    expect(res.body.plans[0].slug).toBe('starter-monthly')
  })

  it('POST /api/billing/checkout returns 200 with session id and checkout url', async () => {
    const stripeService = app.get(StripeService)
    vi.spyOn(stripeService, 'createCheckoutSession').mockResolvedValue({
      sessionId: 'cs_test_contract',
      url: 'https://checkout.stripe.com/session/cs_test_contract',
    })

    const res = await request(app.getHttpServer())
      .post('/api/billing/checkout')
      .send({ planSlug: 'starter', billingPeriod: 'monthly' })
      .expect(200)

    expect(res.body.sessionId).toBe('cs_test_contract')
    expect(res.body.url).toMatch(/^https:\/\//)
  })

  it('POST /api/billing/purchase-credits returns 200', async () => {
    const stripeService = app.get(StripeService)
    vi.spyOn(stripeService, 'purchaseCreditsOneClick').mockResolvedValue({
      charged: true,
      credits: 2000,
      amount: 20,
      paymentId: 'pi_test_contract',
    })

    const res = await request(app.getHttpServer())
      .post('/api/billing/purchase-credits')
      .send({ packId: 'pack_small', quantity: 1 })
      .expect(200)

    expect(res.body.charged).toBe(true)
    expect(res.body.credits).toBe(2000)
  })

  it('POST /api/billing/cancel-subscription returns 200', async () => {
    const actionsService = app.get(BillingUserActionsService)
    vi.spyOn(actionsService, 'cancelSubscriptionAtPeriodEnd').mockResolvedValue({
      success: true,
      periodEnd: '2026-12-31T00:00:00.000Z',
    })

    const res = await request(app.getHttpServer())
      .post('/api/billing/cancel-subscription')
      .send({ reason: 'integration test' })
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.periodEnd).toBeDefined()
  })

  it('POST /api/billing/portal returns 200 with url', async () => {
    const stripeService = app.get(StripeService)
    vi.spyOn(stripeService, 'getCustomerIdForUser').mockResolvedValue('cus_test_contract')
    vi.spyOn(stripeService, 'createPortalSession').mockResolvedValue({
      url: 'https://billing.stripe.com/session/test_portal',
    })

    const res = await request(app.getHttpServer()).post('/api/billing/portal').send({}).expect(200)

    expect(res.body.url).toMatch(/^https:\/\//)
  })
})
