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

export interface StudioSearchArtifactHit {
  kind: StudioSearchArtifactKind
  id: string
  campaign_id: string | null
  title: string
  sequence_id?: string
  funnel_id?: string
}

export async function fetchStudioArtifactSearch(q: string): Promise<StudioSearchArtifactHit[]> {
  const query = new URLSearchParams()
  query.set('q', q)
  const res = await backendGet<{ items: StudioSearchArtifactHit[] }>(
    `/api/studio/search?${query.toString()}`,
  )
  return res.items ?? []
}
