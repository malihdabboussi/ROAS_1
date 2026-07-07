import type { IgResearchGroupBy } from '../types/space-schema'
import {
  PLATFORM_GROUP_BADGE_COLOR,
  PLATFORM_LABELS,
  platformForSocialResearchItem,
} from './all-social-research'

export const IG_RESEARCH_GROUP_BY_OPTIONS: { id: IgResearchGroupBy; label: string }[] = [
  { id: 'account', label: 'Account' },
  { id: 'outlier_tier', label: 'Outlier Tier' },
  { id: 'date_range', label: 'Date' },
  { id: 'media_type', label: 'Media Type' },
]

export const ALL_SOCIAL_RESEARCH_GROUP_BY_OPTIONS: { id: IgResearchGroupBy; label: string }[] = [
  { id: 'platform', label: 'Platform' },
  ...IG_RESEARCH_GROUP_BY_OPTIONS,
]

export interface IgGroupBucket {
  key: string
  label: string
  /** Select-style color id for `spaceGroupBadgeGlassClass` (e.g. outlier tier). */
  color?: string
  items: Array<{ custom_data: Record<string, unknown>; [k: string]: unknown }>
}

/** Matches list/kanban status chip palette (`space-group-badge-glass`). */
const OUTLIER_TIER_BADGE_COLOR: Record<string, string> = {
  '10x': 'red',
  '5x': 'orange',
  '2x': 'amber',
  avg: 'blue',
  below: 'muted',
}

function outlierTierLabel(score: number): { key: string; label: string; order: number } {
  if (score >= 10) return { key: '10x', label: '10x+ Outlier', order: 0 }
  if (score >= 5) return { key: '5x', label: '5x+ Outlier', order: 1 }
  if (score >= 2) return { key: '2x', label: '2x+ Outlier', order: 2 }
  if (score >= 0.8) return { key: 'avg', label: 'Average', order: 3 }
  return { key: 'below', label: 'Below Average', order: 4 }
}

function dateRangeLabel(takenAt: string): { key: string; label: string; order: number } {
  const now = Date.now()
  const ts = new Date(takenAt).getTime()
  const days = (now - ts) / 86_400_000
  if (days <= 7) return { key: 'this_week', label: 'This Week', order: 0 }
  if (days <= 14) return { key: 'last_week', label: 'Last Week', order: 1 }
  if (days <= 30) return { key: 'this_month', label: 'This Month', order: 2 }
  return { key: 'older', label: 'Older', order: 3 }
}

type AnyItem = { custom_data: Record<string, unknown>; [k: string]: unknown }

export function groupIgItems(
  items: AnyItem[],
  groupBy: IgResearchGroupBy,
  sortDir: 'asc' | 'desc' = 'asc',
): IgGroupBucket[] {
  const map = new Map<string, { label: string; order: number; color?: string; items: AnyItem[] }>()

  for (const item of items) {
    const cd = item.custom_data ?? {}
    let key: string
    let label: string
    let order: number

    switch (groupBy) {
      case 'platform': {
        const platform = platformForSocialResearchItem(cd) ?? 'instagram'
        key = platform
        label = PLATFORM_LABELS[platform]
        order = ['instagram', 'tiktok', 'youtube', 'twitter'].indexOf(platform)
        const color = PLATFORM_GROUP_BADGE_COLOR[platform]
        const existingPlatform = map.get(key)
        if (existingPlatform) {
          existingPlatform.items.push(item)
        } else {
          map.set(key, { label, order, color, items: [item] })
        }
        continue
      }
      case 'account': {
        const handle = String(cd._handle ?? 'unknown')
        key = handle
        label = `@${handle}`
        order = 0
        break
      }
      case 'outlier_tier': {
        const score = (cd.outlier_score as number) ?? 0
        const tier = outlierTierLabel(score)
        key = tier.key
        label = tier.label
        order = tier.order
        const color = OUTLIER_TIER_BADGE_COLOR[tier.key] ?? 'muted'
        const existingOt = map.get(key)
        if (existingOt) {
          existingOt.items.push(item)
        } else {
          map.set(key, { label, order, color, items: [item] })
        }
        continue
      }
      case 'date_range': {
        const takenAt = (cd.taken_at as string) ?? ''
        const dr = dateRangeLabel(takenAt)
        key = dr.key
        label = dr.label
        order = dr.order
        break
      }
      case 'media_type': {
        const mt = String(cd.media_type ?? 'unknown')
        key = mt
        label = mt === 'reel' ? 'Reels' : mt === 'image' ? 'Images' : mt
        order = mt === 'reel' ? 0 : 1
        break
      }
    }

    const existing = map.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      map.set(key, { label, order, items: [item] })
    }
  }

  const buckets = [...map.entries()].map(([key, val]) => ({
    key,
    label: val.label,
    order: val.order,
    color: val.color,
    items: val.items,
  }))

  buckets.sort((a, b) => (sortDir === 'asc' ? a.order - b.order : b.order - a.order))

  return buckets
}
