import { BadRequestException, Injectable } from '@nestjs/common'
import { AdminAiUsageRepository } from '../repositories/admin-ai-usage.repository'
import type {
  AdminAiUsageAttemptRow,
  AdminAiUsageRangeQuery,
  AdminAiUsageReport,
  AdminAiUsageRoute,
  AdminAiUsageTraceRow,
} from '../types/admin-ai-usage.types'

const ROUTE_LABELS: Record<AdminAiUsageRoute['id'], string> = {
  openai: 'OpenAI / ChatGPT',
  openrouter: 'OpenRouter',
  google: 'Gemini / Google',
  anthropic: 'Claude / Anthropic',
  other: 'Other providers',
}
const SETTLED_STATUSES = new Set(['settled', 'no_charge'])
const OVERSIZED_CONTEXT_TOKENS = 250000
const DAY_MS = 24 * 60 * 60 * 1000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function number(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function attemptCost(row: AdminAiUsageAttemptRow): number {
  return number(row.final_cost_usd ?? row.provider_cost_usd ?? row.estimated_cost_usd)
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseDate(value: string, label: string): Date {
  if (!DATE_PATTERN.test(value)) throw new BadRequestException(`${label} must be YYYY-MM-DD`)
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || dateString(date) !== value) {
    throw new BadRequestException(`${label} must be a valid UTC calendar date`)
  }
  return date
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function comparison(current: number, previous: number) {
  return {
    current,
    previous,
    changePercent:
      previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / previous) * 100,
  }
}

function failureRate(rows: AdminAiUsageTraceRow[]): number {
  if (rows.length === 0) return 0
  return (rows.filter((row) => row.status === 'failed').length / rows.length) * 100
}

function resolveRange(query: AdminAiUsageRangeQuery | number, now: Date) {
  const normalized = typeof query === 'number' ? { days: String(query) } : query
  const hasStart = normalized.start !== undefined
  const hasEnd = normalized.end !== undefined
  if (hasStart !== hasEnd) {
    throw new BadRequestException('start and end must be provided together')
  }

  let start: Date
  let end: Date
  if (hasStart && hasEnd) {
    start = parseDate(normalized.start!, 'start')
    end = parseDate(normalized.end!, 'end')
  } else {
    const rawDays = normalized.days ?? '7'
    const days = Number(rawDays)
    if (!/^\d+$/.test(rawDays) || !Number.isInteger(days) || days < 1 || days > 366) {
      throw new BadRequestException('days must be an integer from 1 to 366')
    }
    end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    start = addUtcDays(end, -(days - 1))
  }

  if (start > end) throw new BadRequestException('start cannot be after end')
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
  if (days > 366) throw new BadRequestException('date range cannot exceed 366 days')
  const previousEnd = addUtcDays(start, -1)
  const previousStart = addUtcDays(previousEnd, -(days - 1))

  return {
    days,
    start,
    end,
    previousStart,
    previousEnd,
    currentStartIso: start.toISOString(),
    currentEndExclusiveIso: addUtcDays(end, 1).toISOString(),
    combinedStartIso: previousStart.toISOString(),
  }
}

function outputValidationState(row: AdminAiUsageAttemptRow): string | null {
  const validation = row.metadata_json?.image_output_validation
  if (!validation || typeof validation !== 'object' || Array.isArray(validation)) return null
  const state = (validation as Record<string, unknown>).state
  return typeof state === 'string' ? state : null
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

  async getReport(
    query: AdminAiUsageRangeQuery | number = {},
    now = new Date(),
  ): Promise<AdminAiUsageReport> {
    const range = resolveRange(query, now)
    const [combinedTraces, combinedAttempts, billingChecks] = await Promise.all([
      this.repository.findTracesInRange(range.combinedStartIso, range.currentEndExclusiveIso),
      this.repository.findProviderAttemptsInRange(
        range.combinedStartIso,
        range.currentEndExclusiveIso,
      ),
      this.repository.findRecentBillingChecks(Math.min(range.days, 14)),
    ])
    const traces = combinedTraces.filter((row) => row.created_at >= range.currentStartIso)
    const attempts = combinedAttempts.filter((row) => row.created_at >= range.currentStartIso)
    const previousTraces = combinedTraces.filter((row) => row.created_at < range.currentStartIso)
    const previousAttempts = combinedAttempts.filter(
      (row) => row.created_at < range.currentStartIso,
    )

    const routes = this.buildRoutes(traces, attempts)
    const traceCostUsd = traces.reduce((sum, row) => sum + number(row.cost_usd), 0)
    const providerCostUsd = attempts.reduce((sum, row) => sum + attemptCost(row), 0)
    const costlyFailed = traces.filter((row) => row.status === 'failed' && number(row.cost_usd) > 0)
    const oversized = traces.filter((row) => number(row.total_tokens) >= OVERSIZED_CONTEXT_TOKENS)
    const unlinkedPaid = attempts.filter((row) => !row.ai_usage_event_id && attemptCost(row) > 0)
    const paidOutputInvalid = attempts.filter(
      (row) => outputValidationState(row) === 'paid_output_invalid',
    )
    const latestCheckAt = billingChecks[0]?.created_at ?? billingChecks[0]?.check_date ?? null
    const previousProviderCostUsd = previousAttempts.reduce((sum, row) => sum + attemptCost(row), 0)
    const previousTokens = previousTraces.reduce((sum, row) => sum + number(row.total_tokens), 0)
    const daily = this.buildDaily(range.start, range.end, traces, attempts)
    const dailyModelSpend = this.buildDailyModelSpend(attempts)
    const modelSpend = this.buildModelSpend(attempts)

    return {
      generatedAt: now.toISOString(),
      days: range.days,
      range: {
        startDate: dateString(range.start),
        endDate: dateString(range.end),
        previousStartDate: dateString(range.previousStart),
        previousEndDate: dateString(range.previousEnd),
      },
      comparison: {
        providerCostUsd: comparison(providerCostUsd, previousProviderCostUsd),
        providerAttempts: comparison(attempts.length, previousAttempts.length),
        tokens: comparison(
          traces.reduce((sum, row) => sum + number(row.total_tokens), 0),
          previousTokens,
        ),
        failureRate: comparison(failureRate(traces), failureRate(previousTraces)),
      },
      daily,
      modelSpend,
      dailyModelSpend,
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
        paidOutputInvalid: {
          count: paidOutputInvalid.length,
          costUsd: paidOutputInvalid.reduce((sum, row) => sum + attemptCost(row), 0),
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

  private buildDaily(
    start: Date,
    end: Date,
    traces: AdminAiUsageTraceRow[],
    attempts: AdminAiUsageAttemptRow[],
  ): AdminAiUsageReport['daily'] {
    const rows = new Map<string, AdminAiUsageReport['daily'][number]>()
    for (let date = start; date <= end; date = addUtcDays(date, 1)) {
      const day = dateString(date)
      rows.set(day, {
        date: day,
        providerCostUsd: 0,
        providerAttempts: 0,
        tokens: 0,
        failed: 0,
      })
    }
    for (const trace of traces) {
      const row = rows.get(trace.created_at.slice(0, 10))
      if (!row) continue
      row.tokens += number(trace.total_tokens)
      row.failed += trace.status === 'failed' ? 1 : 0
    }
    for (const attempt of attempts) {
      const row = rows.get(attempt.created_at.slice(0, 10))
      if (!row) continue
      row.providerCostUsd += attemptCost(attempt)
      row.providerAttempts += 1
    }
    return [...rows.values()]
  }

  private buildModelSpend(attempts: AdminAiUsageAttemptRow[]): AdminAiUsageReport['modelSpend'] {
    const totals = new Map<string, number>()
    for (const attempt of attempts) {
      const model = attempt.resolved_model ?? attempt.requested_model ?? 'unknown'
      totals.set(model, (totals.get(model) ?? 0) + attemptCost(attempt))
    }
    return [...totals.entries()]
      .map(([model, costUsd]) => ({ model, costUsd }))
      .sort((left, right) => right.costUsd - left.costUsd)
  }

  private buildDailyModelSpend(
    attempts: AdminAiUsageAttemptRow[],
  ): AdminAiUsageReport['dailyModelSpend'] {
    const totals = new Map<string, AdminAiUsageReport['dailyModelSpend'][number]>()
    for (const attempt of attempts) {
      const date = attempt.created_at.slice(0, 10)
      const model = attempt.resolved_model ?? attempt.requested_model ?? 'unknown'
      const key = `${date}\u0000${model}`
      const existing = totals.get(key) ?? { date, model, costUsd: 0 }
      existing.costUsd += attemptCost(attempt)
      totals.set(key, existing)
    }
    return [...totals.values()].sort(
      (left, right) => left.date.localeCompare(right.date) || left.model.localeCompare(right.model),
    )
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
        providerVerified: false,
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
      route.providerVerified = true
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
        outputIssues: 0,
      }
      existing.attempts += 1
      existing.tokens += number(attempt.total_tokens)
      existing.costUsd += attemptCost(attempt)
      existing.unsettled += SETTLED_STATUSES.has(attempt.status) ? 0 : 1
      existing.outputIssues +=
        outputValidationState(attempt) === 'output_invalid' ||
        outputValidationState(attempt) === 'paid_output_invalid'
          ? 1
          : 0
      models.set(key, existing)
    }
    return [...models.values()].sort((left, right) => right.costUsd - left.costUsd)
  }
}
