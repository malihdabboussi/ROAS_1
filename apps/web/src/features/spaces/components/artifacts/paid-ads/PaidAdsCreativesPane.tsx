'use client'

import { useCallback } from 'react'
import { Megaphone } from 'lucide-react'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import { fetchCampaignAdCampaigns, fetchCampaignAds } from '@/lib/artifacts/paid-ads-api'
import type { ArtifactPreviewSelection } from '../artifact-preview-selection'
import { adRows } from '../artifact-view-rows'
import { ArtifactSpaceView } from '../ArtifactSpaceView'
import { useArtifactRows } from '../use-artifact-rows'

function AdEmptyMockup() {
  return (
    <div aria-hidden className="relative h-48 w-80 select-none">
      <div className="card-glass top-spacing-4 absolute left-1/2 flex h-44 w-56 -translate-x-1/2 rotate-1 flex-col overflow-hidden p-0 shadow-2xl">
        <div className="bg-muted flex h-28 items-center justify-center">
          <Megaphone className="text-muted-foreground h-10 w-10 opacity-40" />
        </div>
        <div className="gap-spacing-2 p-spacing-3 flex flex-col">
          <div className="h-spacing-2 bg-muted-foreground w-3/4 rounded-full opacity-20" />
          <div className="h-spacing-2 bg-muted-foreground opacity-12 w-1/2 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function PaidAdsCreativesPane({
  campaignId,
  spaceId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: {
  campaignId: string
  spaceId: string | null
  activeView: ViewDef
  selection: ArtifactPreviewSelection | null
  onSelectionChange: (next: ArtifactPreviewSelection | null) => void
  onDetailChange?: (open: boolean) => void
  onArtifactDeepMetaChange?: (meta: { id: string; title: string } | null) => void
  artifactDeepToolbarExtras?: React.ReactNode
  includeCampaignArtifacts: boolean
}) {
  const fetcher = useCallback(
    async (id: string) => {
      const [ads, adCampaigns] = await Promise.all([
        fetchCampaignAds(id, includeCampaignArtifacts ? undefined : (spaceId ?? undefined)),
        fetchCampaignAdCampaigns(id, includeCampaignArtifacts ? undefined : (spaceId ?? undefined)),
      ])
      const adSetNameById = Object.fromEntries(
        adCampaigns.flatMap((campaign) =>
          (campaign.ad_sets ?? []).map((set) => [set.id, set.name] as const),
        ),
      )
      return adRows(ads, adSetNameById)
    },
    [includeCampaignArtifacts, spaceId],
  )

  const adsConfig = activeView.ads_config ?? {}
  const config = {
    ...adsConfig,
    group_by: adsConfig.group_by ?? activeView.group_by,
    group_sort: adsConfig.group_sort ?? activeView.group_sort,
  }

  const { rows, loading, error } = useArtifactRows({
    campaignId,
    viewType: 'ads',
    realtimeTables: ['ads'],
    childRealtimeTables: ['ad_sets'],
    fetcher,
    enabled: includeCampaignArtifacts || Boolean(spaceId),
  })

  return (
    <ArtifactSpaceView
      campaignId={campaignId}
      rows={rows}
      loading={loading}
      error={error}
      config={config}
      emptyTitle="No ad creatives yet"
      emptyDescription="Create an ad set first, then add or assign creative from the Ads toolbar."
      emptyMockup={<AdEmptyMockup />}
      previewType="ad"
      selection={selection}
      onSelectionChange={onSelectionChange}
      onDetailChange={onDetailChange}
      onArtifactDeepMetaChange={onArtifactDeepMetaChange}
      artifactDeepToolbarExtras={artifactDeepToolbarExtras}
      adsCardFieldIds={activeView.ads_config?.ad_card_fields}
    />
  )
}
