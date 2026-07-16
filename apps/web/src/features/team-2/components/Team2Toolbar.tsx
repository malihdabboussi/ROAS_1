'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpDown, ChevronDown, Cpu, Grid3x3, List, Plus, Search, Wifi } from 'lucide-react'
import { Team2FilterDropdown, type FilterOption } from '@/components/filters/Team2FilterDropdown'
import { Tooltip } from '@/components/ui/tooltip'
import type { MissionAgent } from '@/lib/agents'
import { agentModelId, MODEL_STRATEGIES } from '@/lib/agents/model-strategies'
import type { LlmModelOption } from '@/lib/chat/llm-models-api'
import { Team2GroupByButton } from './Team2GroupByButton'
import { Team2GroupByToolbarPopover } from './Team2GroupByToolbarPopover'

const TOOLBAR_DOCK_SLOT_SPRING = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 40,
  mass: 0.78,
}

export type Team2ViewMode = 'grid' | 'list'

export type Team2StatusFilter = 'online' | 'offline' | 'working' | 'idle'

export type Team2Sort = 'recent' | 'oldest' | 'name_asc' | 'name_desc' | 'level_top_first'

export type Team2GroupBy = 'none' | 'team' | 'level' | 'model'

export type Team2GroupSort = 'asc' | 'desc'

const STATUS_OPTIONS: FilterOption[] = [
  { id: 'working', label: 'Working' },
  { id: 'idle', label: 'Idle' },
  { id: 'online', label: 'Active' },
  { id: 'offline', label: 'Deactivated' },
]

const SORT_OPTIONS: FilterOption[] = [
  { id: 'recent', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'name_asc', label: 'Name A → Z' },
  { id: 'name_desc', label: 'Name Z → A' },
  { id: 'level_top_first', label: 'Level (C-level → Employee)' },
]

