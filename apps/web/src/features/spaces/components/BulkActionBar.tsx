'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRightLeft,
  Calendar,
  ChevronRight,
  CopyPlus,
  FolderInput,
  FolderMinus,
  LayoutList,
  Loader2,
  Tags,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import { useOtherSpacesByCampaign } from '../hooks/use-other-spaces-by-campaign'
import {
  ensureGeneralSpace,
  transferSpaceItem,
  type DuplicateSpaceItemInclude,
} from '../services/spaces.service'
import type { Space, SpaceItem } from '../types'
import type { FieldDef, SelectOption } from '../types/space-schema'
import { AssigneeCell } from './cells/AssigneeCell'
import { DueDateCell } from './cells/DueDateCell'
import type { MissionSendOptions } from './cells/MissionSendDropdown'
import { MultiSelectCell } from './cells/MultiSelectCell'
import { SelectCell } from './cells/SelectCell'
import { SpaceCell } from './cells/SpaceCell'
import { OtherSpacesSubmenuList } from './OtherSpacesSubmenuList'
import { readFieldValue, toFieldPatch } from './space-item-values'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bulkApply(
  ids: Set<string>,
  patchFn: (item: SpaceItem) => Partial<SpaceItem>,
  onUpdate: (id: string, patch: Partial<SpaceItem>) => Promise<void>,
  items: SpaceItem[],
) {
  const targets = items.filter((i) => ids.has(i.id))
  const results = await Promise.allSettled(targets.map((item) => onUpdate(item.id, patchFn(item))))
  const failed = results.filter((r) => r.status === 'rejected').length
  return { total: targets.length, failed }
}

function toastResult(action: string, total: number, failed: number, itemLabel = 'task') {
  const noun = total > 1 ? `${itemLabel}s` : itemLabel
  if (failed === 0) toast.success(`${action} ${total} ${noun}`)
  else toast.error(`${action} failed for ${failed} of ${total}`)
}

function isSyntheticDocId(id: string): boolean {
  return id.startsWith('cdoc:') || id.startsWith('mdel:')
}

const BTN =
  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]'

// ---------------------------------------------------------------------------
// Floating popover shell (anchored to a button ref)
// ---------------------------------------------------------------------------

