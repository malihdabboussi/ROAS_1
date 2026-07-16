'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CornerDownLeft,
  Flag,
  GitBranch,
  MoreVertical,
  Pencil,
  Plus,
  PlusCircle,
  Tags,
  UserPlus,
} from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { TeamRosterEntry } from '@/features/org/services/org.service'
import { cn } from '@/lib/utils/cn'
import { assigneeFieldValueForGroupKey, groupItems } from '../lib/group-items'
import {
  resolveSpaceEntryType,
  viewPromotesFollowUpSubtasks,
} from '../lib/apply-space-toolbar-filters'
import {
  kanbanBoardColumnTintSource,
  spaceGroupBadgeChipProps,
} from '../lib/space-group-badge-glass'
import { useSpacesStore } from '../store/use-spaces-store'
import type { SpaceItem } from '../types'
import type { FieldDef, SelectOption, ViewDef } from '../types/space-schema'
import { isSpaceFieldVisibleInUi, resolveSubtasksDisplay } from '../types/space-schema'
import { AssigneeGroupHeaderTitle } from './AssigneeGroupHeaderTitle'
import { AssigneeCell } from './cells/AssigneeCell'
import { DueDateCell } from './cells/DueDateCell'
import { MultiSelectCell } from './cells/MultiSelectCell'
import { ResponsiveTagChips } from './cells/ResponsiveTagChips'
import { SelectCell } from './cells/SelectCell'
import { SpaceCell } from './cells/SpaceCell'
import { OptionDot } from './OptionBadge'
import {
  buildSpaceTaskChatDragPayload,
  fieldDraftsToCreateExtra,
  readFieldValue,
  toFieldPatch,
} from './space-item-values'
import { TaskExecutionStatusIndicator } from './TaskExecutionStatusIndicator'

const COLUMN_BG: Record<string, string> = {
  cyan: 'bg-cyan-500/[0.1] border-cyan-500/20 dark:bg-cyan-500/[0.04] dark:border-cyan-500/10',
  amber: 'bg-amber-500/[0.1] border-amber-500/20 dark:bg-amber-500/[0.04] dark:border-amber-500/10',
  violet:
    'bg-violet-500/[0.1] border-violet-500/20 dark:bg-violet-500/[0.04] dark:border-violet-500/10',
  emerald:
    'bg-emerald-500/[0.1] border-emerald-500/20 dark:bg-emerald-500/[0.04] dark:border-emerald-500/10',
  slate: 'bg-slate-500/[0.1] border-slate-500/20 dark:bg-slate-500/[0.04] dark:border-slate-500/10',
  blue: 'bg-blue-500/[0.1] border-blue-500/20 dark:bg-blue-500/[0.04] dark:border-blue-500/10',
  orange:
    'bg-orange-500/[0.1] border-orange-500/20 dark:bg-orange-500/[0.04] dark:border-orange-500/10',
  red: 'bg-red-500/[0.1] border-red-500/20 dark:bg-red-500/[0.04] dark:border-red-500/10',
  muted: 'bg-surface-subtle border-border',
}

const FLAG_COLOR: Record<string, string> = {
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  blue: 'text-blue-600 dark:text-blue-400',
  slate: 'text-slate-600 dark:text-slate-400',
  amber: 'text-amber-600 dark:text-amber-400',
  violet: 'text-violet-600 dark:text-violet-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
}

const KANBAN_COLUMN_LABEL_CLASS =
  'inline-flex max-w-full items-center rounded-md px-2 py-0.5 typo-caption font-bold uppercase tracking-wider shadow-sm'

function resolveDoneStatusId(fieldsById: Map<string, FieldDef>): string {
  const opts = fieldsById.get('status')?.options ?? []
  return opts.find((o) => o.group === 'done' || o.id === 'done')?.id ?? 'done'
}

function kanbanFieldHasValue(item: SpaceItem, f: FieldDef): boolean {
  const v = readFieldValue(item, f.id)
  if (f.type === 'assignee') {
    return Array.isArray(v) && v.length > 0
  }
  if (f.type === 'select') return v != null && v !== ''
  if (f.type === 'multi_select') return Array.isArray(v) && v.length > 0
  if (f.type === 'date' && f.id === 'due_date') {
    const due = readFieldValue(item, 'due_date')
    const start = readFieldValue(item, 'start_date')
    return (
      (typeof due === 'string' && due.length > 0) ||
      (typeof start === 'string' && start.length > 0) ||
      item.recurrence != null
    )
  }
  if (f.type === 'date') return typeof v === 'string' && v.length > 0
  if (f.type === 'checkbox') return v === true || v === 'true'
  if (f.type === 'rating') return typeof v === 'number' && v > 0
  if (f.type === 'progress') {
    if (typeof v === 'number') return v > 0
    if (typeof v === 'object' && v !== null && 'v' in v) {
      const raw = (v as { v: unknown }).v
      const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
      return !Number.isNaN(n) && n > 0
    }
    return false
  }
  // if (f.type === 'duration') return typeof v === 'number' && v > 0
  if (f.type === 'created_at' || f.type === 'updated_at')
    return typeof v === 'string' && v.length > 0
  if (f.type === 'mission') {
    if (item.linked_mission_id) return true
    return item.assignee_type === 'agent'
  }
  return v != null && v !== ''
}