function buildTeam2ModelFilterOptions(
  agents: MissionAgent[],
  llmCatalog: LlmModelOption[],
): FilterOption[] {
  const counts = new Map<string, number>()
  for (const a of agents) {
    const id = agentModelId(a)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  const strategyRows: FilterOption[] = MODEL_STRATEGIES.map((s) => {
    const c = counts.get(s.id) ?? 0
    return {
      id: s.id,
      label: s.label,
      chipClassName: s.chipClass,
      disabled: c === 0,
      trailingCount: c > 0 ? c : undefined,
    }
  })
  const strategyIds = new Set<string>(MODEL_STRATEGIES.map((s) => s.id))

  const llmRows: FilterOption[] = llmCatalog
    .filter((m) => !strategyIds.has(m.id))
    .map((opt) => {
      const c = counts.get(opt.id) ?? 0
      return {
        id: opt.id,
        label: opt.label,
        chipClassName: 'chip-glass-neutral',
        disabled: c === 0,
        trailingCount: c > 0 ? c : undefined,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))

  const catalogIds = new Set<string>([...strategyIds, ...llmCatalog.map((m) => m.id)])
  const orphanRows: FilterOption[] = []
  for (const id of counts.keys()) {
    if (catalogIds.has(id)) continue
    const c = counts.get(id) ?? 0
    orphanRows.push({
      id,
      label: id,
      description: 'Custom model',
      chipClassName: 'chip-glass-neutral',
      disabled: c === 0,
      trailingCount: c > 0 ? c : undefined,
    })
  }
  orphanRows.sort((a, b) => a.label.localeCompare(b.label))

  const all = [...strategyRows, ...llmRows, ...orphanRows]
  return [...all.filter((r) => !r.disabled), ...all.filter((r) => r.disabled)]
}

interface Team2ToolbarProps {
  agents: MissionAgent[]
  modelOptions: LlmModelOption[]

  view: Team2ViewMode
  onViewChange: (next: Team2ViewMode) => void

  search: string
  onSearchChange: (next: string) => void
  searchOpen: boolean
  onSearchOpenChange: (next: boolean) => void

  statusFilters: Team2StatusFilter[]
  onToggleStatus: (id: Team2StatusFilter) => void

  modelFilters: string[]
  onToggleModel: (id: string) => void

  sort: Team2Sort
  onSortChange: (next: Team2Sort) => void

  groupBy: Team2GroupBy
  onGroupByChange: (next: Team2GroupBy) => void

  groupSort: Team2GroupSort
  onGroupSortChange: (next: Team2GroupSort) => void

  onOpenAgentLibrary: () => void
  onStartAgentFromScratch: () => void
  canHire: boolean
}

function NewAgentDropdown({
  onFromLibrary,
  onFromScratch,
}: {
  onFromLibrary: () => void
  onFromScratch: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="badge-glass badge-glass-green rounded-spacing-2 body-3 inline-flex h-7 shrink-0 items-center gap-1.5 px-3 font-semibold transition-opacity hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" />
        New Agent
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>
      {open ? (
        <div
          className="dropdown-menu-solid mt-spacing-1 z-dropdown rounded-spacing-2 py-spacing-1 absolute right-0 top-full min-w-44"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 block w-full whitespace-nowrap text-left transition-colors"
            onClick={() => {
              setOpen(false)
              onFromScratch()
            }}
          >
            Start from scratch
          </button>
          <button
            type="button"
            role="menuitem"
            className="body-3 text-foreground hover:bg-hover-subtle px-spacing-3 py-spacing-2 block w-full whitespace-nowrap text-left transition-colors"
            onClick={() => {
              setOpen(false)
              onFromLibrary()
            }}
          >
            From Library
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function Team2Toolbar({
  agents,
  modelOptions,
  view,
  onViewChange,
  search,
  onSearchChange,
  searchOpen,
  onSearchOpenChange,
  statusFilters,
  onToggleStatus,
  modelFilters,
  onToggleModel,
  sort,
  onSortChange,
  groupBy,
  onGroupByChange,
  groupSort,
  onGroupSortChange,
  onOpenAgentLibrary,
  onStartAgentFromScratch,
  canHire,
}: Team2ToolbarProps) {
  const groupByBtnRef = useRef<HTMLSpanElement>(null)
  const [groupByOpen, setGroupByOpen] = useState(false)

  const modelOptionsForFilter = useMemo(
    () => buildTeam2ModelFilterOptions(agents, modelOptions),
    [agents, modelOptions],
  )

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
      {/* Left: group by · view toggle */}
      <div className="flex min-w-0 shrink flex-wrap items-center gap-1">
        <Team2GroupByButton
          groupBy={groupBy}
          btnRef={groupByBtnRef}
          onToggle={() => setGroupByOpen((o) => !o)}
        />
        <Team2GroupByToolbarPopover
          open={groupByOpen}
          onClose={() => setGroupByOpen(false)}
          anchorRef={groupByBtnRef}
          groupBy={groupBy}
          groupSort={groupSort}
          onGroupByChange={onGroupByChange}
          onGroupSortChange={onGroupSortChange}
        />
        <Tooltip label="Grid view" side="bottom" triggerClassName="flex h-full items-center">
          <span className="inline-flex">
            <button
              type="button"
              onClick={() => onViewChange('grid')}
              aria-pressed={view === 'grid'}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                view === 'grid'
                  ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
              }`}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
            </button>
          </span>
        </Tooltip>
        <Tooltip label="List view" side="bottom" triggerClassName="flex h-full items-center">
          <span className="inline-flex">
            <button
              type="button"
              onClick={() => onViewChange('list')}
              aria-pressed={view === 'list'}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                view === 'list'
                  ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </span>
        </Tooltip>
      </div>

      {/* Right: search · filters · new agent */}
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
        {/* Search */}
        <div className="flex h-7 shrink-0 items-center justify-center">
          <AnimatePresence mode="popLayout" initial={false}>
            {searchOpen ? (
              <motion.div
                key="team2-search-field"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <input
                  autoFocus
                  type="search"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onBlur={() => {
                    if (!search.trim()) onSearchOpenChange(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      onSearchChange('')
                      onSearchOpenChange(false)
                    }
                  }}
                  placeholder="Search agents…"
                  className="w-[160px] rounded-md border border-[var(--color-border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-primary)]"
                />
              </motion.div>
            ) : (
              <motion.div
                key="team2-search-icon"
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={TOOLBAR_DOCK_SLOT_SPRING}
                className="flex h-7 items-center justify-center"
              >
                <Tooltip label="Search" side="bottom" triggerClassName="flex h-full items-center">
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={() => onSearchOpenChange(true)}
                      className="rounded-md p-1.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                    >
                      <Search className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Team2FilterDropdown
          label="Status"
          options={STATUS_OPTIONS}
          selectedIds={statusFilters}
          onToggle={(id) => onToggleStatus(id as Team2StatusFilter)}
          trigger="icon"
          icon={<Wifi className="h-3.5 w-3.5" />}
        />
        <Team2FilterDropdown
          label="Model"
          options={modelOptionsForFilter}
          selectedIds={modelFilters}
          onToggle={(id) => onToggleModel(id)}
          menuClassName="min-w-52"
          collapseDisabledOptions
          trigger="icon"
          icon={<Cpu className="h-3.5 w-3.5" />}
        />
        <Team2FilterDropdown
          label="Sort"
          options={SORT_OPTIONS}
          currentId={sort}
          onSelect={(id) => onSortChange(id as Team2Sort)}
          trigger="icon"
          icon={<ArrowUpDown className="h-3.5 w-3.5" />}
        />

        <div className="border-l-glass mx-1 h-4 w-0 shrink-0 self-center" aria-hidden />

        {canHire ? (
          <NewAgentDropdown
            onFromLibrary={onOpenAgentLibrary}
            onFromScratch={onStartAgentFromScratch}
          />
        ) : null}
      </div>
    </div>
  )
}
