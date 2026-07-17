import { backendGet } from '@/lib/api/backend-client'

export type StudioSearchArtifactKind =
  | 'offer'
  | 'funnel'
  | 'website'
  | 'sequence'
  | 'email'
  | 'presentation'
  | 'avatar'
  | 'ad'
  | 'ad_campaign'
  | 'ad_set'
  | 'social_post'
  | 'blog_post'
  | 'page'

export type StudioGlobalSearchResultKind =
  | 'task'
  | 'doc'
  | 'deliverable'
  | 'conversation'
  | 'campaign'
  | 'artifact'

export interface StudioGlobalSearchResult {
  kind: StudioGlobalSearchResultKind
  id: string
  label: string
  subtitle: string | null
  url: string | null
  campaignId?: string | null
  campaignIcon?: string | null
  artifactKind?: StudioSearchArtifactKind
  sequenceId?: string
  funnelId?: string
}

export interface StudioSearchArtifactHit {
  kind: StudioSearchArtifactKind
  id: string
  campaign_id: string | null
  title: string
  sequence_id?: string
  funnel_id?: string
}

const STUDIO_CORE_SEARCH_KINDS: StudioGlobalSearchResultKind[] = [
  'task',
  'doc',
  'deliverable',
  'conversation',
  'campaign',
]

export async function fetchStudioGlobalSearch(
  q: string,
  signal?: AbortSignal,
  onPartial?: (items: StudioGlobalSearchResult[]) => void,
): Promise<StudioGlobalSearchResult[]> {
  const search = async (types: StudioGlobalSearchResultKind[]) => {
    const query = new URLSearchParams({ q, types: types.join(','), limit: '12' })
    const response = await backendGet<{ results: StudioGlobalSearchResult[] }>(
      `/api/entity-search?${query.toString()}`,
      { signal },
    )
    const items = response.results ?? []
    onPartial?.(items)
    return items
  }

  const settled = await Promise.allSettled([
    search(STUDIO_CORE_SEARCH_KINDS),
    search(['artifact']),
  ])
  const successful = settled.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  )
  if (settled.every((result) => result.status === 'rejected')) {
    const failure = settled[0]
    throw failure.status === 'rejected' ? failure.reason : new Error('Search failed')
  }
  return successful
}
