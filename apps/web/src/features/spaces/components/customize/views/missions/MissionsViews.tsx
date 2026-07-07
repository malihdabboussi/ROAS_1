'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, BarChart3, Blocks, ChevronRight, CircleDot, Clock, FileText, Flag, GitBranch, Image, Layers, RefreshCw, Search, Type, Users, Wrench, X } from 'lucide-react'
import Switch from '@/components/ui/forms/switch'
import { IconPicker, LucideIcon, type IconColorId } from '@/components/ui/IconPicker'
import { cn } from '@/lib/utils/cn'
import { MISSION_GROUP_BY_OPTIONS } from '../../../../lib/mission-group-by-options'
import { resolveMissionsSubtasksDisplay, type MissionColumnId, type MissionsConfig, type ViewDef } from '../../../../types/space-schema'
import { CustomizeViewManagementSection } from '../../../customize-view-management-section'
import { GroupByToolbarPopover } from '../../../group-by-toolbar-popover'
import { SubtasksToolbarMenu } from '../../../subtasks-toolbar-menu'

const ALL_MISSION_COLUMNS: {
  id: MissionColumnId
  label: string
  icon: ComponentType<{ className?: string }>
  locked?: boolean
}[] = [
  { id: 'title', label: 'Title', icon: Type, locked: true },
  { id: 'status', label: 'Status', icon: CircleDot },
  { id: 'priority', label: 'Priority', icon: Flag },
  { id: 'assigned', label: 'Assigned', icon: Users },
  { id: 'working', label: 'Working', icon: Wrench },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'artifacts', label: 'Artifacts', icon: Blocks },
  { id: 'updated', label: 'Updated', icon: RefreshCw },
  { id: 'created', label: 'Created', icon: Clock },
]

const DEFAULT_MISSION_COLUMNS: MissionColumnId[] = [
  'title',
  'assigned',
  'working',
  'status',
  'progress',
  'updated',
]

function getMissionsConfig(view: ViewDef): MissionsConfig {
  return view.missions_config ?? {}
}

function patchMissionsConfig(
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>,
  current: MissionsConfig,
  patch: Partial<MissionsConfig>,
) {
  void onViewPatch({ missions_config: { ...current, ...patch } })
}

