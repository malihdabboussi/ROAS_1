import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminBillingHealthBase } from '../admin-service-billing-health.base'

class BillingHealthHarness extends AdminBillingHealthBase {
  constructor(repository: unknown) {
    super({} as never, {} as never, repository as never, {} as never, {} as never, {} as never)
  }
}

function makeRangeQuery(rows: Array<Record<string, unknown>>) {
  const query = {
    select: vi.fn(() => query),
    gte: vi.fn(() => query),
    lt: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(async () => ({ data: rows, error: null })),
  }
  return query
}

describe('AdminBillingHealthBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('excludes paid-model provider_direct zero-cost rows from OpenRouter reconciliation', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'openrouter-key')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            usage: 10,
            usage_daily: 3.5,
            rate_limit: { requests: 12 },
          },
        }),
      })),
    )
    const rangeQuery = makeRangeQuery([
      {
        computed_cost: 0,
        cost_source: 'provider_direct',
        model_name: 'anthropic/claude-sonnet-4.6',
        metadata_json: { provider_billing: 'openrouter', provider_cost: 0 },
      },
      {
        computed_cost: 0,
        cost_source: 'provider_direct',
        model_name: 'anthropic/claude-sonnet-4.6',
        metadata_json: { provider_billing: 'openrouter' },
      },
      {
        computed_cost: 2,
        cost_source: 'provider_direct',
        model_name: 'anthropic/claude-sonnet-4.6',
        metadata_json: { provider_billing: 'openrouter', provider_cost: 2 },
      },
      {
        computed_cost: 1.5,
        cost_source: 'openrouter_calc',
        model_name: 'anthropic/claude-sonnet-4.6',
        metadata_json: {},
      },
    ])
    const upsert = vi.fn(async () => ({ data: null, error: null }))
    const repository = {
      serviceTable: vi.fn((table: string) => {
        if (table === 'ai_usage_events') return rangeQuery
        if (table === 'billing_health_checks') return { upsert }
        throw new Error(`Unexpected table: ${table}`)
      }),
    }
    const service = new BillingHealthHarness(repository)

    const result = await service.runBillingReconciliation()

    expect(result).toMatchObject({ success: true, delta_percent: 0, status: 'ok' })
    expect(rangeQuery.select).toHaveBeenCalledWith(
      'computed_cost, cost_source, generation_ids, metadata_json, created_at, model_name',
    )
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        openrouter_reported_cost: 3.5,
        db_computed_cost: 3.5,
        db_event_count: 2,
        status: 'ok',
        metadata: expect.objectContaining({
          candidate_db_event_count: 4,
          db_row_source: 'actual_openrouter_cost_rows',
        }),
      }),
      { onConflict: 'check_date' },
    )
  })
})
