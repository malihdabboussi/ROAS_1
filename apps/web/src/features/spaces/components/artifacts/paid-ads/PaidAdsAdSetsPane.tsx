'use client'

import { useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import { PaidAdsDetailPane } from './PaidAdsDetailPane'
import {
  PAID_ADS_GROUP_HEADER_CLS,
  PaidAdsSidebar,
  PaidAdsSidebarIconButton,
  PaidAdsSidebarRow,
  PaidAdsSplitLayout,
} from './PaidAdsSidebar'
import type { PaidAdsTreeSelection } from './types'
import type { usePaidAdsData } from './use-paid-ads-data'

export function PaidAdsAdSetsPane({
  data,
  onOpenCanvasForAdSet,
  toolbarExtras,
}: {
  data: ReturnType<typeof usePaidAdsData>
  onOpenCanvasForAdSet: (adSetId: string) => void
  toolbarExtras?: React.ReactNode
}) {
  const [selection, setSelection] = useState<PaidAdsTreeSelection | null>(null)

  const sortedSets = useMemo(
    () =>
      [...data.allAdSets].sort((a, b) =>
        (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' }),
      ),
    [data.allAdSets],
  )

  const selectAdSet = (set: (typeof sortedSets)[number]) => {
    setSelection({
      kind: 'ad_set',
      id: set.id,
      title: set.name || 'Untitled Ad Set',
      adCampaignId: set.ad_campaign_id,
    })
  }

  const expandedContent =
    sortedSets.length === 0 ? (
      <p className="typo-caption text-muted-foreground px-spacing-2 py-spacing-2">
        No ad sets yet. Add one from the Ads toolbar to start organizing creative.
      </p>
    ) : (
      <div className="space-y-spacing-1">
        <p className={PAID_ADS_GROUP_HEADER_CLS}>Ad sets</p>
        {sortedSets.map((set) => {
          const adCount = data.adsByAdSetId.get(set.id)?.length ?? 0
          return (
            <PaidAdsSidebarRow
              key={set.id}
              label={set.name || 'Untitled Ad Set'}
              subtitle={`${set.ad_campaign_name ?? 'Campaign'} · ${adCount} ad${adCount === 1 ? '' : 's'}`}
              selected={selection?.kind === 'ad_set' && selection.id === set.id}
              onClick={() => selectAdSet(set)}
              icon={<Layers className="icon-sm" />}
            />
          )
        })}
      </div>
    )

  const collapsedContent = sortedSets.map((set) => (
    <PaidAdsSidebarIconButton
      key={set.id}
      label={set.name || 'Untitled Ad Set'}
      selected={selection?.kind === 'ad_set' && selection.id === set.id}
      onClick={() => selectAdSet(set)}
    >
      <Layers className="icon-sm" />
    </PaidAdsSidebarIconButton>
  ))

  return (
    <PaidAdsSplitLayout
      sidebar={
        <PaidAdsSidebar
          title="Ad sets"
          expandedContent={expandedContent}
          collapsedContent={collapsedContent}
        />
      }
    >
      <PaidAdsDetailPane
        selection={selection}
        adCampaigns={data.adCampaigns}
        ads={data.ads}
        ungroupedAds={data.ungroupedAds}
        onOpenCanvasForAdSet={onOpenCanvasForAdSet}
        onRefresh={() => void data.refreshSilent()}
        onAdCampaignChange={data.patchAdCampaign}
        onAdSetChange={data.patchAdSet}
        toolbarExtras={toolbarExtras}
      />
    </PaidAdsSplitLayout>
  )
}
