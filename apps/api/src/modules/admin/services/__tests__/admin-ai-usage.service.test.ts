import { describe, expect, it, vi } from 'vitest'
import { AdminAiUsageService } from '../admin-ai-usage.service'

describe('AdminAiUsageService', () => {
  it('separates integration routes and expands OpenRouter by underlying model', async () => {
    const now = new Date().toISOString()
    const repository = {
      findTracesInRange: vi.fn(async () => [
        {
          id: 'trace-openai',
          created_at: now,
          status: 'completed',
          channel: 'studio',
          model: 'openai-codex/gpt-5.6-sol',
          total_tokens: 1200,
          cost_usd: 0,
        },
        {
          id: 'trace-openrouter',
          created_at: now,
          status: 'completed',
          channel: 'brain-ops',
          model: 'openrouter/anthropic/claude-sonnet-5',
          total_tokens: 300000,
          cost_usd: 2.5,
        },
        {
          id: 'trace-google',
          created_at: now,
          status: 'failed',
          channel: 'studio',
          model: 'google/gemini-3.1-pro-preview',
          total_tokens: 100,
          cost_usd: 0.2,
        },
      ]),
      findProviderAttemptsInRange: vi.fn(async () => [
        {
          id: 'attempt-openrouter',
          created_at: now,
          status: 'settled',
          source_app: 'agent-api',
          source_path: '/chat',
          feature: 'chat',
          action: 'generate',
          provider: 'openrouter',
          requested_model: 'openrouter/anthropic/claude-sonnet-5',
          resolved_model: 'anthropic/claude-sonnet-5-20260630',
          total_tokens: 300000,
          final_cost_usd: 2.5,
          provider_cost_usd: 2.5,
          estimated_cost_usd: null,
          ai_usage_event_id: 'usage-1',
          metadata_json: {
            trace_id: 'trace-openrouter',
            image_output_validation: { state: 'validated' },
          },
        },
      ]),
      findRecentBillingChecks: vi.fn(async () => []),
    }

    const report = await new AdminAiUsageService(repository as never).getReport(7)

    expect(report.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'openai',
          traceCount: 1,
          tokens: 1200,
          providerVerified: false,
        }),
        expect.objectContaining({
          id: 'openrouter',
          traceCount: 1,
          providerCostUsd: 2.5,
          providerVerified: true,
        }),
        expect.objectContaining({
          id: 'google',
          traceCount: 1,
          failed: 1,
          providerVerified: false,
        }),
      ]),
    )
    expect(report.openRouterModels).toEqual([
      expect.objectContaining({
        workload: 'chat · generate',
        requestedModel: 'anthropic/claude-sonnet-5',
        resolvedModel: 'anthropic/claude-sonnet-5-20260630',
        attempts: 1,
        tokens: 300000,
        costUsd: 2.5,
      }),
    ])
    expect(report.coverage.correlatedAttempts).toBe(1)
    expect(report.opportunities.oversizedContext.count).toBe(1)
  })

  it('surfaces failed paid traces, unlinked spend, and stale reconciliation', async () => {
    const oldCheck = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const repository = {
      findTracesInRange: vi.fn(async () => [
        {
          id: 'failed-trace',
          created_at: new Date().toISOString(),
          status: 'failed',
          channel: 'dream-ops',
          model: 'anthropic/claude-sonnet-5',
          total_tokens: 8000,
          cost_usd: 4,
        },
      ]),
      findProviderAttemptsInRange: vi.fn(async () => [
        {
          id: 'unlinked-attempt',
          created_at: new Date().toISOString(),
          status: 'charge_failed',
          source_app: 'api',
          source_path: '/dream',
          feature: 'dream',
          action: null,
          provider: 'anthropic',
          requested_model: 'anthropic/claude-sonnet-5',
          resolved_model: 'anthropic/claude-sonnet-5-20260630',
          total_tokens: 8000,
          final_cost_usd: 4,
          provider_cost_usd: 4,
          estimated_cost_usd: null,
          ai_usage_event_id: null,
          metadata_json: { image_output_validation: { state: 'paid_output_invalid' } },
        },
      ]),
      findRecentBillingChecks: vi.fn(async () => [
        {
          check_date: oldCheck.slice(0, 10),
          created_at: oldCheck,
          status: 'warning',
          openrouter_reported_cost: 10,
          db_computed_cost: 9,
          delta_percent: -10,
        },
      ]),
    }

    const report = await new AdminAiUsageService(repository as never).getReport(7)

    expect(report.opportunities.failedWithCost).toEqual({ count: 1, costUsd: 4 })
    expect(report.routes).toContainEqual(
      expect.objectContaining({
        id: 'anthropic',
        label: 'Claude / Anthropic',
        providerVerified: true,
      }),
    )
    expect(report.opportunities.unlinkedPaidAttempts).toEqual({ count: 1, costUsd: 4 })
    expect(report.opportunities.paidOutputInvalid).toEqual({ count: 1, costUsd: 4 })
    expect(report.opportunities.unsettledAttempts).toBe(1)
    expect(report.opportunities.reconciliationStale).toBe(true)
  })

  it('builds equal UTC calendar periods, comparisons, and zero-filled daily analytics', async () => {
    const repository = {
      findTracesInRange: vi.fn(async () => [
        {
          id: 'previous-failed',
          created_at: '2026-07-09T10:00:00.000Z',
          status: 'failed',
          channel: 'chat',
          model: 'openrouter/old',
          total_tokens: 50,
          cost_usd: 0.1,
        },
        {
          id: 'current-completed',
          created_at: '2026-07-10T12:00:00.000Z',
          status: 'completed',
          channel: 'chat',
          model: 'openrouter/new',
          total_tokens: 200,
          cost_usd: 0.2,
        },
        {
          id: 'current-failed',
          created_at: '2026-07-10T13:00:00.000Z',
          status: 'failed',
          channel: 'chat',
          model: 'openrouter/new',
          total_tokens: 100,
          cost_usd: 0.1,
        },
      ]),
      findProviderAttemptsInRange: vi.fn(async () => [
        {
          id: 'previous-attempt',
          created_at: '2026-07-08T10:00:00.000Z',
          status: 'settled',
          source_app: 'api',
          source_path: '/chat',
          feature: 'chat',
          action: 'generate',
          provider: 'openrouter',
          requested_model: 'openrouter/previous',
          resolved_model: 'previous',
          total_tokens: 50,
          final_cost_usd: 1,
          provider_cost_usd: 2,
          estimated_cost_usd: 3,
          ai_usage_event_id: 'old',
          metadata_json: null,
        },
        {
          id: 'current-attempt',
          created_at: '2026-07-10T10:00:00.000Z',
          status: 'settled',
          source_app: 'api',
          source_path: '/chat',
          feature: 'chat',
          action: 'generate',
          provider: 'openrouter',
          requested_model: 'openrouter/requested',
          resolved_model: 'resolved',
          total_tokens: 300,
          final_cost_usd: 3,
          provider_cost_usd: 4,
          estimated_cost_usd: 5,
          ai_usage_event_id: 'new',
          metadata_json: null,
        },
      ]),
      findRecentBillingChecks: vi.fn(async () => []),
    }

    const report = await new AdminAiUsageService(repository as never).getReport(
      { start: '2026-07-10', end: '2026-07-11' },
      new Date('2026-07-20T12:00:00.000Z'),
    )

    expect(repository.findTracesInRange).toHaveBeenCalledWith(
      '2026-07-08T00:00:00.000Z',
      '2026-07-12T00:00:00.000Z',
    )
    expect(repository.findProviderAttemptsInRange).toHaveBeenCalledWith(
      '2026-07-08T00:00:00.000Z',
      '2026-07-12T00:00:00.000Z',
    )
    expect(report.range).toEqual({
      startDate: '2026-07-10',
      endDate: '2026-07-11',
      previousStartDate: '2026-07-08',
      previousEndDate: '2026-07-09',
    })
    expect(report.summary).toEqual(
      expect.objectContaining({ traces: 2, providerAttempts: 1, providerCostUsd: 3, tokens: 300 }),
    )
    expect(report.comparison.providerCostUsd).toEqual({
      current: 3,
      previous: 1,
      changePercent: 200,
    })
    expect(report.comparison.providerAttempts).toEqual({
      current: 1,
      previous: 1,
      changePercent: 0,
    })
    expect(report.comparison.tokens).toEqual({
      current: 300,
      previous: 50,
      changePercent: 500,
    })
    expect(report.comparison.failureRate).toEqual({
      current: 50,
      previous: 100,
      changePercent: -50,
    })
    expect(report.daily).toEqual([
      {
        date: '2026-07-10',
        providerCostUsd: 3,
        providerAttempts: 1,
        tokens: 300,
        failed: 1,
      },
      {
        date: '2026-07-11',
        providerCostUsd: 0,
        providerAttempts: 0,
        tokens: 0,
        failed: 0,
      },
    ])
    expect(report.modelSpend).toEqual([{ model: 'resolved', costUsd: 3 }])
    expect(report.dailyModelSpend).toEqual([{ date: '2026-07-10', model: 'resolved', costUsd: 3 }])
  })

  it.each([
    [{ start: '2026-07-xx', end: '2026-07-10' }, 'start must be YYYY-MM-DD'],
    [{ start: '2026-07-11', end: '2026-07-10' }, 'start cannot be after end'],
    [{ start: '2025-07-10', end: '2026-07-11' }, 'date range cannot exceed 366 days'],
  ])('rejects invalid range %#', async (query, message) => {
    const repository = {
      findTracesInRange: vi.fn(),
      findProviderAttemptsInRange: vi.fn(),
      findRecentBillingChecks: vi.fn(),
    }
    await expect(new AdminAiUsageService(repository as never).getReport(query)).rejects.toThrow(
      message,
    )
  })

  it('defaults to the latest seven UTC calendar days', async () => {
    const repository = {
      findTracesInRange: vi.fn(async () => []),
      findProviderAttemptsInRange: vi.fn(async () => []),
      findRecentBillingChecks: vi.fn(async () => []),
    }
    const report = await new AdminAiUsageService(repository as never).getReport(
      {},
      new Date('2026-07-26T23:30:00.000Z'),
    )

    expect(report.range).toEqual({
      startDate: '2026-07-20',
      endDate: '2026-07-26',
      previousStartDate: '2026-07-13',
      previousEndDate: '2026-07-19',
    })
    expect(repository.findTracesInRange).toHaveBeenCalledWith(
      '2026-07-13T00:00:00.000Z',
      '2026-07-27T00:00:00.000Z',
    )
  })
})
