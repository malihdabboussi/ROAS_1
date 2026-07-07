'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Globe, Lock } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import { cn } from '@/lib/utils/cn'
import type {
  OtherSpacesCampaignGroup,
  WritableSpaceOption,
} from '../lib/group-other-spaces-by-campaign'

function campaignIconName(c: Campaign): string {
  const fromConfig = c.config?.icon
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'folder'
}

function campaignIconColor(c: Campaign) {
  const raw = (c.config as Record<string, unknown> | undefined)?.icon_color
  return typeof raw === 'string' ? getIconColor(raw) : getIconColor(undefined)
}

export function OtherSpacesSubmenuList({
  groups,
  sourceCampaignId,
  menuOpen,
  onPick,
  rowClassName,
  iconClassName = 'h-3.5 w-3.5 shrink-0',
  emptyMessage = 'No other writable spaces',
}: {
  groups: OtherSpacesCampaignGroup[]
  sourceCampaignId?: string | null
  /** When true, expands the source campaign (or first group) — call when the flyout opens. */
  menuOpen: boolean
  onPick: (spaceId: string) => void
  rowClassName: string
  iconClassName?: string
  emptyMessage?: string
}) {
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!menuOpen) return
    const initial = new Set<string>()
    if (sourceCampaignId && groups.some((g) => g.campaign.id === sourceCampaignId)) {
      initial.add(sourceCampaignId)
    } else if (groups[0]) {
      initial.add(groups[0].campaign.id)
    }
    setExpandedCampaignIds(initial)
  }, [menuOpen, sourceCampaignId, groups])

  if (groups.length === 0) {
    return (
      <p className="px-spacing-2 py-spacing-1 body-3 text-muted-foreground/70">{emptyMessage}</p>
    )
  }

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaignIds((prev) => {
      const next = new Set(prev)
      if (next.has(campaignId)) next.delete(campaignId)
      else next.add(campaignId)
      return next
    })
  }

  return (
    <>
      {groups.map(({ campaign, spaces: campaignSpaces }) => {
        const expanded = expandedCampaignIds.has(campaign.id)
        const cIcon = campaignIconName(campaign)
        const cColor = campaignIconColor(campaign)
        return (
          <div key={campaign.id} className="mb-spacing-1">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => toggleCampaign(campaign.id)}
              className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center font-semibold transition-colors"
            >
              <ChevronRight
                className={cn(
                  'h-3 w-3 shrink-0 transition-transform duration-150',
                  expanded && 'rotate-90',
                )}
                aria-hidden
              />
              <LucideIcon name={cIcon} className={cn(iconClassName, cColor.textColor)} />
              <span className="min-w-0 flex-1 truncate text-left">{campaign.name}</span>
              <span className="typo-caption text-muted-foreground shrink-0">
                {campaignSpaces.length}
              </span>
            </button>
            {expanded ? (
              <div className="border-border mt-spacing-1 ml-spacing-1 pl-spacing-2 flex flex-col border-l">
                {campaignSpaces.map((sp) => (
                  <SpacePickRow
                    key={sp.id}
                    space={sp}
                    rowClassName={rowClassName}
                    iconClassName={iconClassName}
                    onPick={onPick}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

function SpacePickRow({
  space,
  rowClassName,
  iconClassName,
  onPick,
}: {
  space: WritableSpaceOption
  rowClassName: string
  iconClassName: string
  onPick: (spaceId: string) => void
}) {
  const VisIcon = space.visibility === 'team' ? Globe : Lock
  return (
    <button type="button" onClick={() => onPick(space.id)} className={rowClassName}>
      <VisIcon className={iconClassName} aria-hidden />
      <span className="min-w-0 truncate">{space.title}</span>
    </button>
  )
}