type AssigneeValue = Array<{ type: 'human' | 'agent'; id: string }>

function KanbanNewTaskField({
  field,
  value,
  onValue,
  roster,
  currentUserId,
  allFields,
  draftFieldValues,
  onDraftFieldPatch,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
}: {
  field: FieldDef
  value: unknown
  onValue: (next: unknown) => void
  roster: TeamRosterEntry[]
  currentUserId: string | null
  allFields: Map<string, FieldDef>
  draftFieldValues: Record<string, unknown>
  onDraftFieldPatch: (patch: Record<string, unknown>) => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
}) {
  const f = allFields.get(field.id) ?? field
  const statusField = allFields.get('status')

  if (f.type === 'mission') {
    return <span className="text-sm text-[var(--color-muted-foreground)]">—</span>
  }

  if (f.type === 'assignee') {
    const v: AssigneeValue = Array.isArray(value) ? (value as AssigneeValue) : []
    const selected = v
      .map((assignee) =>
        assignee.type === 'agent'
          ? roster.find((e) => e.kind === 'agent' && e.agent_key === assignee.id)
          : roster.find((e) => e.kind === 'human' && e.user_id === assignee.id),
      )
      .filter((entry): entry is TeamRosterEntry => entry != null)
    return (
      <AssigneeCell
        value={v}
        roster={roster}
        currentUserId={currentUserId}
        onChange={onValue}
        customTrigger={
          <span className="flex w-full min-w-0 items-center gap-2 text-left text-sm text-[var(--color-muted-foreground)]">
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                selected.length > 0 && 'text-[var(--foreground)]',
              )}
            >
              {selected.length > 0
                ? selected.length === 1 && currentUserId && selected[0]!.user_id === currentUserId
                  ? 'Me'
                  : selected.length === 1
                    ? selected[0]!.display_name
                    : `${selected.length} assignees`
                : 'Assign'}
            </span>
          </span>
        }
      />
    )
  }

  if (f.type === 'date' && f.id === 'due_date') {
    const dueStr =
      typeof draftFieldValues['due_date'] === 'string'
        ? draftFieldValues['due_date']
        : typeof value === 'string'
          ? value
          : null
    const startStr =
      typeof draftFieldValues['start_date'] === 'string' ? draftFieldValues['start_date'] : null
    const hasDate = Boolean(dueStr || startStr)
    const label = dueStr
      ? new Date(dueStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Due date'
    return (
      <DueDateCell
        value={{ start_date: startStr, due_date: dueStr, recurrence: null }}
        onChange={(patch) => {
          const p: Record<string, unknown> = {}
          if ('due_date' in patch) p.due_date = patch.due_date
          if ('start_date' in patch) p.start_date = patch.start_date
          if ('recurrence' in patch) p.recurrence = patch.recurrence
          onDraftFieldPatch(p)
        }}
        statusField={statusField}
        customTrigger={
          <span className="flex w-full min-w-0 items-center gap-2 text-left text-sm text-[var(--color-muted-foreground)]">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className={cn('min-w-0 flex-1 truncate', hasDate && 'text-[var(--foreground)]')}>
              {label}
            </span>
          </span>
        }
      />
    )
  }

  if (f.type === 'select') {
    const isPriority = f.id === 'priority'
    const options = f.options ?? []
    const selectedId = typeof value === 'string' ? value : null
    const selected = options.find((o) => o.id === selectedId) ?? null
    return (
      <SelectCell
        field={f}
        value={value}
        onChange={onValue}
        customTrigger={
          <span className="flex w-full min-w-0 items-center gap-2 text-left text-sm text-[var(--color-muted-foreground)]">
            {isPriority ? (
              <Flag
                className={
                  selected
                    ? `h-3.5 w-3.5 shrink-0 ${FLAG_COLOR[selected.color ?? ''] ?? 'text-[var(--color-muted-foreground)]'}`
                    : 'h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]'
                }
                fill="currentColor"
                aria-hidden
              />
            ) : (
              <span className="shrink-0">
                {selected ? <OptionDot color={selected.color} size="sm" /> : <OptionDot />}
              </span>
            )}
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                !selected && 'text-[var(--color-muted-foreground)]',
                selected && 'text-[var(--foreground)]',
              )}
            >
              {selected
                ? selected.label
                : isPriority
                  ? 'Add priority'
                  : `Add ${f.name ?? 'option'}`}
            </span>
          </span>
        }
      />
    )
  }

  if (f.type === 'multi_select') {
    const ids = Array.isArray(value) ? value.filter((e): e is string => typeof e === 'string') : []
    const options = f.options ?? []
    const selectedOpts = options.filter((o) => ids.includes(o.id))
    return (
      <MultiSelectCell
        field={f}
        value={value}
        onChange={onValue}
        onCreateOption={onCreateOption}
        onUpdateOption={onUpdateOption}
        onDeleteOption={onDeleteOption}
        onTagCustomSwatchesChange={onTagCustomSwatchesChange}
        customTrigger={
          <span className="flex w-full min-w-0 items-center gap-2 text-left text-sm text-[var(--color-muted-foreground)]">
            <Tags className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1">
              {selectedOpts.length > 0 ? (
                <ResponsiveTagChips options={selectedOpts} />
              ) : (
                <span className="text-[var(--color-muted-foreground)]">
                  Add {f.name ? f.name.toLowerCase() : 'tag'}
                </span>
              )}
            </span>
          </span>
        }
      />
    )
  }

  return (
    <div className="w-full min-w-0 text-sm">
      <SpaceCell
        field={f}
        value={value}
        roster={roster}
        currentUserId={currentUserId}
        fieldRowVariant="kanban"
        onCreateOption={onCreateOption}
        onUpdateOption={onUpdateOption}
        onDeleteOption={onDeleteOption}
        onTagCustomSwatchesChange={onTagCustomSwatchesChange}
        onChange={onValue}
      />
    </div>
  )
}

