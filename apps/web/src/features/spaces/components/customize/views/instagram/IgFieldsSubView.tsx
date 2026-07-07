'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, X } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import {
  IG_RESEARCH_LIST_COLUMN_META,
  resolveIgListVisibleColumns,
} from '../../../../lib/ig-research-list-columns'
import {
  SOCIAL_RESEARCH_LIST_COLUMN_IDS,
  type SocialPlatform,
  type SocialResearchListColumnId,
  type ViewDef,
} from '../../../../types/space-schema'
import { getSocialConfig, patchSocialConfig } from './instagram-customize.helpers'

export function IgFieldsSubView({
  activeView,
  platform = 'instagram',
  onViewPatch,
  onBack,
  onClose,
}: {
  activeView: ViewDef
  platform?: SocialPlatform
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}) {
  const ic = getSocialConfig(activeView, platform)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [localListVisibleCols, setLocalListVisibleCols] = useState<string[]>(() =>
    resolveIgListVisibleColumns(ic),
  )
  useEffect(() => {
    setLocalListVisibleCols(resolveIgListVisibleColumns(getSocialConfig(activeView, platform)))
  }, [activeView.id, platform])

  const visibleSet = useMemo(() => new Set(localListVisibleCols), [localListVisibleCols])
  const igListMetaById = useMemo(
    () => new Map(IG_RESEARCH_LIST_COLUMN_META.map((m) => [m.id, m])),
    [],
  )
  const igListShownOrdered = useMemo(
    () =>
      localListVisibleCols
        .map((id) => igListMetaById.get(id as SocialResearchListColumnId))
        .filter((m): m is (typeof IG_RESEARCH_LIST_COLUMN_META)[number] => Boolean(m)),
    [localListVisibleCols, igListMetaById],
  )
  const igListHidden = useMemo(
    () =>
      [...IG_RESEARCH_LIST_COLUMN_META.filter((m) => !visibleSet.has(m.id))].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    [visibleSet],
  )
  const igListColMatches = useCallback((label: string, q: string) => {
    if (!q) return true
    return label.toLowerCase().includes(q.toLowerCase())
  }, [])
  const igListShownFiltered = useMemo(
    () => igListShownOrdered.filter((m) => igListColMatches(m.label, search)),
    [igListShownOrdered, search, igListColMatches],
  )
  const igListHiddenFiltered = useMemo(
    () => igListHidden.filter((m) => igListColMatches(m.label, search)),
    [igListHidden, search, igListColMatches],
  )

  function toggleIgListColumn(metaId: string, on: boolean) {
    const nextSet = new Set(localListVisibleCols)
    if (on) nextSet.add(metaId)
    else nextSet.delete(metaId)
    const next = SOCIAL_RESEARCH_LIST_COLUMN_IDS.filter((id) => nextSet.has(id))
    setLocalListVisibleCols(next)
    patchSocialConfig(
      onViewPatch,
      ic,
      {
        list_visible_columns:
          next.length === SOCIAL_RESEARCH_LIST_COLUMN_IDS.length ? undefined : next,
      },
      platform,
      activeView,
    )
  }

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [])

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="body-3 font-semibold text-[var(--foreground)]">Fields</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 border-b border-[var(--border)] px-4 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--color-secondary)] px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search columns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="body-3 min-w-0 flex-1 bg-transparent text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <div className="mb-1 mt-3">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">Shown</p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
            Preview stays first in the list.
          </p>
        </div>
        <div className="space-y-0.5">
          {igListShownFiltered.map((meta) => (
            <div
              key={meta.id}
              className="flex min-h-8 items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-[var(--color-hover-subtle)]"
            >
              <span className="body-3 truncate pr-2 text-[var(--foreground)]">{meta.label}</span>
              <Switch checked onCheckedChange={(on) => toggleIgListColumn(meta.id, on)} />
            </div>
          ))}
          {igListShownFiltered.length === 0 && search && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching columns</p>
          )}
          {igListShownFiltered.length === 0 && !search && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No columns shown</p>
          )}
        </div>

        <div className="mb-1 mt-3">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">Hidden</p>
        </div>
        <div className="space-y-0.5">
          {igListHiddenFiltered.map((meta) => (
            <div
              key={meta.id}
              className="flex min-h-8 items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-[var(--color-hover-subtle)]"
            >
              <span className="body-3 truncate pr-2 text-[var(--color-muted-foreground)]">
                {meta.label}
              </span>
              <Switch checked={false} onCheckedChange={(on) => toggleIgListColumn(meta.id, on)} />
            </div>
          ))}
          {igListHidden.length === 0 && !search && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">
              All list columns are shown
            </p>
          )}
          {igListHidden.length > 0 && igListHiddenFiltered.length === 0 && search && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching columns</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
