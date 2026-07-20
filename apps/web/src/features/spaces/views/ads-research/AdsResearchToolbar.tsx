'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDownUp, Check, Layers, LayoutGrid, List, RefreshCw, Trash2 } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import { SaveViewSlot } from '../_shared/SaveViewSeparator'
import { ToolbarShell } from '../_shared/ToolbarShell'
import {
  ADS_RESEARCH_GROUP_BY_OPTIONS,
  ADS_RESEARCH_SORT_OPTIONS,
  getAdsResearchConfig,
} from '../../lib/ads-research-group-by'
import { useAdsResearchToolbarBridgeStore } from '../../store/use-ads-research-toolbar-bridge'
import type { AdsResearchConfig } from '../../types/space-schema'
import type { SpaceToolbarContext } from '../types'

/**
 * Toolbar for the Ads Research view: group-by, grid/list layout, and sort —
 * same controls the social research toolbar exposes, persisted on
 * `ads_research_config`. Search lives inside the view panel; refresh sits here when a saved search is open.
 */
export function AdsResearchToolbar({ ctx }: { ctx: SpaceToolbarContext }) {
  const { activeView, handleViewPatch } = ctx
  const adsBridge = useAdsResearchToolbarBridgeStore((s) => s.bridge)
  const surface = useAdsResearchToolbarBridgeStore((s) => s.surface)
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false)
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const groupMenuRef = useRef<HTMLDivElement | null>(null)
  const layoutMenuRef = useRef<HTMLDivElement | null>(null)
  const sortMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!groupMenuOpen && !layoutMenuOpen && !sortMenuOpen) return
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node
      if (groupMenuOpen && !groupMenuRef.current?.contains(t)) setGroupMenuOpen(false)
      if (layoutMenuOpen && !layoutMenuRef.current?.contains(t)) setLayoutMenuOpen(false)
      if (sortMenuOpen && !sortMenuRef.current?.contains(t)) setSortMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside, true)
    return () => document.removeEventListener('mousedown', handleOutside, true)
  }, [groupMenuOpen, layoutMenuOpen, sortMenuOpen])

  if (!activeView || surface === 'runs') {
    return (
      <ToolbarShell ctx={ctx}>
        <div className="flex min-w-0 flex-nowrap items-center gap-1" />
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1" />
      </ToolbarShell>
    )
  }

  const config = getAdsResearchConfig(activeView)
  const patchConfig = (patch: Partial<AdsResearchConfig>) =>
    void handleViewPatch({ ads_research_config: { ...activeView.ads_research_config, ...patch } })

  const groupByLabel = config.group_by
    ? (ADS_RESEARCH_GROUP_BY_OPTIONS.find((o) => o.id === config.group_by)?.label ??
      config.group_by)
    : null
  const sortBy = config.sort_by ?? 'days_running'
  const sortDir = config.sort_dir ?? 'desc'
  const isListMode = (config.display_mode ?? 'grid') === 'list'

  return (
    <ToolbarShell ctx={ctx}>
      <div className="flex min-w-0 flex-nowrap items-center gap-1">
        {/* Group by */}
        <div ref={groupMenuRef} className="relative shrink-0">
          <Tooltip label="Group by" side="bottom">
            <span className="inline-flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => {
                  setGroupMenuOpen((o) => !o)
                  setLayoutMenuOpen(false)
                  setSortMenuOpen(false)
                }}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors ${
                  groupByLabel
                    ? 'badge-glass-purple'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                }`}
              >
                <Layers className="h-3 w-3" />
                {groupByLabel ?? 'Group by'}
              </button>
            </span>
          </Tooltip>
          {groupMenuOpen ? (
            <div className="dropdown-menu-solid absolute left-0 top-full z-50 mt-1 w-44 rounded-xl py-1 shadow-lg">
              {ADS_RESEARCH_GROUP_BY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    patchConfig({ group_by: option.id })
                    setGroupMenuOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="text-[var(--foreground)]">{option.label}</span>
                  {config.group_by === option.id ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))}
              {config.group_by ? (
                <>
                  <div className="my-1 border-t border-[var(--border)]" />
                  <button
                    type="button"
                    onClick={() => {
                      patchConfig({ group_by: undefined })
                      setGroupMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove grouping
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Layout: grid / list */}
        <div ref={layoutMenuRef} className="relative shrink-0">
          <Tooltip label="Layout" side="bottom">
            <span className="inline-flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => {
                  setLayoutMenuOpen((o) => !o)
                  setGroupMenuOpen(false)
                  setSortMenuOpen(false)
                }}
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                  layoutMenuOpen
                    ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                }`}
                aria-label="Layout"
              >
                {isListMode ? (
                  <List className="h-3.5 w-3.5" />
                ) : (
                  <LayoutGrid className="h-3.5 w-3.5" />
                )}
              </button>
            </span>
          </Tooltip>
          {layoutMenuOpen ? (
            <div className="dropdown-menu-solid absolute left-0 top-full z-50 mt-1 w-40 rounded-xl py-1 shadow-lg">
              {(
                [
                  { id: 'grid', label: 'Grid', icon: LayoutGrid },
                  { id: 'list', label: 'List', icon: List },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    patchConfig({ display_mode: id })
                    setLayoutMenuOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="flex items-center gap-2 text-[var(--foreground)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
                    {label}
                  </span>
                  {(config.display_mode ?? 'grid') === id ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        <SaveViewSlot ctx={ctx} />
        {/* Sort */}
        <div ref={sortMenuRef} className="relative shrink-0">
          <Tooltip label="Sort" side="bottom">
            <span className="inline-flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => {
                  setSortMenuOpen((o) => !o)
                  setGroupMenuOpen(false)
                  setLayoutMenuOpen(false)
                }}
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                  sortMenuOpen
                    ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                    : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
                }`}
                aria-label="Sort"
              >
                <ArrowDownUp className="h-3.5 w-3.5" />
              </button>
            </span>
          </Tooltip>
          {sortMenuOpen ? (
            <div className="dropdown-menu-solid absolute right-0 top-full z-50 mt-1 w-44 rounded-xl py-1 shadow-lg">
              {ADS_RESEARCH_SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    patchConfig({ sort_by: option.id })
                    setSortMenuOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="text-[var(--foreground)]">{option.label}</span>
                  {sortBy === option.id ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))}
              <div className="my-1 border-t border-[var(--border)]" />
              {(
                [
                  { id: 'desc', label: 'Descending' },
                  { id: 'asc', label: 'Ascending' },
                ] as const
              ).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    patchConfig({ sort_dir: id })
                    setSortMenuOpen(false)
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-[var(--color-hover-subtle)]"
                >
                  <span className="text-[var(--foreground)]">{label}</span>
                  {sortDir === id ? (
                    <Check className="h-3 w-3 shrink-0 text-[var(--color-primary)]" />
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {adsBridge?.canRefreshSaved ? (
          <Tooltip label="Refresh search" side="bottom">
            <span className="inline-flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => adsBridge.refreshSavedSearch()}
                disabled={adsBridge.refreshingSaved}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Refresh search"
              >
                <RefreshCw
                  className={cn('h-3.5 w-3.5', adsBridge.refreshingSaved && 'animate-spin')}
                />
              </button>
            </span>
          </Tooltip>
        ) : null}
      </div>
    </ToolbarShell>
  )
}
