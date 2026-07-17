'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, MouseEvent } from 'react'
import { toast } from 'sonner'
import type {
  MissionColumnId,
  MissionsConfig,
  SubtasksDisplayMode,
} from '@/lib/spaces/space-schema-types'
import { MISSION_CONTROL_TOAST_ERRORS } from '../config/mission-control-toast-errors.config'
import { retryMission, trashMission } from '../services/missions.service'
import type { Mission, MissionAgent, MissionDeliverable, MissionSubtask } from '../types'
import {
  COLUMN_DEFS,
  DEFAULT_COLUMNS,
  MIN_MISSION_RESIZE_COL,
  MIN_MISSION_RESIZE_TITLE,
  MISSION_LIST_DEFAULT_COL_PX,
  normalizeMissionColumnOrder,
} from './mission-list-config'
import { MissionMenuDropdown } from './mission-menu/MissionMenuDropdown'
import { MissionListDeleteDialog } from './MissionListDeleteDialog'
import { MissionListDesktopRows } from './MissionListDesktopRows'
import { MissionListHeader } from './MissionListHeader'
import { MissionListMobileCards } from './MissionListMobileCards'

interface Campaign {
  id: string
  name: string
  icon?: string
}

interface MissionListProps {
  missions: Mission[]
  agents: MissionAgent[]
  campaigns: Campaign[]
  selectedMissionId: string | null
  onSelect: (missionId: string) => void
  onSelectSubtask?: (missionId: string, subtaskId: string) => void
  onChanged?: () => void
  visibleColumns?: MissionColumnId[]
  /** Trailing + column: opens view customize (e.g. mission column toggles) when set. */
  onAddColumn?: (e: MouseEvent<HTMLButtonElement>) => void
  /** Spaces missions: indented subtask rows (list-style); omit in Mission Control / campaign tab. */
  subtasksByMissionId?: Record<string, MissionSubtask[]>
  expandedSubtaskMissionIds?: Set<string>
  onToggleSubtaskExpand?: (missionId: string) => void
  /** Spaces: collapsed / expanded / separate (omit elsewhere - chevron + inline rows match list/kanban). */
  subtasksDisplayMode?: SubtasksDisplayMode
  /** Spaces: persist `missions_config.visible_columns` after drag-reorder (title column stays first). */
  onReorderColumns?: (next: MissionColumnId[]) => void | Promise<void>
  /** Spaces: progress column display (subtask-derived bar). Omit in Mission Control. */
  missionsProgress?: { showNumber: boolean; barFill: string | null }
  onMissionsProgressPatch?: (
    patch: Pick<MissionsConfig, 'progress_show_number' | 'progress_bar_fill'>,
  ) => void | Promise<void>
  /** Deliverables keyed by mission id (for documents / media / artifacts columns). */
  deliverablesByMissionId?: Record<string, MissionDeliverable[]>
  /** Open a deliverable preview. */
  onOpenDeliverable?: (d: MissionDeliverable) => void
  /** Spaces: px widths per column; enables drag resize (list-style blue edge). */
  listColumnWidths?: Record<string, number>
  onListColumnResize?: (colId: MissionColumnId, width: number) => void
  /** Spaces: right-click / row menu (copy link, archive, rename, delete, etc.). */
  enableContextMenu?: boolean
}

