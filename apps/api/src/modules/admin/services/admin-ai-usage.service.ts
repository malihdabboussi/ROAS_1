import { Injectable } from '@nestjs/common'
import { AdminAiUsageRepository } from '../repositories/admin-ai-usage.repository'
import type {
  AdminAiUsageAttemptRow,
  AdminAiUsageReport,
  AdminAiUsageRoute,
  AdminAiUsageTraceRow,
} from '../types/admin-ai-usage.types'

const ROUTE_LABELS: Record<AdminAiUsageRoute['id'], string> = {
  openai: 'OpenAI / ChatGPT',
  openrouter: 'OpenRouter',
  google: 'Gemini / Google',
  anthropic: 'Anthropic direct',
  other: 'Other providers',
}
const SETTLED_STATUSES = new Set(['settled', 'no_charge'])
const OVERSIZED_CONTEXT_TOKENS = 250000

function number(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function attemptCost(row: AdminAiUsageAttemptRow): number {
  return number(row.final_cost_usd ?? row.provider_cost_usd ?? row.estimated_cost_usd)
}

function routeForModel(model: string | null | undefined): AdminAiUsageRoute['id'] {
  const value = String(model ?? '').toLowerCase()
  if (value.startsWith('openrouter/')) return 'openrouter'
  if (
    value.startsWith('openai-codex/') ||
    value.startsWith('openai/') ||
    value.startsWith('gpt-')
  ) {
    return 'openai'
  }
  if (value.startsWith('google/') || value.includes('gemini')) return 'google'
  if (value.startsWith('anthropic/') || value.includes('claude')) return 'anthropic'
  return 'other'
}

function routeForAttempt(row: AdminAiUsageAttemptRow): AdminAiUsageRoute['id'] {
  if (row.provider.toLowerCase() === 'openrouter') return 'openrouter'
  if (row.provider.toLowerCase() === 'openai') return 'openai'
  if (row.provider.toLowerCase() === 'google') return 'google'
  if (row.provider.toLowerCase() === 'anthropic') return 'anthropic'
  return routeForModel(row.requested_model ?? row.resolved_model)
}

@Injectable()
export class AdminAiUsageService {
  constructor(private readonly repository: AdminAiUsageRepository) {}

  async getReport(rawDays: number): Promise<AdminAiUsageReport> {
    const days = [1, 7, 30].includes(rawDays) ? rawDays : 7
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const [traces, attempts, billingChecks] = await Promise.all([
      this.repository.findRecentTraces(since),
      this.repository.findRecentProviderAttempts(since),
      this.repository.findRecentBillingChecks(Math.min(days, 14)),
    ])

    const routes = this.buildRoutes(traces, attempts)
    const traceCostUsd = traces.reduce((sum, row) => sum + number(row.cost_usd), 0)
    const providerCostUsd = attempts.reduce((sum, row) => sum + attemptCost(row), 0)
    const costlyFailed = traces.filter((row) => row.status === 'failed' && number(row.cost_usd) > 0)
    const oversized = traces.filter((row) => number(row.total_tokens) >= OVERSIZED_CONTEXT_TOKENS)
    const unlinkedPaid = attempts.filter((row) => !row.ai_usage_event_id && attemptCost(row) > 0)
    const latestCheckAt = billingChecks[0]?.created_at ?? billingChecks[0]?.check_date ?? null

    return {
      generatedAt: new Date().toISOString(),
      days,
      summary: {
        traces: traces.length,
        completed: traces.filter((row) => row.status === 'completed').length,
        failed: traces.filter((row) => row.status === 'failed').length,
        tokens: traces.reduce((sum, row) => sum + number(row.total_tokens), 0),
        traceCostUsd,
        providerAttempts: attempts.length,
        providerCostUsd,
      },
      routes,
      models: this.buildModels(traces),
      openRouterModels: this.buildOpenRouterModels(attempts),
      opportunities: {
        oversizedContext: {
          count: oversized.length,
          tokens: oversized.reduce((sum, row) => sum + number(row.total_tokens), 0),
          costUsd: oversized.reduce((sum, row) => sum + number(row.cost_usd), 0),
        },
        failedWithCost: {
          count: costlyFailed.length,
          costUsd: costlyFailed.reduce((sum, row) => sum + number(row.cost_usd), 0),
        },
        unlinkedPaidAttempts: {
          count: unlinkedPaid.length,
          costUsd: unlinkedPaid.reduce((sum, row) => sum + attemptCost(row), 0),
        },
        missingTraceUsage: traces.filter(
          (row) => row.status === 'completed' && number(row.total_tokens) === 0,
        ).length,
        unsettledAttempts: attempts.filter((row) => !SETTLED_STATUSES.has(row.status)).length,
        reconciliationStale:
          !latestCheckAt || Date.now() - new Date(latestCheckAt).getTime() > 36 * 60 * 60 * 1000,
      },
      coverage: {
        attempts: attempts.length,
        correlatedAttempts: attempts.filter((row) => {
          const traceId = row.metadata_json?.trace_id
          return typeof traceId === 'string' && traceId.length > 0
        }).length,
        usageLinkedAttempts: attempts.filter((row) => row.ai_usage_event_id).length,
      },
      reconciliation: billingChecks.map((row) => ({
        date: row.check_date,
        status: row.status,
        providerCostUsd: number(row.openrouter_reported_cost),
        recordedCostUsd: number(row.db_computed_cost),
        deltaPercent: row.delta_percent == null ? null : number(row.delta_percent),
      })),
      recentCostlyTraces: [...traces]
        .sort((left, right) => number(right.cost_usd) - number(left.cost_usd))
        .slice(0, 25)
        .map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          channel: row.channel ?? 'unknown',
          model: row.model ?? 'unknown',
          status: row.status ?? 'unknown',
          tokens: number(row.total_tokens),
          costUsd: number(row.cost_usd),
        })),
    }
  }

  private buildRoutes(
    traces: AdminAiUsageTraceRow[],
    attempts: AdminAiUsageAttemptRow[],
  ): AdminAiUsageRoute[] {
    const routeMap = new Map<AdminAiUsageRoute['id'], AdminAiUsageRoute>()
    const getRoute = (id: AdminAiUsageRoute['id']) => {
      const existing = routeMap.get(id)
      if (existing) return existing
      const route: AdminAiUsageRoute = {
        id,
        label: ROUTE_LABELS[id],
        traceCount: 0,
        completed: 0,
        failed: 0,
        tokens: 0,
        traceCostUsd: 0,
        providerAttempts: 0,
        providerCostUsd: 0,
      }
      routeMap.set(id, route)
      return route
    }
    for (const trace of traces) {
      const route = getRoute(routeForModel(trace.model))
      route.traceCount += 1
      route.completed += trace.status === 'completed' ? 1 : 0
      route.failed += trace.status === 'failed' ? 1 : 0
      route.tokens += number(trace.total_tokens)
      route.traceCostUsd += number(trace.cost_usd)
    }
    for (const attempt of attempts) {
      const route = getRoute(routeForAttempt(attempt))
      route.providerAttempts += 1
      route.providerCostUsd += attemptCost(attempt)
    }
    return [...routeMap.values()].sort((left, right) => right.tokens - left.tokens)
  }

  private buildModels(traces: AdminAiUsageTraceRow[]): AdminAiUsageReport['models'] {
    const models = new Map<string, AdminAiUsageReport['models'][number]>()
    for (const trace of traces) {
      const model = trace.model ?? 'unknown'
      const existing = models.get(model) ?? {
        model,
        routeId: routeForModel(model),
        traces: 0,
        completed: 0,
        failed: 0,
        tokens: 0,
        costUsd: 0,
      }
      existing.traces += 1
      existing.completed += trace.status === 'completed' ? 1 : 0
      existing.failed += trace.status === 'failed' ? 1 : 0
      existing.tokens += number(trace.total_tokens)
      existing.costUsd += number(trace.cost_usd)
      models.set(model, existing)
    }
    return [...models.values()].sort((left, right) => right.tokens - left.tokens).slice(0, 30)
  }

  private buildOpenRouterModels(
    attempts: AdminAiUsageAttemptRow[],
  ): AdminAiUsageReport['openRouterModels'] {
    const models = new Map<string, AdminAiUsageReport['openRouterModels'][number]>()
    for (const attempt of attempts.filter((row) => routeForAttempt(row) === 'openrouter')) {
      const requestedModel = (attempt.requested_model ?? 'unknown').replace(/^openrouter\//, '')
      const workload = [attempt.feature, attempt.action].filter(Boolean).join(' · ')
      const key = `${workload}|${requestedModel}|${attempt.resolved_model ?? ''}`
      const existing = models.get(key) ?? {
        workload,
        requestedModel,
        resolvedModel: attempt.resolved_model,
        attempts: 0,
        tokens: 0,
        costUsd: 0,
        unsettled: 0,
      }
      existing.attempts += 1
      existing.tokens += number(attempt.total_tokens)
      existing.costUsd += attemptCost(attempt)
      existing.unsettled += SETTLED_STATUSES.has(attempt.status) ? 0 : 1
      models.set(key, existing)
    }
    return [...models.values()].sort((left, right) => right.costUsd - left.costUsd)
  }
}
