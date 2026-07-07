import { backendGet, type BackendFetchOptions } from '@/lib/api/backend-client'

export type YourTurnKind = 'mission_subtask' | 'space_item' | 'suggestion' | 'plan_approval'

export interface YourTurnItem {
  kind: YourTurnKind
  id: string
  title: string
  status: string
  assignee_user_id: string | null
  org_id: string | null
  mission_id: string | null
  space_id: string | null
  suggestion_state: 'pending' | 'accepted' | 'dismissed' | null
  due_at: string | null
  source_url: string | null
  preview: string | null
  created_at: string
  updated_at: string | null
}

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
