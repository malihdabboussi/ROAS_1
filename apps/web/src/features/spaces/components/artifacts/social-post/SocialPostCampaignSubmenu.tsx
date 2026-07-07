'use client'

import { Check } from 'lucide-react'
import { LucideIcon } from '@/components/ui/IconPicker'

export const SOCIAL_POST_CAMPAIGN_SUBMENU_WIDTH = 224

export type SocialPostCampaignSubmenuKind = 'move' | 'copy'

interface SocialPostCampaignOption {
  id: string
  name: string
  config?: Record<string, unknown> | null
}

interface SocialPostCampaignSubmenuProps {
  currentCampaign?: SocialPostCampaignOption
  kind: SocialPostCampaignSubmenuKind
  otherCampaigns: SocialPostCampaignOption[]
  position: { top: number; left: number }
  onClose: () => void
  onCopyToCampaign: (campaignId: string) => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onMoveToCampaign: (campaignId: string) => void
}

function campaignIconName(campaign: { config?: Record<string, unknown> | null }): string {
  const fromConfig = (campaign.config as Record<string, unknown> | undefined)?.icon
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'folder'
}

export function SocialPostCampaignSubmenu({
  currentCampaign,
  kind,
  otherCampaigns,
  position,
  onClose,
  onCopyToCampaign,
  onMouseEnter,
  onMouseLeave,
  onMoveToCampaign,
}: SocialPostCampaignSubmenuProps) {
  const submenuRowCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'

  return (
    <div
      data-social-post-menu
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="z-dropdown rounded-spacing-2 border-border surface-card py-spacing-2 px-spacing-3 flex flex-col gap-spacing-1 fixed overflow-y-auto border shadow-lg"
      style={{
        top: position.top,
        left: position.left,
        width: SOCIAL_POST_CAMPAIGN_SUBMENU_WIDTH,
        maxHeight: `calc(100vh - ${position.top + 8}px)`,
      }}
    >
      {currentCampaign ? (
        <>
          <button
            type="button"
            disabled
            className="gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground px-spacing-2 py-spacing-1 flex w-full cursor-default items-center text-left opacity-70"
          >
            <LucideIcon
              name={campaignIconName(currentCampaign)}
              className="h-3.5 w-3.5 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate">{currentCampaign.name}</span>
            <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          </button>
          <div className="border-border border-t" />
        </>
      ) : null}
      {otherCampaigns.length === 0 ? (
        <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground/70">
          No other campaigns
        </p>
      ) : (
        otherCampaigns.map((campaign) => (
          <button
            key={campaign.id}
            type="button"
            onClick={() => {
              if (kind === 'move') onMoveToCampaign(campaign.id)
              else onCopyToCampaign(campaign.id)
              onClose()
            }}
            className={submenuRowCls}
          >
            <LucideIcon name={campaignIconName(campaign)} className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 truncate">{campaign.name}</span>
          </button>
        ))
      )}
    </div>
  )
}
