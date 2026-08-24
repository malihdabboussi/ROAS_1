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
  | 'client'
  | 'request'
  | 'task'
  | 'doc'
  | 'deliverable'
  | 'conversation'
  | 'campaign'
  | 'artifact'
  | 'mission'
  | 'preset'

export interface StudioGlobalSearchResult {
  kind: StudioGlobalSearchResultKind
  id: string
  label: string
  subtitle: string | null
  url: string | null
  campaignId?: string | null
  clientId?: string | null
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

export interface StudioSearchIdlePayload {
  recents: StudioGlobalSearchResult[]
  presets: StudioGlobalSearchResult[]
}

const STUDIO_CORE_SEARCH_KINDS: StudioGlobalSearchResultKind[] = [
  'client',
  'campaign',
  'request',
  'conversation',
]

const STUDIO_IDLE_RECENT_KINDS: StudioGlobalSearchResultKind[] = ['client']

export const STUDIO_SEARCH_IDLE_PRESETS: StudioGlobalSearchResult[] = [
  {
    kind: 'preset',
    id: 'clients',
    label: 'Clients',
    subtitle: 'Client workspaces',
    url: '/clients',
  },
  {
    kind: 'preset',
    id: 'client-campaigns',
    label: 'Client Campaigns',
    subtitle: 'All campaigns',
    url: '/client-campaigns',
  },
  {
    kind: 'preset',
    id: 'launches',
    label: 'Launches',
    subtitle: 'Launch calendar',
    url: '/launches',
  },
  {
    kind: 'preset',
    id: 'all-tasks',
    label: 'All Tasks',
    subtitle: 'All client work',
    url: '/all-tasks',
  },
  {
    kind: 'preset',
    id: 'create-campaign',
    label: 'New Campaign',
    subtitle: 'Build with Pixel',
    url: 'action:create-campaign',
  },
  {
    kind: 'preset',
    id: 'create-request',
    label: 'New Service Request',
    subtitle: 'Delegate work with Pixel',
    url: 'action:create-request',
  },
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

  const settled = await Promise.allSettled([search(STUDIO_CORE_SEARCH_KINDS), search(['artifact'])])
  const successful = settled.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  )
  if (settled.every((result) => result.status === 'rejected')) {
    const failure = settled[0]
    throw failure.status === 'rejected' ? failure.reason : new Error('Search failed')
  }
  return successful
}

/** Empty-query recent clients plus navigation and creation actions. */
export async function fetchStudioSearchIdle(
  signal?: AbortSignal,
): Promise<StudioSearchIdlePayload> {
  const query = new URLSearchParams({
    q: '',
    types: STUDIO_IDLE_RECENT_KINDS.join(','),
    limit: '6',
  })
  const response = await backendGet<{ results: StudioGlobalSearchResult[] }>(
    `/api/entity-search?${query.toString()}`,
    { signal },
  )
  const recents = (response.results ?? []).filter((item) =>
    STUDIO_IDLE_RECENT_KINDS.includes(item.kind),
  )
  return { recents, presets: STUDIO_SEARCH_IDLE_PRESETS }
}
