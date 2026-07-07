'use client'

import type { RefObject } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, LayoutGrid, Megaphone } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { Tooltip } from '@/components/ui/tooltip'
import { ReportingTimeRangeSelector } from '@/components/reporting'
import type { Campaign } from '@/lib/campaigns'
import type { ReportingDateRangeInput } from '@/lib/reporting/resolve-reporting-dates'
import { cn } from '@/lib/utils/cn'

export interface TeamDetailToolbarSpaceOption {
  id: string
  title?: string | null
  schema?: {
    icon?: string | null
    icon_color?: string | null
  } | null
}

function campaignGlyph(c: Campaign) {
  const cfg = c.config as Record<string, unknown> | undefined
  const icon = typeof cfg?.icon === 'string' ? cfg.icon : 'folder-kanban'
  const colorId = typeof cfg?.icon_color === 'string' ? cfg.icon_color : 'default'
  const palette = getIconColor(colorId)
  return {
    icon,
    glassClass: palette.glassClass,
    textColor: palette.textColor,
  }
}

function spaceGlyph(s: TeamDetailToolbarSpaceOption) {
  const icon = s.schema?.icon ?? 'layout-grid'
  const colorId = s.schema?.icon_color
  const palette = getIconColor(colorId ?? 'default')
  return {
    icon,
    glassClass: palette.glassClass,
    textColor: palette.textColor,
  }
}

function StackedCampaignIcons({ campaigns }: { campaigns: Campaign[] }) {
  const slice = campaigns.slice(0, 3)
  return (
    <span className="flex -space-x-1.5">
      {slice.map((c) => {
        const g = campaignGlyph(c)
        return (
          <span
            key={c.id}
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-md',
              g.glassClass,
            )}
          >
            <LucideIcon name={g.icon} className={cn('h-2.5 w-2.5', g.textColor)} />
          </span>
        )
      })}
    </span>
  )
}

function StackedSpaceIcons({ spaces }: { spaces: TeamDetailToolbarSpaceOption[] }) {
  const slice = spaces.slice(0, 3)
  return (
    <span className="flex -space-x-1.5">
      {slice.map((s) => {
        const g = spaceGlyph(s)
        return (
          <span
            key={s.id}
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-md ring-1 ring-[var(--background)]',
              g.glassClass,
            )}
          >
            <LucideIcon name={g.icon} className={cn('h-2.5 w-2.5', g.textColor)} />
          </span>
        )
      })}
    </span>
  )
}

export interface TeamDetailToolbarProps {
  rangeConfig: ReportingDateRangeInput
  onRangePatch: (patch: Partial<ReportingDateRangeInput>) => void
  campaigns: Campaign[]
  campaignFilterIds: string[]
  onCampaignFilterIdsChange: (ids: string[]) => void
  spaceOptions: TeamDetailToolbarSpaceOption[]
  spaceFilterIds: string[]
  onSpaceFilterIdsChange: (ids: string[]) => void
  showSpaceFilter?: boolean
  addMembersToolbarOpen: boolean
  onToggleAddMembersToolbar: () => void
  addMembersToolbarRef: RefObject<HTMLButtonElement | null>
}

