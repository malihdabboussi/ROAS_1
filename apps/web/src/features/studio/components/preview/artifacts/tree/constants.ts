import type { ArtifactCategoryId, ArtifactsState } from './types'

export const ARTIFACT_CATEGORIES: { id: ArtifactCategoryId; label: string }[] = [
  { id: 'offers', label: 'Offers' },
  { id: 'funnels', label: 'Funnels' },
  { id: 'websites', label: 'Websites' },
  { id: 'ads', label: 'Ads' },
  { id: 'sequences', label: 'Email Sequences' },
  { id: 'presentations', label: 'Presentations' },
  { id: 'avatars', label: 'Avatars' },
  { id: 'social-content', label: 'Social Content' },
]

export const EMPTY_ARTIFACTS: ArtifactsState = {
  funnels: [],
  offers: [],
  ads: [],
  sequences: [],
  presentations: [],
  avatars: [],
  adCampaigns: [],
  socialPosts: [],
  blogPosts: [],
}

/** Session cache or partial payloads may omit arrays; coalesce so `buildArtifactTree` never reads `.length` on undefined. */
export function normalizeArtifactsState(raw: unknown): ArtifactsState {
  if (raw == null || typeof raw !== 'object') {
    return { ...EMPTY_ARTIFACTS }
  }
  const o = raw as Partial<Record<keyof ArtifactsState, unknown>>
  const list = <K extends keyof ArtifactsState>(key: K): ArtifactsState[K] =>
    (Array.isArray(o[key]) ? o[key] : []) as ArtifactsState[K]
  return {
    funnels: list('funnels'),
    offers: list('offers'),
    ads: list('ads'),
    sequences: list('sequences'),
    presentations: list('presentations'),
    avatars: list('avatars'),
    adCampaigns: list('adCampaigns'),
    socialPosts: list('socialPosts'),
    blogPosts: list('blogPosts'),
  }
}

export const CATEGORY_DEFAULTS: Record<string, string> = {
  funnels: 'New Funnel',
  websites: 'New Website',
  offers: 'Untitled Offer',
  sequences: 'Untitled Sequence',
  presentations: 'Untitled Presentation',
  avatars: 'Untitled Avatar',
}

export const ARTIFACT_TABLE_MAP: Record<string, string> = {
  funnel: 'funnels',
  offer: 'offers',
  ad: 'ads',
  'ad-campaign': 'ad_campaigns',
  'ad-set': 'ad_sets',
  sequence: 'sequences',
  presentation: 'presentations',
  avatar: 'avatars',
  'social-post': 'social_posts',
}

export const MENU_NODE_TYPES = [
  'funnel',
  'offer',
  'sequence',
  'presentation',
  'avatar',
  'ad',
  'page',
  'ad-campaign',
  'ad-set',
  'social-post',
] as const