export function MissionList({
  missions,
  agents,
  campaigns: _campaigns,
  onSelect,
  onSelectSubtask,
  onChanged,
  visibleColumns,
  onAddColumn,
  subtasksByMissionId,
  expandedSubtaskMissionIds,
  onToggleSubtaskExpand,
  subtasksDisplayMode,
  onReorderColumns,
  missionsProgress,
  onMissionsProgressPatch,
  deliverablesByMissionId,
  onOpenDeliverable,
  listColumnWidths,
  onListColumnResize,
  enableContextMenu = false,
}: MissionListProps) {
  const [actionMissionId, setActionMissionId] = useState<string | null>(null)
  const [menuMission, setMenuMission] = useState<Mission | null>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const menuAnchorRef = useRef<HTMLButtonElement>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dragId, setDragId] = useState<MissionColumnId | null>(null)
  const [overId, setOverId] = useState<MissionColumnId | null>(null)
  const [overSide, setOverSide] = useState<'left' | 'right'>('right')
  const [resizingColId, setResizingColId] = useState<MissionColumnId | null>(null)
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null)

  const rawCols = visibleColumns ?? DEFAULT_COLUMNS
  const cols = rawCols.filter((id) => id !== 'campaign' && id !== 'subtasks')
  const colSet = new Set<MissionColumnId>(cols)
  const activeCols = COLUMN_DEFS.filter((c) => colSet.has(c.id))
  const usePxGrid = Boolean(onListColumnResize)

  const mergedListColWidths = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of activeCols) {
      const id = c.id
      m[id] = listColumnWidths?.[id] ?? MISSION_LIST_DEFAULT_COL_PX[id] ?? 120
    }
    return m
  }, [activeCols, listColumnWidths])

  const gridTemplateWithTrail = useMemo(() => {
    const trail = ' minmax(2rem, 1fr)'
    if (usePxGrid) {
      return activeCols.map((c) => `${mergedListColWidths[c.id]}px`).join(' ') + trail
    }
    const gridTemplate = activeCols.map((c) => c.fraction).join(' ')
    return `${gridTemplate}${trail}`
  }, [usePxGrid, activeCols, mergedListColWidths])

  const handleResizeStart = useCallback(
    (colId: MissionColumnId, e: MouseEvent) => {
      if (!onListColumnResize || !usePxGrid) return
      e.preventDefault()
      e.stopPropagation()
      const w = mergedListColWidths[colId]
      if (typeof w !== 'number') return
      resizeStartRef.current = { x: e.clientX, width: w }
      setResizingColId(colId)
    },
    [onListColumnResize, usePxGrid, mergedListColWidths],
  )

  useEffect(() => {
    if (!resizingColId || !onListColumnResize) return
    const handleMove = (e: globalThis.MouseEvent) => {
      if (!resizeStartRef.current) return
      const delta = e.clientX - resizeStartRef.current.x
      const minW = resizingColId === 'title' ? MIN_MISSION_RESIZE_TITLE : MIN_MISSION_RESIZE_COL
      const next = Math.max(minW, resizeStartRef.current.width + delta)
      onListColumnResize(resizingColId, Math.round(next))
    }
    const handleUp = () => {
      setResizingColId(null)
      resizeStartRef.current = null
    }
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [resizingColId, onListColumnResize])

  const progressShowNumber = missionsProgress?.showNumber !== false
  const progressBarFill = missionsProgress?.barFill ?? null
  const progressConfigurable = Boolean(onMissionsProgressPatch)

  const pendingMission = confirmDeleteId ? missions.find((m) => m.id === confirmDeleteId) : null

  const handleRetry = async (e: MouseEvent, missionId: string) => {
    e.stopPropagation()
    setActionMissionId(missionId)
    try {
      await retryMission(missionId)
      onChanged?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : MISSION_CONTROL_TOAST_ERRORS.RETRY_FAILED.userMessage
      toast.error(msg)
    } finally {
      setActionMissionId((id) => (id === missionId ? null : id))
    }
  }

  const handleTrashClick = (e: MouseEvent, missionId: string) => {
    e.stopPropagation()
    setConfirmDeleteId(missionId)
  }

  const closeMissionMenu = useCallback(() => {
    setMenuMission(null)
    setContextMenuPos(null)
  }, [])

  const openMissionMenuAtPointer = useCallback((e: MouseEvent, mission: Mission) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setMenuMission(mission)
  }, [])

  const openMissionMenuFromButton = useCallback(
    (e: MouseEvent<HTMLButtonElement>, mission: Mission) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenuPos(null)
      setMenuMission(mission)
    },
    [],
  )

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return
    setIsDeleting(true)
    try {
      await trashMission(confirmDeleteId)
      setConfirmDeleteId(null)
      onChanged?.()
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : MISSION_CONTROL_TOAST_ERRORS.TRASH_FAILED.userMessage
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  function resetColumnDrag() {
    setDragId(null)
    setOverId(null)
  }

  function handleColumnDragStart(e: DragEvent, colId: MissionColumnId) {
    if (resizingColId) {
      e.preventDefault()
      return
    }
    if (colId === 'title' || !onReorderColumns) {
      e.preventDefault()
      return
    }
    setDragId(colId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', colId)
  }

  function handleColumnDragOver(e: DragEvent, colId: MissionColumnId) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!dragId || colId === dragId) {
      setOverId(null)
      return
    }
    setOverId(colId)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midX = rect.left + rect.width / 2
    setOverSide(e.clientX < midX ? 'left' : 'right')
  }

  function handleColumnDrop(e: DragEvent) {
    e.preventDefault()
    if (!onReorderColumns || !dragId || !overId || dragId === overId) {
      resetColumnDrag()
      return
    }
    const allIds = activeCols.map((c) => c.id)
    const without = allIds.filter((id) => id !== dragId)
    const targetIdx = without.indexOf(overId)
    if (targetIdx < 0) {
      resetColumnDrag()
      return
    }
    const insertAt = overSide === 'right' ? targetIdx + 1 : targetIdx
    without.splice(insertAt, 0, dragId)
    const next = normalizeMissionColumnOrder(without)
    resetColumnDrag()
    void onReorderColumns(next)
  }

  return (
    <div>
      <MissionListHeader
        activeCols={activeCols}
        gridTemplateWithTrail={gridTemplateWithTrail}
        dragId={dragId}
        overId={overId}
        overSide={overSide}
        resizingColId={resizingColId}
        usePxGrid={usePxGrid}
        onAddColumn={onAddColumn}
        onReorderColumns={onReorderColumns}
        onColumnDragStart={handleColumnDragStart}
        onColumnDragOver={handleColumnDragOver}
        onColumnDrop={handleColumnDrop}
        onColumnDragEnd={resetColumnDrag}
        onResizeStart={handleResizeStart}
      />
      <MissionListMobileCards
        missions={missions}
        agents={agents}
        onSelect={onSelect}
        onSelectSubtask={onSelectSubtask}
        subtasksByMissionId={subtasksByMissionId}
        expandedSubtaskMissionIds={expandedSubtaskMissionIds}
        onToggleSubtaskExpand={onToggleSubtaskExpand}
        subtasksDisplayMode={subtasksDisplayMode}
        progressShowNumber={progressShowNumber}
        progressBarFill={progressBarFill}
        progressConfigurable={progressConfigurable}
        onMissionsProgressPatch={onMissionsProgressPatch}
        actionMissionId={actionMissionId}
        onRetry={handleRetry}
        onTrashClick={handleTrashClick}
        enableContextMenu={enableContextMenu}
        menuMission={menuMission}
        menuAnchorRef={menuAnchorRef}
        openMissionMenuAtPointer={openMissionMenuAtPointer}
        openMissionMenuFromButton={openMissionMenuFromButton}
      />
      <MissionListDesktopRows
        missions={missions}
        agents={agents}
        activeCols={activeCols}
        gridTemplateWithTrail={gridTemplateWithTrail}
        onSelect={onSelect}
        onSelectSubtask={onSelectSubtask}
        subtasksByMissionId={subtasksByMissionId}
        expandedSubtaskMissionIds={expandedSubtaskMissionIds}
        onToggleSubtaskExpand={onToggleSubtaskExpand}
        subtasksDisplayMode={subtasksDisplayMode}
        progressShowNumber={progressShowNumber}
        progressBarFill={progressBarFill}
        progressConfigurable={progressConfigurable}
        onMissionsProgressPatch={onMissionsProgressPatch}
        deliverablesByMissionId={deliverablesByMissionId}
        onOpenDeliverable={onOpenDeliverable}
        actionMissionId={actionMissionId}
        onRetry={handleRetry}
        onChanged={onChanged}
        enableContextMenu={enableContextMenu}
        menuMission={menuMission}
        menuAnchorRef={menuAnchorRef}
        openMissionMenuAtPointer={openMissionMenuAtPointer}
        openMissionMenuFromButton={openMissionMenuFromButton}
      />

      {enableContextMenu && menuMission ? (
        <MissionMenuDropdown
          mission={menuMission}
          anchorRef={contextMenuPos ? undefined : menuAnchorRef}
          pointerPosition={contextMenuPos}
          onClose={closeMissionMenu}
          onChanged={onChanged}
          onOpenMission={() => onSelect(menuMission.id)}
          onDelete={() => setConfirmDeleteId(menuMission.id)}
        />
      ) : null}

      <MissionListDeleteDialog
        open={!!confirmDeleteId}
        pendingMission={pendingMission ?? null}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setConfirmDeleteId(null)
        }}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
