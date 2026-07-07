export const ARTIFACT_VIEW_TYPES = [
  'funnels',
  'offers',
  'ads',
  'ad_campaigns',
  'sequences',
  'presentations',
  'avatars',
  'social_posts',
  'websites',
  'forms',
  'emails',
] as const

export type ArtifactViewType = (typeof ARTIFACT_VIEW_TYPES)[number]

export interface ArtifactViewDef {
  id: string
  type: ArtifactViewType
  name: string
  icon?: string
  pinned_to_start?: boolean
  funnels_config?: Record<string, unknown>
  offers_config?: Record<string, unknown>
  ads_config?: Record<string, unknown>
  ad_campaigns_config?: Record<string, unknown>
  sequences_config?: Record<string, unknown>
  presentations_config?: Record<string, unknown>
  avatars_config?: Record<string, unknown>
  social_posts_config?: Record<string, unknown>
  websites_config?: Record<string, unknown>
  forms_config?: Record<string, unknown>
  emails_config?: Record<string, unknown>
}

const VIEW_META: Record<
  ArtifactViewType,
  { name: string; icon: string; configKey: keyof ArtifactViewDef }
> = {
  funnels: { name: 'Funnels', icon: 'git-branch', configKey: 'funnels_config' },
  offers: { name: 'Offers', icon: 'package', configKey: 'offers_config' },
  ads: { name: 'Ads', icon: 'megaphone', configKey: 'ads_config' },
  ad_campaigns: { name: 'Ad Campaigns', icon: 'target', configKey: 'ad_campaigns_config' },
  sequences: { name: 'Sequences', icon: 'mail', configKey: 'sequences_config' },
  presentations: { name: 'Presentations', icon: 'presentation', configKey: 'presentations_config' },
  avatars: { name: 'Avatars', icon: 'user', configKey: 'avatars_config' },
  social_posts: { name: 'Social Posts', icon: 'share-2', configKey: 'social_posts_config' },
  websites: { name: 'Websites', icon: 'globe', configKey: 'websites_config' },
  forms: { name: 'Forms', icon: 'clipboard-list', configKey: 'forms_config' },
  emails: { name: 'Emails', icon: 'mail', configKey: 'emails_config' },
}

export function buildArtifactViewDef(
  viewType: ArtifactViewType,
  options?: { viewName?: string; pinnedToStart?: boolean },
): ArtifactViewDef {
  const meta = VIEW_META[viewType]
  const view: ArtifactViewDef = {
    id: viewType,
    type: viewType,
    name: options?.viewName?.trim() || meta.name,
    icon: meta.icon,
    ...(options?.pinnedToStart ? { pinned_to_start: true } : {}),
  }
  const defaultConfig: Record<string, unknown> = {
    display_mode: 'grid',
    time_range: 'all',
    sort_by: 'created_at',
    sort_dir: 'desc',
  }
  if (viewType === 'social_posts') defaultConfig.time_field = 'created_at'
  ;(view as unknown as Record<string, unknown>)[meta.configKey] = defaultConfig
  return view
}
