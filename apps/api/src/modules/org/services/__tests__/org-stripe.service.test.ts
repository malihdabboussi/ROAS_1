import { ConfigService } from '@nestjs/config'
import { describe, expect, it, vi } from 'vitest'
import { OrgStripeRepository } from '../../repositories/org-stripe.repository'
import { OrgStripeService } from '../org-stripe.service'

type QueryResult = {
  data?: unknown
  error?: { message: string } | null
}

function makeQuery(table: string, result: QueryResult, writes: Record<string, unknown[]>) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    upsert: vi.fn((payload: unknown) => {
      writes[table] = writes[table] ?? []
      writes[table].push(payload)
      return query
    }),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function makeSupabase(queues: Record<string, QueryResult[]>) {
  const writes: Record<string, unknown[]> = {}
  const client = {
    from: vi.fn((table: string) => {
      const result = queues[table]?.shift()
      if (!result) throw new Error(`Unexpected table query: ${table}`)
      return makeQuery(table, result, writes)
    }),
  }
  return { client, writes }
}

function makeStripeMock() {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus-new' }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: 'cs-1', url: 'https://checkout.example/session' }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.example/portal' }),
      },
    },
    invoices: {
      list: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'in_1',
            amount_paid: 1299,
            amount_due: 0,
            currency: 'usd',
            status: 'paid',
            invoice_pdf: 'https://example.com/invoice.pdf',
            hosted_invoice_url: 'https://example.com/invoice',
            created: 1790000000,
          },
        ],
      }),
    },
  }
}

function makeService(queues: Record<string, QueryResult[]>) {
  const supabase = makeSupabase(queues)
  const service = new OrgStripeService(
    new ConfigService(),
    { client: supabase.client } as never,
    new OrgStripeRepository(),
  )
  const stripe = makeStripeMock()
  ;(service as unknown as { stripe: ReturnType<typeof makeStripeMock>; isTestMode: boolean }).stripe =
    stripe
  ;(service as unknown as { isTestMode: boolean }).isTestMode = true
  return { service, supabase, stripe }
}

describe('OrgStripeService.findOrCreateOrgCustomer', () => {
  it('returns the existing org Stripe customer without creating another one', async () => {
    const { service, stripe } = makeService({
      org_subscriptions: [{ data: { stripe_customer_id: 'cus-existing' }, error: null }],
    })

    await expect(service.findOrCreateOrgCustomer('org-1', 'owner@example.com')).resolves.toBe(
      'cus-existing',
    )
    expect(stripe.customers.create).not.toHaveBeenCalled()
  })

  it('creates a Stripe customer and stores it on the org subscription row', async () => {
    const { service, supabase, stripe } = makeService({
      org_subscriptions: [{ data: null, error: null }, { error: null }],
      organizations: [{ data: { name: 'Acme Team' }, error: null }],
    })

    await expect(service.findOrCreateOrgCustomer('org-1', 'owner@example.com')).resolves.toBe(
      'cus-new',
    )

    expect(stripe.customers.create).toHaveBeenCalledWith({
      email: 'owner@example.com',
      name: 'Acme Team',
      metadata: { org_id: 'org-1', type: 'organization' },
    })
    expect(supabase.writes.org_subscriptions[0]).toEqual({
      org_id: 'org-1',
      stripe_customer_id: 'cus-new',
      status: 'active',
    })
  })
})

describe('OrgStripeService.createOrgCheckoutSession', () => {
  it('uses the annual org plan test price and org subscription metadata', async () => {
    const { service, stripe } = makeService({
      subscription_plans: [
        {
          data: {
            slug: 'team-annual',
            stripe_price_id: 'price-live',
            stripe_test_price_id: 'price-test',
          },
          error: null,
        },
      ],
      org_subscriptions: [{ data: { stripe_customer_id: 'cus-existing' }, error: null }],
    })

    await expect(
      service.createOrgCheckoutSession(
        'org-1',
        'owner@example.com',
        'team-monthly',
        'annual',
        'https://app.example/success',
        'https://app.example/cancel',
      ),
    ).resolves.toEqual({ sessionId: 'cs-1', url: 'https://checkout.example/session' })

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
      customer: 'cus-existing',
      mode: 'subscription',
      line_items: [{ price: 'price-test', quantity: 1 }],
      success_url: 'https://app.example/success',
      cancel_url: 'https://app.example/cancel',
      client_reference_id: 'org-1',
      metadata: { org_id: 'org-1', plan_slug: 'team-annual', type: 'org_subscription' },
    })
  })
})

describe('OrgStripeService.createOrgCreditPurchaseSession', () => {
  it('creates a one-time credit purchase session with multiplied credit metadata', async () => {
    const { service, stripe } = makeService({
      credit_packs: [
        {
          data: {
            slug: 'pack-small',
            credits: 2000,
            stripe_price_id: 'price-live',
            stripe_test_price_id: 'price-test',
          },
          error: null,
        },
      ],
      org_subscriptions: [{ data: { stripe_customer_id: 'cus-existing' }, error: null }],
    })

    await expect(
      service.createOrgCreditPurchaseSession(
        'org-1',
        'owner@example.com',
        'pack-small',
        'https://app.example/success',
        'https://app.example/cancel',
        3,
        'user-1',
      ),
    ).resolves.toEqual({ sessionId: 'cs-1', url: 'https://checkout.example/session' })

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith({
      customer: 'cus-existing',
      mode: 'payment',
      line_items: [{ price: 'price-test', quantity: 3 }],
      success_url: 'https://app.example/success',
      cancel_url: 'https://app.example/cancel',
      client_reference_id: 'org-1',
      metadata: {
        org_id: 'org-1',
        pack_id: 'pack-small',
        credits: '6000',
        type: 'org_credit_purchase',
        purchased_by: 'user-1',
      },
      payment_intent_data: {
        metadata: {
          org_id: 'org-1',
          pack_id: 'pack-small',
          credits: '6000',
          type: 'org_credit_purchase',
          purchased_by: 'user-1',
        },
      },
    })
  })
})

describe('OrgStripeService.listOrgInvoices', () => {
  it('maps Stripe invoice amounts from cents to dollars', async () => {
    const { service } = makeService({
      org_subscriptions: [{ data: { stripe_customer_id: 'cus-existing' }, error: null }],
    })

    await expect(service.listOrgInvoices('org-1', 5)).resolves.toEqual([
      {
        stripe_invoice_id: 'in_1',
        amount_paid: 12.99,
        amount_due: 0,
        currency: 'usd',
        status: 'paid',
        invoice_pdf: 'https://example.com/invoice.pdf',
        hosted_invoice_url: 'https://example.com/invoice',
        created: 1790000000,
      },
    ])
  })
}
)