function FloatingPanel({
  anchorRef,
  onClose,
  children,
  width = 240,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  children: React.ReactNode
  width?: number
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.top
    const placeAbove = spaceBelow < 320 && rect.top > 320
    const rawLeft = rect.left + rect.width / 2 - width / 2
    const maxLeft = window.innerWidth - width - 8
    setPos({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rawLeft, maxLeft)),
    })
  }, [anchorRef, width])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!panelRef.current?.contains(t) && !anchorRef.current?.contains(t)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef])

  if (!pos) return null
  return createPortal(
    <div
      ref={panelRef}
      className="dropdown-menu-solid fixed flex max-h-80 flex-col overflow-hidden"
      style={{
        top: pos.top,
        left: pos.left,
        width,
        zIndex: 100000,
        transform: pos.top < 100 ? undefined : 'translateY(-100%)',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}

// ---------------------------------------------------------------------------
// Custom fields: field list, then same SpaceCell as list rows
// ---------------------------------------------------------------------------

const CORE_FIELD_IDS = new Set([
  'title',
  'status',
  'priority',
  'assignee',
  'due_date',
  'start_date',
  'tags',
  'mission',
  'created_at',
  'updated_at',
])

function bulkDuplicateInclude(
  item: SpaceItem,
  schemaFields: FieldDef[],
): DuplicateSpaceItemInclude {
  const customData = (item.custom_data ?? {}) as Record<string, unknown>
  const custom_field_ids = schemaFields
    .filter((f) => !CORE_FIELD_IDS.has(f.id))
    .map((f) => f.id)
    .filter((id) => Object.prototype.hasOwnProperty.call(customData, id))
  const include: DuplicateSpaceItemInclude = {
    status: true,
    priority: true,
    assignees: true,
    start_date: true,
    due_date: true,
    description: true,
    notes: true,
    recurrence: true,
    mission: true,
    subtasks: true,
    comments: true,
    documents: true,
    deliverables: true,
  }
  if (custom_field_ids.length > 0) include.custom_field_ids = custom_field_ids
  return include
}

const CUSTOM_LIST_W = 240
const CUSTOM_SUB_W = 300

function CustomFieldsPanel({
  anchorRef,
  allFields,
  firstItem,
  selectedIds,
  items,
  onUpdateItem,
  onClose,
  roster,
  currentUserId,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onPushToAgent,
  statusField,
  setBusy,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  allFields: FieldDef[]
  firstItem: SpaceItem
  selectedIds: Set<string>
  items: SpaceItem[]
  onUpdateItem: (id: string, patch: Partial<SpaceItem>) => Promise<void>
  onClose: () => void
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent?: (itemId: string, options?: MissionSendOptions) => Promise<void>
  statusField?: FieldDef
  setBusy: (v: boolean) => void
}) {
  const custom = allFields.filter((f) => !CORE_FIELD_IDS.has(f.id))
  const [activeField, setActiveField] = useState<FieldDef | null>(null)
  const listPanelRef = useRef<HTMLDivElement>(null)
  const subPanelRef = useRef<HTMLDivElement>(null)
  const customFieldRowRef = useRef<Map<string, HTMLButtonElement>>(new Map())
  const [listPos, setListPos] = useState<{
    top: number
    left: number
    transform?: string
  } | null>(null)
  const [subPos, setSubPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < 300 && rect.top > 100
    const rawLeft = rect.left + rect.width / 2 - CUSTOM_LIST_W / 2
    const maxLeft = window.innerWidth - CUSTOM_LIST_W - 8
    const top = placeAbove ? rect.top - 4 : rect.bottom + 4
    const left = Math.max(8, Math.min(rawLeft, maxLeft))
    setListPos({
      top,
      left,
      transform: top < 100 ? undefined : placeAbove ? 'translateY(-100%)' : undefined,
    })
  }, [anchorRef])

  useLayoutEffect(() => {
    if (!activeField || !listPanelRef.current) {
      setSubPos(null)
      return
    }
    const listR = listPanelRef.current.getBoundingClientRect()
    const rowEl = customFieldRowRef.current.get(activeField.id)
    const anchorR = rowEl?.getBoundingClientRect() ?? listR
    const margin = 4
    let left = listR.right + margin
    if (left + CUSTOM_SUB_W > window.innerWidth - 8) {
      left = listR.left - CUSTOM_SUB_W - margin
    }
    left = Math.max(8, left)
    const top = Math.max(8, Math.min(anchorR.top, window.innerHeight - 200))
    setSubPos({ top, left })
  }, [activeField, listPos])

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (
        listPanelRef.current?.contains(t) ||
        subPanelRef.current?.contains(t) ||
        anchorRef.current?.contains(t)
      ) {
        return
      }
      onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (activeField) setActiveField(null)
      else onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, anchorRef, activeField])

  const runBulkPatch = useCallback(
    (makePatch: (item: SpaceItem) => Partial<SpaceItem>, actionLabel: string) => {
      void (async () => {
        setBusy(true)
        const { total, failed } = await bulkApply(
          selectedIds,
          (item) => makePatch(item),
          onUpdateItem,
          items,
        )
        toastResult(actionLabel, total, failed)
        setBusy(false)
        setActiveField(null)
      })()
    },
    [items, onUpdateItem, selectedIds, setBusy],
  )

  if (!listPos) return null

  return createPortal(
    <>
      <div
        ref={listPanelRef}
        className="dropdown-menu-solid fixed z-[99990] flex max-h-80 max-w-[min(100vw-1rem,240px)] flex-col overflow-hidden"
        style={{
          top: listPos.top,
          left: listPos.left,
          width: CUSTOM_LIST_W,
          transform: listPos.transform,
        }}
      >
        <div className="max-h-64 overflow-y-auto py-1">
          {custom.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--color-muted-foreground)]">
              No custom fields
            </div>
          )}
          {custom.map((f) => (
            <button
              key={f.id}
              type="button"
              ref={(el) => {
                const m = customFieldRowRef.current
                if (el) m.set(f.id, el)
                else m.delete(f.id)
              }}
              onClick={() => {
                setActiveField((prev) => (prev?.id === f.id ? null : f))
              }}
              className={cn(
                'flex w-full items-center justify-between gap-1 px-3 py-1.5 text-left text-sm',
                activeField?.id === f.id
                  ? 'bg-[var(--color-hover-subtle)] text-[var(--foreground)]'
                  : 'text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]',
              )}
            >
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <ChevronRight className="h-3 w-3 shrink-0 text-[var(--color-muted-foreground)]" />
            </button>
          ))}
        </div>
      </div>
      {activeField && subPos && (
        <div
          ref={subPanelRef}
          className="dropdown-menu-solid fixed z-[99995] flex max-h-[min(80vh,520px)] w-[300px] flex-col overflow-hidden"
          style={{ top: subPos.top, left: subPos.left }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <SpaceFieldBulkEditor
              key={activeField.id}
              field={activeField}
              firstItem={firstItem}
              allFields={allFields}
              roster={roster}
              currentUserId={currentUserId}
              onEditStatuses={onEditStatuses}
              onEditCategories={onEditCategories}
              onCreateOption={onCreateOption}
              onUpdateOption={onUpdateOption}
              onDeleteOption={onDeleteOption}
              onTagCustomSwatchesChange={onTagCustomSwatchesChange}
              onPushToAgent={onPushToAgent}
              statusField={statusField}
              runBulkPatch={runBulkPatch}
            />
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}

function SpaceFieldBulkEditor({
  field: sf,
  firstItem,
  allFields,
  roster,
  currentUserId,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onPushToAgent,
  statusField,
  runBulkPatch,
}: {
  field: FieldDef
  firstItem: SpaceItem
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent?: (itemId: string, options?: MissionSendOptions) => Promise<void>
  statusField?: FieldDef
  runBulkPatch: (makePatch: (item: SpaceItem) => Partial<SpaceItem>, actionLabel: string) => void
}) {
  const isMergedDate = sf.type === 'date' && (sf.id === 'due_date' || sf.id === 'start_date')
  return (
    <SpaceCell
      field={sf}
      value={readFieldValue(firstItem, sf.id)}
      onChange={(v) => {
        runBulkPatch(
          (item) => toFieldPatch(item, sf.id, v) as Partial<SpaceItem>,
          'Updated field for',
        )
      }}
      roster={roster}
      currentUserId={currentUserId}
      onEditStatuses={onEditStatuses}
      onEditCategories={onEditCategories}
      onCreateOption={onCreateOption}
      onUpdateOption={onUpdateOption}
      onDeleteOption={onDeleteOption}
      onTagCustomSwatchesChange={onTagCustomSwatchesChange}
      fieldRowVariant="default"
      spaceItem={isMergedDate ? firstItem : undefined}
      onItemPatch={
        isMergedDate
          ? (patch) => {
              runBulkPatch(() => patch, 'Updated dates for')
            }
          : undefined
      }
      statusField={statusField}
      onPushToAgent={onPushToAgent}
      allFields={allFields}
      openOnMount
      bulkInlineEditor
    />
  )
}

// ---------------------------------------------------------------------------
// Move to space
// ---------------------------------------------------------------------------

function MovePanel({
  anchorRef,
  activeSpaceId,
  sourceCampaignId,
  onPick,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  activeSpaceId: string
  sourceCampaignId: string | null
  onPick: (spaceId: string) => void
  onClose: () => void
}) {
  const { groups: otherSpaceGroups } = useOtherSpacesByCampaign(activeSpaceId)
  const rowCls =
    'gap-spacing-2 body-3 rounded-spacing-2 text-muted-foreground hover:bg-[var(--color-hover-subtle)] hover:text-foreground px-spacing-2 py-spacing-1 flex w-full items-center text-left transition-colors'
  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose}>
      <div className="px-spacing-1 py-spacing-1 max-h-64 overflow-y-auto">
        <OtherSpacesSubmenuList
          groups={otherSpaceGroups}
          sourceCampaignId={sourceCampaignId}
          menuOpen
          rowClassName={rowCls}
          emptyMessage="No other spaces"
          onPick={onPick}
        />
      </div>
    </FloatingPanel>
  )
}

