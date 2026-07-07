import type { Ad, AdCampaign } from '@/lib/artifacts'
import {
  getAdCampaignIconColorId,
  getAdCampaignIconName,
  getAdSetIconColorId,
  getAdSetIconName,
} from '../paid-ads-icon'
import type { PaidAdsRowMenuTarget } from '../PaidAdsRowMenu'
import type { PaidAdsTreeSelection } from '../types'

export interface PaidAdsMenuPosition {
  top: number
  left: number
}

export interface PaidAdsStructureRowMenuState {
  rowId: string
  position: PaidAdsMenuPosition
  target: PaidAdsRowMenuTarget
}

export function resolveRowMenuTarget(
  menu: PaidAdsStructureRowMenuState,
  adCampaigns: AdCampaign[],
  adsByAdSetId: Map<string, { id: string }[]>,
): PaidAdsRowMenuTarget {
  if (menu.target.kind === 'campaign') {
    const campaign = adCampaigns.find((item) => item.id === menu.target.data.id) ?? menu.target.data
    return {
      kind: 'campaign',
      data: campaign,
      iconName: getAdCampaignIconName(campaign),
      iconColorId: getAdCampaignIconColorId(campaign),
    }
  }

  const setId = menu.target.data.id
  for (const campaign of adCampaigns) {
    const set = campaign.ad_sets?.find((item) => item.id === setId)
    if (set) {
      return {
        kind: 'ad_set',
        data: set,
        adAccountId: menu.target.adAccountId ?? campaign.meta_ad_account_id ?? null,
        hasAds: (adsByAdSetId.get(set.id)?.length ?? 0) > 0,
        iconName: getAdSetIconName(set),
        iconColorId: getAdSetIconColorId(set),
      }
    }
  }

  return menu.target
}

export function isCampaignBranchActive(
  selection: PaidAdsTreeSelection | null,
  campaignId: string,
  adSetIds: string[],
  adsByAdSetId: Map<string, { id: string }[]>,
): boolean {
  if (!selection) return false
  if (selection.kind === 'campaign' && selection.id === campaignId) return true
  if (selection.kind === 'ad_set' && selection.adCampaignId === campaignId) return true
  if (selection.kind === 'ad') {
    for (const setId of adSetIds) {
      if (adsByAdSetId.get(setId)?.some((ad) => ad.id === selection.id)) return true
    }
  }
  return false
}

export function isUngroupedBranchActive(
  selection: PaidAdsTreeSelection | null,
  ungroupedAds: Ad[],
): boolean {
  if (!selection) return false
  if (selection.kind === 'ungrouped') return true
  if (selection.kind === 'ad') return ungroupedAds.some((ad) => ad.id === selection.id)
  return false
}
