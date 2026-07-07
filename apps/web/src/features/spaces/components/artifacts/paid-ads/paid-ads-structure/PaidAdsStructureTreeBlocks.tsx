'use client'

import type { MouseEvent as ReactMouseEvent } from 'react'
import { Megaphone, MoreHorizontal, Plus } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Ad, AdCampaign, AdSet } from '@/lib/artifacts'
import { cn } from '@/lib/utils/cn'
import {
  getAdCampaignIconColorId,
  getAdCampaignIconName,
  getAdSetIconColorId,
  getAdSetIconName,
} from '../paid-ads-icon'
import {
  PAID_ADS_GROUP_HEADER_CLS,
  PaidAdsSidebarRow,
  PaidAdsSidebarTreeRow,
} from '../PaidAdsSidebar'
import type { PaidAdsTreeSelection } from '../types'
import type { PaidAdsMenuPosition } from './paid-ads-structure-helpers'

export function UngroupedTreeBlock({
  ads,
  expanded,
  onToggle,
  selection,
  onSelect,
}: {
  ads: Ad[]
  expanded: boolean
  onToggle: () => void
  selection: PaidAdsTreeSelection | null
  onSelect: (selection: PaidAdsTreeSelection) => void
}) {
  return (
    <div className="space-y-spacing-1">
      <PaidAdsSidebarTreeRow
        label="Ungrouped ads"
        selected={selection?.kind === 'ungrouped'}
        onClick={() => onSelect({ kind: 'ungrouped' })}
        icon={<Megaphone className="icon-sm" />}
        count={ads.length}
        expanded={expanded}
        onToggleExpand={onToggle}
        expandable={ads.length > 0}
      />
      {expanded
        ? ads.map((ad) => (
            <div key={ad.id} className="pl-spacing-4">
              <PaidAdsSidebarRow
                label={ad.headline || 'Untitled Ad'}
                selected={selection?.kind === 'ad' && selection.id === ad.id}
                onClick={() =>
                  onSelect({ kind: 'ad', id: ad.id, title: ad.headline || 'Untitled Ad' })
                }
                icon={<Megaphone className="icon-sm" />}
              />
            </div>
          ))
        : null}
    </div>
  )
}

export function CampaignTreeBlock({
  campaign,
  expanded,
  onToggle,
  selection,
  onSelect,
  adsByAdSetId,
  menuOpenRowId,
  onOpenCampaignMenu,
  onOpenAdSetMenu,
  onCreateAdSetForCampaign,
  positionFromTrigger,
  positionFromContextMenu,
  renameId,
  renameDraft,
  onRenameChange,
  onSubmitRenameForCampaign,
  onSubmitRenameForAdSet,
  onCancelRename,
}: {
  campaign: AdCampaign
  expanded: boolean
  onToggle: () => void
  selection: PaidAdsTreeSelection | null
  onSelect: (selection: PaidAdsTreeSelection) => void
  adsByAdSetId: Map<string, Ad[]>
  menuOpenRowId: string | null
  onOpenCampaignMenu: (campaign: AdCampaign, position: PaidAdsMenuPosition) => void
  onOpenAdSetMenu: (set: AdSet, position: PaidAdsMenuPosition) => void
  onCreateAdSetForCampaign: (campaign: AdCampaign) => void
  positionFromTrigger: (event: ReactMouseEvent<HTMLElement>) => PaidAdsMenuPosition
  positionFromContextMenu: (event: ReactMouseEvent) => PaidAdsMenuPosition
  renameId: string | null
  renameDraft: string
  onRenameChange: (value: string) => void
  onSubmitRenameForCampaign: (campaign: AdCampaign) => void | Promise<void>
  onSubmitRenameForAdSet: (set: AdSet) => void | Promise<void>
  onCancelRename: () => void
}) {
  const sets = campaign.ad_sets ?? []
  const campaignPalette = getIconColor(getAdCampaignIconColorId(campaign))

  const campaignMenuTrigger = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpenCampaignMenu(campaign, positionFromTrigger(event))
      }}
      className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle inline-flex h-5 w-5 items-center justify-center rounded transition-colors"
      aria-label="Campaign menu"
    >
      <MoreHorizontal className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div className="space-y-spacing-1">
      <PaidAdsSidebarTreeRow
        label={campaign.name || 'Untitled Campaign'}
        selected={selection?.kind === 'campaign' && selection.id === campaign.id}
        onClick={() =>
          onSelect({
            kind: 'campaign',
            id: campaign.id,
            title: campaign.name || 'Untitled Campaign',
          })
        }
        onContextMenu={(event) => {
          event.preventDefault()
          onOpenCampaignMenu(campaign, positionFromContextMenu(event))
        }}
        icon={
          <LucideIcon
            name={getAdCampaignIconName(campaign)}
            className={cn('icon-sm', campaignPalette.textColor)}
          />
        }
        count={sets.length}
        expanded={expanded}
        onToggleExpand={onToggle}
        expandable
        trailing={campaignMenuTrigger}
        forceTrailing={menuOpenRowId === `campaign:${campaign.id}`}
        renaming={renameId === campaign.id}
        renameValue={renameId === campaign.id ? renameDraft : undefined}
        onRenameChange={onRenameChange}
        onRenameSubmit={() => void onSubmitRenameForCampaign(campaign)}
        onRenameCancel={onCancelRename}
      />
      {expanded ? (
        <div className="pl-spacing-4 space-y-spacing-1">
          {sets.map((set) => (
            <AdSetTreeBlock
              key={set.id}
              set={set}
              campaignId={campaign.id}
              ads={adsByAdSetId.get(set.id) ?? []}
              selected={selection?.kind === 'ad_set' && selection.id === set.id}
              menuForced={menuOpenRowId === `ad_set:${set.id}`}
              renaming={renameId === set.id}
              renameDraft={renameId === set.id ? renameDraft : undefined}
              onSelect={onSelect}
              onOpenAdSetMenu={onOpenAdSetMenu}
              positionFromTrigger={positionFromTrigger}
              positionFromContextMenu={positionFromContextMenu}
              onRenameChange={onRenameChange}
              onRenameSubmit={() => void onSubmitRenameForAdSet(set)}
              onRenameCancel={onCancelRename}
            />
          ))}
          <CampaignAdsList
            sets={sets}
            adsByAdSetId={adsByAdSetId}
            selection={selection}
            onSelect={onSelect}
          />
          <button
            type="button"
            onClick={() => void onCreateAdSetForCampaign(campaign)}
            className="body-3 text-muted-foreground hover:text-foreground px-spacing-2 py-spacing-1 hover:bg-muted flex w-full items-center gap-1.5 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            New Ad Set
          </button>
        </div>
      ) : null}
    </div>
  )
}