// ---------------------------------------------------------------------------
// Convert panel
// ---------------------------------------------------------------------------

function ConvertPanel({
  anchorRef,
  selectedItems,
  onConvertToSubtasks,
  onPromoteToTasks,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  selectedItems: SpaceItem[]
  onConvertToSubtasks: () => void
  onPromoteToTasks: () => void
  onClose: () => void
}) {
  const allTopLevel = selectedItems.every((i) => !i.parent_item_id)
  const allSubtasks = selectedItems.every((i) => !!i.parent_item_id)

  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose} width={220}>
      <div className="py-1">
        <button
          type="button"
          disabled={!allTopLevel || selectedItems.length < 2}
          onClick={() => {
            onConvertToSubtasks()
            onClose()
          }}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
            allTopLevel && selectedItems.length >= 2
              ? 'text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]'
              : 'text-[var(--color-muted-foreground)]/50 cursor-not-allowed',
          )}
        >
          Convert to Subtasks
        </button>
        <button
          type="button"
          disabled={!allSubtasks}
          onClick={() => {
            onPromoteToTasks()
            onClose()
          }}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
            allSubtasks
              ? 'text-[var(--foreground)] hover:bg-[var(--color-hover-subtle)]'
              : 'text-[var(--color-muted-foreground)]/50 cursor-not-allowed',
          )}
        >
          Promote to Tasks
        </button>
      </div>
    </FloatingPanel>
  )
}

