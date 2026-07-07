import { backendDelete, backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { cachedFetch, invalidateCachedFetch } from '@/lib/cache/keyed-fetch-cache'
import type { Funnel, FunnelPage, FunnelPageBundle } from './artifact-types'

/** TTL for per-artifact preview caches (card heroes, slide-over, full view). */
const ARTIFACT_PREVIEW_CACHE_TTL_MS = 60_000

/**
 * Fetch all funnels for a campaign (from DB via backend API).
 *
 * `opts.summary` requests the slim list payload (page metadata only - no
 * generated_html/css). Use it for list/grid views; editors and previews that
 * need page HTML must use {@link fetchFunnelWithPages} / the page endpoints.
 * Concurrent callers of the same URL share one request (dedupe-only cache).
 */
export async function fetchCampaignFunnels(
  campaignId: string,
  spaceId?: string,
  opts?: { summary?: boolean },
): Promise<Funnel[]> {
  const search = new URLSearchParams({ campaign_id: campaignId })
  if (spaceId) search.set('space_id', spaceId)
  if (opts?.summary) search.set('fields', 'summary')
  const url = `/api/funnels?${search.toString()}`
  return cachedFetch(`artifact-list:${url}`, () => backendGet<Funnel[]>(url))
}

/**
 * Fetch a single funnel with its pages.
 */
export async function fetchFunnelWithPages(funnelId: string): Promise<Funnel> {
  return backendGet<Funnel>(`/api/funnels/${funnelId}`)
}

export async function updateFunnel(
  funnelId: string,
  data: {
    name?: string
    tag_ids?: string[]
    hide_branding?: boolean
    layout?: Record<string, unknown> | null
    metadata?: Record<string, unknown>
  },
): Promise<Funnel> {
  const funnel = await backendPatch<Funnel>(`/api/funnels/${funnelId}`, data)
  invalidateFunnelPreviewCache(funnelId)
  return funnel
}

interface PublishFunnelResult {
  status: string
  slug: string
  url?: string
}

export async function publishFunnel(funnelId: string): Promise<PublishFunnelResult> {
  const result = await backendPost<PublishFunnelResult>(`/api/funnels/${funnelId}/publish`, {})
  invalidateFunnelPreviewCache(funnelId)
  return result
}

export async function unpublishFunnel(funnelId: string): Promise<PublishFunnelResult> {
  const result = await backendPost<PublishFunnelResult>(`/api/funnels/${funnelId}/unpublish`, {})
  invalidateFunnelPreviewCache(funnelId)
  return result
}

export async function connectFunnelCustomDomain(
  funnelId: string,
  domainId: string,
): Promise<{ success: boolean; published_url?: string | null }> {
  const result = await backendPost<{ success: boolean; published_url?: string | null }>(
    '/api/domains/connect-funnel',
    { domain_id: domainId, funnel_id: funnelId },
  )
  invalidateFunnelPreviewCache(funnelId)
  return result
}

export async function deleteFunnel(funnelId: string): Promise<void> {
  await backendDelete(`/api/funnels/${funnelId}`)
  invalidateFunnelPreviewCache(funnelId)
}

/**
 * Cached {@link fetchFunnelWithPages} for preview surfaces (grid card heroes,
 * slide-over, full view). One download per funnel per TTL window.
 */
export async function fetchFunnelWithPagesCached(funnelId: string): Promise<Funnel> {
  return cachedFetch(`funnel-with-pages:${funnelId}`, () => fetchFunnelWithPages(funnelId), {
    ttlMs: ARTIFACT_PREVIEW_CACHE_TTL_MS,
  })
}

/** Drop cached funnel + page preview payloads for one funnel (or all when omitted). */
export function invalidateFunnelPreviewCache(funnelId?: string) {
  invalidateCachedFetch(funnelId ? `funnel-with-pages:${funnelId}` : 'funnel-with-pages:')
  invalidateCachedFetch(funnelId ? `funnel-page:${funnelId}:` : 'funnel-page:')
}

/**
 * Fetch a single funnel page (includes generated_html content).
 */
export async function fetchFunnelPage(funnelId: string, pageId: string): Promise<FunnelPage> {
  return backendGet<FunnelPage>(`/api/funnels/${funnelId}/pages/${pageId}`)
}

/** Cached {@link fetchFunnelPage} for preview surfaces. */
export async function fetchFunnelPageCached(funnelId: string, pageId: string): Promise<FunnelPage> {
  return cachedFetch(
    `funnel-page:${funnelId}:${pageId}:page`,
    () => fetchFunnelPage(funnelId, pageId),
    { ttlMs: ARTIFACT_PREVIEW_CACHE_TTL_MS },
  )
}

/**
 * Fetch the HTML bundle for a funnel page (page + shared files, resolved assets).
 */
export async function fetchFunnelPageBundle(
  funnelId: string,
  pageId: string,
): Promise<FunnelPageBundle> {
  return backendGet<FunnelPageBundle>(`/api/funnels/${funnelId}/pages/${pageId}/bundle`)
}

/** Cached {@link fetchFunnelPageBundle} for preview surfaces. */
export async function fetchFunnelPageBundleCached(
  funnelId: string,
  pageId: string,
): Promise<FunnelPageBundle> {
  return cachedFetch(
    `funnel-page:${funnelId}:${pageId}:bundle`,
    () => fetchFunnelPageBundle(funnelId, pageId),
    { ttlMs: ARTIFACT_PREVIEW_CACHE_TTL_MS },
  )
}
