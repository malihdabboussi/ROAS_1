import { describe, expect, it, vi } from 'vitest'
import { CreditsService, type CreditBalance } from './credits.service'

type Row = Record<string, any>

function makeSupabase(tables: Record<string, Row[]> = {}) {
  const calls: Array<{ table: string; type: string; payload: unknown }> = []
  const from = vi.fn((table: string) => {
    const state: {
      filters: Array<(row: Row) => boolean>
      order?: { field: string; ascending: boolean }
      limit?: number
      payload?: unknown
    } = { filters: [] }

    const materialize = () => {
      let rows = [...(tables[table] ?? [])]
      for (const filter of state.filters) rows = rows.filter(filter)
      if (state.order) {
        rows.sort((a, b) => {
          const left = a[state.order!.field]
          const right = b[state.order!.field]
          const comparison = left === right ? 0 : left > right ? 1 : -1
          return state.order!.ascending ? comparison : -comparison
        })
      }
      if (state.limit !== undefined) rows = rows.slice(0, state.limit)
      return rows
    }

    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn((field: string, value: unknown) => {
        state.filters.push((row) => row[field] === value)
        return query
      }),
      gte: vi.fn((field: string, value: unknown) => {
        state.filters.push((row) => row[field] >= value)
        return query
      }),
      lt: vi.fn((field: string, value: unknown) => {
        state.filters.push((row) => row[field] < value)
        return query
      }),
      in: vi.fn((field: string, values: unknown[]) => {
        state.filters.push((row) => values.includes(row[field]))
        return query
      }),
      not: vi.fn((field: string, operator: string, value: unknown) => {
        if (operator === 'is' && value === null) {
          state.filters.push((row) => row[field] !== null && row[field] !== undefined)
        }
        return query
      }),
      maybeSingle: vi.fn(async () => ({ data: materialize()[0] ?? null, error: null })),
      single: vi.fn(async () => ({ data: materialize()[0] ?? null, error: null })),
      order: vi.fn((field: string, options?: { ascending?: boolean }) => {
        state.order = { field, ascending: options?.ascending ?? true }
        return query
      }),
      limit: vi.fn((limit: number) => {
        state.limit = limit
        return query
      }),
      insert: vi.fn(async (payload: unknown) => {
        calls.push({ table, type: 'insert', payload })
        return { data: null, error: null }
      }),
      update: vi.fn((payload: unknown) => {
        calls.push({ table, type: 'update', payload })
        return query
      }),
      then: (resolve: any, reject: any) =>
        Promise.resolve({ data: materialize(), error: null }).then(resolve, reject),
    }
    return query
  })

  return { from, calls }
}

function makeService(tables: Record<string, Row[]> = {}) {
  const { from, calls } = makeSupabase(tables)
  const insert = vi.fn(async (payload: unknown) => {
    calls.push({ table: 'ai_usage_events', type: 'insert', payload })
    return { data: null, error: null }
  })
  if (Object.keys(tables).length === 0) {
    from.mockReturnValue({ insert } as any)
  }
  const service = new CreditsService({ client: { from } } as any)
  return { service, from, insert, calls }
}

const usage = {
  input: 17_026,
  output: 16,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 17_042,
}

const balance: CreditBalance = {
  baseCredits: 0,
  baseCreditsUsed: 0,
  rolloverCredits: 0,
  purchasedCredits: 100,
  purchasedCreditsUsed: 0,
  totalAvailable: 100,
  totalUsed: 0,
}