// ---------------------------------------------------------------------------
// Delete confirm
// ---------------------------------------------------------------------------

function RemoveFromSpacePanel({
  anchorRef,
  count,
  onConfirm,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  count: number
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose} width={280}>
      <div className="p-3">
        <p className="text-xs text-[var(--foreground)]">
          Remove {count} doc{count > 1 ? 's' : ''} from this space? They will be kept in your
          General workspace.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded bg-[var(--color-hover-subtle)] px-2 py-1 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--color-border)]"
          >
            Remove
          </button>
        </div>
      </div>
    </FloatingPanel>
  )
}

function DeletePanel({
  anchorRef,
  count,
  itemLabel,
  onConfirm,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  count: number
  itemLabel: 'task' | 'doc'
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose} width={220}>
      <div className="p-3">
        <p className="text-xs text-[var(--foreground)]">
          Delete {count} {itemLabel}
          {count > 1 ? 's' : ''}? This cannot be undone.
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded px-2 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-hover-subtle)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/30"
          >
            Delete
          </button>
        </div>
      </div>
    </FloatingPanel>
  )
}

// ---------------------------------------------------------------------------
// Main bar
// ---------------------------------------------------------------------------

export interface BulkActionBarProps {
  selectedIds: Set<string>
  items: SpaceItem[]
  allFields: FieldDef[]
  roster: TeamRosterEntry[]
  currentUserId: string | null
  spaces: Space[]
  activeSpaceId: string | null
  onUpdateItem: (id: string, patch: Partial<SpaceItem>) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onCreateItem: (title: string, extra?: Record<string, unknown>) => Promise<SpaceItem | null>
  onClearSelection: () => void
  onRefresh: () => Promise<void>
  onEditStatuses?: () => void
  onEditCategories?: () => void
  onCreateOption?: (fieldId: string, option: SelectOption) => void
  onUpdateOption?: (fieldId: string, optionId: string, updates: Partial<SelectOption>) => void
  onDeleteOption?: (fieldId: string, optionId: string) => void
  onTagCustomSwatchesChange?: (fieldId: string, swatches: string[]) => void
  onPushToAgent?: (itemId: string, options?: MissionSendOptions) => Promise<void>
  duplicateItem: (
    spaceId: string,
    itemId: string,
    input: { include: DuplicateSpaceItemInclude; title?: string },
  ) => Promise<SpaceItem | null>
  itemKind?: 'task' | 'doc'
}

type PanelKey = 'custom' | 'move' | 'convert' | 'delete' | 'removeFromSpace'

