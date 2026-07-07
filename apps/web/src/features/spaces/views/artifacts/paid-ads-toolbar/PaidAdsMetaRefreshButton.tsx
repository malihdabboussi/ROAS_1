'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import {
  fetchCampaignAdCampaigns,
  refreshAdCampaignMetaStatus,
  refreshAdSetMetaStatus,
} from '@/lib/artifacts/paid-ads-api'
import { PAID_ADS_META_STATUS_REFRESHED_EVENT } from '../../../components/artifacts/paid-ads/use-paid-ads-data'

export function PaidAdsMetaRefreshButton({ campaignId }: { campaignId: string | null }) {
  const [refreshingMetaStatus, setRefreshingMetaStatus] = useState(false)

  const handleRefreshAllMetaStatus = async () => {
    if (!campaignId || refreshingMetaStatus) return
    setRefreshingMetaStatus(true)
    try {
      const campaigns = await fetchCampaignAdCampaigns(campaignId)
      const adSetIds = campaigns.flatMap((campaign) =>
        (campaign.ad_sets ?? []).map((adSet) => adSet.id),
      )
      await Promise.all([
        ...campaigns.map((campaign) => refreshAdCampaignMetaStatus(campaign.id)),
        ...adSetIds.map((adSetId) => refreshAdSetMetaStatus(adSetId)),
      ])
      window.dispatchEvent(
        new CustomEvent(PAID_ADS_META_STATUS_REFRESHED_EVENT, { detail: { campaignId } }),
      )
    } finally {
      setRefreshingMetaStatus(false)
    }
  }

  return (
    <Tooltip
      label={campaignId ? 'Refresh all Meta statuses' : 'Paid ads require a campaign'}
      side="bottom"
    >
      <span className="inline-flex h-spacing-7 items-center">
        <button
          type="button"
          disabled={!campaignId || refreshingMetaStatus}
          onClick={() => void handleRefreshAllMetaStatus()}
          className="inline-flex h-spacing-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          aria-label="Refresh all Meta statuses"
        >
          <RefreshCw className={`icon-sm ${refreshingMetaStatus ? 'animate-spin' : ''}`} />
        </button>
      </span>
    </Tooltip>
  )
}
