import { describe, expect, it, vi } from 'vitest'
import { AdminAiUsageService } from '../admin-ai-usage.service'

describe('AdminAiUsageService', () => {
  it('separates integration routes and expands OpenRouter by underlying model', async () => {
    const now = new Date().toISOString()
    const repository = {
      findRecentTraces: vi.fn(async () => [
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
      findRecentProviderAttempts: vi.fn(async () => [
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
      findRecentTraces: vi.fn(async () => [
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
      findRecentProviderAttempts: vi.fn(async () => [
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
})
