import { BadRequestException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BillingUserDataRepository } from '../../repositories/billing-user-data.repository'
import { CreditHistoryEnrichmentRepository } from '../../repositories/credit-history-enrichment.repository'
import { BillingUserDataService } from '../billing-user-data.service'

type QueryResult = {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

function createQuery(result: QueryResult) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    neq: vi.fn(() => query),
    in: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    range: vi.fn(() => query),
    upsert: vi.fn(() => query),
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
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    queries,
  }
  return supabase
}

describe('BillingUserDataService', () => {
  const creditsService = {
    getBalance: vi.fn(),
  }
  let repository: BillingUserDataRepository

  beforeEach(() => {
    repository = new BillingUserDataRepository(new CreditHistoryEnrichmentRepository())
    creditsService.getBalance.mockReset()
    creditsService.getBalance.mockResolvedValue({
      baseCredits: 1000,
      baseCreditsUsed: 100,
      rolloverCredits: 0,
      purchasedCredits: 500,
      purchasedCreditsUsed: 100,
      totalAvailable: 1300,
      totalUsed: 200,
    })
  })

  it('builds billing status from subscription, plan, usage, recharge, add-on, and profile reads', async () => {
    const supabase = createSupabase({
      user_subscriptions: {
        data: {
          plan_id: 'plan-1',
          status: 'active',
          stripe_subscription_id: 'sub-1',
          stripe_customer_id: 'cus-1',
          current_period_start: '2026-06-01T00:00:00.000Z',
          current_period_end: '2026-07-01T00:00:00.000Z',
          cancel_at_period_end: false,
        },
        error: null,
      },
      subscription_plans: {
        data: {
          id: 'plan-1',
          slug: 'pro-monthly',
          name: 'Pro',
          price_amount: 4900,
          interval: 'month',
          base_credits: 5000,
          stripe_price_id: 'price-1',
          is_active: true,
          rollover_cap: 0,
          can_buy_credits: true,
          max_campaigns: 10,
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
        error: null,
      },
      campaigns: { count: 2, error: null },
      funnels: { count: 3, error: null },
      domains: { count: 4, error: null },
      presentations: { count: 5, error: null },
      offers: { count: 6, error: null },
      sequences: { count: 7, error: null },
      memories: { count: 8, error: null },
      branding_themes: { count: 9, error: null },
      user_credit_auto_recharge: {
        data: {
          is_enabled: true,
          trigger_credits: 700,
          topup_credits: 2200,
          last_recharged_at: '2026-06-01T00:00:00.000Z',
          monthly_cap_cents: 10000,
        },
        error: null,
      },
      user_addons: {
        data: [{ addon_slug: 'agent-brain', agent_id: 'agent-1', status: 'active' }],
        error: null,
      },
      user_profiles: {
        data: { role: 'admin', credit_discount_percent: 15 },
        error: null,
      },
    })
    const service = new BillingUserDataService(creditsService as never, repository)

    const result = await service.getBillingStatus('user-1', supabase as never)

    expect(creditsService.getBalance).toHaveBeenCalledWith('user-1')
    expect(result.balance.totalAvailable).toBe(1300)
    expect(result.subscription?.stripe_subscription_id).toBe('sub-1')
    expect(result.plan?.slug).toBe('pro-monthly')
    expect(result.plan?.max_campaigns).toBeNull()
    expect(result.usage).toEqual({
      campaigns: 2,
      publishedFunnels: 3,
      customDomains: 4,
      presentations: 5,
      offers: 6,
      sequences: 7,
      brainEntries: 8,
      storageBytes: 0,
      customThemes: 9,
    })
    expect(result.autoRecharge.is_enabled).toBe(true)
    expect(result.addons).toEqual([{ slug: 'agent-brain', agentId: 'agent-1' }])
    expect(result.role).toBe('admin')
    expect(result.creditDiscountPercent).toBe(15)
  })

  it('maps plan query failures to a bad request response', async () => {
    const service = new BillingUserDataService(creditsService as never, repository)
    const supabase = createSupabase({
      subscription_plans: { data: null, error: { message: 'plans failed' } },
    })

    await expect(service.getPlans(supabase as never)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('validates auto-recharge settings before writing', async () => {
    const service = new BillingUserDataService(creditsService as never, repository)
    const supabase = createSupabase({})

    await expect(
      service.updateAutoRechargeSettings('user-1', supabase as never, {
        enabled: true,
        triggerCredits: 100,
        topupCredits: 2100,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns paginated credit history with total and hasMore', async () => {
    const service = new BillingUserDataService(creditsService as never, repository)
    const supabase = createSupabase({
      ai_usage_events: [
        { count: 3, error: null },
        {
          data: [
            {
              id: 'event-1',
              feature: 'chat',
              action: null,
              model_name: null,
              credits_charged: null,
              created_at: '2026-06-09T00:00:00.000Z',
              conversation_id: null,
              campaign_id: null,
            },
          ],
          error: null,
        },
      ],
    })

    const result = await service.getCreditHistory('user-1', supabase as never, '1', '0')

    expect(result).toEqual({
      items: [
        {
          id: 'event-1',
          action: 'AI Usage',
          feature: 'chat',
          model: 'unknown',
          credits: 0,
          timestamp: '2026-06-09T00:00:00.000Z',
          conversationTitle: null,
          campaignName: null,
          agentName: null,
          agentImageUrl: null,
        },
      ],
      total: 3,
      hasMore: true,
    })
    expect(supabase.queries.ai_usage_events[1].range).toHaveBeenCalledWith(0, 0)
  })

  it('enriches credit history with conversation, campaign, and agent details', async () => {
    const service = new BillingUserDataService(creditsService as never, repository)
    const supabase = createSupabase({
      ai_usage_events: [
        { count: 1, error: null },
        {
          data: [
            {
              id: 'event-1',
              feature: 'campaigns',
              action: 'Generate campaign',
              model_name: 'gemini-pro',
              credits_charged: 42,
              created_at: '2026-06-09T00:00:00.000Z',
              conversation_id: 'conversation-1',
              campaign_id: 'campaign-1',
            },
          ],
          error: null,
        },
      ],
      conversations: {
        data: [
          {
            id: 'conversation-1',
            title: 'Launch chat',
            agent_id: 'ceo',
            user_id: 'user-1',
            org_id: 'org-1',
          },
        ],
        error: null,
      },
      campaigns: {
        data: [{ id: 'campaign-1', name: 'Summer Launch' }],
        error: null,
      },
      agents_registry: {
        data: [
          {
            agent_key: 'ceo',
            name: 'CEO Agent',
            image_url: 'https://example.com/ceo.png',
            user_id: 'other-user',
            org_id: 'other-org',
          },
          {
            agent_key: 'ceo',
            name: 'Org CEO Agent',
            image_url: 'https://example.com/org-ceo.png',
            user_id: null,
            org_id: 'org-1',
          },
        ],
        error: null,
      },
    })

    const result = await service.getCreditHistory('user-1', supabase as never, '20', '0')

    expect(result.items).toEqual([
      {
        id: 'event-1',
        action: 'Generate campaign',
        feature: 'campaigns',
        model: 'gemini-pro',
        credits: 42,
        timestamp: '2026-06-09T00:00:00.000Z',
        conversationTitle: 'Launch chat',
        campaignName: 'Summer Launch',
        agentName: 'Org CEO Agent',
        agentImageUrl: 'https://example.com/org-ceo.png',
      },
    ])
    expect(supabase.from).toHaveBeenCalledWith('conversations')
    expect(supabase.from).toHaveBeenCalledWith('campaigns')
    expect(supabase.from).toHaveBeenCalledWith('agents_registry')
  })
})