describe('Agent API CreditsService subscription billing', () => {
  it('tracks subscription model usage without actual cost or credit deduction', async () => {
    const { service, insert } = makeService()
    vi.spyOn(service, 'getUsageFromTranscript').mockResolvedValue(usage)
    vi.spyOn(service, 'resolveCreditsOwner').mockResolvedValue({
      creditsOwnerId: 'user-1',
      billingType: 'personal',
      orgId: null,
      orgMemberId: null,
    })
    vi.spyOn(service as any, 'getBalanceForOwner').mockResolvedValue(balance)
    const deductCredits = vi.spyOn(service, 'deductCredits').mockResolvedValue(balance)
    const deductOrgCredits = vi.spyOn(service, 'deductOrgCredits').mockResolvedValue(balance)

    const result = await service.processUsage({
      userId: 'user-1',
      sessionKey: 'session-1',
      conversationId: 'conversation-1',
      feature: 'chat',
      action: 'message',
      modelName: 'openai-codex/gpt-5.5',
      preComputedCost: 0.08553,
      costSource: 'provider_direct',
      requestedModelId: 'openai-codex/gpt-5.5',
      resolvedModelId: 'openai-codex/gpt-5.5',
    })

    expect(result).toEqual({ credits: 0, balance, apiCost: 0 })
    expect(deductCredits).not.toHaveBeenCalled()
    expect(deductOrgCredits).not.toHaveBeenCalled()
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai-codex',
        model_name: 'openai-codex/gpt-5.5',
        computed_cost: 0,
        cost_source: 'subscription',
        credits_charged: 0,
        input_tokens: usage.input,
        output_tokens: usage.output,
        total_tokens: usage.totalTokens,
        metadata_json: expect.objectContaining({
          billing_source: 'subscription',
          actual_cost_usd: 0,
          equivalent_cost_usd: 0.08553,
          equivalent_cost_source: 'provider_direct',
          equivalent_credits: 35,
          requested_model_id: 'openai-codex/gpt-5.5',
          resolved_model_id: 'openai-codex/gpt-5.5',
        }),
      }),
    )
  })

  it('continues to deduct credits for normal provider-paid text usage', async () => {
    const { service, insert } = makeService()
    vi.spyOn(service, 'getUsageFromTranscript').mockResolvedValue(usage)
    vi.spyOn(service, 'resolveCreditsOwner').mockResolvedValue({
      creditsOwnerId: 'user-1',
      billingType: 'personal',
      orgId: null,
      orgMemberId: null,
    })
    vi.spyOn(service, 'getCreditDiscount').mockResolvedValue(0)
    vi.spyOn(service as any, 'getChargeableCredits').mockResolvedValue(35)
    vi.spyOn(service as any, 'incrementOrgMemberUsage').mockResolvedValue(undefined)
    const deductCredits = vi.spyOn(service, 'deductCredits').mockResolvedValue(balance)

    const result = await service.processUsage({
      userId: 'user-1',
      sessionKey: 'session-1',
      conversationId: 'conversation-1',
      feature: 'chat',
      action: 'message',
      modelName: 'openai/gpt-5.5',
      preComputedCost: 0.08553,
      costSource: 'provider_direct',
      requestedModelId: 'openai/gpt-5.5',
      resolvedModelId: 'openai/gpt-5.5',
    })

    expect(result).toEqual({ credits: 35, balance, apiCost: 0.08553 })
    expect(deductCredits).toHaveBeenCalledWith('user-1', 35)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
        model_name: 'openai/gpt-5.5',
        computed_cost: 0.08553,
        cost_source: 'provider_direct',
        credits_charged: 35,
      }),
    )
  })
})

