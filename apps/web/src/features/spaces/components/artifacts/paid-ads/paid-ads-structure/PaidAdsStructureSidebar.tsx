'use client'

import {
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from 'react'
import { Megaphone, Plus } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Ad, AdCampaign, AdSet } from '@/lib/artifacts'
import { cn } from '@/lib/utils/cn'
import {
  getAdCampaignIconColorId,
  getAdCampaignIconName,
} from '../paid-ads-icon'
import {
  PAID_ADS_GROUP_HEADER_CLS,
  PAID_ADS_SIDEBAR_ACTION_BTN_CLS,
  PaidAdsSidebar,
  PaidAdsSidebarIconButton,
} from '../PaidAdsSidebar'
import type { PaidAdsTreeSelection } from '../types'
import {
  isCampaignBranchActive,
  isUngroupedBranchActive,
  type PaidAdsMenuPosition,
} from './paid-ads-structure-helpers'
import { CampaignTreeBlock, UngroupedTreeBlock } from './PaidAdsStructureTreeBlocks'

export function PaidAdsStructureSidebar({
  adCampaigns,
  ungroupedAds,
  adsByAdSetId,
  selection,
  onSelectionChange,
  expandedCampaigns,
  onToggleCampaign,
  ungroupedExpanded,
  onToggleUngrouped,
  menuOpenRowId,
  onNewCampaign,
  onCreateAdSetForCampaign,
  onOpenCampaignMenu,
  onOpenAdSetMenu,
  positionFromTrigger,
  positionFromContextMenu,
  renameId,
  renameDraft,
  onRenameChange,
  onSubmitRenameForCampaign,
  onSubmitRenameForAdSet,
  onCancelRename,
}: {
  adCampaigns: AdCampaign[]
  ungroupedAds: Ad[]
  adsByAdSetId: Map<string, Ad[]>
  selection: PaidAdsTreeSelection | null
  onSelectionChange: Dispatch<SetStateAction<PaidAdsTreeSelection | null>>
  expandedCampaigns: Set<string>
  onToggleCampaign: (id: string) => void
  ungroupedExpanded: boolean
  onToggleUngrouped: () => void
  menuOpenRowId: string | null
  onNewCampaign: () => void
  onCreateAdSetForCampaign: (campaign: AdCampaign) => void
  onOpenCampaignMenu: (campaign: AdCampaign, position: PaidAdsMenuPosition) => void
  onOpenAdSetMenu: (
    adSet: AdSet,
    adAccountId: string | null,
    hasAds: boolean,
    position: PaidAdsMenuPosition,
  ) => void
  positionFromTrigger: (event: ReactMouseEvent<HTMLElement>) => PaidAdsMenuPosition
  positionFromContextMenu: (event: ReactMouseEvent) => PaidAdsMenuPosition
  renameId: string | null
  renameDraft: string
  onRenameChange: (value: string) => void
  onSubmitRenameForCampaign: (campaign: AdCampaign) => void | Promise<void>
  onSubmitRenameForAdSet: (set: AdSet) => void | Promise<void>
  onCancelRename: () => void
}) {
  const expandedContent = (
    <div className="space-y-spacing-2">
      <div className="space-y-spacing-1">
        <button
          type="button"
          onClick={() => void onNewCampaign()}
          className={PAID_ADS_SIDEBAR_ACTION_BTN_CLS}
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          New Campaign
        </button>
        <p className={PAID_ADS_GROUP_HEADER_CLS}>Campaigns</p>
        {adCampaigns.length === 0 ? (
          <p className="typo-caption text-muted-foreground px-spacing-2 py-spacing-1">
            No ad campaigns yet.
          </p>
        ) : (
          adCampaigns.map((campaign) => (
            <CampaignTreeBlock
              key={campaign.id}
              campaign={campaign}
              expanded={expandedCampaigns.has(campaign.id)}
              onToggle={() => onToggleCampaign(campaign.id)}
              selection={selection}
              onSelect={onSelectionChange}
              adsByAdSetId={adsByAdSetId}
              menuOpenRowId={menuOpenRowId}
              onOpenCampaignMenu={onOpenCampaignMenu}
              onOpenAdSetMenu={(set, position) =>
                onOpenAdSetMenu(
                  set,
                  campaign.meta_ad_account_id ?? null,
                  (adsByAdSetId.get(set.id)?.length ?? 0) > 0,
                  position,
                )
              }
              onCreateAdSetForCampaign={onCreateAdSetForCampaign}
              positionFromTrigger={positionFromTrigger}
              positionFromContextMenu={positionFromContextMenu}
              renameId={renameId}
              renameDraft={renameDraft}
              onRenameChange={onRenameChange}
              onSubmitRenameForCampaign={onSubmitRenameForCampaign}
              onSubmitRenameForAdSet={onSubmitRenameForAdSet}
              onCancelRename={onCancelRename}
            />
          ))
        )}
      </div>
      {ungroupedAds.length > 0 ? (
        <div className="space-y-spacing-1">
          <p className={PAID_ADS_GROUP_HEADER_CLS}>Ungrouped</p>
          <UngroupedTreeBlock
            ads={ungroupedAds}
            expanded={ungroupedExpanded}
            onToggle={onToggleUngrouped}
            selection={selection}
            onSelect={onSelectionChange}
          />
        </div>
      ) : null}
    </div>
  )

  const collapsedContent = (
    <>
      {adCampaigns.map((campaign) => {
        const setIds = (campaign.ad_sets ?? []).map((set) => set.id)
        const active = isCampaignBranchActive(selection, campaign.id, setIds, adsByAdSetId)
        const palette = getIconColor(getAdCampaignIconColorId(campaign))
        return (
          <PaidAdsSidebarIconButton
            key={campaign.id}
            label={campaign.name || 'Untitled Campaign'}
            selected={active}
            onClick={() =>
              onSelectionChange({
                kind: 'campaign',
                id: campaign.id,
                title: campaign.name || 'Untitled Campaign',
              })
            }
          >
            <LucideIcon
              name={getAdCampaignIconName(campaign)}
              className={cn('icon-sm', palette.textColor)}
            />
          </PaidAdsSidebarIconButton>
        )
      })}
      {ungroupedAds.length > 0 ? (
        <PaidAdsSidebarIconButton
          label="Ungrouped ads"
          selected={isUngroupedBranchActive(selection, ungroupedAds)}
          onClick={() => onSelectionChange({ kind: 'ungrouped' })}
        >
          <Megaphone className="icon-sm" />
        </PaidAdsSidebarIconButton>
      ) : null}
    </>
  )

  return (
    <PaidAdsSidebar
      title="Campaigns"
      expandedContent={expandedContent}
      collapsedContent={collapsedContent}
    />
  )
}
