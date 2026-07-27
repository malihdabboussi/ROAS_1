'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useSpaceCampaignName } from '../hooks/use-space-campaign-name'
import { sendSpaceItemsToPageGrader } from '../services/page-grader-send.service'
import { ensureGeneralSpace, transferSpaceItem } from '../services/spaces.service'
import type { SpaceItem } from '../types'
import {
  bulkApply,
  bulkDuplicateInclude,
  isSyntheticDocId,
  toastResult,
} from './bulk-action-bar/bulk-action-helpers'
import { BulkActionBarToolbar } from './bulk-action-bar/BulkActionBarToolbar'
import type { PanelKey } from './bulk-action-bar/panel-key'
import type { BulkActionBarProps } from './bulk-action-bar/types'
import { readFieldValue, toFieldPatch } from './space-item-values'

export type { BulkActionBarProps } from './bulk-action-bar/types'

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
  const pageGraderRef = useRef<HTMLButtonElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds],
  )

  const firstItem = selectedItems[0] ?? null
  const activeSpace = useMemo(() => {
    if (!activeSpaceId) return null
    return spaces.find((s) => s.id === activeSpaceId) ?? null
  }, [spaces, activeSpaceId])
  const activeSpaceCampaignId = useMemo(() => {
    return typeof activeSpace?.campaign_id === 'string' ? activeSpace.campaign_id : null
  }, [activeSpace])
  const { campaignName: activeSpaceCampaignName } = useSpaceCampaignName(activeSpace)
  const statusField = useMemo(() => allFields.find((f) => f.id === 'status'), [allFields])
  const tagsField = useMemo(() => allFields.find((f) => f.id === 'tags'), [allFields])
  const attendeesField = useMemo(() => allFields.find((f) => f.id === 'attendees'), [allFields])
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
      children.map((item) =>
        onUpdateItem(item.id, { parent_item_id: parent.id }, { skipSubtaskCompleteConfirm: true }),
      ),
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

  const handlePageGraderSend = useCallback(
    async (input: {
      clientId: string
      clientName: string
      taskType: string
      note: string
      dueDate: string
      clientTagId: string
      clientTagLabel: string
      assignee: {
        pageGraderUserId?: string
        email?: string
        name?: string
      } | null
    }) => {
      if (!activeSpaceId) {
        toast.error('No active space')
        return
      }
      setBusy(true)
      try {
        if (tagsField && input.clientTagId) {
          await bulkApply(
            selectedIds,
            (item) => {
              const current = readFieldValue(item, 'tags')
              const ids = Array.isArray(current)
                ? current.filter((t): t is string => typeof t === 'string')
                : []
              if (ids.includes(input.clientTagId)) return {}
              return toFieldPatch(item, 'tags', [...ids, input.clientTagId]) as Partial<SpaceItem>
            },
            onUpdateItem,
            items,
          )
        }

        const { results } = await sendSpaceItemsToPageGrader({
          clientId: input.clientId,
          spaceId: activeSpaceId,
          spaceItemIds: [...selectedIds],
          note: input.note,
          dueDate: input.dueDate,
          workKind: 'task_request',
          taskType: input.taskType,
          clientTagId: input.clientTagId,
          clientTagLabel: input.clientTagLabel,
          assignee: input.assignee,
        })
        const created = results.filter((r) => r.status === 'created').length
        const skipped = results.filter((r) => r.status === 'skipped_already_sent').length
        const failed = results.filter((r) => r.status === 'failed').length
        if (failed === 0 && created + skipped > 0) {
          const parts: string[] = []
          if (created > 0) parts.push(`sent ${created}`)
          if (skipped > 0) parts.push(`${skipped} already in The ROAS Portal`)
          toast.success(parts.join(' · '))
          onClearSelection()
          closePanel()
          await onRefresh()
        } else if (failed > 0) {
          const firstError = results.find((r) => r.status === 'failed')?.error
          toast.error(
            firstError
              ? `The ROAS Portal send failed: ${firstError}`
              : `The ROAS Portal send failed for ${failed} of ${results.length}`,
          )
        } else {
          toast.error('Nothing was sent to The ROAS Portal')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'The ROAS Portal send failed')
      } finally {
        setBusy(false)
      }
    },
    [
      activeSpaceId,
      selectedIds,
      tagsField,
      onUpdateItem,
      items,
      onClearSelection,
      closePanel,
      onRefresh,
    ],
  )

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

  return (
    <BulkActionBarToolbar
      selectedIds={selectedIds}
      items={items}
      allFields={allFields}
      roster={roster}
      currentUserId={currentUserId}
      firstItem={firstItem}
      selectedItems={selectedItems}
      itemKind={itemKind}
      itemLabel={itemLabel}
      busy={busy}
      removingFromSpace={removingFromSpace}
      removableDocItems={removableDocItems}
      activePanel={activePanel}
      activeSpaceId={activeSpaceId}
      activeSpaceCampaignId={activeSpaceCampaignId}
      activeSpaceCampaignName={activeSpaceCampaignName}
      statusField={statusField}
      tagsField={tagsField}
      attendeesField={attendeesField}
      customRef={customRef}
      moveRef={moveRef}
      convertRef={convertRef}
      removeFromSpaceRef={removeFromSpaceRef}
      pageGraderRef={pageGraderRef}
      deleteRef={deleteRef}
      onClearSelection={onClearSelection}
      onUpdateItem={onUpdateItem}
      onEditStatuses={onEditStatuses}
      onEditCategories={onEditCategories}
      onCreateOption={onCreateOption}
      onUpdateOption={onUpdateOption}
      onDeleteOption={onDeleteOption}
      onTagCustomSwatchesChange={onTagCustomSwatchesChange}
      onPushToAgent={onPushToAgent}
      setBusy={setBusy}
      toggle={toggle}
      closePanel={closePanel}
      handleMovePick={handleMovePick}
      handleConvertToSubtasks={handleConvertToSubtasks}
      handlePromoteToTasks={handlePromoteToTasks}
      handleDuplicate={handleDuplicate}
      handlePageGraderSend={handlePageGraderSend}
      handleDelete={handleDelete}
      handleRemoveFromSpace={handleRemoveFromSpace}
    />
  )
}
