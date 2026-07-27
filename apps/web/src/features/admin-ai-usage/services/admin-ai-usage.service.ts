import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { AdminAiUsageReport, AiUsageRange } from '../types/admin-ai-usage.types'

const CACHE_PREFIX = 'admin-ai-usage:'

type OpenRouterModelRow = AdminAiUsageReport['openRouterModels'][number]
type AdminAiUsageWireReport = Omit<
  AdminAiUsageReport,
  | 'openRouterModels'
  | 'opportunities'
  | 'range'
  | 'comparison'
  | 'daily'
  | 'modelSpend'
  | 'dailyModelSpend'
> & {
  range?: AdminAiUsageReport['range']
  comparison?: AdminAiUsageReport['comparison']
  daily?: AdminAiUsageReport['daily']
  modelSpend?: AdminAiUsageReport['modelSpend']
  dailyModelSpend?: AdminAiUsageReport['dailyModelSpend']
  openRouterModels: Array<Omit<OpenRouterModelRow, 'outputIssues'> & { outputIssues?: number }>
  opportunities: Omit<AdminAiUsageReport['opportunities'], 'paidOutputInvalid'> & {
    paidOutputInvalid?: AdminAiUsageReport['opportunities']['paidOutputInvalid']
  }
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function legacyRange(report: AdminAiUsageWireReport): AdminAiUsageReport['range'] {
  const days = report.days || 7
  const end = new Date(report.generatedAt)
  const endDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
  const startDate = addDays(endDate, -(days - 1))
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    previousStartDate: addDays(startDate, -days).toISOString().slice(0, 10),
    previousEndDate: addDays(startDate, -1).toISOString().slice(0, 10),
  }
}

export function normalizeAdminAiUsageReport(report: AdminAiUsageWireReport): AdminAiUsageReport {
  const zeroComparison = {
    previous: 0,
    changePercent: null,
  }
  return {
    ...report,
    range: report.range ?? legacyRange(report),
    comparison: report.comparison ?? {
      providerCostUsd: { current: report.summary.providerCostUsd, ...zeroComparison },
      providerAttempts: { current: report.summary.providerAttempts, ...zeroComparison },
      tokens: { current: report.summary.tokens, ...zeroComparison },
      failureRate: {
        current: report.summary.traces
          ? (report.summary.failed / report.summary.traces) * 100
          : 0,
        ...zeroComparison,
      },
    },
    daily: report.daily ?? [],
    modelSpend: report.modelSpend ?? [],
    dailyModelSpend: report.dailyModelSpend ?? [],
    openRouterModels: report.openRouterModels.map((row) => ({
      ...row,
      outputIssues: row.outputIssues ?? 0,
    })),
    opportunities: {
      ...report.opportunities,
      paidOutputInvalid: report.opportunities.paidOutputInvalid ?? { count: 0, costUsd: 0 },
    },
  }
}

export function loadAdminAiUsage(
  range: AiUsageRange,
  force = false,
): Promise<AdminAiUsageReport> {
  if (force) invalidateCachedFetch(CACHE_PREFIX)
  const params = new URLSearchParams()
  if (range.startDate && range.endDate) {
    params.set('start', range.startDate)
    params.set('end', range.endDate)
  } else {
    params.set('days', String(range.days ?? 7))
  }
  const query = params.toString()
  return cachedFetch(
    `${CACHE_PREFIX}${query}`,
    () => backendGet<AdminAiUsageWireReport>(`/api/admin/ai-usage?${query}`),
    { ttlMs: 60000 },
  ).then(normalizeAdminAiUsageReport)
}
