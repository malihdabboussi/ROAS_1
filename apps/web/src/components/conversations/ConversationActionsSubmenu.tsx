'use client'

import { forwardRef, useMemo, type MouseEventHandler } from 'react'
import { Check, FolderInput } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'
import type { Campaign } from '@/lib/campaigns/campaign-api'

export const CONVERSATION_ACTIONS_SUBMENU_WIDTH = 224

export type ConversationActionsSubmenuKind = 'move' | 'copy'

interface ConversationActionsSubmenuProps {
  kind: ConversationActionsSubmenuKind
  campaignsLoading: boolean
  campaigns: Campaign[]
  currentCampaignId: string | null
  position: { top: number; left: number }
  onMouseEnter: MouseEventHandler<HTMLDivElement>
  onMouseLeave: MouseEventHandler<HTMLDivElement>
  onMoveTo: (campaignId: string | null) => void
  onDuplicateTo: (campaignId: string | null) => void
}

const ITEM_ICON_CLASS = 'h-3.5 w-3.5 shrink-0'
const SUBMENU_ROW_CLASS =
  'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'

function campaignIconName(campaign: Campaign): string {
  const fromConfig = campaign.config?.icon
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'folder'
}

export const ConversationActionsSubmenu = forwardRef<
  HTMLDivElement,
  ConversationActionsSubmenuProps
>(function ConversationActionsSubmenu(
  {
    kind,
    campaignsLoading,
    campaigns,
    currentCampaignId,
    position,
    onMouseEnter,
    onMouseLeave,
    onMoveTo,
    onDuplicateTo,
  },
  ref,
) {
  const sortedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [campaigns],
  )
  const currentCampaign =
    currentCampaignId !== null ? (campaigns.find((c) => c.id === currentCampaignId) ?? null) : null
  const otherCampaigns = sortedCampaigns.filter((c) => c.id !== currentCampaignId)
  const onSelect = kind === 'move' ? onMoveTo : onDuplicateTo

  return (
    <div
      ref={ref}
      data-spaces-conversation-menu
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="z-dropdown rounded-spacing-2 border-border surface-card gap-spacing-1 px-spacing-3 py-spacing-2 fixed flex flex-col overflow-y-auto border shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        width: CONVERSATION_ACTIONS_SUBMENU_WIDTH,
        maxHeight: `calc(100vh - ${position.top + 8}px)`,
      }}
    >
      {campaignsLoading && campaigns.length === 0 ? (
        <p className="body-3 text-muted-foreground/70 px-spacing-2 py-spacing-1">Loading…</p>
      ) : (
        <>
          <CurrentCampaignRow campaign={currentCampaign} />

          {currentCampaignId !== null ? (
            <button type="button" className={SUBMENU_ROW_CLASS} onClick={() => onSelect(null)}>
              <FolderInput className={ITEM_ICON_CLASS} />
              <span className="min-w-0 truncate">No campaign (personal)</span>
            </button>
          ) : null}

          {otherCampaigns.length === 0 ? (
            <p className="body-3 text-muted-foreground/70 px-spacing-2 py-spacing-1">
              No other campaigns
            </p>
          ) : (
            otherCampaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                className={SUBMENU_ROW_CLASS}
                onClick={() => onSelect(campaign.id)}
              >
                <LucideIcon name={campaignIconName(campaign)} className={ITEM_ICON_CLASS} />
                <span className="min-w-0 truncate">{campaign.name || 'Untitled campaign'}</span>
              </button>
            ))
          )}
        </>
      )}
    </div>
  )
})

function CurrentCampaignRow({ campaign }: { campaign: Campaign | null }) {
  return (
    <>
      <div className="gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground px-spacing-2 py-spacing-1 flex w-full cursor-default items-center text-left opacity-70">
        {campaign ? (
          <>
            <LucideIcon name={campaignIconName(campaign)} className={ITEM_ICON_CLASS} />
            <span className="min-w-0 flex-1 truncate">{campaign.name}</span>
          </>
        ) : (
          <>
            <FolderInput className={ITEM_ICON_CLASS} />
            <span className="min-w-0 flex-1 truncate">No campaign (personal)</span>
          </>
        )}
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      </div>
      <div className="border-border border-t" />
    </>
  )
}
