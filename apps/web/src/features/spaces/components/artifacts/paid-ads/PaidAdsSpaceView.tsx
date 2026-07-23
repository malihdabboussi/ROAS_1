'use client'

import { useCallback } from 'react'
import { AdsPerformanceView } from '@/components/artifacts/paid-ads/AdsPerformanceViewAdapter'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import {
  resolvePaidAdsHierarchyMode,
  resolvePaidAdsWorkspaceMode,
} from '@/features/spaces/lib/paid-ads-display-mode'
import type { ViewDef } from '@/features/spaces/types/space-schema'
import { createAdsBulk } from '@/lib/artifacts/paid-ads-api'
import { AdsResearchView } from '../../ads-research/AdsResearchView'
import type { ArtifactPreviewSelection } from '../artifact-preview-selection'
import { useArtifactDetailQuery } from '../use-artifact-detail-query'
import { PaidAdsAdSetsPane } from './PaidAdsAdSetsPane'
import { PaidAdsCreativesPane } from './PaidAdsCreativesPane'
import { PaidAdsMetaSetupBar } from './PaidAdsMetaSetupBar'
import { PaidAdsStructurePane } from './PaidAdsStructurePane'
import { usePaidAdsData } from './use-paid-ads-data'

function MissingCampaign() {
  return (
    <div className="body-3 text-muted-foreground flex flex-1 items-center justify-center p-8 text-center">
      Link this space to a campaign to manage paid ads.
    </div>
  )
}

interface PaidAdsSpaceViewProps {
  campaignId: string | null
  spaceId: string | null
  activeView: ViewDef
  selection: ArtifactPreviewSelection | null
  onSelectionChange: (next: ArtifactPreviewSelection | null) => void
  onDetailChange?: (open: boolean) => void
  onArtifactDeepMetaChange?: (meta: { id: string; title: string } | null) => void
  artifactDeepToolbarExtras?: React.ReactNode
  includeCampaignArtifacts: boolean
}

function PaidAdsWorkspaceShell({
  campaignId,
  spaceId,
  children,
}: {
  campaignId: string
  spaceId: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PaidAdsMetaSetupBar campaignId={campaignId} spaceId={spaceId} />
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  )
}

function PaidAdsCreationView({
  campaignId,
  spaceId,
  activeView,
  selection,
  onSelectionChange,
  onDetailChange,
  onArtifactDeepMetaChange,
  artifactDeepToolbarExtras,
  includeCampaignArtifacts,
}: PaidAdsSpaceViewProps & { campaignId: string }) {
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

export function PaidAdsSpaceView(props: PaidAdsSpaceViewProps) {
  const { campaignId, spaceId, activeView } = props

  if (!campaignId) return <MissingCampaign />
  const workspaceMode = resolvePaidAdsWorkspaceMode(activeView)

  return (
    <PaidAdsWorkspaceShell campaignId={campaignId} spaceId={spaceId}>
      {workspaceMode === 'reporting' ? (
        <div className="px-spacing-4 py-spacing-3 flex min-h-0 flex-1 overflow-auto">
          <AdsPerformanceView campaignId={campaignId} embedded />
        </div>
      ) : workspaceMode === 'research' && spaceId ? (
        <AdsResearchView view={activeView} items={[]} researchContext={{ spaceId, campaignId }} />
      ) : (
        <PaidAdsCreationView {...props} campaignId={campaignId} />
      )}
    </PaidAdsWorkspaceShell>
  )
}