interface KanbanViewProps {
  view: ViewDef
  items: SpaceItem[]
  fieldsById: Map<string, FieldDef>
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onUpdateItem: (itemId: string, payload: Partial<SpaceItem>) => Promise<void>
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onAddItemInGroup: (
    title: string,
    groupFieldId: string,
    groupKey: string,
    fieldExtras?: Record<string, unknown>,
  ) => Promise<void>
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent: (
    itemId: string,
    options?: import('./cells/MissionSendDropdown').MissionSendOptions,
  ) => Promise<void>
  onCreateSubtask: (
    parentId: string,
    title: string,
    extras?: Record<string, unknown>,
  ) => Promise<void>
  onOpenDetail?: (item: SpaceItem) => void
  readOnly?: boolean
}

export function KanbanView({
  view,
  items,
  fieldsById,
  roster,
  currentUserId,
  onUpdateItem,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onAddItemInGroup,
  onTagCustomSwatchesChange,
  onPushToAgent,
  onCreateSubtask,
  onOpenDetail,
  readOnly = false,
}: KanbanViewProps) {
  const doneStatusId = useMemo(() => resolveDoneStatusId(fieldsById), [fieldsById])
  const subtasksMode = resolveSubtasksDisplay(view)
  const groupFieldId = view.group_by ?? 'status'
  const groupField = fieldsById.get(groupFieldId)
  const statusField = fieldsById.get('status')
  const statusOptionsById = useMemo(
    () => new Map((statusField?.options ?? []).map((option) => [option.id, option])),
    [statusField],
  )

  const PINNED_ORDER = ['assignee', 'due_date', 'priority', 'tags'] as const
  const pinnedSet = new Set<string>(PINNED_ORDER)

  /** Board + new task: pinned fields first in fixed order, then the rest from visible_fields. */
  const cardFieldDefs = useMemo(() => {
    const ids = view.visible_fields ?? [
      'title',
      'status',
      'priority',
      'assignee',
      'due_date',
      'tags',
    ]
    const enabledSet = new Set(ids.filter((id) => id !== 'title' && id !== groupFieldId))
    const out: FieldDef[] = []
    for (const id of PINNED_ORDER) {
      if (!enabledSet.has(id)) continue
      const f = fieldsById.get(id)
      if (f && isSpaceFieldVisibleInUi(f)) out.push(f)
    }
    for (const id of ids) {
      if (id === 'title' || id === groupFieldId || pinnedSet.has(id)) continue
      const f = fieldsById.get(id)
      if (f && isSpaceFieldVisibleInUi(f)) out.push(f)
    }
    if (out.some((f) => f.id === 'due_date')) {
      return out.filter((f) => f.id !== 'start_date')
    }
    return out
  }, [view.visible_fields, fieldsById, groupFieldId])

  /** Composer row: always offer these fields when they exist in schema, not only when in visible_fields. */
  const DRAFT_FIELD_ORDER = ['assignee', 'due_date', 'priority', 'tags'] as const
  const draftFieldDefs = useMemo(() => {
    const out: FieldDef[] = []
    for (const id of DRAFT_FIELD_ORDER) {
      const f = fieldsById.get(id)
      if (f && isSpaceFieldVisibleInUi(f)) out.push(f)
    }
    return out
  }, [fieldsById])

  const subtaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const promote = viewPromotesFollowUpSubtasks(view)
    for (const item of items) {
      if (promote) continue
      if (item.parent_item_id) {
        counts[item.parent_item_id] = (counts[item.parent_item_id] ?? 0) + 1
      }
    }
    return counts
  }, [items, view])

  const topLevelItems = useMemo(() => {
    if (viewPromotesFollowUpSubtasks(view)) {
      return items.filter(
        (i) => !i.parent_item_id || resolveSpaceEntryType(i) === 'follow_up',
      )
    }
    return items.filter((i) => !i.parent_item_id)
  }, [items, view])

  const boardColumns = useMemo(() => {
    const gf = groupField
    if (!gf) return []
    if (
      gf.type === 'assignee' ||
      gf.type === 'date' ||
      gf.type === 'created_at' ||
      gf.type === 'updated_at'
    ) {
      return groupItems(topLevelItems, gf, view.group_sort ?? 'asc', roster, false).map((g) => ({
        key: g.key,
        columnItems: g.items,
        mode: 'group' as const,
        group: g,
      }))
    }
    if (gf.type === 'multi_select') {
      return groupItems(topLevelItems, gf, view.group_sort ?? 'asc', roster, false).map((g) => ({
        key: g.key,
        columnItems: g.items,
        mode: 'group' as const,
        group: g,
      }))
    }
    return (gf.options ?? []).map((o) => ({
      key: o.id,
      columnItems: topLevelItems.filter((item) => readFieldValue(item, groupFieldId) === o.id),
      mode: 'select' as const,
      option: o,
    }))
  }, [groupField, topLevelItems, view.group_sort, roster, groupFieldId])

  const subtasksByParent = useMemo(() => {
    const map: Record<string, SpaceItem[]> = {}
    for (const item of items) {
      if (item.parent_item_id) {
        ;(map[item.parent_item_id] ??= []).push(item)
      }
    }
    return map
  }, [items])

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const prevSubtasksModeRef = useRef(subtasksMode)
  const [inlineTitleEditId, setInlineTitleEditId] = useState<string | null>(null)

  useEffect(() => {
    const prev = prevSubtasksModeRef.current
    prevSubtasksModeRef.current = subtasksMode
    if (prev !== subtasksMode && (subtasksMode === 'collapsed' || subtasksMode === 'separate')) {
      setExpandedIds(new Set())
    }
  }, [subtasksMode])

  useEffect(() => {
    if (subtasksMode === 'collapsed' || subtasksMode === 'separate') return
    const parentIds = Object.keys(subtaskCounts).filter((id) => (subtaskCounts[id] ?? 0) > 0)
    if (parentIds.length === 0) return
    setExpandedIds((prev) => {
      const missing = parentIds.filter((id) => !prev.has(id))
      if (missing.length === 0) return prev
      const next = new Set(prev)
      for (const id of missing) next.add(id)
      return next
    })
  }, [subtasksMode, subtaskCounts])

  const [draftGroupKey, setDraftGroupKey] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftFieldValues, setDraftFieldValues] = useState<Record<string, unknown>>({})
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [subtaskDraftParentId, setSubtaskDraftParentId] = useState<string | null>(null)
  const [subtaskDraftTitle, setSubtaskDraftTitle] = useState('')
  const [subtaskDraftFieldValues, setSubtaskDraftFieldValues] = useState<Record<string, unknown>>(
    {},
  )
  const subtaskTitleInputRef = useRef<HTMLInputElement>(null)

  const toggleSubtasks = useCallback((itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }, [])

  const openDraft = useCallback((key: string) => {
    setDraftGroupKey((k) => (k === key ? null : key))
    setDraftTitle('')
    setDraftFieldValues({})
  }, [])

  useLayoutEffect(() => {
    if (draftGroupKey) titleInputRef.current?.focus()
  }, [draftGroupKey])

  const commitDraft = useCallback(
    async (groupKey: string) => {
      const trimmed = draftTitle.trim()
      if (!trimmed) return
      const extras = fieldDraftsToCreateExtra(draftFieldValues, draftFieldDefs)
      await onAddItemInGroup(trimmed, groupFieldId, groupKey, extras)
      setDraftGroupKey(null)
      setDraftTitle('')
      setDraftFieldValues({})
    },
    [draftTitle, draftFieldValues, draftFieldDefs, groupFieldId, onAddItemInGroup],
  )

  const openSubtaskDraft = useCallback((parentId: string) => {
    setSubtaskDraftParentId((cur) => (cur === parentId ? null : parentId))
    setSubtaskDraftTitle('')
    setSubtaskDraftFieldValues({})
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.add(parentId)
      return next
    })
  }, [])

  useLayoutEffect(() => {
    if (subtaskDraftParentId) subtaskTitleInputRef.current?.focus()
  }, [subtaskDraftParentId])

  const commitSubtaskDraft = useCallback(
    async (parentId: string) => {
      const trimmed = subtaskDraftTitle.trim()
      if (!trimmed) return
      const extras = fieldDraftsToCreateExtra(subtaskDraftFieldValues, draftFieldDefs)
      await onCreateSubtask(parentId, trimmed, extras)
      setSubtaskDraftParentId(null)
      setSubtaskDraftTitle('')
      setSubtaskDraftFieldValues({})
    },
    [subtaskDraftTitle, subtaskDraftFieldValues, draftFieldDefs, onCreateSubtask],
  )

  const inlineTaskComposerFocusNonce = useSpacesStore((s) => s.inlineTaskComposerFocusNonce)
  const prevKanbanToolbarNonce = useRef<number | null>(null)

  useEffect(() => {
    if (prevKanbanToolbarNonce.current === null) {
      prevKanbanToolbarNonce.current = inlineTaskComposerFocusNonce
      return
    }
    if (inlineTaskComposerFocusNonce === prevKanbanToolbarNonce.current) return
    prevKanbanToolbarNonce.current = inlineTaskComposerFocusNonce
    const first = boardColumns[0]?.key
    if (!first) return
    setDraftGroupKey(first)
    setDraftTitle('')
    setDraftFieldValues({})
  }, [inlineTaskComposerFocusNonce, boardColumns])

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto px-4 py-3">
      {boardColumns.map((col) => {
        const columnItems = col.columnItems
        const colKey = col.key
        const option = col.mode === 'select' ? col.option : undefined
        const groupData = col.mode === 'group' ? col.group : undefined
        const headerColor = col.mode === 'group' && groupData ? groupData.color : option?.color
        const hasNamedColumnBg = !!(headerColor && headerColor in COLUMN_BG)
        const tintSource = kanbanBoardColumnTintSource(headerColor, hasNamedColumnBg)
        const useKanbanColTint = tintSource !== null
        const colBg = useKanbanColTint
          ? COLUMN_BG.muted
          : col.mode === 'group' && groupData
            ? (COLUMN_BG[groupData.color] ?? COLUMN_BG.muted)
            : (COLUMN_BG[option?.color ?? 'muted'] ?? COLUMN_BG.muted)
        const labelChip = spaceGroupBadgeChipProps(headerColor)
        return (
          <div
            key={colKey}
            className={cn(
              'relative flex h-full max-h-full w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border',
              colBg,
            )}
            onDragOver={(event) => !readOnly && event.preventDefault()}
            onDrop={
              readOnly
                ? undefined
                : (event) => {
                    const itemId = event.dataTransfer.getData('text/plain')
                    if (!itemId) return
                    const dropped = items.find((item) => item.id === itemId)
                    if (!dropped) return
                    const patchValue =
                      groupField?.type === 'assignee'
                        ? assigneeFieldValueForGroupKey(colKey, roster)
                        : col.mode === 'select'
                          ? option!.id
                          : colKey
                    void onUpdateItem(itemId, toFieldPatch(dropped, groupFieldId, patchValue))
                  }
            }
          >
            {useKanbanColTint && tintSource ? (
              <div
                className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-20 dark:opacity-10"
                style={{ background: tintSource }}
                aria-hidden
              />
            ) : null}
            <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2.5">
                {col.mode === 'group' && groupData && groupData.assigneeAvatarUrl !== undefined ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <AssigneeGroupHeaderTitle
                      label={groupData.label}
                      avatarUrl={groupData.assigneeAvatarUrl}
                      isUnassigned={groupData.key === '__unassigned__'}
                    />
                    <span className="shrink-0 text-[10px] text-[var(--color-muted-foreground)]">
                      {columnItems.length}
                    </span>
                  </div>
                ) : col.mode === 'group' && groupData ? (
                  <span
                    className={cn(KANBAN_COLUMN_LABEL_CLASS, labelChip.chipClassName)}
                    style={labelChip.style}
                  >
                    <span className="min-w-0 truncate">{groupData.label}</span>
                    <span className="ml-1.5 shrink-0 font-bold">{columnItems.length}</span>
                  </span>
                ) : (
                  <span
                    className={cn(KANBAN_COLUMN_LABEL_CLASS, labelChip.chipClassName)}
                    style={labelChip.style}
                  >
                    <span className="min-w-0 truncate">{option?.label}</span>
                    <span className="ml-1.5 shrink-0 font-bold">{columnItems.length}</span>
                  </span>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => openDraft(colKey)}
                    className="rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    title="Add task"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                {draftGroupKey === colKey && !readOnly && (
                  <div
                    className="card-glass border-[var(--color-primary)]/50 rounded-lg border p-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-2">
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void commitDraft(colKey)
                          }
                        }}
                        placeholder="Task name…"
                        className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                      />
                      <button
                        type="button"
                        onClick={() => void commitDraft(colKey)}
                        disabled={!draftTitle.trim()}
                        className="badge-glass badge-glass-green inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-opacity disabled:pointer-events-none disabled:opacity-40"
                      >
                        Save
                        <CornerDownLeft className="h-3 w-3" />
                      </button>
                    </div>
                    {draftFieldDefs.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1.5">
                        {draftFieldDefs.map((field) => {
                          const v = draftFieldValues[field.id]
                          return (
                            <div key={field.id} className="w-full min-w-0">
                              <KanbanNewTaskField
                                field={field}
                                value={
                                  v ??
                                  (field.type === 'assignee'
                                    ? []
                                    : field.type === 'multi_select'
                                      ? []
                                      : null)
                                }
                                onValue={(next) => {
                                  setDraftFieldValues((prev) => ({ ...prev, [field.id]: next }))
                                }}
                                draftFieldValues={draftFieldValues}
                                onDraftFieldPatch={(p) =>
                                  setDraftFieldValues((prev) => ({ ...prev, ...p }))
                                }
                                roster={roster}
                                currentUserId={currentUserId}
                                allFields={fieldsById}
                                onCreateOption={onCreateOption}
                                onUpdateOption={onUpdateOption}
                                onDeleteOption={onDeleteOption}
                                onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {columnItems.map((item) => {
                  const subCount = subtaskCounts[item.id] ?? 0
                  const cardSubtasksOpen =
                    subtaskDraftParentId === item.id ||
                    (subtasksMode === 'separate' ? subCount > 0 : expandedIds.has(item.id))
                  const statusValue = readFieldValue(item, 'status')
                  const statusOption =
                    typeof statusValue === 'string' ? statusOptionsById.get(statusValue) : null
                  const isAgentWorking = item.task_execution_status === 'running'

                  return (
                    <div key={item.id} className="flex flex-col gap-1.5">
                      <article
                        className={cn(
                          'group/card card-glass group relative rounded-lg p-2.5',
                          readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
                        )}
                        draggable={!readOnly}
                        onDragStart={
                          readOnly
                            ? undefined
                            : (event) => {
                                event.dataTransfer.effectAllowed = 'copyMove'
                                event.dataTransfer.setData('text/plain', item.id)
                                const { id, label } = buildSpaceTaskChatDragPayload(item)
                                event.dataTransfer.setData(
                                  'application/x-vibey-artifact',
                                  JSON.stringify({
                                    id,
                                    type: 'space-task',
                                    label,
                                  }),
                                )
                              }
                        }
                        onClick={(e) => {
                          if (!onOpenDetail) return
                          const target = e.target as HTMLElement
                          if (
                            target.closest('button, a, input, select, [data-dropdown], [data-cell]')
                          )
                            return
                          onOpenDetail(item)
                        }}
                      >
                        {!readOnly && (
                          <div
                            className="bg-[var(--background)]/95 pointer-events-none absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5 rounded-md border border-[var(--border)] p-0.5 opacity-0 shadow-sm transition-opacity group-hover/card:pointer-events-auto group-hover/card:opacity-100"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <Tooltip label="Mark complete" side="top">
                              <button
                                type="button"
                                aria-label="Mark complete"
                                className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void onUpdateItem(
                                    item.id,
                                    toFieldPatch(item, 'status', doneStatusId),
                                  )
                                }}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip label="New subtask" side="top">
                              <button
                                type="button"
                                aria-label="New subtask"
                                className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openSubtaskDraft(item.id)
                                }}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip label="Rename" side="top">
                              <button
                                type="button"
                                aria-label="Rename"
                                className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setInlineTitleEditId(item.id)
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip label="More" side="top">
                              <button
                                type="button"
                                aria-label="More"
                                className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                }}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </Tooltip>
                          </div>
                        )}
                        <div className="flex min-w-0 items-start gap-1.5">
                          {isAgentWorking && (
                            <span className="mt-1 shrink-0">
                              <TaskExecutionStatusIndicator
                                color={statusOption?.color}
                                active
                                size="sm"
                              />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <SpaceCell
                              field={fieldsById.get('title')!}
                              value={readFieldValue(item, 'title')}
                              roster={roster}
                              currentUserId={currentUserId}
                              readonly={
                                readOnly || (!!onOpenDetail && inlineTitleEditId !== item.id)
                              }
                              nameAsListOpenTarget={
                                !readOnly && !!onOpenDetail && inlineTitleEditId !== item.id
                              }
                              nameListHoverGroup="self"
                              listInlineEditActive={inlineTitleEditId === item.id}
                              onListInlineTitleEditEnd={() => setInlineTitleEditId(null)}
                              onChange={(next) => {
                                void onUpdateItem(item.id, toFieldPatch(item, 'title', next))
                              }}
                            />
                          </div>
                        </div>

                        {cardFieldDefs.length > 0 && (
                          <div
                            data-cell
                            className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            {cardFieldDefs.map((field) => {
                              const filled = kanbanFieldHasValue(item, field)
                              const wrapClass =
                                field.type === 'assignee'
                                  ? undefined
                                  : filled
                                    ? 'btn-icon-glass-flat !w-auto max-w-full px-1.5'
                                    : 'btn-icon-glass-flat'
                              return (
                                <div key={`${item.id}:${field.id}`} className={wrapClass}>
                                  <SpaceCell
                                    field={field}
                                    value={readFieldValue(item, field.id)}
                                    roster={roster}
                                    currentUserId={currentUserId}
                                    fieldRowVariant="kanban"
                                    onCreateOption={onCreateOption}
                                    onUpdateOption={onUpdateOption}
                                    onDeleteOption={onDeleteOption}
                                    onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                                    spaceItem={item}
                                    onItemPatch={(p) => void onUpdateItem(item.id, p)}
                                    statusField={fieldsById.get('status')}
                                    onPushToAgent={onPushToAgent}
                                    onOpenDetail={onOpenDetail}
                                    allFields={Array.from(fieldsById.values())}
                                    onChange={(next) => {
                                      void onUpdateItem(item.id, toFieldPatch(item, field.id, next))
                                    }}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {subCount > 0 && subtasksMode !== 'separate' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              void toggleSubtasks(item.id)
                            }}
                            className="mt-1.5 flex items-center gap-1 text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                          >
                            {expandedIds.has(item.id) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <span className="text-[10px]">
                              {subCount} subtask{subCount > 1 ? 's' : ''}
                            </span>
                          </button>
                        )}
                        {subCount > 0 && subtasksMode === 'separate' && (
                          <div className="mt-1.5 flex items-center gap-1 text-[var(--color-muted-foreground)]">
                            <span className="text-[10px]">
                              {subCount} subtask{subCount > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </article>

                      {cardSubtasksOpen && (
                        <div
                          className={cn(
                            'flex flex-col gap-1.5',
                            subtasksMode === 'separate' ? '' : 'ml-3',
                          )}
                        >
                          {(subtasksByParent[item.id] ?? []).map((sub) => {
                            const subStatusValue = readFieldValue(sub, 'status')
                            const subStatusOption =
                              typeof subStatusValue === 'string'
                                ? statusOptionsById.get(subStatusValue)
                                : null
                            const isSubAgentWorking = sub.task_execution_status === 'running'

                            return (
                              <article
                                key={sub.id}
                                className="group/sub card-glass group relative rounded-lg p-2"
                                onClick={(e) => {
                                  if (!onOpenDetail) return
                                  const target = e.target as HTMLElement
                                  if (
                                    target.closest(
                                      'button, a, input, select, [data-dropdown], [data-cell]',
                                    )
                                  )
                                    return
                                  onOpenDetail(sub)
                                }}
                              >
                                <div
                                  className="bg-[var(--background)]/95 pointer-events-none absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5 rounded-md border border-[var(--border)] p-0.5 opacity-0 shadow-sm transition-opacity group-hover/sub:pointer-events-auto group-hover/sub:opacity-100"
                                  onPointerDown={(e) => e.stopPropagation()}
                                >
                                  <Tooltip label="Mark complete" side="top">
                                    <button
                                      type="button"
                                      aria-label="Mark complete"
                                      className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void onUpdateItem(
                                          sub.id,
                                          toFieldPatch(sub, 'status', doneStatusId),
                                        )
                                      }}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  </Tooltip>
                                  <Tooltip label="Rename" side="top">
                                    <button
                                      type="button"
                                      aria-label="Rename"
                                      className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setInlineTitleEditId(sub.id)
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  </Tooltip>
                                  <Tooltip label="More" side="top">
                                    <button
                                      type="button"
                                      aria-label="More"
                                      className="rounded p-1 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                      }}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </button>
                                  </Tooltip>
                                </div>
                                <div className="flex min-w-0 items-start gap-1.5">
                                  {subtasksMode === 'separate' && (
                                    <GitBranch
                                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                                      aria-hidden
                                    />
                                  )}
                                  {isSubAgentWorking && (
                                    <span className="mt-1 shrink-0">
                                      <TaskExecutionStatusIndicator
                                        color={subStatusOption?.color}
                                        active
                                        size="sm"
                                      />
                                    </span>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <SpaceCell
                                      field={fieldsById.get('title')!}
                                      value={readFieldValue(sub, 'title')}
                                      roster={roster}
                                      currentUserId={currentUserId}
                                      readonly={!!onOpenDetail && inlineTitleEditId !== sub.id}
                                      nameAsListOpenTarget={
                                        !!onOpenDetail && inlineTitleEditId !== sub.id
                                      }
                                      nameListHoverGroup="self"
                                      listInlineEditActive={inlineTitleEditId === sub.id}
                                      onListInlineTitleEditEnd={() => setInlineTitleEditId(null)}
                                      onChange={(next) => {
                                        void onUpdateItem(sub.id, toFieldPatch(sub, 'title', next))
                                      }}
                                    />
                                  </div>
                                </div>
                                {cardFieldDefs.length > 0 && (
                                  <div
                                    data-cell
                                    className="mt-1.5 flex min-h-6 flex-wrap items-center gap-1.5"
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    {cardFieldDefs.map((field) => {
                                      const filled = kanbanFieldHasValue(sub, field)
                                      const wrapClass =
                                        field.type === 'assignee'
                                          ? undefined
                                          : filled
                                            ? 'btn-icon-glass-flat !w-auto max-w-full px-1.5'
                                            : 'btn-icon-glass-flat'
                                      return (
                                        <div key={`${sub.id}:${field.id}`} className={wrapClass}>
                                          <SpaceCell
                                            field={field}
                                            value={readFieldValue(sub, field.id)}
                                            roster={roster}
                                            currentUserId={currentUserId}
                                            fieldRowVariant="kanban"
                                            onCreateOption={onCreateOption}
                                            onUpdateOption={onUpdateOption}
                                            onDeleteOption={onDeleteOption}
                                            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                                            spaceItem={sub}
                                            onItemPatch={(p) => void onUpdateItem(sub.id, p)}
                                            statusField={fieldsById.get('status')}
                                            onPushToAgent={onPushToAgent}
                                            onOpenDetail={onOpenDetail}
                                            allFields={Array.from(fieldsById.values())}
                                            onChange={(next) => {
                                              void onUpdateItem(
                                                sub.id,
                                                toFieldPatch(sub, field.id, next),
                                              )
                                            }}
                                          />
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </article>
                            )
                          })}

                          {subtaskDraftParentId === item.id && (
                            <div
                              className="card-glass border-[var(--color-primary)]/50 rounded-lg border p-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-start gap-2">
                                <input
                                  ref={subtaskTitleInputRef}
                                  type="text"
                                  value={subtaskDraftTitle}
                                  onChange={(e) => setSubtaskDraftTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault()
                                      void commitSubtaskDraft(item.id)
                                    }
                                    if (e.key === 'Escape') setSubtaskDraftParentId(null)
                                  }}
                                  placeholder="Subtask name…"
                                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--color-muted-foreground)]"
                                />
                                <button
                                  type="button"
                                  onClick={() => void commitSubtaskDraft(item.id)}
                                  disabled={!subtaskDraftTitle.trim()}
                                  className="badge-glass badge-glass-green inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-opacity disabled:pointer-events-none disabled:opacity-40"
                                >
                                  Save
                                  <CornerDownLeft className="h-3 w-3" />
                                </button>
                              </div>
                              {draftFieldDefs.length > 0 && (
                                <div className="mt-2 flex flex-col gap-1.5">
                                  {draftFieldDefs.map((field) => {
                                    const v = subtaskDraftFieldValues[field.id]
                                    return (
                                      <div key={field.id} className="w-full min-w-0">
                                        <KanbanNewTaskField
                                          field={field}
                                          value={
                                            v ??
                                            (field.type === 'assignee'
                                              ? []
                                              : field.type === 'multi_select'
                                                ? []
                                                : null)
                                          }
                                          onValue={(next) => {
                                            setSubtaskDraftFieldValues((prev) => ({
                                              ...prev,
                                              [field.id]: next,
                                            }))
                                          }}
                                          draftFieldValues={subtaskDraftFieldValues}
                                          onDraftFieldPatch={(p) =>
                                            setSubtaskDraftFieldValues((prev) => ({
                                              ...prev,
                                              ...p,
                                            }))
                                          }
                                          roster={roster}
                                          currentUserId={currentUserId}
                                          allFields={fieldsById}
                                          onCreateOption={onCreateOption}
                                          onUpdateOption={onUpdateOption}
                                          onDeleteOption={onDeleteOption}
                                          onTagCustomSwatchesChange={onTagCustomSwatchesChange}
                                        />
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
