import type { PaidAdsHierarchyMode, ViewDef } from '../types/space-schema'

export const PAID_ADS_MODE_OPTIONS: { id: PaidAdsHierarchyMode; label: string }[] = [
  { id: 'structure', label: 'Campaigns' },
  { id: 'creatives', label: 'Ad Creatives' },
]

export function resolvePaidAdsHierarchyMode(view: ViewDef | null): PaidAdsHierarchyMode {
  if (!view) return 'creatives'
  if (view.type === 'ad_campaigns') return 'structure'
  if (view.type === 'ads') return view.ads_config?.paid_ads_mode ?? 'creatives'
  return 'creatives'
}

export function isPaidAdsViewType(viewType: ViewDef['type'] | undefined): boolean {
  return viewType === 'ads' || viewType === 'ad_campaigns'
}

export function usesPaidAdsInlineDetail(view: ViewDef | null): boolean {
  if (!view || !isPaidAdsViewType(view.type)) return false
  return resolvePaidAdsHierarchyMode(view) !== 'creatives'
}
