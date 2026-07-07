'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, ChevronRight, Search, Workflow, X } from 'lucide-react'
import { getIconColor, LucideIcon } from '@/components/ui/IconPicker'
import { fetchCampaigns, type Campaign } from '@/lib/campaigns/campaign-api'
import {
  filterFlowSpacePickerGroups,
  groupFlowSpacesByCampaign,
} from '@/lib/flows/flow-space-picker.utils'
import { FLOWS_UI } from '@/lib/flows/flows-ui-labels'
import { VIBEY_SPACE_FLOATING_CONTROL } from '@/lib/ui/floating-control-attrs'
import { cn } from '@/lib/utils/cn'
import type { FlowSpaceNavItem } from '../types/flow-space.types'

type FlowComposerSpaceSelectorProps = {
  spaces: FlowSpaceNavItem[]
  selectedSpaceId: string | null
  onSelectSpace: (spaceId: string) => void
  createAnythingMode?: boolean
  onSelectCreateAnything?: () => void
  conceptSpaceLoading?: boolean
}

type SpaceGroup = {
  id: string
  title: string
  iconName: string
  iconColor: ReturnType<typeof getIconColor>
  spaces: FlowSpaceNavItem[]
}

function SpaceRowIcon({ space }: { space: FlowSpaceNavItem }) {
  const iconName = space.schema?.icon ?? 'layout-grid'
  const color = getIconColor(space.schema?.icon_color)
  return <LucideIcon name={iconName} className={cn('icon-sm shrink-0', color.textColor)} />
}