export function MissionsMainView({
  activeView,
  viewIconName,
  viewIconColor,
  nameDraft,
  setNameDraft,
  onViewPatch,
  onViewPinToStart,
  canDeleteView,
  onDeleteView,
  onClose,
  onOpenFields,
  isTeamSpace = false,
  canSaveForEveryone = false,
  hasViewOverride = false,
  onSaveForEveryone,
  onResetToDefault,
  onOpenSharingPermissions,
}: {
  activeView: ViewDef
  viewIconName: string
  viewIconColor: { textColor: string }
  nameDraft: string
  setNameDraft: (v: string) => void
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onViewPinToStart: (pinned: boolean) => Promise<void>
  canDeleteView: boolean
  onDeleteView: () => Promise<void>
  onClose: () => void
  onOpenFields: () => void
  isTeamSpace?: boolean
  canSaveForEveryone?: boolean
  hasViewOverride?: boolean
  onSaveForEveryone?: () => Promise<void>
  onResetToDefault?: () => Promise<void>
  onOpenSharingPermissions?: () => void
}) {
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false)
  const groupAnchorRef = useRef<HTMLButtonElement>(null)
  const [subtasksMenuOpen, setSubtasksMenuOpen] = useState(false)
  const subtasksAnchorRef = useRef<HTMLButtonElement>(null)

  const mc = getMissionsConfig(activeView)
  const groupByLabel = mc.group_by
    ? (MISSION_GROUP_BY_OPTIONS.find((o) => o.id === mc.group_by)?.label ?? mc.group_by)
    : 'None'
  const visibleCols = (mc.visible_columns ?? DEFAULT_MISSION_COLUMNS).filter(
    (id) => id !== 'campaign' && id !== 'subtasks',
  )

  const subtasksMode = resolveMissionsSubtasksDisplay(mc)
  const subtasksSummary =
    subtasksMode === 'collapsed'
      ? 'Collapsed'
      : subtasksMode === 'expanded'
        ? 'Expanded'
        : 'Separate'

  return (
    <motion.div
      className="flex flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconPicker
            className="z-10 shrink-0"
            value={viewIconName}
            color={activeView.icon_color}
            size="sm"
            onChange={(name) => void onViewPatch({ icon: name })}
            onColorChange={(colorId: IconColorId) => void onViewPatch({ icon_color: colorId })}
            customTrigger={
              <LucideIcon name={viewIconName} className={`h-4 w-4 ${viewIconColor.textColor}`} />
            }
          />
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim()
              if (!trimmed) {
                setNameDraft(activeView.name)
                return
              }
              if (trimmed !== activeView.name) void onViewPatch({ name: trimmed })
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            className="body-3 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)] px-2 py-1 font-semibold text-[var(--foreground)] outline-none focus:border-[var(--border)]"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Section 1 — mission toggles */}
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="body-3 text-[var(--foreground)]">Show empty groups</span>
            <Switch
              checked={mc.show_empty_groups ?? false}
              onCheckedChange={(v) =>
                patchMissionsConfig(onViewPatch, mc, { show_empty_groups: v })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="body-3 text-[var(--foreground)]">Show closed missions</span>
            <Switch
              checked={mc.show_closed ?? false}
              onCheckedChange={(v) => patchMissionsConfig(onViewPatch, mc, { show_closed: v })}
            />
          </div>
        </div>

        {/* Section 2 — Columns / Group / Subtasks */}
        <div className="space-y-2.5 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onOpenFields}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Columns</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {visibleCols.length} shown
              </span>
              <ChevronRight className="h-3 w-3 text-[var(--color-muted-foreground)]" />
            </div>
          </button>

          <button
            ref={groupAnchorRef}
            type="button"
            onClick={() => setGroupPopoverOpen((o) => !o)}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Group</span>
            </div>
            <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
              <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {groupByLabel}
              </span>
              <ChevronRight
                className={cn(
                  'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                  groupPopoverOpen && 'rotate-90',
                )}
              />
            </div>
          </button>
          <GroupByToolbarPopover
            open={groupPopoverOpen}
            onClose={() => setGroupPopoverOpen(false)}
            anchorRef={groupAnchorRef}
            onViewPatch={onViewPatch}
            activeView={activeView}
            variant="missions"
            groupableFields={[]}
          />

          <button
            ref={subtasksAnchorRef}
            type="button"
            onClick={() => setSubtasksMenuOpen((o) => !o)}
            className="flex w-full items-center justify-between transition-colors hover:opacity-80"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="body-3 font-semibold text-[var(--foreground)]">Subtasks</span>
            </div>
            <div className="flex min-w-0 max-w-[55%] items-center justify-end gap-1">
              <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                {subtasksSummary}
              </span>
              <ChevronRight
                className={cn(
                  'h-3 w-3 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200',
                  subtasksMenuOpen && 'rotate-90',
                )}
              />
            </div>
          </button>
          <SubtasksToolbarMenu
            open={subtasksMenuOpen}
            onClose={() => setSubtasksMenuOpen(false)}
            anchorRef={subtasksAnchorRef}
            onViewPatch={onViewPatch}
            activeView={activeView}
            isMissionsView
            missionsMc={mc}
          />
        </div>

        <CustomizeViewManagementSection
          activeView={activeView}
          onViewPatch={onViewPatch}
          onViewPinToStart={onViewPinToStart}
          canDeleteView={canDeleteView}
          onDeleteView={onDeleteView}
          isTeamSpace={isTeamSpace}
          canSaveForEveryone={canSaveForEveryone}
          hasViewOverride={hasViewOverride}
          onSaveForEveryone={onSaveForEveryone}
          onResetToDefault={onResetToDefault}
          onSharingPermissions={onOpenSharingPermissions}
        />
      </div>
    </motion.div>
  )
}

function normalizeMissionVisibleColumns(cols: MissionColumnId[] | undefined): MissionColumnId[] {
  return (cols ?? [...DEFAULT_MISSION_COLUMNS]).filter(
    (id) => id !== 'campaign' && id !== 'subtasks',
  )
}

