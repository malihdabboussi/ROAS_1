'use client'

import type { CSSProperties, ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/**
 * ClickUp-style drag for the Programs sidebar tree:
 * - reorder programs (same list)
 * - reorder spaces within a campaign (same list)
 * - reparent: space → different campaign, campaign → different program
 *
 * Drag sources/targets carry typed `data` so the resolver can decide the move
 * without inspecting the DOM. Persisting + permission checks happen in the
 * handlers passed to the provider (see SidebarHqSpacesGroupedList).
 */

export type SidebarDragData =
  | { dndType: 'space'; spaceId: string; campaignId: string | null }
  | { dndType: 'campaign'; campaignId: string; programId: string | null }
  | { dndType: 'program'; programId: string }

export type SidebarDropData =
  | { dndType: 'campaign-drop'; campaignId: string }
  | { dndType: 'program'; programId: string | null }
  | { dndType: 'space'; spaceId: string; campaignId: string | null }

export type SidebarDropResult =
  | { kind: 'space'; spaceId: string; toCampaignId: string }
  | { kind: 'campaign'; campaignId: string; toProgramId: string | null }
  | null

export type SidebarReorderResult =
  | { kind: 'programs'; activeId: string; overId: string }
  | { kind: 'spaces'; campaignId: string; activeId: string; overId: string }
  | null

function asDragData(value: unknown): SidebarDragData | null {
  if (!value || typeof value !== 'object') return null
  const data = value as SidebarDragData
  if (data.dndType === 'space' || data.dndType === 'campaign' || data.dndType === 'program') {
    return data
  }
  return null
}

function asDropData(value: unknown): SidebarDropData | null {
  if (!value || typeof value !== 'object') return null
  const data = value as SidebarDropData
  if (data.dndType === 'campaign-drop' || data.dndType === 'program' || data.dndType === 'space') {
    return data
  }
  return null
}

/** Pure resolver — cross-parent moves (reparent). Same-list drops return null. */
export function resolveSidebarDrop(
  active: SidebarDragData | null | undefined,
  over: SidebarDropData | null | undefined,
): SidebarDropResult {
  if (!active || !over) return null
  if (active.dndType === 'space' && over.dndType === 'campaign-drop') {
    if (active.campaignId === over.campaignId) return null
    return { kind: 'space', spaceId: active.spaceId, toCampaignId: over.campaignId }
  }
  if (active.dndType === 'space' && over.dndType === 'space') {
    if (!over.campaignId || active.campaignId === over.campaignId) return null
    return { kind: 'space', spaceId: active.spaceId, toCampaignId: over.campaignId }
  }
  if (active.dndType === 'campaign' && over.dndType === 'program') {
    if ((active.programId ?? null) === (over.programId ?? null)) return null
    return { kind: 'campaign', campaignId: active.campaignId, toProgramId: over.programId }
  }
  return null
}

/** Pure resolver — same-list reorder (programs, or spaces within one campaign). */
export function resolveSidebarReorder(
  active: SidebarDragData | null | undefined,
  over: SidebarDropData | null | undefined,
): SidebarReorderResult {
  if (!active || !over) return null
  if (active.dndType === 'program' && over.dndType === 'program') {
    const overProgramId = over.programId
    if (!overProgramId || active.programId === overProgramId) return null
    return { kind: 'programs', activeId: active.programId, overId: overProgramId }
  }
  if (active.dndType === 'space' && over.dndType === 'space') {
    if (!active.campaignId || active.campaignId !== over.campaignId) return null
    if (active.spaceId === over.spaceId) return null
    return {
      kind: 'spaces',
      campaignId: active.campaignId,
      activeId: active.spaceId,
      overId: over.spaceId,
    }
  }
  return null
}

export function SidebarTreeDndProvider({
  onMoveSpace,
  onMoveCampaign,
  onReorderPrograms,
  onReorderSpaces,
  children,
}: {
  onMoveSpace: (spaceId: string, toCampaignId: string) => void
  onMoveCampaign: (campaignId: string, toProgramId: string | null) => void
  onReorderPrograms: (activeId: string, overId: string) => void
  onReorderSpaces: (campaignId: string, activeId: string, overId: string) => void
  children: ReactNode
}) {
  // Distance activation keeps row clicks (open space/campaign/program) working —
  // a drag only starts after the pointer moves past the threshold.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const active = asDragData(event.active.data.current)
    const over = asDropData(event.over?.data.current)
    const move = resolveSidebarDrop(active, over)
    if (move) {
      if (move.kind === 'space') onMoveSpace(move.spaceId, move.toCampaignId)
      else onMoveCampaign(move.campaignId, move.toProgramId)
      return
    }
    const reorder = resolveSidebarReorder(active, over)
    if (!reorder) return
    if (reorder.kind === 'programs') onReorderPrograms(reorder.activeId, reorder.overId)
    else onReorderSpaces(reorder.campaignId, reorder.activeId, reorder.overId)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  )
}

