import type { SegmentFilters } from '@/lib/properties/segments'

export function getFilterBadges(filters?: SegmentFilters): Array<{ label: string; count: number }> {
  if (!filters) return []
  const badges: Array<{ label: string; count: number }> = []
  if (filters.campaigns?.length) badges.push({ label: 'campaign', count: filters.campaigns.length })
  if (filters.funnels?.length) badges.push({ label: 'funnel', count: filters.funnels.length })
  if (filters.tags?.length) badges.push({ label: 'tag', count: filters.tags.length })
  if (filters.contact_type?.length)
    badges.push({ label: 'stage', count: filters.contact_type.length })
  if (filters.country?.length) badges.push({ label: 'country', count: filters.country.length })
  if (filters.date_range?.from || filters.date_range?.to)
    badges.push({ label: 'date range', count: 1 })
  return badges
}
