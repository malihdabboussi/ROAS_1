import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BillingUserActionsService } from '../billing-user-actions.service'

type QueryResult = {
  data?: unknown
  error?: { message: string } | null
}

function createQuery(result: QueryResult) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    insert: vi.fn(() => query),
    update: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    not: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return query
}

function createSupabase(results: Record<string, QueryResult | QueryResult[]>) {
  const queries: Record<string, ReturnType<typeof createQuery>[]> = {}
  const supabase = {
    from: vi.fn((table: string) => {
      const tableResults = Array.isArray(results[table]) ? results[table] : [results[table]]
      const nextResult = tableResults[queries[table]?.length ?? 0] ?? tableResults.at(-1)
      const query = createQuery(nextResult ?? { data: null, error: null })
      queries[table] = [...(queries[table] ?? []), query]
      return query
    }),
    queries,
  }
  return supabase
}

describe('BillingUserActionsService', () => {
  const creditsService = {
    resolvePersonalMonthlyUsageLedgerRowId: vi.fn(),
  }
  const stripeService = {
    listInvoices: vi.fn(),
    cancelSubscription: vi.fn(),
    reactivateSubscription: vi.fn(),
  }
  const stripeCustomerRepository = {
    findFreePlanId: vi.fn(),
    upsertUserSubscription: vi.fn(),
  }

  function createService(actionsRepository?: unknown) {
    return new BillingUserActionsService(
      creditsService as never,
      stripeService as never,
      stripeCustomerRepository as never,
      actionsRepository as never,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    creditsService.resolvePersonalMonthlyUsageLedgerRowId.mockResolvedValue('usage-1')
    stripeService.listInvoices.mockResolvedValue([])
    stripeService.cancelSubscription.mockResolvedValue({
      periodEnd: '2026-12-31T00:00:00.000Z',
    })
    stripeService.reactivateSubscription.mockResolvedValue(undefined)
    stripeCustomerRepository.findFreePlanId.mockResolvedValue({
      data: { id: 'free-plan' },
      error: null,
    })
    stripeCustomerRepository.upsertUserSubscription.mockResolvedValue({ data: null, error: null })
  })

  it('redeems a promo code, records credit purchase totals, and applies enterprise profile grants', async () => {
    const service = createService()
    const supabase = createSupabase({
      promo_codes: [
        {
          data: {
            id: 'promo-1',
            code: 'LAUNCH100',
            credits_amount: 100,
            current_redemptions: 2,
            max_redemptions: 10,
            expires_at: '2099-01-01T00:00:00.000Z',
            grants_role: 'enterprise',
          },
          error: null,
        },
        { data: null, error: null },
      ],
      promo_redemptions: [
        { data: null, error: null },
        { data: null, error: null },
      ],
      credit_purchases: [
        { data: null, error: null },
        {
          data: [{ credits_purchased: 100 }, { credits_purchased: 50 }],
          error: null,
        },
      ],
      monthly_credit_usage: { data: null, error: null },
      user_profiles: { data: null, error: null },
    })

    const result = await service.redeemPromo('user-1', supabase as never, {
      code: ' launch100 ',
    })

    expect(result).toEqual({ success: true, credits: 100 })
    expect(supabase.queries.promo_codes[0].eq).toHaveBeenCalledWith('code', 'LAUNCH100')
    expect(supabase.queries.promo_redemptions[1].insert).toHaveBeenCalledWith({
      promo_code_id: 'promo-1',
      user_id: 'user-1',
      credits_granted: 100,
    })
    expect(supabase.queries.promo_codes[1].update).toHaveBeenCalledWith({
      current_redemptions: 3,
    })
    expect(supabase.queries.credit_purchases[0].insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      credits_purchased: 100,
      amount_paid: 0,
      status: 'completed',
    })
    expect(creditsService.resolvePersonalMonthlyUsageLedgerRowId).toHaveBeenCalledWith('user-1')
    expect(supabase.queries.monthly_credit_usage[0].update).toHaveBeenCalledWith({
      total_credits_purchased: 150,
    })
    expect(supabase.queries.monthly_credit_usage[0].eq).toHaveBeenCalledWith('id', 'usage-1')
    expect(supabase.queries.user_profiles[0].update).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'enterprise',
        credit_discount_percent: 20,
      }),
    )
  })

  it('rejects an already redeemed promo code before writing redemption records', async () => {
    const service = createService()
    const supabase = createSupabase({
      promo_codes: {
        data: {
          id: 'promo-1',
          credits_amount: 100,
          current_redemptions: 0,
          max_redemptions: null,
          expires_at: null,
          grants_role: null,
        },
        error: null,
      },
      promo_redemptions: { data: { id: 'redemption-1' }, error: null },
    })

    await expect(
      service.redeemPromo('user-1', supabase as never, { code: 'LAUNCH100' }),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(supabase.queries.promo_redemptions).toHaveLength(1)
  })

  it('creates and links a personal agent brain when the active add-on has no brain id', async () => {
    const service = createService()
    const supabase = createSupabase({
      user_addons: [{ data: { id: 'addon-1', brain_id: null }, error: null }, { data: null }],
      ns_brains: { data: { id: 'brain-1' }, error: null },
    })

    const result = await service.getAgentBrainStatus('user-1', supabase as never, ' agent-1 ')

    expect(result).toEqual({ hasBrain: true, brainId: 'brain-1' })
    expect(supabase.queries.ns_brains[0].insert).toHaveBeenCalledWith({
      owner_id: 'user-1',
      name: 'agent-1 Brain',
      agent_id: 'agent-1',
      is_default: false,
    })
    expect(supabase.queries.user_addons[1].update).toHaveBeenCalledWith({
      brain_id: 'brain-1',
    })
    expect(supabase.queries.user_addons[1].eq).toHaveBeenCalledWith('id', 'addon-1')
  })

  it('maps org agent brain batch status by supplied agent ids', async () => {
    const service = createService()
    const supabase = createSupabase({
      ns_brains: {
        data: [{ id: 'brain-a', agent_id: 'agent-a' }],
        error: null,
      },
    })

    const result = await service.getAgentBrainStatusBatch(
      'user-1',
      supabase as never,
      'agent-a, agent-b',
      ' org-1 ',
    )

    expect(result).toEqual({
      statuses: [
        { agentId: 'agent-a', hasBrain: true, brainId: 'brain-a' },
        { agentId: 'agent-b', hasBrain: false, brainId: null },
      ],
    })
    expect(supabase.queries.ns_brains[0].in).toHaveBeenCalledWith('agent_id', [
      'agent-a',
      'agent-b',
    ])
    expect(supabase.queries.ns_brains[0].eq).toHaveBeenCalledWith('org_id', 'org-1')
  })

  it('returns Stripe invoices for the current billing customer with a capped limit', async () => {
    const service = createService()
    stripeService.listInvoices.mockResolvedValue([
      {
        stripe_invoice_id: 'inv-1',
        amount_paid: 1000,
        amount_due: 1000,
        currency: 'usd',
        status: 'paid',
        invoice_pdf: null,
        hosted_invoice_url: null,
        created: 1,
      },
    ])
    const supabase = createSupabase({
      user_subscriptions: {
        data: { stripe_customer_id: 'cus-1' },
        error: null,
      },
    })

    const result = await service.getInvoices('user-1', supabase as never, '99')

    expect(stripeService.listInvoices).toHaveBeenCalledWith('cus-1', 50)
    expect(result.invoices).toHaveLength(1)
    expect(result.invoices[0].stripe_invoice_id).toBe('inv-1')
  })

  it('cancels an active subscription at period end and persists the reason', async () => {
    const service = createService()
    const supabase = createSupabase({
      user_subscriptions: [
        {
          data: { stripe_subscription_id: 'sub-1', stripe_customer_id: 'cus-1' },
          error: null,
        },
        { data: null, error: null },
      ],
    })

    const result = await service.cancelSubscriptionAtPeriodEnd(
      'user-1',
      supabase as never,
      'testing',
    )

    expect(stripeService.cancelSubscription).toHaveBeenCalledWith('sub-1')
    expect(supabase.queries.user_subscriptions[1].update).toHaveBeenCalledWith({
      cancel_at_period_end: true,
      cancellation_reason: 'testing',
    })
    expect(supabase.queries.user_subscriptions[1].eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(result).toEqual({ success: true, periodEnd: '2026-12-31T00:00:00.000Z' })
  })

  it('reactivates an active subscription and clears cancellation metadata', async () => {
    const service = createService()
    const supabase = createSupabase({
      user_subscriptions: [
        { data: { stripe_subscription_id: 'sub-1' }, error: null },
        { data: null, error: null },
      ],
    })

    const result = await service.reactivateSubscription('user-1', supabase as never)

    expect(stripeService.reactivateSubscription).toHaveBeenCalledWith('sub-1')
    expect(supabase.queries.user_subscriptions[1].update).toHaveBeenCalledWith({
      cancel_at_period_end: false,
      cancellation_reason: null,
    })
    expect(result).toEqual({ success: true })
  })

  it('rejects free onboarding when ALLOW_FREE_ONBOARDING is disabled', async () => {
    const service = createService()
    const supabase = createSupabase({})

    await expect(service.activateFreePlan('user-1', supabase as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('activates the free plan when onboarding free access is enabled', async () => {
    process.env.ALLOW_FREE_ONBOARDING = 'true'
    const service = createService()
    const supabase = createSupabase({
      user_subscriptions: [{ data: null, error: null }],
    })

    const result = await service.activateFreePlan('user-1', supabase as never)

    expect(result).toEqual({ success: true, alreadyActive: false })
    expect(stripeCustomerRepository.upsertUserSubscription).toHaveBeenCalledWith({
      user_id: 'user-1',
      plan_id: 'free-plan',
      status: 'active',
      stripe_subscription_id: null,
    })
    delete process.env.ALLOW_FREE_ONBOARDING
  })
})