function AdSetTreeBlock({
  set,
  campaignId,
  ads,
  selected,
  menuForced,
  renaming,
  renameDraft,
  onSelect,
  onOpenAdSetMenu,
  positionFromTrigger,
  positionFromContextMenu,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
}: {
  set: AdSet
  campaignId: string
  ads: Ad[]
  selected: boolean
  menuForced: boolean
  renaming: boolean
  renameDraft?: string
  onSelect: (selection: PaidAdsTreeSelection) => void
  onOpenAdSetMenu: (set: AdSet, position: PaidAdsMenuPosition) => void
  positionFromTrigger: (event: ReactMouseEvent<HTMLElement>) => PaidAdsMenuPosition
  positionFromContextMenu: (event: ReactMouseEvent) => PaidAdsMenuPosition
  onRenameChange: (value: string) => void
  onRenameSubmit: () => void
  onRenameCancel: () => void
}) {
  const setPalette = getIconColor(getAdSetIconColorId(set))
  const adSetMenuTrigger = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onOpenAdSetMenu(set, positionFromTrigger(event))
      }}
      className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle inline-flex h-5 w-5 items-center justify-center rounded transition-colors"
      aria-label="Ad set menu"
    >
      <MoreHorizontal className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div className="space-y-spacing-1">
      <PaidAdsSidebarTreeRow
        label={set.name || 'Untitled Ad Set'}
        selected={selected}
        onClick={() =>
          onSelect({
            kind: 'ad_set',
            id: set.id,
            title: set.name || 'Untitled Ad Set',
            adCampaignId: campaignId,
          })
        }
        onContextMenu={(event) => {
          event.preventDefault()
          onOpenAdSetMenu(set, positionFromContextMenu(event))
        }}
        icon={
          <LucideIcon
            name={getAdSetIconName(set)}
            className={cn('icon-sm', setPalette.textColor)}
          />
        }
        count={ads.length}
        trailing={adSetMenuTrigger}
        forceTrailing={menuForced}
        renaming={renaming}
        renameValue={renameDraft}
        onRenameChange={onRenameChange}
        onRenameSubmit={onRenameSubmit}
        onRenameCancel={onRenameCancel}
      />
    </div>
  )
}

function CampaignAdsList({
  sets,
  adsByAdSetId,
  selection,
  onSelect,
}: {
  sets: AdSet[]
  adsByAdSetId: Map<string, Ad[]>
  selection: PaidAdsTreeSelection | null
  onSelect: (selection: PaidAdsTreeSelection) => void
}) {
  const campaignAds = sets.flatMap((set) => adsByAdSetId.get(set.id) ?? [])
  if (campaignAds.length === 0) return null

  return (
    <div className="space-y-spacing-1">
      <p className={PAID_ADS_GROUP_HEADER_CLS}>Ads</p>
      {campaignAds.map((ad) => (
        <PaidAdsSidebarRow
          key={ad.id}
          label={ad.headline || 'Untitled Ad'}
          selected={selection?.kind === 'ad' && selection.id === ad.id}
          onClick={() => onSelect({ kind: 'ad', id: ad.id, title: ad.headline || 'Untitled Ad' })}
          icon={<Megaphone className="icon-sm" />}
        />
      ))}
    </div>
  )
}
