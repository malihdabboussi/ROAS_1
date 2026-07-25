'use client'

import type { ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'

/**
 * ClickUp-style drag-reorder for the Programs sidebar tree:
 * - drag a space into a different campaign
 * - drag a campaign into a different program
 *
 * Drag sources/targets carry typed `data` so the resolver can decide the move
 * without inspecting the DOM. Persisting + permission checks happen in the
 * handlers passed to the provider (see SidebarHqSpacesGroupedList).
 */

export type SidebarDragData =
  | { dndType: 'space'; spaceId: string; campaignId: string | null }
  | { dndType: 'campaign'; campaignId: string; programId: string | null }

export type SidebarDropData =
  | { dndType: 'campaign-drop'; campaignId: string }
  | { dndType: 'program'; programId: string | null }

export type SidebarDropResult =
  | { kind: 'space'; spaceId: string; toCampaignId: string }
  | { kind: 'campaign'; campaignId: string; toProgramId: string | null }
  | null

/** Pure resolver — decides which move (if any) a drag/drop pair represents. */
export function resolveSidebarDrop(
  active: SidebarDragData | null | undefined,
  over: SidebarDropData | null | undefined,
): SidebarDropResult {
  if (!active || !over) return null
  if (active.dndType === 'space' && over.dndType === 'campaign-drop') {
    if (active.campaignId === over.campaignId) return null
    return { kind: 'space', spaceId: active.spaceId, toCampaignId: over.campaignId }
  }
  if (active.dndType === 'campaign' && over.dndType === 'program') {
    if ((active.programId ?? null) === (over.programId ?? null)) return null
    return { kind: 'campaign', campaignId: active.campaignId, toProgramId: over.programId }
  }
  return null
}

export function SidebarTreeDndProvider({
  onMoveSpace,
  onMoveCampaign,
  children,
}: {
  onMoveSpace: (spaceId: string, toCampaignId: string) => void
  onMoveCampaign: (campaignId: string, toProgramId: string | null) => void
  children: ReactNode
}) {
  // Distance activation keeps row clicks (open space/campaign) working — a drag
  // only starts after the pointer moves past the threshold.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd(event: DragEndEvent) {
    const active = event.active.data.current as SidebarDragData | undefined
    const over = event.over?.data.current as SidebarDropData | undefined
    const result = resolveSidebarDrop(active, over)
    if (!result) return
    if (result.kind === 'space') onMoveSpace(result.spaceId, result.toCampaignId)
    else onMoveCampaign(result.campaignId, result.toProgramId)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  )
}

/** Wrap a space row so it can be dragged into another campaign. */
export function DraggableSpace({
  spaceId,
  campaignId,
  children,
}: {
  spaceId: string
  campaignId: string | null
  children: ReactNode
}) {
  const data: SidebarDragData = { dndType: 'space', spaceId, campaignId }
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `space:${spaceId}`,
    data,
  })
  return (
    <div
      ref={setNodeRef}
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

/** Grip handle that drags a campaign into another program. */
export function CampaignDragHandle({
  campaignId,
  programId,
  label,
}: {
  campaignId: string
  programId: string | null
  label: string
}) {
  const data: SidebarDragData = { dndType: 'campaign', campaignId, programId }
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `campaign:${campaignId}`,
    data,
  })
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`Move ${label} to another program`}
      className={`text-muted-foreground hover:text-foreground pointer-events-none flex h-5 w-4 shrink-0 cursor-grab touch-none items-center justify-center opacity-0 transition-opacity group-hover/section:pointer-events-auto group-hover/section:opacity-100 active:cursor-grabbing ${
        isDragging ? 'opacity-100' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5" aria-hidden />
    </button>
  )
}

/** Make a program folder a drop target for campaigns. */
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
