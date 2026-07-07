'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import type { Campaign } from '@/lib/campaigns/campaign-api'
import { cn } from '@/lib/utils/cn'
import type { Space } from '../../types'
import type { SwitcherTree } from '../header/SpaceSwitcherDropdown'

function campaignIconName(c: Campaign): string {
  const fromConfig = c.config?.icon
  return typeof fromConfig === 'string' && fromConfig.length > 0 ? fromConfig : 'folder'
}

function campaignIconColor(c: Campaign) {
  const raw = (c.config as Record<string, unknown> | undefined)?.icon_color
  return typeof raw === 'string' ? getIconColor(raw) : getIconColor(undefined)
}

function SpaceRowIcon({ space }: { space: Space }) {
  const iconName = space.schema?.icon ?? 'layout-grid'
  const color = getIconColor(space.schema?.icon_color)
  return <LucideIcon name={iconName} className={cn('icon-sm shrink-0', color.textColor)} />
}

export function AutomationsScopeDropdown({
  activeSpace,
  switcherTree,
  onSelectSpace,
}: {
  activeSpace: Space
  switcherTree: SwitcherTree
  onSelectSpace: (spaceId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(() => new Set())
  const rootRef = useRef<HTMLDivElement>(null)

  const searchTrim = query.trim().toLowerCase()

  const filteredTree = useMemo(() => {
    if (!searchTrim) {
      return {
        campaignEntries: [...switcherTree.byCampaign.entries()] as Array<
          [string, { campaign: Campaign; spaces: Space[] }]
        >,
      }
    }
    const campaignEntries = [...switcherTree.byCampaign.entries()]
      .map(([id, { campaign, spaces: cSpaces }]) => {
        const campaignHits = campaign.name.toLowerCase().includes(searchTrim)
        const spaces = campaignHits
          ? cSpaces
          : cSpaces.filter((sp) => sp.title.toLowerCase().includes(searchTrim))
        return [id, { campaign, spaces }] as [string, { campaign: Campaign; spaces: Space[] }]
      })
      .filter(([_, bundle]) => bundle.spaces.length > 0)

    return { campaignEntries }
  }, [query, switcherTree])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return
    setExpandedSectionIds((prev) => {
      const next = new Set(prev)
      if (activeSpace.campaign_id && switcherTree.byCampaign.has(activeSpace.campaign_id)) {
        next.add(activeSpace.campaign_id)
      }
      return next
    })
  }, [open, activeSpace.campaign_id, switcherTree.byCampaign])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [open])

  const hasAny = filteredTree.campaignEntries.length > 0

  const toggleSection = (sectionId: string) => {
    setExpandedSectionIds((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const isSectionExpanded = (sectionId: string) =>
    searchTrim.length > 0 || expandedSectionIds.has(sectionId)

  return (
    <div ref={rootRef} className="relative min-w-0 justify-self-start">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-hover-subtle body-3 text-foreground gap-spacing-2 px-spacing-2 py-spacing-2 flex min-w-0 max-w-full items-center rounded-lg transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <SpaceRowIcon space={activeSpace} />
        <span className="min-w-0 max-w-[200px] truncate text-left font-medium">
          {activeSpace.title ?? 'Space'}
        </span>
        <ChevronDown
          className={cn(
            'icon-sm text-muted-foreground shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          className="dropdown-menu-solid border-border z-dropdown mt-spacing-1 absolute left-0 top-full flex max-h-80 min-w-64 max-w-[min(100vw-2rem,320px)] flex-col overflow-hidden rounded-xl border shadow-lg"
          role="listbox"
        >
          <div className="border-border gap-spacing-2 px-spacing-4 py-spacing-3 flex shrink-0 items-center border-b">
            <Search className="icon-sm text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search personal, campaigns & spaces..."
              className="body-3 text-foreground placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent outline-none"
              aria-label="Search spaces"
              autoFocus
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="icon-xs" />
              </button>
            ) : null}
          </div>
          <div className="px-spacing-4 py-spacing-3 min-h-0 flex-1 overflow-y-auto">
            {!hasAny ? (
              <p className="body-3 text-muted-foreground py-spacing-2 text-center">
                {switcherTree.byCampaign.size === 0 ? 'No spaces yet' : 'No matches'}
              </p>
            ) : null}

            {filteredTree.campaignEntries.map(([cId, { campaign, spaces: cSpaces }]) => {
              const expanded = isSectionExpanded(cId)
              const cIcon = campaignIconName(campaign)
              const cColor = campaignIconColor(campaign)
              return (
                <div key={cId} className="mb-spacing-2">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`automations-scope-campaign-${cId}`}
                    id={`automations-scope-campaign-trigger-${cId}`}
                    onClick={() => toggleSection(cId)}
                    className="body-3 text-muted-foreground hover:bg-hover-subtle hover:text-foreground gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-2 flex w-full min-w-0 items-center font-semibold transition-colors"
                  >
                    <span className="text-muted-foreground flex h-4 w-4 shrink-0 items-center justify-center">
                      <ChevronRight
                        className={cn(
                          'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
                          expanded && 'rotate-90',
                        )}
                      />
                    </span>
                    <LucideIcon
                      name={cIcon}
                      className={cn('h-3.5 w-3.5 shrink-0', cColor.textColor)}
                    />
                    <span className="min-w-0 flex-1 truncate text-left">{campaign.name}</span>
                  </button>
                  {expanded ? (
                    <div
                      id={`automations-scope-campaign-${cId}`}
                      role="group"
                      aria-labelledby={`automations-scope-campaign-trigger-${cId}`}
                      className="border-border mt-spacing-2 ml-spacing-1 pl-spacing-2 flex flex-col border-l"
                    >
                      {cSpaces.map((sp) => (
                        <button
                          key={sp.id}
                          type="button"
                          role="option"
                          aria-selected={sp.id === activeSpace.id}
                          onClick={() => {
                            onSelectSpace(sp.id)
                            setOpen(false)
                          }}
                          className={cn(
                            'hover:bg-hover-subtle body-3 gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full min-w-0 items-center text-left transition-colors',
                            sp.id === activeSpace.id && 'nav-glass-selected-purple',
                          )}
                        >
                          <SpaceRowIcon space={sp} />
                          <span className="min-w-0 flex-1 truncate">{sp.title}</span>
                          {sp.id === activeSpace.id ? (
                            <Check className="icon-sm text-primary shrink-0" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
