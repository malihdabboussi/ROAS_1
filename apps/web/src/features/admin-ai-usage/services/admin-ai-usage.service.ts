import { backendGet } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { AdminAiUsageReport } from '../types/admin-ai-usage.types'

const CACHE_PREFIX = 'admin-ai-usage:'

export function loadAdminAiUsage(days: number, force = false): Promise<AdminAiUsageReport> {
  if (force) invalidateCachedFetch(CACHE_PREFIX)
  return cachedFetch(
    `${CACHE_PREFIX}${days}`,
    () => backendGet<AdminAiUsageReport>(`/api/admin/ai-usage?days=${days}`),
    { ttlMs: 60000 },
  )
}
