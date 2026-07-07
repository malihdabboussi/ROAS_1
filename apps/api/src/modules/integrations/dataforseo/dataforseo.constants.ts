export type DataForSeoActionSlug =
  | 'keyword_overview'
  | 'keyword_ideas'
  | 'google_serp'
  | 'competitors_domain'
  | 'backlinks_summary'

export const DATAFORSEO_ACTIONS: Record<
  DataForSeoActionSlug,
  { upstreamPath: string; fallbackCredits: number }
> = {
  keyword_overview: {
    upstreamPath: '/v3/dataforseo_labs/google/keyword_overview/live',
    fallbackCredits: 2,
  },
  keyword_ideas: {
    upstreamPath: '/v3/dataforseo_labs/google/keyword_ideas/live',
    fallbackCredits: 2,
  },
  google_serp: {
    upstreamPath: '/v3/serp/google/organic/live/advanced',
    fallbackCredits: 2,
  },
  competitors_domain: {
    upstreamPath: '/v3/dataforseo_labs/google/competitors_domain/live',
    fallbackCredits: 2,
  },
  backlinks_summary: {
    upstreamPath: '/v3/backlinks/summary/live',
    fallbackCredits: 2,
  },
}

export function dataForSeoFallbackCostUsd(actionSlug: DataForSeoActionSlug): number {
  const credits = DATAFORSEO_ACTIONS[actionSlug].fallbackCredits
  return credits / (2 * 200)
}
