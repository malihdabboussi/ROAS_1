'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import {
  filterFlowSpacePickerGroups,
  groupFlowSpacesByCampaign,
} from '@/lib/flows/flow-space-picker.utils'
import { cn } from '@/lib/utils/cn'
import type { FlowSpaceNavItem } from '../../types/flow-space.types'

function SpaceRowIcon({ space }: { space: FlowSpaceNavItem }) {
  const iconName = space.schema?.icon ?? 'layout-grid'
  const color = getIconColor(space.schema?.icon_color)
  return <LucideIcon name={iconName} className={cn('icon-sm shrink-0', color.textColor)} />
}

export function FlowsSpaceBreadcrumbDropdown({
  spaces,
  selectedSpaceId,
  onSelectSpace,
}: {
  spaces: FlowSpaceNavItem[]
  selectedSpaceId: string | null
  onSelectSpace: (spaceId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [expandedCampaignIds, setExpandedCampaignIds] = useState<Set<string>>(() => new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [selectedSpaceId, spaces],
  )

  useEffect(() => {
    void fetchCampaigns()
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
  }, [])

  const groupedSpaces = useMemo(
    () => groupFlowSpacesByCampaign(spaces, campaigns),
    [campaigns, spaces],
  )

  const searchActive = searchQuery.trim().length > 0

  const visibleGroups = useMemo(
    () => filterFlowSpacePickerGroups(groupedSpaces, searchQuery),
    [groupedSpaces, searchQuery],
  )

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      return
    }
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open || !selectedSpace?.campaign_id) return
    setExpandedCampaignIds((prev) => {
      const next = new Set(prev)
      next.add(selectedSpace.campaign_id!)
      return next
    })
  }, [open, selectedSpace?.campaign_id])

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaignIds((prev) => {
      const next = new Set(prev)
      if (next.has(campaignId)) next.delete(campaignId)
      else next.add(campaignId)
      return next
    })
  }

  const isCampaignExpanded = (campaignId: string) =>
    searchActive || expandedCampaignIds.has(campaignId)

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-w-0 max-w-[220px] items-center gap-1 font-medium text-[var(--foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <span className="truncate">{selectedSpace?.title ?? 'Select space'}</span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="dropdown-menu-solid z-dropdown rounded-spacing-2 absolute left-0 top-full mt-1 flex max-h-80 min-w-64 max-w-[min(100vw-2rem,320px)] flex-col overflow-hidden">
          <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center border-b">
            <Search className="icon-sm text-muted-foreground shrink-0" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search campaigns & spaces…"
              aria-label="Search spaces"
              className="body-3 text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="icon-xs" />
              </button>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-spacing-1 py-spacing-2">
            {groupedSpaces.length === 0 ? (
              <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 text-center">
                No spaces yet
              </p>
            ) : visibleGroups.length === 0 ? (
              <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 text-center">
                No matching spaces
              </p>
            ) : (
              visibleGroups.map((group) => {
                const expanded = isCampaignExpanded(group.id)
                const iconName = group.campaignIcon ?? 'layout-grid'
                const iconColor = getIconColor(group.campaignIconColor)
                return (
                  <div key={group.id} className="px-spacing-1">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => toggleCampaign(group.id)}
                      className="body-4 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center font-medium transition-colors"
                    >
                      <ChevronRight
                        className={cn(
                          'icon-xs shrink-0 transition-transform duration-150',
                          expanded && 'rotate-90',
                        )}
                      />
                      <LucideIcon
                        name={iconName}
                        className={cn('icon-xs shrink-0', iconColor.textColor)}
                      />
                      <span className="min-w-0 flex-1 truncate text-left">{group.heading}</span>
                      <span className="typo-caption tabular-nums">{group.spaces.length}</span>
                    </button>
                    {expanded ? (
                      <div className="border-border ml-spacing-2 pl-spacing-2 flex flex-col border-l">
                        {group.spaces.map((space) => {
                          const selected = space.id === selectedSpaceId
                          return (
                            <button
                              key={space.id}
                              type="button"
                              onClick={() => {
                                onSelectSpace(space.id)
                                setOpen(false)
                              }}
                              className={cn(
                                'body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors',
                                selected && 'nav-glass-selected-purple',
                              )}
                            >
                              <SpaceRowIcon space={space} />
                              <span className="min-w-0 flex-1 truncate font-medium">
                                {space.title ?? 'Untitled'}
                              </span>
                              {selected ? <Check className="icon-xs text-primary shrink-0" /> : null}
                            </button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
