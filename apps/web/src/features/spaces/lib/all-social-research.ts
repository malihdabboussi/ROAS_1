import {
  parseSocialHandle,
  SOCIAL_VIEW_TYPE_BY_PLATFORM,
  VIEW_TYPE_TO_SOCIAL_PLATFORM,
} from '../services/social-research.service'
import type { SpaceItem } from '../types'
import {
  DEFAULT_SOCIAL_RESEARCH_CONFIG,
  SOCIAL_PLATFORMS,
  SOCIAL_RESEARCH_VIEW_TYPES,
  socialResearchConfigKeyForPlatform,
  socialResearchPlatformForViewType,
  type AllSocialResearchConfig,
  type SocialPlatform,
  type SocialResearchConfig,
  type SocialResearchViewType,
  type SocialTrackedAccount,
  type SpaceSchema,
  type ViewDef,
} from '../types/space-schema'
import { getIgMediaToggles } from './ig-research-media-toggles'

export function isAllSocialResearchView(view: ViewDef | null | undefined): boolean {
  return view?.type === 'all_social_research'
}

export function getAllSocialResearchConfig(view: ViewDef): AllSocialResearchConfig {
  return { ...DEFAULT_SOCIAL_RESEARCH_CONFIG, ...view.all_social_research_config }
}

export function activePlatformFilters(config: AllSocialResearchConfig): SocialPlatform[] {
  const filters = config.platform_filters?.filter((p): p is SocialPlatform =>
    SOCIAL_PLATFORMS.includes(p),
  )
  return filters?.length ? filters : [...SOCIAL_PLATFORMS]
}

/** Copy tracked accounts from sibling platform-specific research views in the same space. */
export function mergeTrackedAccountsFromSiblingViews(
  schema: SpaceSchema,
  currentViewId: string,
): Partial<Record<SocialPlatform, SocialTrackedAccount[]>> {
  const merged: Partial<Record<SocialPlatform, SocialTrackedAccount[]>> = {}

  for (const platform of SOCIAL_PLATFORMS) {
    const viewType = SOCIAL_VIEW_TYPE_BY_PLATFORM[platform]
    const configKey = socialResearchConfigKeyForPlatform(platform)

    for (const view of schema.views) {
      if (view.id === currentViewId) continue
      if (view.type !== viewType) continue
      const accounts = view[configKey]?.tracked_accounts ?? []
      if (!accounts.length) continue

      const bucket = merged[platform] ?? []
      for (const acct of accounts) {
        if (!bucket.some((a) => a.handle.toLowerCase() === acct.handle.toLowerCase())) {
          bucket.push(acct)
        }
      }
      merged[platform] = bucket
    }
  }

  return merged
}

/** Unified view accounts = own config merged with sibling platform views (deduped by handle). */
export function resolveAllSocialResearchAccounts(
  schema: SpaceSchema,
  view: ViewDef,
): Partial<Record<SocialPlatform, SocialTrackedAccount[]>> {
  const config = getAllSocialResearchConfig(view)
  const own = config.tracked_accounts_by_platform ?? {}
  const sibling = mergeTrackedAccountsFromSiblingViews(schema, view.id)

  const result: Partial<Record<SocialPlatform, SocialTrackedAccount[]>> = {}
  for (const platform of SOCIAL_PLATFORMS) {
    const combined = [...(own[platform] ?? [])]
    for (const acct of sibling[platform] ?? []) {
      if (!combined.some((a) => a.handle.toLowerCase() === acct.handle.toLowerCase())) {
        combined.push(acct)
      }
    }
    if (combined.length) result[platform] = combined
  }
  return result
}

export function countAllSocialResearchAccounts(
  accounts: Partial<Record<SocialPlatform, SocialTrackedAccount[]>>,
): number {
  return SOCIAL_PLATFORMS.reduce((n, p) => n + (accounts[p]?.length ?? 0), 0)
}

export function flattenAllSocialResearchAccounts(
  accounts: Partial<Record<SocialPlatform, SocialTrackedAccount[]>>,
): Array<{ platform: SocialPlatform; account: SocialTrackedAccount }> {
  const out: Array<{ platform: SocialPlatform; account: SocialTrackedAccount }> = []
  for (const platform of SOCIAL_PLATFORMS) {
    for (const account of accounts[platform] ?? []) {
      out.push({ platform, account })
    }
  }
  return out
}

export function platformForSocialResearchItem(
  cd: Record<string, unknown> | undefined,
): SocialPlatform | null {
  if (!cd) return null
  const viewType = cd._view_type
  if (typeof viewType === 'string' && SOCIAL_RESEARCH_VIEW_TYPES.has(viewType)) {
    return socialResearchPlatformForViewType(viewType as SocialResearchViewType)
  }
  const platform = cd._platform
  if (typeof platform === 'string' && SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) {
    return platform as SocialPlatform
  }
  return null
}