describe('Agent API CreditsService data access behavior', () => {
  it('resolves org credit ownership from active membership rows', async () => {
    const { service } = makeService({
      org_members: [{ id: 'member-1', org_id: 'org-1', user_id: 'user-1', status: 'active' }],
    })

    await expect(service.resolveCreditsOwner('user-1', 'org-1')).resolves.toEqual({
      creditsOwnerId: 'org-1',
      billingType: 'org',
      orgId: 'org-1',
      orgMemberId: 'member-1',
    })
  })

  it('uses active pricing rows for image credits and unit costs', async () => {
    const { service } = makeService({
      token_providers_pricing: [
        {
          model_name: 'imagen-test',
          unit_type: 'images_1',
          is_active: true,
          cost_per_unit: '0.05',
        },
      ],
    })

    await expect(service.calculateImageCredits('imagen-test')).resolves.toEqual({
      apiCost: 0.05,
      credits: 20,
      breakdown: {
        inputCost: 0.05,
        outputCost: 0,
        cacheReadCost: 0,
        cacheWriteCost: 0,
      },
    })
    await expect(service.getUnitCost('imagen-test', 'images_1')).resolves.toBe(0.05)
  })

  it('lists active plans, credit packs, and recent user usage rows', async () => {
    const { service } = makeService({
      subscription_plans: [
        { id: 'plan-2', is_active: true, price: 20 },
        { id: 'plan-1', is_active: true, price: 10 },
      ],
      credit_packs: [
        { id: 'pack-2', is_active: true, price: 50 },
        { id: 'pack-1', is_active: true, price: 25 },
      ],
      ai_usage_events: [
        {
          id: 'event-old',
          user_id: 'user-1',
          feature: 'chat',
          action: 'message',
          model_name: 'old',
          credits_charged: 1,
          computed_cost: 0.01,
          created_at: '2026-06-17T00:00:00.000Z',
        },
        {
          id: 'event-new',
          user_id: 'user-1',
          feature: 'chat',
          action: 'message',
          model_name: 'new',
          credits_charged: 2,
          computed_cost: 0.02,
          created_at: '2026-06-18T00:00:00.000Z',
        },
        {
          id: 'event-other',
          user_id: 'user-2',
          created_at: '2026-06-19T00:00:00.000Z',
        },
      ],
    })

    await expect(service.getActivePlans()).resolves.toEqual([
      { id: 'plan-1', is_active: true, price: 10 },
      { id: 'plan-2', is_active: true, price: 20 },
    ])
    await expect(service.getCreditPacks()).resolves.toEqual([
      { id: 'pack-1', is_active: true, price: 25 },
      { id: 'pack-2', is_active: true, price: 50 },
    ])
    await expect(service.getRecentUsage('user-1', 1)).resolves.toEqual([
      {
        id: 'event-new',
        user_id: 'user-1',
        feature: 'chat',
        action: 'message',
        model_name: 'new',
        credits_charged: 2,
        computed_cost: 0.02,
        created_at: '2026-06-18T00:00:00.000Z',
      },
    ])
  })

  it('creates a new free-period balance row with lifetime purchased credits', async () => {
    const { service, calls } = makeService({
      subscription_plans: [{ slug: 'free', base_credits: 0, rollover_cap: 0 }],
      credit_purchases: [
        { user_id: 'user-1', status: 'completed', credits_purchased: 200 },
        { user_id: 'user-1', status: 'completed', credits_purchased: 50 },
      ],
    })

    const result = await service.getBalance('user-1')

    expect(result).toEqual({
      baseCredits: 3000,
      baseCreditsUsed: 0,
      rolloverCredits: 0,
      purchasedCredits: 250,
      purchasedCreditsUsed: 0,
      totalAvailable: 3250,
      totalUsed: 0,
    })
    expect(calls).toContainEqual(
      expect.objectContaining({
        table: 'monthly_credit_usage',
        type: 'insert',
        payload: expect.objectContaining({
          user_id: 'user-1',
          base_allowance: 3000,
          purchased_credits_used: 0,
          total_credits_purchased: 250,
          rollover_credits: 0,
        }),
      }),
    )
  })

  it('deducts credits from base, then rollover, then purchased balance', async () => {
    const { service, calls } = makeService({
      subscription_plans: [{ slug: 'free', base_credits: 0, rollover_cap: 0 }],
      credit_purchases: [{ user_id: 'user-1', status: 'completed', credits_purchased: 30 }],
      monthly_credit_usage: [
        {
          id: 'usage-1',
          user_id: 'user-1',
          month: '2026-06-01',
          base_allowance: 3000,
          base_credits_used: 2990,
          rollover_credits: 5,
          purchased_credits_used: 10,
          total_credits_used: 2990,
        },
      ],
    })

    await service.deductCredits('user-1', 20)

    expect(calls).toContainEqual({
      table: 'monthly_credit_usage',
      type: 'update',
      payload: {
        base_credits_used: 3000,
        rollover_credits: 0,
        purchased_credits_used: 15,
        total_credits_used: 3010,
      },
    })
  })

  it('checks org auto-recharge through the main API after org credit deduction', async () => {
    const originalFetch = global.fetch
    const rechargedBalance = {
      baseCredits: 0,
      baseCreditsUsed: 0,
      rolloverCredits: 0,
      purchasedCredits: 120,
      purchasedCreditsUsed: 20,
      totalAvailable: 100,
      totalUsed: 20,
    }
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ balance: rechargedBalance }),
    }))

    vi.stubEnv('MAIN_API_URL', 'https://api.example.com/')
    vi.stubEnv('INTERNAL_API_TOKEN', 'internal-token')
    global.fetch = fetchMock as unknown as typeof fetch

    try {
      const { service, calls } = makeService({
        subscription_plans: [{ slug: 'free', base_credits: 0, rollover_cap: 0 }],
        org_credit_purchases: [
          { org_id: 'org-1', status: 'completed', credits_purchased: 100 },
        ],
        org_monthly_credit_usage: [
          {
            id: 'org-usage-1',
            org_id: 'org-1',
            month: '2026-06-01',
            base_credits_used: 0,
            rollover_credits: 0,
            purchased_credits_used: 0,
            total_credits_used: 0,
          },
        ],
      })

      await expect(service.deductOrgCredits('org-1', 20)).resolves.toEqual(rechargedBalance)
      expect(calls).toContainEqual({
        table: 'org_monthly_credit_usage',
        type: 'update',
        payload: {
          base_credits_used: 0,
          rollover_credits: 0,
          purchased_credits_used: 20,
          total_credits_used: 20,
        },
      })
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/api/internal/billing/auto-recharge',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer internal-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ org_id: 'org-1' }),
        },
      )
    } finally {
      global.fetch = originalFetch
      vi.unstubAllEnvs()
    }
  })
})
