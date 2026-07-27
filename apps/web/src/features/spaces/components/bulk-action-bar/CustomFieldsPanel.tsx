'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight } from 'lucide-react'
import type { TeamRosterEntry } from '@/lib/team/team-roster-api'
import { cn } from '@/lib/utils/cn'
import type { SpaceItem } from '../../types'
import type { FieldDef, SelectOption } from '../../types/space-schema'
import type { MissionSendOptions } from '../cells/MissionSendDropdown'
import { SpaceCell } from '../cells/SpaceCell'
import { readFieldValue, toFieldPatch } from '../space-item-values'
import { bulkApply, CORE_FIELD_IDS, toastResult } from './bulk-action-helpers'

const CUSTOM_LIST_W = 240
const CUSTOM_SUB_W = 300

export function CustomFieldsPanel({
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
  onUpdateItem: (
    id: string,
    patch: Partial<SpaceItem>,
    options?: { skipSubtaskCompleteConfirm?: boolean },
  ) => Promise<void>
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
