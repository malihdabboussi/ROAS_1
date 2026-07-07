'use client'

import type { ReactNode } from 'react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'
import { AdCampaignSettingsPanel } from '@/features/studio/components/preview/AdCampaignSettingsPanel'
import { AdPreview } from '@/features/studio/components/preview/AdPreview'
import { AdSetSettingsPanel } from '@/features/studio/components/preview/AdSetSettingsPanel'
import { AdUngroupedAssignPanel } from '@/features/studio/components/preview/AdUngroupedAssignPanel'
import type { Ad, AdCampaign, AdSet } from '@/features/studio/types'
import { PaidAdsDetailFrame } from './PaidAdsDetailFrame'
import type { PaidAdsTreeSelection } from './types'

function EmptyDetail({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <p className="body-3 text-foreground font-medium">{title}</p>
      <p className="typo-caption text-muted-foreground max-w-sm">{description}</p>
    </div>
  )
}

function DetailHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string
  subtitle?: string
  trailing?: ReactNode
}) {
  return (
    <div className="border-border px-spacing-4 py-spacing-3 shrink-0 border-b">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="body-3 text-foreground truncate font-semibold">{title}</p>
          {subtitle ? <p className="typo-caption text-muted-foreground">{subtitle}</p> : null}
        </div>
        {trailing}
      </div>
    </div>
  )
}

export function PaidAdsDetailPane({
  selection,
  adCampaigns,
  ads,
  ungroupedAds,
  onRefresh,
  onAdCampaignChange,
  onAdSetChange,
  toolbarExtras,
}: {
  selection: PaidAdsTreeSelection | null
  adCampaigns: AdCampaign[]
  ads: Ad[]
  ungroupedAds: Ad[]
  onOpenCanvasForAdSet?: (adSetId: string) => void
  onRefresh: () => void
  onAdCampaignChange?: (updated: AdCampaign) => void
  onAdSetChange?: (updated: AdSet) => void
  toolbarExtras?: ReactNode
}) {
  if (!selection) {
    return (
      <PaidAdsDetailFrame>
        <EmptyDetail
          title="Select a campaign, ad set, or ad"
          description="Use the tree on the left to browse structure and open settings or the creative canvas."
        />
      </PaidAdsDetailFrame>
    )
  }

  if (selection.kind === 'ungrouped') {
    if (ungroupedAds.length === 0) {
      return (
        <PaidAdsDetailFrame>
          <EmptyDetail
            title="No ungrouped ads"
            description="Ads without an ad set appear here. Delete an ad set with “keep ads” to move creatives into this bucket."
          />
        </PaidAdsDetailFrame>
      )
    }
    return (
      <PaidAdsDetailFrame>
        <DetailHeader
          title="Ungrouped ads"
          subtitle="Assign each ad to an ad set to unlock the creative canvas."
        />
        <div className="p-spacing-4 min-h-0 flex-1 overflow-y-auto">
          <div className="gap-spacing-3 flex flex-col">
            {ungroupedAds.map((ad) => (
              <section key={ad.id} className="gap-spacing-3 flex flex-col">
                <p className="body-4 text-muted-foreground font-medium">
                  {ad.headline || 'Untitled Ad'}
                </p>
                <AdUngroupedAssignPanel
                  ad={ad}
                  adCampaigns={adCampaigns}
                  onAssigned={() => onRefresh()}
                />
              </section>
            ))}
          </div>
        </div>
      </PaidAdsDetailFrame>
    )
  }

  if (selection.kind === 'campaign') {
    return (
      <PaidAdsDetailFrame>
        <AdCampaignSettingsPanel
          key={selection.id}
          adCampaignId={selection.id}
          appearance="spaces"
          headerTrailing={toolbarExtras}
          onCampaignChange={onAdCampaignChange}
          onUpdated={onAdCampaignChange}
        />
      </PaidAdsDetailFrame>
    )
  }

  if (selection.kind === 'ad_set') {
    return (
      <PaidAdsDetailFrame>
        <AdSetSettingsPanel
          key={selection.id}
          adSetId={selection.id}
          appearance="spaces"
          headerTrailing={toolbarExtras}
          onAdSetChange={onAdSetChange}
          onUpdated={onAdSetChange}
        />
      </PaidAdsDetailFrame>
    )
  }

  const ad = ads.find((a) => a.id === selection.id)
  if (!ad) {
    return (
      <PaidAdsDetailFrame>
        <EmptyDetail title="Ad not found" description="This ad may have been deleted." />
      </PaidAdsDetailFrame>
    )
  }

  if (!ad.ad_set_id) {
    return (
      <PaidAdsDetailFrame>
        <DetailHeader
          title={ad.headline || 'Untitled Ad'}
          subtitle="Ungrouped — assign to an ad set for canvas."
        />
        <div className="p-spacing-4 min-h-0 flex-1 overflow-y-auto">
          <AdUngroupedAssignPanel
            ad={ad}
            adCampaigns={adCampaigns}
            onAssigned={() => onRefresh()}
          />
        </div>
      </PaidAdsDetailFrame>
    )
  }

  return (
    <PaidAdsDetailFrame>
      <div className="min-h-0 flex-1 overflow-hidden">
        <AdPreview adId={ad.id} />
      </div>
    </PaidAdsDetailFrame>
  )
}

export function PaidAdsDetailLoading() {
  return (
    <PaidAdsDetailFrame>
      <div className="flex flex-1 items-center justify-center">
        <VibeyLoadingOrb size="sm" text="Loading…" />
      </div>
    </PaidAdsDetailFrame>
  )
}
