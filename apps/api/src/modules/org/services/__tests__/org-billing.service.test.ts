import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { CreditHistoryEnrichmentRepository } from '../../../billing/repositories/credit-history-enrichment.repository'
import { OrgBillingRepository } from '../../repositories/org-billing.repository'
import { OrgBillingService } from '../org-billing.service'

type QueryResult = {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

function makeQuery(table: string, result: QueryResult, writes: Record<string, unknown[]>) {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    insert: vi.fn((payload: unknown) => {
      writes[table] = writes[table] ?? []
      writes[table].push(payload)
      return query
    }),
    update: vi.fn((payload: unknown) => {
      writes[table] = writes[table] ?? []
      writes[table].push(payload)
      return query
    }),
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

function makeService(queues: Record<string, QueryResult[]>) {
  const supabase = makeSupabase(queues)
  const service = new OrgBillingService(
    { client: supabase.client } as never,
    new OrgBillingRepository(),
    new CreditHistoryEnrichmentRepository(),
  )
  return { service, supabase }
}

function makeRpcClient(result: { data?: unknown; error?: unknown } = { data: {}, error: null }) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  }
}

const proPlan = {
  slug: 'pro',
  name: 'Pro',
  base_credits: 1000,
  rollover_cap: 300,
  price_amount: 4900,
  billing_period: 'monthly',
}

describe('OrgBillingService.getOrgBalance', () => {
  it('creates a new billing-period usage row with capped rollover and purchased carryover', async () => {
    const { service, supabase } = makeService({
      org_subscriptions: [
        { data: { plan_id: 'plan-pro', status: 'active' }, error: null },
        { data: { current_period_start: '2026-06-01T00:00:00.000Z' }, error: null },
      ],
      subscription_plans: [{ data: proPlan, error: null }],
      org_monthly_credit_usage: [
        {
          data: {
            id: 'usage-old',
            month: '2026-05-01',
            base_allowance: 1000,
            base_credits_used: 650,
            purchased_credits_used: 200,
          },
          error: null,
        },
        { error: null },
      ],
      org_credit_purchases: [{ data: [{ credits_purchased: 500 }, { credits_purchased: 300 }] }],
    })

    await expect(service.getOrgBalance('org-1')).resolves.toEqual({
      baseCredits: 1000,
      baseCreditsUsed: 0,
      rolloverCredits: 300,
      purchasedCredits: 800,
      purchasedCreditsUsed: 200,
      totalAvailable: 1900,
      totalUsed: 0,
    })

    expect(supabase.writes.org_monthly_credit_usage[0]).toMatchObject({
      org_id: 'org-1',
      month: '2026-06-01',
      base_allowance: 1000,
      base_credits_used: 0,
      purchased_credits_used: 200,
      total_credits_used: 0,
      total_credits_purchased: 800,
      rollover_credits: 300,
    })
  })
})

describe('OrgBillingService.deductOrgCredits', () => {
  it('deducts from base, then rollover, then purchased credits', async () => {
    const { service, supabase } = makeService({
      org_monthly_credit_usage: [
        {
          data: {
            id: 'usage-1',
            base_credits_used: 900,
            rollover_credits: 50,
            purchased_credits_used: 25,
            total_credits_used: 925,
          },
          error: null,
        },
        { error: null },
      ],
    })
    service.getOrgBalance = vi
      .fn()
      .mockResolvedValueOnce({ totalAvailable: 500, totalUsed: 925 })
      .mockResolvedValueOnce({ totalAvailable: 350, totalUsed: 1075 })
    service.getOrgPlan = vi.fn().mockResolvedValue(proPlan)

    await expect(service.deductOrgCredits('org-1', 150)).resolves.toEqual({
      totalAvailable: 350,
      totalUsed: 1075,
    })

    expect(supabase.writes.org_monthly_credit_usage[0]).toEqual({
      base_credits_used: 1000,
      rollover_credits: 0,
      purchased_credits_used: 25,
      total_credits_used: 1075,
    })
  })
})

