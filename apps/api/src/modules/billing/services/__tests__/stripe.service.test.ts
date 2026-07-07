import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorReporter } from '@vibey/api-shared'
import { BillingStripeAgentBrainRepository } from '../../repositories/billing-stripe-agent-brain.repository'
import { BillingStripeCustomerRepository } from '../../repositories/billing-stripe-customer.repository'
import { BillingStripePaymentRepository } from '../../repositories/billing-stripe-payment.repository'
import { CreditsService } from '../credits.service'
import { StripeService } from '../stripe.service'

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: { create: vi.fn() },
  },
  billingPortal: {
    sessions: { create: vi.fn() },
  },
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
  },
  customers: {
    list: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
  },
  invoices: {
    list: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
}

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => mockStripe),
}))

// Mock Supabase
const mockSbChain: Record<string, any> = {}
const sbMethods = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'not',
  'in',
  'single',
  'maybeSingle',
  'order',
  'limit',
  'gte',
]
for (const m of sbMethods) {
  mockSbChain[m] = vi.fn().mockReturnValue(mockSbChain)
}
mockSbChain.single.mockResolvedValue({ data: null, error: null })
mockSbChain.maybeSingle.mockResolvedValue({ data: null, error: null })

const mockFrom = vi.fn().mockReturnValue(mockSbChain)

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

