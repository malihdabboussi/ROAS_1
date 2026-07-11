'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronRight, Grid } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ChatInputPlusMenuSpacePickerConfig } from './chat-input-plus-menu-space.types'

export function ChatInputPlusMenuSpacePanel({
  spacePicker,
  onCloseMenu,
}: {
  spacePicker: ChatInputPlusMenuSpacePickerConfig
  onCloseMenu: () => void
}) {
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)

  useEffect(() => {
    const activeCampaignId =
      spacePicker.groups.find((group) =>
        group.spaces.some((space) => space.id === spacePicker.selectedSpaceId),
      )?.campaignId ??
      spacePicker.groups[0]?.campaignId ??
      null
    setExpandedCampaignId(activeCampaignId)
  }, [spacePicker.groups, spacePicker.selectedSpaceId])

  return (
    <>
      <p className="body-4 text-muted-foreground px-spacing-3 pb-spacing-1 pt-spacing-2 font-medium uppercase tracking-wide">
        Choose a space
      </p>
      {!spacePicker.isOrgOnly ? (
        <button
          type="button"
          onClick={() => {
            spacePicker.onSelect(null)
            onCloseMenu()
          }}
          className={cn(
            'body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors',
            spacePicker.selectedSpaceId === null && 'bg-primary/10',
          )}
        >
          <Grid className="icon-sm text-muted-foreground shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            {spacePicker.defaultSpaceTitle ?? 'New Workspace'}
          </span>
          {spacePicker.selectedSpaceId === null ? <Check className="icon-sm shrink-0" /> : null}
        </button>
      ) : null}
      {spacePicker.groups.map((group) => {
        const expanded = expandedCampaignId === group.campaignId
        return (
          <div key={group.campaignId}>
            <button
              type="button"
              onClick={() =>
                setExpandedCampaignId((prev) =>
                  prev === group.campaignId ? null : group.campaignId,
                )
              }
              className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 gap-spacing-2 flex w-full items-center text-left transition-colors"
            >
              <ChevronRight
                className={cn(
                  'icon-xs text-muted-foreground shrink-0 transition-transform',
                  expanded && 'rotate-90',
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium">{group.campaignName}</span>
              <span className="body-4 text-muted-foreground shrink-0">{group.spaces.length}</span>
            </button>
            {expanded
              ? group.spaces.map((space) => {
                  const isSelected = spacePicker.selectedSpaceId === space.id
                  return (
                    <button
                      key={space.id}
                      type="button"
                      onClick={() => {
                        spacePicker.onSelect(space.id)
                        onCloseMenu()
                      }}
                      className={cn(
                        'body-3 text-foreground hover:bg-hover-subtle py-spacing-2 gap-spacing-2 pl-spacing-8 pr-spacing-3 flex w-full items-center text-left transition-colors',
                        isSelected && 'bg-primary/10',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{space.title}</span>
                      {isSelected ? <Check className="icon-sm shrink-0" /> : null}
                    </button>
                  )
                })
              : null}
          </div>
        )
      })}
    </>
  )
}
