import type { PaidAdsHierarchyMode, PaidAdsWorkspaceMode, ViewDef } from '../types/space-schema'

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

export function resolvePaidAdsWorkspaceMode(view: ViewDef | null): PaidAdsWorkspaceMode {
  if (!view || !isPaidAdsViewType(view.type)) return 'reporting'
  return view.ads_config?.paid_ads_workspace_mode ?? 'reporting'
}

export function isPaidAdsViewType(viewType: ViewDef['type'] | undefined): boolean {
  return viewType === 'ads' || viewType === 'ad_campaigns'
}

export function usesPaidAdsInlineDetail(view: ViewDef | null): boolean {
  if (!view || !isPaidAdsViewType(view.type)) return false
  return resolvePaidAdsHierarchyMode(view) !== 'creatives'
}

export function consolidatePaidAdsViews(views: ViewDef[]): ViewDef[] {
  const hasPaidAds = views.some((view) => isPaidAdsViewType(view.type))
  if (!hasPaidAds) return views
  return views.filter((view) => view.type !== 'ads_research')
}

export function resolveConsolidatedPaidAdsView(
  views: ViewDef[],
  activeViewId: string | null,
): ViewDef | undefined {
  const requested = views.find((view) => view.id === activeViewId)
  if (requested?.type !== 'ads_research') {
    const consolidated = consolidatePaidAdsViews(views)
    return consolidated.find((view) => view.id === activeViewId) ?? consolidated[0]
  }
  const paidAds = views.find((view) => isPaidAdsViewType(view.type))
  if (!paidAds) return requested
  return {
    ...paidAds,
    ads_config: {
      ...(paidAds.ads_config ?? {}),
      paid_ads_workspace_mode: 'research',
    },
  }
}