export function ProgramSortableContext({
  programIds,
  children,
}: {
  programIds: string[]
  children: ReactNode
}) {
  return (
    <SortableContext
      items={programIds.map((id) => `program:${id}`)}
      strategy={verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  )
}

export function SpaceSortableContext({
  spaceIds,
  children,
}: {
  spaceIds: string[]
  children: ReactNode
}) {
  return (
    <SortableContext
      items={spaceIds.map((id) => `space:${id}`)}
      strategy={verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  )
}

export type SidebarSortableBind = {
  setNodeRef: (node: HTMLElement | null) => void
  style: CSSProperties
  attributes: ReturnType<typeof useSortable>['attributes']
  listeners: ReturnType<typeof useSortable>['listeners']
  isDragging: boolean
}

/**
 * Sortable program folder. `useSortable` registers the node as both drag source
 * and drop target, so campaigns can still drop onto the program to reparent.
 * Listeners belong on the header only (via bind) so nested space/campaign
 * drags are not captured by the parent.
 */
export function SortableProgram({
  programId,
  children,
}: {
  programId: string
  children: (bind: SidebarSortableBind) => ReactNode
}) {
  const data: SidebarDragData = { dndType: 'program', programId }
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `program:${programId}`,
    data,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return children({ setNodeRef, style, attributes, listeners, isDragging })
}

/** Sortable space row — also a drop target for same-list reorder / cross-campaign move. */
export function SortableSpace({
  spaceId,
  campaignId,
  children,
}: {
  spaceId: string
  campaignId: string | null
  children: ReactNode
}) {
  const data: SidebarDragData = { dndType: 'space', spaceId, campaignId }
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `space:${spaceId}`,
    data,
  })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`min-w-0 touch-none ${isDragging ? 'opacity-40' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

/** Make a campaign section a drop target for spaces. */
export function CampaignDropZone({
  campaignId,
  children,
}: {
  campaignId: string
  children: ReactNode
}) {
  const data: SidebarDropData = { dndType: 'campaign-drop', campaignId }
  const { setNodeRef, isOver } = useDroppable({ id: `campaign-drop:${campaignId}`, data })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-spacing-2 min-w-0 ${isOver ? 'ring-primary/40 ring-1' : ''}`}
    >
      {children}
    </div>
  )
}

/**
 * Whole campaign header is the drag source (distance threshold preserves clicks).
 * Replaces the nearly-invisible grip that made campaign drag feel broken.
 */
export function DraggableCampaignHeader({
  campaignId,
  programId,
  children,
}: {
  campaignId: string
  programId: string | null
  children: ReactNode
}) {
  const data: SidebarDragData = { dndType: 'campaign', campaignId, programId }
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `campaign:${campaignId}`,
    data,
  })
  return (
    <div
      ref={setNodeRef}
      className={`min-w-0 flex-1 touch-none ${isDragging ? 'opacity-40' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

/** Make a program folder a drop target for campaigns (General / non-sortable). */
export function ProgramDropZone({
  programId,
  children,
}: {
  programId: string | null
  children: ReactNode
}) {
  const data: SidebarDropData = { dndType: 'program', programId }
  const { setNodeRef, isOver } = useDroppable({
    id: `program:${programId ?? '__ungrouped__'}`,
    data,
  })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-spacing-2 min-w-0 ${isOver ? 'ring-primary/40 ring-1' : ''}`}
    >
      {children}
    </div>
  )
}