describe('StripeService', () => {
  let service: StripeService
  let configService: ConfigService
  let creditsService: CreditsService
  let errorReporter: ErrorReporter

  beforeEach(() => {
    vi.clearAllMocks()

    configService = {
      get: vi.fn((key: string) => {
        const map: Record<string, string> = {
          STRIPE_SECRET_KEY: 'sk_test_fake',
          STRIPE_WEBHOOK_SECRET: 'whsec_test',
          SUPABASE_URL: 'https://test.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: 'sb_test_key',
        }
        return map[key]
      }),
    } as unknown as ConfigService

    creditsService = {
      resolvePersonalMonthlyUsageLedgerRowId: vi.fn().mockResolvedValue(null),
    } as unknown as CreditsService

    errorReporter = {
      report: vi.fn(),
    } as unknown as ErrorReporter

    service = new StripeService(configService, creditsService, errorReporter)
    service.onModuleInit()
  })

  it('should compile through Nest with billing repositories injected', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        StripeService,
        BillingStripeCustomerRepository,
        BillingStripePaymentRepository,
        BillingStripeAgentBrainRepository,
        { provide: ConfigService, useValue: configService },
        { provide: CreditsService, useValue: creditsService },
        { provide: ErrorReporter, useValue: errorReporter },
      ],
    }).compile()

    expect(moduleRef.get(StripeService)).toBeInstanceOf(StripeService)
    await moduleRef.close()
  })

  describe('createCheckoutSession', () => {
    it('should create a checkout session for a valid plan', async () => {
      // Mock plan lookup
      mockSbChain.single.mockResolvedValueOnce({
        data: {
          id: 'plan-1',
          slug: 'starter-monthly',
          stripe_price_id: 'price_live',
          stripe_test_price_id: 'price_test',
          is_active: true,
        },
        error: null,
      })

      // Mock no existing customer_id in user_subscriptions
      mockSbChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockStripe.customers.list.mockResolvedValueOnce({ data: [{ id: 'cus_123' }] })
      mockStripe.customers.retrieve.mockRejectedValueOnce(new Error('no default payment method'))

      mockStripe.checkout.sessions.create.mockResolvedValueOnce({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/session',
      })

      const result = await service.createCheckoutSession(
        'user-1',
        'user@test.com',
        'starter',
        'monthly',
        'https://app.com/success',
        'https://app.com/cancel',
      )

      expect(result.sessionId).toBe('cs_test_123')
      expect(result.url).toBe('https://checkout.stripe.com/session')
    })

    it('should handle double-suffix in plan slug (starter-monthly + monthly)', async () => {
      mockSbChain.single.mockResolvedValueOnce({
        data: {
          id: 'plan-1',
          slug: 'starter-monthly',
          stripe_test_price_id: 'price_test',
          is_active: true,
        },
        error: null,
      })
      mockSbChain.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockStripe.customers.list.mockResolvedValueOnce({ data: [{ id: 'cus_123' }] })
      mockStripe.customers.retrieve.mockRejectedValueOnce(new Error('no default payment method'))
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_1', url: 'https://x' })

      // Pass "starter-monthly" with billingPeriod "monthly" — should NOT become "starter-monthly-monthly"
      await service.createCheckoutSession(
        'user-1',
        'u@t.com',
        'starter-monthly',
        'monthly',
        'https://ok',
        'https://cancel',
      )

      // The .eq call for slug should be 'starter-monthly', not 'starter-monthly-monthly'
      const eqCalls = mockSbChain.eq.mock.calls
      const slugCall = eqCalls.find((c: any[]) => c[0] === 'slug')
      expect(slugCall![1]).toBe('starter-monthly')
    })

    it('should throw if plan not found', async () => {
      mockSbChain.single.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

      await expect(
        service.createCheckoutSession('u1', 'e@t.com', 'nonexistent', 'monthly', 'ok', 'cancel'),
      ).rejects.toThrow('Plan not found')
    })

    it('should throw if plan has no Stripe price ID', async () => {
      mockSbChain.single.mockResolvedValueOnce({
        data: {
          id: 'p1',
          slug: 'free',
          stripe_price_id: null,
          stripe_test_price_id: null,
          is_active: true,
        },
        error: null,
      })

      await expect(
        service.createCheckoutSession('u1', 'e@t.com', 'free', 'monthly', 'ok', 'cancel'),
      ).rejects.toThrow('no Stripe price ID')
    })

    it('should use test price ID when in test mode', async () => {
      mockSbChain.single.mockResolvedValueOnce({
        data: {
          id: 'p1',
          slug: 'pro-annual',
          stripe_price_id: 'price_live_123',
          stripe_test_price_id: 'price_test_456',
          is_active: true,
        },
        error: null,
      })
      mockSbChain.maybeSingle.mockResolvedValueOnce({
        data: { stripe_customer_id: 'cus_existing' },
        error: null,
      })
      mockStripe.customers.retrieve.mockRejectedValueOnce(new Error('no default payment method'))
      mockStripe.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_1', url: 'https://x' })

      await service.createCheckoutSession('u1', 'e@t.com', 'pro', 'annual', 'ok', 'cancel')

      // Should pass test price ID since key starts with sk_test_
      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0]
      expect(createCall.line_items[0].price).toBe('price_test_456')
    })
  })

  describe('cancelSubscription', () => {
    it('should cancel at period end', async () => {
      mockStripe.subscriptions.update.mockResolvedValueOnce({
        current_period_end: 1700000000,
      })

      const result = await service.cancelSubscription('sub_123')
      expect(result.periodEnd).toBeDefined()
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      })
    })
  })

  describe('reactivateSubscription', () => {
    it('should reactivate by clearing cancel_at_period_end', async () => {
      mockStripe.subscriptions.update.mockResolvedValueOnce({})
      await service.reactivateSubscription('sub_123')
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: false,
      })
    })
  })

  describe('listInvoices', () => {
    it('should return mapped invoices', async () => {
      mockStripe.invoices.list.mockResolvedValueOnce({
        data: [
          {
            id: 'inv_1',
            amount_paid: 2000,
            amount_due: 2000,
            currency: 'usd',
            status: 'paid',
            invoice_pdf: 'https://pdf',
            hosted_invoice_url: 'https://hosted',
            created: 1700000000,
          },
        ],
      })

      const result = await service.listInvoices('cus_123', 5)
      expect(result).toHaveLength(1)
      expect(result[0].stripe_invoice_id).toBe('inv_1')
      expect(result[0].amount_paid).toBe(2000)
    })
  })

  describe('createPortalSession', () => {
    it('should return portal URL', async () => {
      mockStripe.billingPortal.sessions.create.mockResolvedValueOnce({
        url: 'https://portal.stripe.com',
      })

      const result = await service.createPortalSession('cus_123', 'https://return.url')
      expect(result.url).toBe('https://portal.stripe.com')
    })
  })
})