describe('OrgBillingService.getMemberUsageSummary', () => {
  it('maps active members with current-month usage and member limits', async () => {
    const { service } = makeService({
      org_members: [
        {
          data: [
            {
              id: 'member-1',
              user_id: 'user-1',
              role: 'admin',
              profiles: { id: 'user-1', full_name: 'A User', avatar_url: null },
            },
          ],
          error: null,
        },
      ],
      ai_usage_events: [
        {
          data: [
            { metadata_json: { requesting_user_id: 'user-1' }, credits_charged: 20 },
            { metadata_json: { requesting_user_id: 'other-user' }, credits_charged: 99 },
          ],
          error: null,
        },
      ],
      org_member_credit_limits: [
        {
          data: [
            {
              member_id: 'member-1',
              period: 'monthly',
              credit_limit: 500,
              credits_used: 20,
            },
          ],
          error: null,
        },
      ],
    })

    await expect(service.getMemberUsageSummary('org-1')).resolves.toEqual([
      {
        memberId: 'member-1',
        userId: 'user-1',
        role: 'admin',
        profile: { id: 'user-1', full_name: 'A User', avatar_url: null },
        creditsUsedThisMonth: 20,
        creditLimit: { period: 'monthly', limit: 500, used: 20 },
      },
    ])
  })
})

describe('OrgBillingService org spending analytics', () => {
  it('uses the request Supabase client for membership-gated org usage analytics RPCs', async () => {
    const { service, supabase } = makeService({})
    const requestSupabase = makeRpcClient({
      data: {
        dailySpending: [{ date: '2026-06-30', credits: 25 }],
        categoryBreakdown: [{ feature: 'chat', credits: 25, count: 1 }],
        totalCreditsSpent: 25,
        totalEvents: 1,
      },
      error: null,
    })

    await expect(
      service.getUsageAnalytics(requestSupabase as never, 'org-1', '2026-06-01', '2026-06-30'),
    ).resolves.toMatchObject({
      success: true,
      totalCreditsSpent: 25,
      totalEvents: 1,
    })

    expect(requestSupabase.rpc).toHaveBeenCalledWith('billing_usage_analytics_org', {
      p_org_id: 'org-1',
      p_start: '2026-06-01',
      p_end: '2026-06-30',
    })
    expect(supabase.client.from).not.toHaveBeenCalled()
  })

  it('uses the request Supabase client for org agent and human spending RPCs', async () => {
    const { service, supabase } = makeService({})
    const requestSupabase = makeRpcClient({ data: { agents: [], humans: [] }, error: null })

    await expect(
      service.getAgentSpending(requestSupabase as never, 'org-1', '2026-06-01', '2026-06-30', [
        'campaign-1',
      ]),
    ).resolves.toEqual({ success: true, agents: [] })
    await expect(
      service.getHumanSpending(requestSupabase as never, 'org-1', '2026-06-01', '2026-06-30', [
        'campaign-1',
      ]),
    ).resolves.toEqual({ success: true, humans: [] })

    expect(requestSupabase.rpc).toHaveBeenNthCalledWith(1, 'billing_agent_spending_org', {
      p_org_id: 'org-1',
      p_start: '2026-06-01',
      p_end: '2026-06-30',
      p_campaign_ids: ['campaign-1'],
    })
    expect(requestSupabase.rpc).toHaveBeenNthCalledWith(2, 'billing_human_spending_org', {
      p_org_id: 'org-1',
      p_start: '2026-06-01',
      p_end: '2026-06-30',
      p_campaign_ids: ['campaign-1'],
    })
    expect(supabase.client.from).not.toHaveBeenCalled()
  })
})

describe('OrgBillingService.updateOrgAutoRecharge', () => {
  it('stores top-up settings and converts the monthly cap to recharge count', async () => {
    const { service, supabase } = makeService({
      org_credit_auto_recharge: [
        { error: null },
        {
          data: {
            is_enabled: true,
            threshold_credits: 600,
            recharge_amount: 2000,
            max_monthly_recharges: 2,
          },
          error: null,
        },
      ],
    })

    await expect(
      service.updateOrgAutoRecharge('org-1', {
        enabled: true,
        triggerCredits: 600,
        topupCredits: 2000,
        monthlyCap: 2000,
      }),
    ).resolves.toEqual({
      is_enabled: true,
      trigger_credits: 600,
      topup_credits: 2000,
      last_recharged_at: null,
      monthly_cap_cents: 2000,
    })

    expect(supabase.writes.org_credit_auto_recharge[0]).toMatchObject({
      org_id: 'org-1',
      is_enabled: true,
      threshold_credits: 600,
      recharge_amount: 2000,
      max_monthly_recharges: 2,
    })
  })

  it('rejects invalid top-up increments before writing', async () => {
    const { service, supabase } = makeService({})

    await expect(
      service.updateOrgAutoRecharge('org-1', {
        enabled: true,
        triggerCredits: 600,
        topupCredits: 2100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(supabase.client.from).not.toHaveBeenCalled()
  })
})
