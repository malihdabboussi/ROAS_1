'use client'

import type { AdCampaign, AdSet } from '@/lib/artifacts'
import {
  PaidAdsRowMenu,
  type PaidAdsRowMenuActions,
  type PaidAdsRowMenuTarget,
} from '../PaidAdsRowMenu'
import {
  resolveRowMenuTarget,
  type PaidAdsStructureRowMenuState,
} from './paid-ads-structure-helpers'
import type { PaidAdsStructureActions } from './use-paid-ads-structure-actions'

export function PaidAdsStructureRowMenuHost({
  rowMenu,
  adCampaigns,
  adsByAdSetId,
  actions,
  onOpenCanvasForAdSet,
}: {
  rowMenu: PaidAdsStructureRowMenuState | null
  adCampaigns: AdCampaign[]
  adsByAdSetId: Map<string, { id: string }[]>
  actions: PaidAdsStructureActions
  onOpenCanvasForAdSet: (adSetId: string) => void
}) {
  if (!rowMenu) return null

  const target = resolveRowMenuTarget(rowMenu, adCampaigns, adsByAdSetId)

  return (
    <PaidAdsRowMenu
      target={target}
      position={rowMenu.position}
      actions={
        rowMenu.target.kind === 'campaign'
          ? getCampaignActions(rowMenu, actions)
          : getAdSetActions(rowMenu, actions, onOpenCanvasForAdSet)
      }
    />
  )
}

function getCampaignActions(
  rowMenu: PaidAdsStructureRowMenuState,
  actions: PaidAdsStructureActions,
): PaidAdsRowMenuActions {
  return {
    onClose: actions.closeRowMenu,
    onCopyLink: () =>
      void actions.copyToClipboard(
        actions.buildVibeyDeepLink('campaign', rowMenu.target.data.id),
        'Link',
      ),
    onCopyId: () => void actions.copyToClipboard(rowMenu.target.data.id, 'ID'),
    onOpenInNewTab: () =>
      actions.openInNewTab(actions.buildVibeyDeepLink('campaign', rowMenu.target.data.id)),
    onStartRename: () => {
      const campaign = rowMenu.target.data as AdCampaign
      actions.startRename(campaign.id, campaign.name || '')
    },
    onPatchIcon: (patch) => void actions.patchCampaignIcon(rowMenu.target.data as AdCampaign, patch),
    onDuplicate: () => void actions.duplicateCampaign(rowMenu.target.data as AdCampaign),
    onAddAdSet: () => void actions.addAdSetForCampaign(rowMenu.target.data as AdCampaign),
    onPauseOnMeta: () => void actions.setCampaignStatus(rowMenu.target.data as AdCampaign, 'PAUSED'),
    onActivateOnMeta: () =>
      void actions.setCampaignStatus(rowMenu.target.data as AdCampaign, 'ACTIVE'),
    onRefreshMetaStatus: () =>
      void actions.refreshCampaignStatus(rowMenu.target.data as AdCampaign),
    onCopyMetaId: () => {
      const id = (rowMenu.target.data as AdCampaign).meta_campaign_id
      if (id) void actions.copyToClipboard(id, 'Meta ID')
    },
    onOpenInMeta: () => {
      const url = actions.buildMetaCampaignUrl(rowMenu.target.data as AdCampaign)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    },
    onDeleteKeepAds: () =>
      void actions.deleteCampaign(rowMenu.target.data as AdCampaign, 'keep_ads'),
    onDeleteAll: () => void actions.deleteCampaign(rowMenu.target.data as AdCampaign, 'delete_all'),
  }
}

function getAdSetActions(
  rowMenu: PaidAdsStructureRowMenuState,
  actions: PaidAdsStructureActions,
  onOpenCanvasForAdSet: (adSetId: string) => void,
): PaidAdsRowMenuActions {
  return {
    onClose: actions.closeRowMenu,
    onCopyLink: () =>
      void actions.copyToClipboard(
        actions.buildVibeyDeepLink('ad_set', rowMenu.target.data.id),
        'Link',
      ),
    onCopyId: () => void actions.copyToClipboard(rowMenu.target.data.id, 'ID'),
    onOpenInNewTab: () =>
      actions.openInNewTab(actions.buildVibeyDeepLink('ad_set', rowMenu.target.data.id)),
    onStartRename: () => {
      const set = rowMenu.target.data as AdSet
      actions.startRename(set.id, set.name || '')
    },
    onPatchIcon: (patch) => void actions.patchAdSetIcon(rowMenu.target.data as AdSet, patch),
    onDuplicate: () => void actions.duplicateAdSetAction(rowMenu.target.data as AdSet),
    onPauseOnMeta: () => void actions.setAdSetStatus(rowMenu.target.data as AdSet, 'PAUSED'),
    onActivateOnMeta: () => void actions.setAdSetStatus(rowMenu.target.data as AdSet, 'ACTIVE'),
    onRefreshMetaStatus: () => void actions.refreshAdSetStatus(rowMenu.target.data as AdSet),
    onCopyMetaId: () => {
      const id = (rowMenu.target.data as AdSet).meta_adset_id
      if (id) void actions.copyToClipboard(id, 'Meta ID')
    },
    onOpenInMeta: () => {
      const target = rowMenu.target as Extract<PaidAdsRowMenuTarget, { kind: 'ad_set' }>
      const url = actions.buildMetaAdSetUrl(target.data, target.adAccountId)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    },
    onOpenCanvas: () => onOpenCanvasForAdSet((rowMenu.target.data as AdSet).id),
    onDeleteKeepAds: () => void actions.deleteAdSetAction(rowMenu.target.data as AdSet, 'keep_ads'),
    onDeleteAll: () => void actions.deleteAdSetAction(rowMenu.target.data as AdSet, 'delete_all'),
  }
}
