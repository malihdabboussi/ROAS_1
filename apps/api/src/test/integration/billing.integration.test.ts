/**
 * Billing Integration Tests — status, plans, checkout, credit history, cancel
 */
import { type INestApplication } from '@nestjs/common'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { CreditsService } from '../../modules/billing/services/credits.service'
import { StripeService } from '../../modules/billing/services/stripe.service'
import { createMockSupabase, createTestApp } from './test-helpers'

describe('Billing Integration', () => {
  let app: INestApplication

  beforeAll(async () => {
    const mockSupabase = createMockSupabase({
      user_subscriptions: {
        data: {
          plan_id: 'plan-starter',
          status: 'active',
          stripe_subscription_id: 'sub_test_123',
          stripe_customer_id: 'cus_test_123',
          current_period_start: '2026-02-01',
          current_period_end: '2026-03-01',
          cancel_at_period_end: false,
        },
        error: null,
      },
      subscription_plans: {
        data: [
          {
            id: 'plan-starter',
            slug: 'starter-monthly',
            name: 'Starter',
            price_amount: 19,
            interval: 'month',
            base_credits: 1000,
            stripe_price_id: 'price_test_123',
            features: {},
            is_active: true,
          },
        ],
        error: null,
      },
      ai_usage_events: {
        data: [
          {
            id: 'evt-1',
            feature: 'chat',
            action: 'message',
            credits_charged: 5,
            computed_cost: 0.025,
            model_name: 'claude-sonnet-4-20250514',
            service_type: 'chat',
            created_at: '2026-02-14T12:00:00Z',
          },
        ],
        error: null,
      },
    })
    app = await createTestApp(mockSupabase)
  }, 30_000)

  afterAll(async () => {
    await app?.close()
  })

  describe('GET /api/billing/status', () => {
    it('returns balance, subscription, and plan info', async () => {
      const creditsService = app.get(CreditsService)
      vi.spyOn(creditsService, 'getBalance').mockResolvedValue({
        baseCredits: 1000,
        baseCreditsUsed: 100,
        rolloverCredits: 0,
        purchasedCredits: 0,
        purchasedCreditsUsed: 0,
        totalAvailable: 900,
        totalUsed: 100,
      })
      const res = await request(app.getHttpServer()).get('/api/billing/status').expect(200)
      expect(res.body.balance).toBeDefined()
      expect(res.body.balance.totalAvailable).toBe(900)
      vi.restoreAllMocks()
    })
  })

  describe('GET /api/billing/plans', () => {
    it('returns available subscription plans', async () => {
      const res = await request(app.getHttpServer()).get('/api/billing/plans').expect(200)
      expect(res.body.plans).toBeDefined()
      expect(Array.isArray(res.body.plans)).toBe(true)
    })
  })

  describe('GET /api/billing/usage', () => {
    it('returns usage events', async () => {
      const res = await request(app.getHttpServer()).get('/api/billing/usage').expect(200)
      expect(res.body.events).toBeDefined()
    })
  })

  describe('POST /api/billing/checkout', () => {
    it('returns 400 when planSlug is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .send({ billingPeriod: 'monthly' })
        .expect(400)
    })

    it('returns 400 when billingPeriod is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .send({ planSlug: 'starter', billingPeriod: 'weekly' })
        .expect(400)
    })

    it('creates checkout session with valid params', async () => {
      const stripeService = app.get(StripeService)
      vi.spyOn(stripeService, 'createCheckoutSession').mockResolvedValue({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      })
      const res = await request(app.getHttpServer())
        .post('/api/billing/checkout')
        .send({ planSlug: 'starter', billingPeriod: 'monthly' })
        .expect(200)
      expect(res.body.sessionId).toBe('cs_test_123')
      expect(res.body.url).toContain('stripe.com')
      vi.restoreAllMocks()
    })
  })

  describe('GET /api/billing/credit-history', () => {
    it('returns paginated credit history', async () => {
      const res = await request(app.getHttpServer()).get('/api/billing/credit-history').expect(200)
      expect(res.body).toHaveProperty('items')
      expect(res.body).toHaveProperty('total')
      expect(res.body).toHaveProperty('hasMore')
    })
  })

  describe('POST /api/billing/cancel-subscription', () => {
    it('cancels active subscription', async () => {
      const stripeService = app.get(StripeService)
      vi.spyOn(stripeService, 'cancelSubscription').mockResolvedValue({
        periodEnd: '2026-03-01T00:00:00Z',
      })
      const res = await request(app.getHttpServer())
        .post('/api/billing/cancel-subscription')
        .send({ reason: 'Too expensive' })
        .expect(200)
      expect(res.body.success).toBe(true)
      vi.restoreAllMocks()
    })
  })
})
