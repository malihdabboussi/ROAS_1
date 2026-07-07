'use client'

import { useCallback } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { resolvePaidAdsHierarchyMode } from '@/features/spaces/lib/paid-ads-display-mode'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import { createAdsBulk } from '@/features/studio/services/artifact-preview.service'
import type { ArtifactPreviewSelection } from '../artifact-preview-selection'
import { useArtifactDetailQuery } from '../use-artifact-detail-query'
import { PaidAdsAdSetsPane } from './PaidAdsAdSetsPane'
import { PaidAdsCreativesPane } from './PaidAdsCreativesPane'
import { PaidAdsStructurePane } from './PaidAdsStructurePane'
import { usePaidAdsData } from './use-paid-ads-data'

function MissingCampaign() {
  return (
    <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center p-8 text-center">
      Link this space to a campaign to manage paid ads.
    </div>
  )
}

export function PaidAdsSpaceView({
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
  campaignId: string | null
  spaceId: string | null
  activeView: ViewDef
  selection: ArtifactPreviewSelection | null
  onSelectionChange: (next: ArtifactPreviewSelection | null) => void
  onDetailChange?: (open: boolean) => void
  onArtifactDeepMetaChange?: (meta: { id: string; title: string } | null) => void
  artifactDeepToolbarExtras?: React.ReactNode
  includeCampaignArtifacts: boolean
}) {
  const { setArtifactQuery } = useArtifactDetailQuery()
  const data = usePaidAdsData(
    campaignId,
    includeCampaignArtifacts || Boolean(spaceId),
    includeCampaignArtifacts ? undefined : (spaceId ?? undefined),
  )
  const hierarchyMode = resolvePaidAdsHierarchyMode(activeView)

  const openCanvasForAdSet = useCallback(
    async (adSetId: string) => {
      const ad = data.ads.find((a) => a.ad_set_id === adSetId)
      if (ad) {
        setArtifactQuery(ad.id)
        onSelectionChange(null)
        return
      }

      const created = await createAdsBulk(adSetId, {
        creatives: [{}],
        template: {
          headline: 'Untitled Ad',
          primaryText: '',
          destinationUrl: '',
          ctaType: 'LEARN_MORE',
        },
      })
      const nextAd = created.ads[0]
      if (!nextAd) return
      data.insertAd(nextAd)
      setArtifactQuery(nextAd.id)
      onSelectionChange(null)
    },
    [data, onSelectionChange, setArtifactQuery],
  )

  if (!campaignId) return <MissingCampaign />

  if (hierarchyMode === 'creatives') {
    return (
      <PaidAdsCreativesPane
        campaignId={campaignId}
        spaceId={spaceId}
        activeView={activeView}
        selection={selection}
        onSelectionChange={onSelectionChange}
        onDetailChange={onDetailChange}
        onArtifactDeepMetaChange={onArtifactDeepMetaChange}
        artifactDeepToolbarExtras={artifactDeepToolbarExtras}
        includeCampaignArtifacts={includeCampaignArtifacts}
      />
    )
  }

  if (data.loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <VibeyLoadingOrb text="Loading paid ads…" state="processing" size="lg" />
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center p-8">
        {data.error}
      </div>
    )
  }

  if (hierarchyMode === 'structure') {
    return (
      <PaidAdsStructurePane
        platformCampaignId={campaignId}
        spaceId={spaceId}
        data={data}
        onOpenCanvasForAdSet={openCanvasForAdSet}
        toolbarExtras={artifactDeepToolbarExtras}
      />
    )
  }

  return (
    <PaidAdsAdSetsPane
      data={data}
      onOpenCanvasForAdSet={openCanvasForAdSet}
      toolbarExtras={artifactDeepToolbarExtras}
    />
  )
}