function SpaceGroupSection({
  group,
  expanded,
  selectedSpaceId,
  onToggle,
  onSelectSpace,
}: {
  group: SpaceGroup
  expanded: boolean
  selectedSpaceId: string | null
  onToggle: () => void
  onSelectSpace: (spaceId: string) => void
}) {
  return (
    <div className="py-spacing-1">
      <button
        type="button"
        onClick={onToggle}
        className="typo-xs text-muted-foreground hover:bg-hover-subtle gap-spacing-1 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center font-medium tracking-wide transition-colors"
      >
        <ChevronRight
          className={cn(
            'icon-xs shrink-0 transition-transform duration-150',
            expanded && 'rotate-90',
          )}
        />
        <LucideIcon
          name={group.iconName}
          className={cn('icon-xs shrink-0', group.iconColor.textColor)}
        />
        <span className="min-w-0 flex-1 truncate text-left">{group.title}</span>
        <span className="tabular-nums">{group.spaces.length}</span>
      </button>
      {expanded ? (
        <div className="border-border ml-spacing-3-5 pl-spacing-2 flex flex-col border-l">
          {group.spaces.map((space) => {
            const selected = space.id === selectedSpaceId
            return (
              <button
                key={space.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelectSpace(space.id)}
                className={cn(
                  'body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors',
                  selected && 'nav-glass-selected-purple',
                )}
              >
                <SpaceRowIcon space={space} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {space.title ?? 'Untitled space'}
                </span>
                {selected ? <Check className="icon-xs text-primary shrink-0" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function FlowComposerSpaceSelector({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  createAnythingMode = false,
  onSelectCreateAnything,
  conceptSpaceLoading = false,
}: FlowComposerSpaceSelectorProps) {
  const [open, setOpen] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [panelPos, setPanelPos] = useState<{ bottom: number; left: number } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
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

  const groupedSpaces = useMemo((): SpaceGroup[] => {
    return groupFlowSpacesByCampaign(spaces, campaigns).map((group) => ({
      id: group.id,
      title: group.heading,
      iconName: group.campaignIcon ?? 'layout-grid',
      iconColor: getIconColor(group.campaignIconColor),
      spaces: group.spaces,
    }))
  }, [campaigns, spaces])

  const searchActive = searchQuery.trim().length > 0

  const filteredGroupedSpaces = useMemo((): SpaceGroup[] => {
    const rawGroups = groupFlowSpacesByCampaign(spaces, campaigns)
    const filtered = filterFlowSpacePickerGroups(rawGroups, searchQuery)
    return filtered.map((group) => ({
      id: group.id,
      title: group.heading,
      iconName: group.campaignIcon ?? 'layout-grid',
      iconColor: getIconColor(group.campaignIconColor),
      spaces: group.spaces,
    }))
  }, [campaigns, searchQuery, spaces])

  const reposition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelWidth = 288
    const gap = 6
    const padding = 8
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : panelWidth
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0
    let left = rect.left
    if (left + panelWidth > viewportWidth - padding) {
      left = Math.max(padding, viewportWidth - panelWidth - padding)
    }
    setPanelPos({ bottom: viewportHeight - rect.top + gap, left })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      return
    }
    setCollapsedGroupIds(new Set())
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown, true)
    document.addEventListener('keydown', onDocKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown, true)
      document.removeEventListener('keydown', onDocKeyDown)
    }
  }, [open])

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const handleSelectSpace = (spaceId: string) => {
    onSelectSpace(spaceId)
    setOpen(false)
  }

  const handleSelectCreateAnything = () => {
    onSelectCreateAnything?.()
    setOpen(false)
  }

  const triggerIcon = createAnythingMode ? (
    <Workflow className="icon-sm text-primary shrink-0" />
  ) : selectedSpace ? (
    <SpaceRowIcon space={selectedSpace} />
  ) : (
    <LucideIcon name="layout-grid" className="icon-sm text-primary shrink-0" />
  )

  const triggerLabel = createAnythingMode
    ? FLOWS_UI.createAnythingLabel
    : (selectedSpace?.title ?? FLOWS_UI.createAnythingLabel)

  return (
    <div ref={rootRef} className="relative inline-flex max-w-full">
      <button
        ref={triggerRef}
        type="button"
        aria-label={
          createAnythingMode
            ? `Loop scope: ${FLOWS_UI.createAnythingLabel}`
            : selectedSpace
              ? `Loop space: ${selectedSpace.title}`
              : `Loop scope: ${FLOWS_UI.createAnythingLabel}`
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={conceptSpaceLoading}
        onClick={() => {
          setOpen((value) => !value)
        }}
        className={cn(
          'hover:bg-hover-subtle gap-spacing-1 rounded-spacing-2 px-spacing-1 py-spacing-0-5 inline-flex min-w-0 max-w-full items-center transition-colors',
          conceptSpaceLoading && 'opacity-60',
        )}
      >
        {triggerIcon}
        <span className="typo-caption text-muted-foreground min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown
          className={cn(
            'icon-sm text-muted-foreground shrink-0 transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && panelPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              {...{ [VIBEY_SPACE_FLOATING_CONTROL]: '' }}
              role="listbox"
              aria-label="Loop spaces"
              className="dropdown-menu-solid z-dropdown fixed flex max-h-72 w-72 flex-col overflow-hidden rounded-xl"
              style={{ bottom: panelPos.bottom, left: panelPos.left }}
            >
              <div className="border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex shrink-0 items-center border-b">
                <Search className="icon-sm text-muted-foreground shrink-0" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search spaces..."
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
              <div className="px-spacing-1 py-spacing-2 min-h-0 flex-1 overflow-y-auto">
                {onSelectCreateAnything ? (
                  <>
                    <button
                      type="button"
                      role="option"
                      aria-selected={createAnythingMode}
                      onClick={handleSelectCreateAnything}
                      className={cn(
                        'body-3 text-foreground hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 px-spacing-2 py-spacing-1-5 mb-spacing-1 flex w-full items-start text-left transition-colors',
                        createAnythingMode && 'nav-glass-selected-purple',
                      )}
                    >
                      <Workflow className="icon-sm text-primary mt-spacing-0-5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{FLOWS_UI.createAnythingLabel}</span>
                        <span className="body-4 text-muted-foreground block">
                          {FLOWS_UI.createAnythingTooltip}
                        </span>
                      </span>
                      {createAnythingMode ? (
                        <Check className="icon-xs text-primary shrink-0" />
                      ) : null}
                    </button>
                    <div className="border-border mx-spacing-2 mb-spacing-1 border-b" />
                  </>
                ) : null}
                {groupedSpaces.length === 0 ? (
                  <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 text-center">
                    No spaces yet
                  </p>
                ) : filteredGroupedSpaces.length === 0 ? (
                  <p className="body-4 text-muted-foreground px-spacing-3 py-spacing-2 text-center">
                    No matching spaces
                  </p>
                ) : (
                  filteredGroupedSpaces.map((group) => (
                    <SpaceGroupSection
                      key={group.id}
                      group={group}
                      expanded={searchActive || !collapsedGroupIds.has(group.id)}
                      selectedSpaceId={createAnythingMode ? null : selectedSpaceId}
                      onToggle={() => toggleGroup(group.id)}
                      onSelectSpace={handleSelectSpace}
                    />
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
