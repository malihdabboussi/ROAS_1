import { backendGet, type BackendFetchOptions } from '@/lib/api/backend-client'
import type { YourTurnItem, YourTurnKind } from '@/lib/your-turn/types'

export type { YourTurnItem, YourTurnKind }

export const yourTurnService = {
  list: (opts?: {
    kind?: YourTurnKind
    limit?: number
    since?: string
    feedScope?: 'workspace' | 'personal' | 'all' | 'org'
    feedOrgId?: string | null
    campaignId?: string | null
    backend?: BackendFetchOptions
  }) => {
    const params = new URLSearchParams()
    if (opts?.kind) params.set('kind', opts.kind)
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.since) params.set('since', opts.since)
    if (opts?.feedScope) params.set('feed_scope', opts.feedScope)
    if (opts?.feedOrgId) params.set('feed_org_id', opts.feedOrgId)
    if (opts?.campaignId) params.set('campaign_id', opts.campaignId)
    const qs = params.toString()
    return backendGet<YourTurnItem[]>(`/api/your-turn${qs ? `?${qs}` : ''}`, opts?.backend ?? {})
  },
}