export function BulkActionBar({
  selectedIds,
  items,
  allFields,
  roster,
  currentUserId,
  spaces,
  activeSpaceId,
  onUpdateItem,
  onDeleteItem,
  onCreateItem,
  onClearSelection,
  onRefresh,
  onEditStatuses,
  onEditCategories,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  onTagCustomSwatchesChange,
  onPushToAgent,
  duplicateItem,
  itemKind = 'task',
}: BulkActionBarProps) {
  const [activePanel, setActivePanel] = useState<PanelKey | null>(null)
  const [busy, setBusy] = useState(false)
  const [removingFromSpace, setRemovingFromSpace] = useState(false)
  const [generalSpaceId, setGeneralSpaceId] = useState<string | null>(null)

  const customRef = useRef<HTMLButtonElement>(null)
  const moveRef = useRef<HTMLButtonElement>(null)
  const convertRef = useRef<HTMLButtonElement>(null)
  const removeFromSpaceRef = useRef<HTMLButtonElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds],
  )

  const firstItem = selectedItems[0] ?? null
  const activeSpaceCampaignId = useMemo(() => {
    if (!activeSpaceId) return null
    const space = spaces.find((s) => s.id === activeSpaceId)
    return typeof space?.campaign_id === 'string' ? space.campaign_id : null
  }, [spaces, activeSpaceId])
  const statusField = useMemo(() => allFields.find((f) => f.id === 'status'), [allFields])
  const tagsField = useMemo(() => allFields.find((f) => f.id === 'tags'), [allFields])
  const itemLabel = itemKind === 'doc' ? 'doc' : 'task'
  const removableDocItems = useMemo(() => {
    if (itemKind !== 'doc' || !generalSpaceId) return []
    return selectedItems.filter(
      (item) => !isSyntheticDocId(item.id) && item.space_id !== generalSpaceId,
    )
  }, [generalSpaceId, itemKind, selectedItems])

  useEffect(() => {
    if (itemKind !== 'doc') {
      setGeneralSpaceId(null)
      return
    }
    let cancelled = false
    void ensureGeneralSpace().then((space) => {
      if (!cancelled) setGeneralSpaceId(space.id)
    })
    return () => {
      cancelled = true
    }
  }, [itemKind])

  const toggle = useCallback((key: PanelKey) => {
    setActivePanel((prev) => (prev === key ? null : key))
  }, [])

  const closePanel = useCallback(() => setActivePanel(null), [])

  const handleMovePick = useCallback(
    async (targetSpaceId: string) => {
      closePanel()
      setBusy(true)
      let ok = 0
      let fail = 0
      for (const item of selectedItems) {
        try {
          await onCreateItem(item.title, {
            priority: item.priority,
            assignee_type: item.assignee_type,
            assignee_id: item.assignee_id,
            assignees: item.assignees,
            due_date: item.due_date,
            start_date: item.start_date,
            custom_data: item.custom_data,
            space_id: targetSpaceId,
          })
          await onDeleteItem(item.id)
          ok++
        } catch {
          fail++
        }
      }
      const targetSpace = spaces.find((s) => s.id === targetSpaceId)
      if (fail === 0)
        toast.success(`Moved ${ok} task${ok > 1 ? 's' : ''} to ${targetSpace?.title ?? 'space'}`)
      else toast.error(`Failed to move ${fail} of ${ok + fail}`)
      onClearSelection()
      await onRefresh()
      setBusy(false)
    },
    [selectedItems, spaces, onCreateItem, onDeleteItem, onClearSelection, onRefresh, closePanel],
  )

  const handleConvertToSubtasks = useCallback(async () => {
    if (selectedItems.length < 2) return
    setBusy(true)
    const parent = selectedItems[0]!
    const children = selectedItems.slice(1)
    const results = await Promise.allSettled(
      children.map((item) => onUpdateItem(item.id, { parent_item_id: parent.id })),
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    toastResult('Converted to subtasks', children.length, failed)
    onClearSelection()
    setBusy(false)
  }, [selectedItems, onUpdateItem, onClearSelection])

  const handlePromoteToTasks = useCallback(async () => {
    setBusy(true)
    const { total, failed } = await bulkApply(
      selectedIds,
      () => ({ parent_item_id: null }),
      onUpdateItem,
      items,
    )
    toastResult('Promoted to tasks', total, failed)
    onClearSelection()
    setBusy(false)
  }, [selectedIds, items, onUpdateItem, onClearSelection])

  const handleDuplicate = useCallback(async () => {
    setBusy(true)
    let ok = 0
    let fail = 0
    for (const item of selectedItems) {
      try {
        const include = bulkDuplicateInclude(item, allFields)
        await duplicateItem(item.space_id, item.id, { include })
        ok++
      } catch {
        fail++
      }
    }
    toastResult('Duplicated', ok, fail)
    if (fail === 0 && ok > 0) onClearSelection()
    setBusy(false)
    await onRefresh()
  }, [selectedItems, allFields, duplicateItem, onClearSelection, onRefresh])

  const handleDelete = useCallback(async () => {
    closePanel()
    setBusy(true)
    const results = await Promise.allSettled([...selectedIds].map((id) => onDeleteItem(id)))
    const failed = results.filter((r) => r.status === 'rejected').length
    toastResult('Deleted', selectedIds.size, failed, itemLabel)
    onClearSelection()
    setBusy(false)
  }, [selectedIds, onDeleteItem, onClearSelection, closePanel, itemLabel])

  const handleRemoveFromSpace = useCallback(async () => {
    closePanel()
    if (removableDocItems.length === 0) return
    setBusy(true)
    setRemovingFromSpace(true)
    try {
      const general = await ensureGeneralSpace()
      let ok = 0
      let fail = 0
      for (const item of removableDocItems) {
        try {
          await transferSpaceItem(item.space_id, item.id, {
            target_space_id: general.id,
            mode: 'move',
          })
          ok++
        } catch {
          fail++
        }
      }
      if (ok > 0 && fail === 0) {
        toast.success(`Removed ${ok} doc${ok > 1 ? 's' : ''} from space — kept in General`)
      } else if (fail > 0) {
        toast.error(`Failed to remove ${fail} of ${ok + fail}`)
      }
      onClearSelection()
      await onRefresh()
    } finally {
      setRemovingFromSpace(false)
      setBusy(false)
    }
  }, [closePanel, onClearSelection, onRefresh, removableDocItems])

  if (selectedIds.size === 0 || typeof document === 'undefined') return null
  if (!firstItem) return null

  return createPortal(
    <div className="fixed bottom-6 left-1/2 z-[9000] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 px-2">
      <div
        className={cn(
          'dropdown-menu-solid flex w-max flex-nowrap items-center gap-1 rounded-xl px-4 py-2',
          busy && 'pointer-events-none opacity-70',
        )}
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
          {selectedIds.size} {itemKind === 'doc' ? 'Doc' : 'Task'}
          {selectedIds.size > 1 ? 's' : ''} selected
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-0.5 rounded p-0.5 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)]"
          >
            <X className="h-3 w-3" />
          </button>
        </span>

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        {statusField && (
          <SelectCell
            field={statusField}
            value={readFieldValue(firstItem, 'status')}
            onChange={(v) => {
              const id = String(v ?? 'todo')
              void (async () => {
                setBusy(true)
                const { total, failed } = await bulkApply(
                  selectedIds,
                  () => ({ status: id as SpaceItem['status'] }),
                  onUpdateItem,
                  items,
                )
                toastResult('Updated status for', total, failed)
                setBusy(false)
              })()
            }}
            customTrigger={
              <span className={cn(BTN, 'shrink-0')}>
                <LayoutList className="h-3.5 w-3.5" />
                Status
              </span>
            }
            triggerInline
            onEditStatuses={onEditStatuses}
          />
        )}

        <AssigneeCell
          value={
            readFieldValue(firstItem, 'assignee') as Array<{ type: 'human' | 'agent'; id: string }>
          }
          roster={roster}
          currentUserId={currentUserId}
          onChange={(next) => {
            void (async () => {
              setBusy(true)
              const { total, failed } = await bulkApply(
                selectedIds,
                (item) => toFieldPatch(item, 'assignee', next) as Partial<SpaceItem>,
                onUpdateItem,
                items,
              )
              toastResult('Updated assignee for', total, failed)
              setBusy(false)
            })()
          }}
          customTrigger={
            <span className={cn(BTN, 'shrink-0')}>
              <Users className="h-3.5 w-3.5" />
              Assignees
            </span>
          }
        />

        <DueDateCell
          value={{
            start_date: firstItem.start_date,
            due_date: firstItem.due_date,
            recurrence: firstItem.recurrence,
          }}
          onChange={async (patch) => {
            setBusy(true)
            const { total, failed } = await bulkApply(
              selectedIds,
              () => {
                const u: Partial<SpaceItem> = {}
                if ('due_date' in patch) u.due_date = patch.due_date ?? null
                if ('start_date' in patch) u.start_date = patch.start_date ?? null
                if ('recurrence' in patch) u.recurrence = patch.recurrence ?? null
                return u
              },
              onUpdateItem,
              items,
            )
            toastResult('Updated dates for', total, failed)
            setBusy(false)
          }}
          customTrigger={
            <span className={cn(BTN, 'shrink-0')}>
              <Calendar className="h-3.5 w-3.5" />
              Dates
            </span>
          }
          statusField={statusField}
          onEditStatuses={onEditStatuses}
        />

        {tagsField && (
          <MultiSelectCell
            field={tagsField}
            value={readFieldValue(firstItem, 'tags')}
            onChange={(v) => {
              void (async () => {
                setBusy(true)
                const { total, failed } = await bulkApply(
                  selectedIds,
                  (item) => toFieldPatch(item, 'tags', v) as Partial<SpaceItem>,
                  onUpdateItem,
                  items,
                )
                toastResult('Updated tags for', total, failed)
                setBusy(false)
              })()
            }}
            onCreateOption={onCreateOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
            customTrigger={
              <span className={cn(BTN, 'shrink-0')}>
                <Tags className="h-3.5 w-3.5" />
                Tags
              </span>
            }
          />
        )}

        <button
          ref={customRef}
          type="button"
          className={cn(BTN, 'shrink-0')}
          onClick={() => toggle('custom')}
        >
          Custom Fields <ChevronRight className="h-3 w-3" />
        </button>
        {activePanel === 'custom' && firstItem && (
          <CustomFieldsPanel
            anchorRef={customRef}
            allFields={allFields}
            firstItem={firstItem}
            selectedIds={selectedIds}
            items={items}
            onUpdateItem={onUpdateItem}
            onClose={closePanel}
            roster={roster}
            currentUserId={currentUserId}
            onEditStatuses={onEditStatuses}
            onEditCategories={onEditCategories}
            onCreateOption={onCreateOption}
            onUpdateOption={onUpdateOption}
            onDeleteOption={onDeleteOption}
            onTagCustomSwatchesChange={onTagCustomSwatchesChange}
            onPushToAgent={onPushToAgent}
            statusField={statusField}
            setBusy={setBusy}
          />
        )}

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        <button
          ref={moveRef}
          type="button"
          className={cn(BTN, 'shrink-0')}
          onClick={() => toggle('move')}
        >
          <FolderInput className="h-3.5 w-3.5" /> Move
        </button>
        {activePanel === 'move' && (
          <MovePanel
            anchorRef={moveRef}
            activeSpaceId={activeSpaceId ?? ''}
            sourceCampaignId={activeSpaceCampaignId}
            onPick={handleMovePick}
            onClose={closePanel}
          />
        )}

        {itemKind === 'doc' ? (
          <>
            <button
              ref={removeFromSpaceRef}
              type="button"
              className={cn(
                BTN,
                'shrink-0',
                (removableDocItems.length === 0 || removingFromSpace) &&
                  'cursor-not-allowed opacity-50',
              )}
              disabled={removableDocItems.length === 0 || removingFromSpace}
              onClick={() => toggle('removeFromSpace')}
            >
              {removingFromSpace ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderMinus className="h-3.5 w-3.5" />
              )}{' '}
              {removingFromSpace ? 'Removing' : 'Remove from space'}
            </button>
            {activePanel === 'removeFromSpace' && (
              <RemoveFromSpacePanel
                anchorRef={removeFromSpaceRef}
                count={removableDocItems.length}
                onConfirm={handleRemoveFromSpace}
                onClose={closePanel}
              />
            )}
          </>
        ) : (
          <>
            <button
              ref={convertRef}
              type="button"
              className={cn(BTN, 'shrink-0')}
              onClick={() => toggle('convert')}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Convert
            </button>
            {activePanel === 'convert' && (
              <ConvertPanel
                anchorRef={convertRef}
                selectedItems={selectedItems}
                onConvertToSubtasks={handleConvertToSubtasks}
                onPromoteToTasks={handlePromoteToTasks}
                onClose={closePanel}
              />
            )}
          </>
        )}

        <button type="button" className={cn(BTN, 'shrink-0')} onClick={handleDuplicate}>
          <CopyPlus className="h-3.5 w-3.5" /> Duplicate
        </button>

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        <button
          ref={deleteRef}
          type="button"
          className="text-destructive hover:bg-destructive/10 flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors"
          onClick={() => toggle('delete')}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
        {activePanel === 'delete' && (
          <DeletePanel
            anchorRef={deleteRef}
            count={selectedIds.size}
            itemLabel={itemLabel}
            onConfirm={handleDelete}
            onClose={closePanel}
          />
        )}
      </div>
    </div>,
    document.body,
  )
}
