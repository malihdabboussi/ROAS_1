import type { ShellArtifactViewerTarget } from './shell-artifact-viewer'

export type GlobalArtifactCategory =
  | 'docs'
  | 'images'
  | 'sheets'
  | 'presentations'
  | 'funnels'
  | 'artifacts'
  | 'files'

export type GlobalArtifactKind =
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

export type EntityResult = {
  kind: 'doc' | 'artifact'
  id: string
  label: string
  subtitle: string | null
  url: string | null
  campaignId?: string | null
  artifactKind?: GlobalArtifactKind
  funnelId?: string
  updatedAt?: string | null
}

export type MediaResult = {
  id: string
  name: string
  original_filename: string
  asset_type: string
  public_url: string | null
  mime_type: string
  category?: string | null
  source?: string | null
  source_model?: string | null
  source_prompt?: string | null
  tags?: string[] | null
  campaign_id: string | null
  space_id?: string | null
  conversation_id?: string | null
  created_at: string
}

export type CampaignResult = { id: string; name: string }
export type SpaceResult = { id: string; title: string; campaign_id: string | null }

export type GlobalArtifactItem = {
  id: string
  title: string
  badge: string
  category: GlobalArtifactCategory
  contextLabel: string
  sourceKind: 'created' | 'uploaded' | 'generated'
  thumbnailUrl?: string | null
  updatedAt: string | null
  viewer: ShellArtifactViewerTarget
}
