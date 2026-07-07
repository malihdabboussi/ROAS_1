import type { MouseEvent as ReactMouseEvent } from 'react'
import { toast } from 'sonner'
import type { AdCampaign, AdSet } from '@/lib/artifacts'
import { openInNewTab as openAppInNewTab } from '@/lib/utils/open-in-new-tab'
import type { PaidAdsMenuPosition } from './paid-ads-structure-helpers'

const ROW_MENU_WIDTH = 230

export function getRowMenuTriggerPosition(
  event: ReactMouseEvent<HTMLElement>,
): PaidAdsMenuPosition {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return { top: rect.top, left: Math.max(8, rect.right - ROW_MENU_WIDTH) }
}

export function getRowMenuContextPosition(event: ReactMouseEvent): PaidAdsMenuPosition {
  return { top: event.clientY, left: Math.max(8, event.clientX - ROW_MENU_WIDTH) }
}

export async function copyPaidAdsValueToClipboard(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error(`Failed to copy ${label.toLowerCase()}`)
  }
}

export function buildPaidAdsVibeyDeepLink(kind: 'campaign' | 'ad_set' | 'ad', id: string) {
  if (typeof window === 'undefined') return ''
  const url = new URL(window.location.href)
  url.searchParams.set('paid_ads_select', `${kind}:${id}`)
  return url.toString()
}

export function openPaidAdsLinkInNewTab(url: string) {
  if (typeof window === 'undefined') return
  openAppInNewTab(url)
}

export function buildMetaCampaignUrl(campaign: AdCampaign): string | null {
  if (!campaign.meta_campaign_id) return null
  const account = (campaign.meta_ad_account_id ?? '').replace('act_', '')
  return `https://www.facebook.com/adsmanager/manage/campaigns?act=${account}&selected_campaign_ids=${campaign.meta_campaign_id}`
}

export function buildMetaAdSetUrl(set: AdSet, adAccountId: string | null): string | null {
  if (!set.meta_adset_id) return null
  const account = (adAccountId ?? '').replace('act_', '')
  return `https://www.facebook.com/adsmanager/manage/adsets?act=${account}&selected_adset_ids=${set.meta_adset_id}`
}