export function itemPassesSocialMediaFilter(
  item: { custom_data: Record<string, unknown> },
  config: SocialResearchConfig,
  platform: SocialPlatform,
): boolean {
  const mt = item.custom_data?.media_type
  const {
    reels: showReels,
    images: showImages,
    slideshows: showSlideshows,
    youtubeVideos: showYoutubeVideos,
    youtubeShorts: showYoutubeShorts,
    xTweets: showXTweets,
    xVideos: showXVideos,
  } = getIgMediaToggles(config, platform)

  if (platform === 'youtube') {
    if (showYoutubeVideos && showYoutubeShorts) return true
    if (mt === 'youtube_video') return showYoutubeVideos
    if (mt === 'youtube_short') return showYoutubeShorts
    return true
  }

  if (platform === 'twitter') {
    if (showXTweets && showXVideos) return true
    if (mt === 'tweet') return showXTweets
    if (mt === 'tweet_video') return showXVideos
    return true
  }

  if (showReels && showImages && (platform !== 'tiktok' || showSlideshows)) return true
  if (mt === 'reel') return showReels
  if (mt === 'slideshow') return showSlideshows
  if (mt === 'image' || mt === 'carousel' || mt === 'post') return showImages
  return true
}

function igItemTakenAtDay(item: SpaceItem): string | null {
  const raw = (item.custom_data as Record<string, unknown>)?.taken_at
  if (raw == null) return null
  if (typeof raw === 'string') {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0] ?? null
  }
  return null
}

function igTakenAtInResolvedRange(
  takenDay: string | null,
  start: string | undefined,
  end: string | undefined,
): boolean {
  if (!start && !end) return true
  if (!takenDay) return true
  const today = new Date().toISOString().split('T')[0]!
  const effectiveEnd = end ?? (start ? today : undefined)
  if (start && takenDay < start) return false
  if (effectiveEnd && takenDay > effectiveEnd) return false
  return true
}

export function filterAllSocialResearchItems(
  items: SpaceItem[],
  config: AllSocialResearchConfig,
  opts: {
    rangeStart?: string
    rangeEnd?: string
    connectedHandles: Partial<Record<SocialPlatform, string | null>>
  },
): SpaceItem[] {
  const platforms = activePlatformFilters(config)
  const hiddenByPlatform = config.people_hidden_by_platform ?? {}

  let filtered = items.filter((item) => {
    const cd = item.custom_data as Record<string, unknown>
    const platform = platformForSocialResearchItem(cd)
    if (!platform || !platforms.includes(platform)) return false
    const viewType = cd._view_type
    return typeof viewType === 'string' && SOCIAL_RESEARCH_VIEW_TYPES.has(viewType)
  })

  filtered = filtered.filter((item) => {
    const platform = platformForSocialResearchItem(item.custom_data as Record<string, unknown>)
    if (!platform) return true
    return itemPassesSocialMediaFilter(item, config, platform)
  })

  if (config.show_connected_ig_in_grid === false) {
    filtered = filtered.filter((item) => {
      const cd = item.custom_data as Record<string, unknown>
      const platform = platformForSocialResearchItem(cd)
      if (!platform) return true
      const connected = opts.connectedHandles[platform]
      if (!connected) return true
      const h = parseSocialHandle(platform, connected).toLowerCase()
      return String(cd._handle ?? '').toLowerCase() !== h
    })
  }

  filtered = filtered.filter((item) => {
    const cd = item.custom_data as Record<string, unknown>
    const platform = platformForSocialResearchItem(cd)
    if (!platform) return true
    const hidden = hiddenByPlatform[platform] ?? []
    if (!hidden.length) return true
    const hiddenSet = new Set(hidden.map((x) => x.toLowerCase()))
    const h = String(cd._handle ?? '').toLowerCase()
    return !hiddenSet.has(h)
  })

  if (config.min_outlier_score && config.min_outlier_score > 0) {
    filtered = filtered.filter(
      (item) =>
        ((item.custom_data as Record<string, unknown>)?.outlier_score as number) >=
        config.min_outlier_score!,
    )
  }

  filtered = filtered.filter((item) =>
    igTakenAtInResolvedRange(igItemTakenAtDay(item), opts.rangeStart, opts.rangeEnd),
  )

  const sortField = config.sort_by ?? 'outlier_score'
  const sortDir = config.sort_dir ?? 'desc'
  filtered.sort((a, b) => {
    const aVal = (a.custom_data as Record<string, unknown>)?.[sortField]
    const bVal = (b.custom_data as Record<string, unknown>)?.[sortField]
    const aNum =
      typeof aVal === 'number' ? aVal : typeof aVal === 'string' ? new Date(aVal).getTime() : 0
    const bNum =
      typeof bVal === 'number' ? bVal : typeof bVal === 'string' ? new Date(bVal).getTime() : 0
    return sortDir === 'desc' ? bNum - aNum : aNum - bNum
  })

  return filtered
}

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X',
}

/** Glass badge preset ids for platform group headers — aligned with research view tab meta. */
export const PLATFORM_GROUP_BADGE_COLOR: Record<SocialPlatform, string> = {
  instagram: 'red',
  tiktok: 'muted',
  youtube: 'red',
  twitter: 'blue',
}

export { VIEW_TYPE_TO_SOCIAL_PLATFORM }
