'use client'

import { useCallback, useEffect, useState } from 'react'
import { PaidAdsDetailPane } from './PaidAdsDetailPane'
import { PaidAdsStructureRowMenuHost } from './paid-ads-structure/PaidAdsStructureRowMenuHost'
import { PaidAdsStructureSidebar } from './paid-ads-structure/PaidAdsStructureSidebar'
import { usePaidAdsStructureActions } from './paid-ads-structure/use-paid-ads-structure-actions'
import { PaidAdsSplitLayout } from './PaidAdsSidebar'
import type { PaidAdsTreeSelection } from './types'
import {
  PAID_ADS_OPEN_CANVAS_REQUEST_EVENT,
  PAID_ADS_SELECTION_EVENT,
  type PaidAdsOpenCanvasRequestDetail,
  type PaidAdsSelectionEventDetail,
  type usePaidAdsData,
} from './use-paid-ads-data'

export function PaidAdsStructurePane({
  platformCampaignId,
  spaceId,
  data,
  onOpenCanvasForAdSet,
  toolbarExtras,
}: {
  platformCampaignId: string
  spaceId: string | null
  data: ReturnType<typeof usePaidAdsData>
  onOpenCanvasForAdSet: (adSetId: string) => void
  toolbarExtras?: React.ReactNode
}) {
  const [selection, setSelection] = useState<PaidAdsTreeSelection | null>(null)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(() => new Set())
  const [ungroupedExpanded, setUngroupedExpanded] = useState(false)

  const toggleCampaign = useCallback((id: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const ensureCampaignExpanded = useCallback((campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const next = new Set(prev)
      next.add(campaignId)
      return next
    })
  }, [])

  const actions = usePaidAdsStructureActions({
    platformCampaignId,
    spaceId,
    data,
    selection,
    setSelection,
    ensureCampaignExpanded,
  })

  useEffect(() => {
    let toolbarSelection: PaidAdsSelectionEventDetail['selection'] = {
      kind:
        selection?.kind === 'campaign' || selection?.kind === 'ungrouped' ? selection.kind : null,
    }
    if (selection?.kind === 'ad_set') {
      toolbarSelection = { kind: 'ad_set', adSetId: selection.id }
    } else if (selection?.kind === 'ad') {
      const ad = data.ads.find((item) => item.id === selection.id)
      toolbarSelection = {
        kind: 'ad',
        adId: selection.id,
        adSetId: ad?.ad_set_id ?? null,
      }
    }
    const detail: PaidAdsSelectionEventDetail = {
      campaignId: platformCampaignId,
      selection: toolbarSelection,
    }
    window.dispatchEvent(new CustomEvent(PAID_ADS_SELECTION_EVENT, { detail }))
  }, [selection, platformCampaignId, data.ads])

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent(PAID_ADS_SELECTION_EVENT, {
          detail: {
            campaignId: platformCampaignId,
            selection: { kind: null },
          } satisfies PaidAdsSelectionEventDetail,
        }),
      )
    }
  }, [platformCampaignId])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PaidAdsOpenCanvasRequestDetail>).detail
      if (detail?.campaignId !== platformCampaignId) return
      if (selection?.kind === 'ad_set') {
        onOpenCanvasForAdSet(selection.id)
        return
      }
      if (selection?.kind === 'ad') {
        const ad = data.ads.find((item) => item.id === selection.id)
        if (ad?.ad_set_id) onOpenCanvasForAdSet(ad.ad_set_id)
      }
    }
    window.addEventListener(PAID_ADS_OPEN_CANVAS_REQUEST_EVENT, handler)
    return () => window.removeEventListener(PAID_ADS_OPEN_CANVAS_REQUEST_EVENT, handler)
  }, [platformCampaignId, selection, onOpenCanvasForAdSet])

  // Hydrate selection from `?paid_ads_select=campaign:<id>` or `ad_set:<id>` once data is loaded.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const param = url.searchParams.get('paid_ads_select')
    if (!param) return
    const [kind, ...rest] = param.split(':')
    const id = rest.join(':')
    if (!id) return
    if (kind === 'campaign') {
      const campaign = data.adCampaigns.find((item) => item.id === id)
      if (!campaign) return
      setSelection({
        kind: 'campaign',
        id: campaign.id,
        title: campaign.name || 'Untitled Campaign',
      })
    } else if (kind === 'ad_set') {
      for (const campaign of data.adCampaigns) {
        const set = (campaign.ad_sets ?? []).find((item) => item.id === id)
        if (set) {
          ensureCampaignExpanded(campaign.id)
          setSelection({
            kind: 'ad_set',
            id: set.id,
            title: set.name || 'Untitled Ad Set',
            adCampaignId: campaign.id,
          })
          break
        }
      }
    } else if (kind === 'ad') {
      const ad = data.ads.find((item) => item.id === id)
      if (!ad?.ad_set_id) return
      for (const campaign of data.adCampaigns) {
        if ((campaign.ad_sets ?? []).some((set) => set.id === ad.ad_set_id)) {
          ensureCampaignExpanded(campaign.id)
          setSelection({
            kind: 'ad',
            id: ad.id,
            title: ad.headline || 'Untitled Ad',
          })
          break
        }
      }
    } else {
      return
    }
    url.searchParams.delete('paid_ads_select')
    window.history.replaceState({}, '', url.toString())
  }, [data.adCampaigns, ensureCampaignExpanded])

  return (
    <PaidAdsSplitLayout
      sidebar={
        <PaidAdsStructureSidebar
          adCampaigns={data.adCampaigns}
          ungroupedAds={data.ungroupedAds}
          adsByAdSetId={data.adsByAdSetId}
          selection={selection}
          onSelectionChange={setSelection}
          expandedCampaigns={expandedCampaigns}
          onToggleCampaign={toggleCampaign}
          ungroupedExpanded={ungroupedExpanded}
          onToggleUngrouped={() => setUngroupedExpanded((value) => !value)}
          menuOpenRowId={actions.menuOpenRowId}
          onNewCampaign={actions.handleNewCampaign}
          onCreateAdSetForCampaign={actions.addAdSetForCampaign}
          onOpenCampaignMenu={actions.openCampaignMenu}
          onOpenAdSetMenu={actions.openAdSetMenu}
          positionFromTrigger={actions.positionFromTrigger}
          positionFromContextMenu={actions.positionFromContextMenu}
          renameId={actions.renameId}
          renameDraft={actions.renameDraft}
          onRenameChange={actions.setRenameDraft}
          onSubmitRenameForCampaign={actions.submitRenameForCampaign}
          onSubmitRenameForAdSet={actions.submitRenameForAdSet}
          onCancelRename={actions.cancelRename}
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
      <PaidAdsStructureRowMenuHost
        rowMenu={actions.rowMenu}
        adCampaigns={data.adCampaigns}
        adsByAdSetId={data.adsByAdSetId}
        actions={actions}
        onOpenCanvasForAdSet={onOpenCanvasForAdSet}
      />
    </PaidAdsSplitLayout>
  )
}