export function TeamDetailToolbar({
  rangeConfig,
  onRangePatch,
  campaigns,
  campaignFilterIds,
  onCampaignFilterIdsChange,
  spaceOptions,
  spaceFilterIds,
  onSpaceFilterIdsChange,
  showSpaceFilter = true,
  addMembersToolbarOpen,
  onToggleAddMembersToolbar,
  addMembersToolbarRef,
}: TeamDetailToolbarProps) {
  const [campaignMenuOpen, setCampaignMenuOpen] = useState(false)
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false)
  const campaignBtnRef = useRef<HTMLButtonElement>(null)
  const campaignMenuRef = useRef<HTMLDivElement>(null)
  const spaceBtnRef = useRef<HTMLButtonElement>(null)
  const spaceMenuRef = useRef<HTMLDivElement>(null)

  const sortedCampaigns = useMemo(
    () =>
      [...campaigns].sort((a, b) =>
        (a.name?.trim() || 'Untitled').localeCompare(b.name?.trim() || 'Untitled'),
      ),
    [campaigns],
  )

  const selectedCampaigns = useMemo(() => {
    const byId = new Map(sortedCampaigns.map((c) => [c.id, c] as const))
    return campaignFilterIds.map((id) => byId.get(id)).filter((c): c is Campaign => c != null)
  }, [sortedCampaigns, campaignFilterIds])

  const sortedSpaces = useMemo(
    () => [...spaceOptions].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '')),
    [spaceOptions],
  )

  const selectedSpaces = useMemo(() => {
    const byId = new Map(sortedSpaces.map((s) => [s.id, s]))
    return spaceFilterIds
      .map((id) => byId.get(id))
      .filter((s): s is TeamDetailToolbarSpaceOption => s != null)
  }, [sortedSpaces, spaceFilterIds])

  const hasCampaignPick = campaignFilterIds.length > 0
  const hasSpacePick = spaceFilterIds.length > 0

  useEffect(() => {
    if (!campaignMenuOpen && !spaceMenuOpen) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (campaignMenuRef.current?.contains(t) || campaignBtnRef.current?.contains(t)) return
      if (spaceMenuRef.current?.contains(t) || spaceBtnRef.current?.contains(t)) return
      setCampaignMenuOpen(false)
      setSpaceMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCampaignMenuOpen(false)
        setSpaceMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [campaignMenuOpen, spaceMenuOpen])

  function toggleCampaignId(id: string) {
    if (campaignFilterIds.includes(id)) {
      onCampaignFilterIdsChange(campaignFilterIds.filter((x) => x !== id))
    } else {
      onCampaignFilterIdsChange([...campaignFilterIds, id])
    }
  }

  function toggleSpaceId(id: string) {
    if (spaceFilterIds.includes(id)) {
      onSpaceFilterIdsChange(spaceFilterIds.filter((x) => x !== id))
    } else {
      onSpaceFilterIdsChange([...spaceFilterIds, id])
    }
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
      <div className="relative flex shrink-0 items-center gap-1">
        <div
          className={cn(
            'relative shrink-0 transition-[max-width,opacity] duration-200 ease-out',
            hasCampaignPick && showSpaceFilter
              ? 'overflow-visible opacity-100'
              : 'pointer-events-none max-w-0 overflow-hidden opacity-0',
          )}
        >
          <div ref={spaceMenuRef} className="relative shrink-0">
            <Tooltip
              label={
                !hasCampaignPick
                  ? 'Pick campaigns first'
                  : spaceFilterIds.length > 0
                    ? `${spaceFilterIds.length} space${spaceFilterIds.length === 1 ? '' : 's'} selected`
                    : 'Spaces (multi-select)'
              }
              side="bottom"
            >
              <span className="inline-flex shrink-0 items-center">
                <button
                  ref={spaceBtnRef}
                  type="button"
                  onClick={() => {
                    if (!hasCampaignPick) return
                    setCampaignMenuOpen(false)
                    setSpaceMenuOpen((o) => !o)
                  }}
                  disabled={!hasCampaignPick}
                  className={
                    hasSpacePick
                      ? 'badge-glass badge-glass-blue rounded-spacing-2 inline-flex shrink-0 cursor-pointer items-center border-0 px-2 py-1 shadow-none transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40'
                      : 'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground disabled:pointer-events-none disabled:opacity-40'
                  }
                  aria-label="Spaces"
                  aria-haspopup="menu"
                  aria-expanded={spaceMenuOpen}
                >
                  {hasSpacePick ? (
                    <StackedSpaceIcons spaces={selectedSpaces} />
                  ) : (
                    <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              </span>
            </Tooltip>
            {spaceMenuOpen && hasCampaignPick ? (
              <div
                role="menu"
                aria-label="Spaces"
                className="dropdown-menu-solid z-dropdown mt-spacing-1 rounded-spacing-2 p-spacing-2 absolute right-0 top-full max-h-72 min-w-[240px] max-w-[min(100vw-24px,380px)] overflow-y-auto shadow-lg"
              >
                {sortedSpaces.length === 0 ? (
                  <p className="body-4 text-muted-foreground px-spacing-2 py-spacing-1 text-center">
                    No spaces for these campaigns
                  </p>
                ) : (
                  <div className="space-y-spacing-1">
                    {sortedSpaces.map((s) => {
                      const selected = spaceFilterIds.includes(s.id)
                      const g = spaceGlyph(s)
                      const label = s.title?.trim() || 'Untitled space'
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="menuitem"
                          aria-checked={selected}
                          onClick={() => toggleSpaceId(s.id)}
                          className={cn(
                            'gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 hover:bg-hover-subtle hover:text-foreground flex w-full items-center text-left transition-colors',
                            selected ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                              g.glassClass,
                            )}
                          >
                            <LucideIcon name={g.icon} className={cn('h-3 w-3', g.textColor)} />
                          </span>
                          <span
                            className="body-3 min-w-0 flex-1 truncate font-medium"
                            title={label}
                          >
                            {label}
                          </span>
                          <span className="inline-flex shrink-0 justify-end">
                            {selected ? (
                              <Check className="icon-sm text-primary" aria-hidden />
                            ) : null}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div ref={campaignMenuRef} className="relative shrink-0">
          <Tooltip
            label={
              campaignFilterIds.length > 0
                ? `${campaignFilterIds.length} campaign${campaignFilterIds.length === 1 ? '' : 's'} selected`
                : 'Campaigns (multi-select)'
            }
            side="bottom"
          >
            <span className="inline-flex shrink-0 items-center">
              <button
                ref={campaignBtnRef}
                type="button"
                onClick={() => {
                  setSpaceMenuOpen(false)
                  setCampaignMenuOpen((o) => !o)
                }}
                className={
                  hasCampaignPick
                    ? 'badge-glass badge-glass-blue rounded-spacing-2 inline-flex shrink-0 cursor-pointer items-center border-0 px-2 py-1 shadow-none transition-opacity hover:opacity-90'
                    : 'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover-subtle hover:text-foreground'
                }
                aria-label="Campaigns"
                aria-haspopup="menu"
                aria-expanded={campaignMenuOpen}
              >
                {hasCampaignPick ? (
                  <StackedCampaignIcons campaigns={selectedCampaigns} />
                ) : (
                  <Megaphone className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            </span>
          </Tooltip>
          {campaignMenuOpen ? (
            <div
              role="menu"
              aria-label="Campaigns"
              className="dropdown-menu-solid z-dropdown mt-spacing-1 rounded-spacing-2 p-spacing-2 absolute right-0 top-full max-h-72 min-w-[240px] max-w-[min(100vw-24px,380px)] overflow-y-auto shadow-lg"
            >
              <div className="space-y-spacing-1">
                {sortedCampaigns.map((c) => {
                  const selected = campaignFilterIds.includes(c.id)
                  const g = campaignGlyph(c)
                  const label = c.name?.trim() || 'Untitled campaign'
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="menuitem"
                      aria-checked={selected}
                      onClick={() => toggleCampaignId(c.id)}
                      className={cn(
                        'gap-spacing-2 px-spacing-2 py-spacing-1 rounded-spacing-1 body-3 hover:bg-hover-subtle hover:text-foreground flex w-full items-center text-left transition-colors',
                        selected ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                          g.glassClass,
                        )}
                      >
                        <LucideIcon name={g.icon} className={cn('h-3 w-3', g.textColor)} />
                      </span>
                      <span className="body-3 min-w-0 flex-1 truncate font-medium" title={label}>
                        {label}
                      </span>
                      <span className="inline-flex shrink-0 justify-end">
                        {selected ? <Check className="icon-sm text-primary" aria-hidden /> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <ReportingTimeRangeSelector
          config={rangeConfig}
          onConfigPatch={onRangePatch}
          variant="badge"
        />
      </div>

      <Tooltip label="Add people or agents to this team" side="bottom">
        <button
          ref={addMembersToolbarRef}
          type="button"
          onClick={onToggleAddMembersToolbar}
          className="badge-glass badge-glass-green body-3 inline-flex h-7 shrink-0 items-center rounded-full px-3 font-semibold transition-opacity hover:opacity-90"
          aria-haspopup="menu"
          aria-expanded={addMembersToolbarOpen}
        >
          Add members
        </button>
      </Tooltip>
    </div>
  )
}
