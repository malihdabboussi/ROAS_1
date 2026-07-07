import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'

export type HomeFeedScopeMode = 'workspace' | 'personal' | 'all' | 'org'

/** Per-home-card scope; persisted in sessionStorage by card id. */
export interface HomeFeedScopeState {
  feedScope: HomeFeedScopeMode
  /** When feedScope === 'org', target organization id */
  orgId: string | null
  /** Optional campaign filter within the selected scope */
  campaignId: string | null
}

export const DEFAULT_HOME_FEED_SCOPE: HomeFeedScopeState = {
  feedScope: 'workspace',
  orgId: null,
  campaignId: null,
}

export function parseHomeFeedScope(raw: unknown): HomeFeedScopeState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_HOME_FEED_SCOPE }
  const o = raw as Record<string, unknown>
  const feedScope = o.feedScope
  const ok =
    feedScope === 'workspace' ||
    feedScope === 'personal' ||
    feedScope === 'all' ||
    feedScope === 'org'
  return {
    feedScope: ok ? feedScope : 'workspace',
    orgId: typeof o.orgId === 'string' ? o.orgId : null,
    campaignId: typeof o.campaignId === 'string' ? o.campaignId : null,
  }
}

/** Strip header org for API routes that resolve scope from query params. */
export function backendOptionsForHomeFeed(feedScope: HomeFeedScopeMode, orgId: string | null) {
  if (feedScope === 'personal' || feedScope === 'all') return { orgId: null as string | null }
  if (feedScope === 'org' && orgId) return { orgId }
  return {}
}

/**
 * Stable `cachedFetch` key segment for a home feed scope: scope params plus
 * the effective `x-org-id` header the request will be sent with. Two requests
 * with the same key are byte-identical, so concurrent callers can share one
 * in-flight fetch.
 */
export function homeFeedCacheScopeKey(feedScope: HomeFeedScopeMode, orgId: string | null): string {
  const backend = backendOptionsForHomeFeed(feedScope, orgId)
  const headerOrgId = 'orgId' in backend ? (backend.orgId ?? null) : getActiveOrgIdFromStorage()
  return `${feedScope}:${orgId ?? ''}:${headerOrgId ?? ''}`
}
