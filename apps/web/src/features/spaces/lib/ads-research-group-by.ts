import { ADS_PLATFORM_LABELS, type AdSearchResultItem } from '../services/ads-research.service'
import type {
  AdsResearchConfig,
  AdsResearchGroupBy,
  AdsResearchSortBy,
  ViewDef,
} from '../types/space-schema'

export const ADS_RESEARCH_GROUP_BY_OPTIONS: { id: AdsResearchGroupBy; label: string }[] = [
  { id: 'advertiser', label: 'Advertiser' },
  { id: 'platform', label: 'Platform' },
  { id: 'format', label: 'Format' },
  { id: 'longevity', label: 'Longevity' },
]

export const ADS_RESEARCH_SORT_OPTIONS: { id: AdsResearchSortBy; label: string }[] = [
  { id: 'days_running', label: 'Days running' },
  { id: 'last_shown', label: 'Last shown' },
  { id: 'first_shown', label: 'First shown' },
]

export const DEFAULT_ADS_RESEARCH_CONFIG: AdsResearchConfig = {
  display_mode: 'grid',
  sort_by: 'days_running',
  sort_dir: 'desc',
}

export function getAdsResearchConfig(view: ViewDef): AdsResearchConfig {
  return { ...DEFAULT_ADS_RESEARCH_CONFIG, ...view.ads_research_config }
}

export interface AdGroupBucket {
  key: string
  label: string
  /** Select-style color id for `spaceGroupBadgeGlassClass` (e.g. longevity tier). */
  color?: string
  items: AdSearchResultItem[]
}

/** Matches the outlier-tier chip palette in social research. */
const LONGEVITY_TIER_BADGE_COLOR: Record<string, string> = {
  '90d': 'red',
  '30d': 'orange',
  '7d': 'amber',
  fresh: 'blue',
  unknown: 'muted',
}

function longevityTier(daysRunning: number | null): { key: string; label: string; order: number } {
  if (daysRunning == null) return { key: 'unknown', label: 'Unknown', order: 4 }
  if (daysRunning >= 90) return { key: '90d', label: '90d+ Proven', order: 0 }
  if (daysRunning >= 30) return { key: '30d', label: '30d+ Running', order: 1 }
  if (daysRunning >= 7) return { key: '7d', label: '7d+ Running', order: 2 }
  return { key: 'fresh', label: 'Fresh', order: 3 }
}

const FORMAT_LABELS: Record<string, string> = {
  video: 'Video',
  image: 'Image',
  carousel: 'Carousel',
  text: 'Text',
  unknown: 'Other',
}

export function groupAdItems(
  items: AdSearchResultItem[],
  groupBy: AdsResearchGroupBy,
  sortDir: 'asc' | 'desc' = 'asc',
): AdGroupBucket[] {
  const map = new Map<
    string,
    { label: string; order: number; color?: string; items: AdSearchResultItem[] }
  >()

  for (const item of items) {
    let key: string
    let label: string
    let order: number
    let color: string | undefined

    switch (groupBy) {
      case 'advertiser': {
        key = (item.advertiser_name ?? item.advertiser_id ?? 'unknown').toLowerCase()
        label = item.advertiser_name ?? 'Unknown advertiser'
        order = 0
        break
      }
      case 'platform': {
        key = item.platform
        label = ADS_PLATFORM_LABELS[item.platform]
        order = ['meta', 'tiktok', 'google'].indexOf(item.platform)
        break
      }
      case 'format': {
        key = item.format
        label = FORMAT_LABELS[item.format] ?? item.format
        order = ['video', 'image', 'carousel', 'text', 'unknown'].indexOf(item.format)
        break
      }
      case 'longevity': {
        const tier = longevityTier(item.days_running)
        key = tier.key
        label = tier.label
        order = tier.order
        color = LONGEVITY_TIER_BADGE_COLOR[tier.key] ?? 'muted'
        break
      }
    }

    const existing = map.get(key)
    if (existing) existing.items.push(item)
    else map.set(key, { label, order, color, items: [item] })
  }

  const buckets = [...map.entries()].map(([key, val]) => ({
    key,
    label: val.label,
    order: val.order,
    color: val.color,
    items: val.items,
  }))

  // Advertiser groups have no natural order — sort alphabetically; the rest by tier order.
  if (groupBy === 'advertiser') {
    buckets.sort((a, b) =>
      sortDir === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label),
    )
  } else {
    buckets.sort((a, b) => (sortDir === 'asc' ? a.order - b.order : b.order - a.order))
  }
  return buckets
}

function sortValue(item: AdSearchResultItem, sortBy: AdsResearchSortBy): number {
  if (sortBy === 'days_running') return item.days_running ?? -1
  const iso = sortBy === 'last_shown' ? item.last_shown : item.first_shown
  const ts = iso ? new Date(iso).getTime() : NaN
  return Number.isNaN(ts) ? -1 : ts
}

export function sortAdItems(
  items: AdSearchResultItem[],
  config: AdsResearchConfig,
): AdSearchResultItem[] {
  const sortBy = config.sort_by ?? 'days_running'
  const sortDir = config.sort_dir ?? 'desc'
  return [...items].sort((a, b) => {
    const diff = sortValue(a, sortBy) - sortValue(b, sortBy)
    return sortDir === 'desc' ? -diff : diff
  })
}