export function MissionsFieldsSubView({
  activeView,
  onViewPatch,
  onBack,
  onClose,
}: {
  activeView: ViewDef
  onViewPatch: (patch: Partial<ViewDef>) => Promise<void>
  onBack: () => void
  onClose: () => void
}) {
  const mc = getMissionsConfig(activeView)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const [localVisibleCols, setLocalVisibleCols] = useState<MissionColumnId[]>(() =>
    normalizeMissionVisibleColumns(mc.visible_columns),
  )
  useEffect(() => {
    setLocalVisibleCols(
      normalizeMissionVisibleColumns(getMissionsConfig(activeView).visible_columns),
    )
  }, [activeView.id])
  const visibleSet = useMemo(() => new Set<MissionColumnId>(localVisibleCols), [localVisibleCols])

  const hidden = useMemo(
    () => ALL_MISSION_COLUMNS.filter((c) => !visibleSet.has(c.id)),
    [visibleSet],
  )

  const colMatchesQuery = useCallback((label: string, q: string) => {
    if (!q) return true
    return label.toLowerCase().includes(q.toLowerCase())
  }, [])

  const shownOrdered = useMemo(() => {
    const byId = new Map(ALL_MISSION_COLUMNS.map((c) => [c.id, c]))
    return localVisibleCols
      .map((id) => byId.get(id))
      .filter((c): c is (typeof ALL_MISSION_COLUMNS)[number] => Boolean(c))
  }, [localVisibleCols])

  const shownFiltered = useMemo(
    () => shownOrdered.filter((c) => colMatchesQuery(c.label, search)),
    [shownOrdered, search, colMatchesQuery],
  )
  const hiddenFiltered = useMemo(() => {
    const list = hidden.filter((c) => colMatchesQuery(c.label, search))
    return [...list].sort((a, b) => a.label.localeCompare(b.label))
  }, [hidden, search, colMatchesQuery])

  useEffect(() => {
    setTimeout(() => searchRef.current?.focus(), 100)
  }, [])

  function toggleColumn(colId: MissionColumnId) {
    const current = localVisibleCols
    const isVisible = current.includes(colId)
    const next = isVisible ? current.filter((id) => id !== colId) : [...current, colId]
    setLocalVisibleCols(next)
    patchMissionsConfig(onViewPatch, mc, { visible_columns: next })
  }

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
          <span className="body-3 font-semibold text-[var(--foreground)]">Columns</span>
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
        <div className="mb-1 mt-3 flex items-center justify-between">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">Shown</p>
        </div>
        <div className="space-y-0.5">
          {shownFiltered.map((col) => {
            const ColIcon = col.icon
            return (
              <div
                key={col.id}
                className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ColIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--foreground)]">{col.label}</span>
                </div>
                <Switch
                  checked
                  onCheckedChange={() => toggleColumn(col.id)}
                  disabled={col.locked}
                />
              </div>
            )
          })}
          {shownFiltered.length === 0 && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching columns</p>
          )}
        </div>

        <div className="mb-1 mt-3 flex items-center justify-between">
          <p className="text-[10px] text-[var(--color-muted-foreground)]">Hidden</p>
        </div>
        <div className="space-y-0.5">
          {hiddenFiltered.map((col) => {
            const ColIcon = col.icon
            return (
              <div
                key={col.id}
                className="flex h-8 items-center justify-between rounded-lg px-3 transition-colors hover:bg-[var(--color-hover-subtle)]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <ColIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                  <span className="body-3 truncate text-[var(--color-muted-foreground)]">
                    {col.label}
                  </span>
                </div>
                <Switch checked={false} onCheckedChange={() => toggleColumn(col.id)} />
              </div>
            )
          })}
          {hidden.length === 0 && !search && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">
              All columns are shown
            </p>
          )}
          {hidden.length > 0 && hiddenFiltered.length === 0 && search && (
            <p className="body-3 py-2 text-[var(--color-muted-foreground)]">No matching columns</p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
