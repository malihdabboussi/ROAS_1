import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { AdminAiUsageReport } from '../types/admin-ai-usage.types'

const CACHE_PREFIX = 'admin-ai-usage:'

type OpenRouterModelRow = AdminAiUsageReport['openRouterModels'][number]
type AdminAiUsageWireReport = Omit<AdminAiUsageReport, 'openRouterModels' | 'opportunities'> & {
  openRouterModels: Array<Omit<OpenRouterModelRow, 'outputIssues'> & { outputIssues?: number }>
  opportunities: Omit<AdminAiUsageReport['opportunities'], 'paidOutputInvalid'> & {
    paidOutputInvalid?: AdminAiUsageReport['opportunities']['paidOutputInvalid']
  }
}

export function normalizeAdminAiUsageReport(report: AdminAiUsageWireReport): AdminAiUsageReport {
  return {
    ...report,
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

export function loadAdminAiUsage(days: number, force = false): Promise<AdminAiUsageReport> {
  if (force) invalidateCachedFetch(CACHE_PREFIX)
  return cachedFetch(
    `${CACHE_PREFIX}${days}`,
    () => backendGet<AdminAiUsageWireReport>(`/api/admin/ai-usage?days=${days}`),
    { ttlMs: 60000 },
  ).then(normalizeAdminAiUsageReport)
}
