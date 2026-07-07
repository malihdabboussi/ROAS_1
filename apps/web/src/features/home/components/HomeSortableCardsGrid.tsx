'use client'

import { useState, type ReactNode } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'
import { homeCardDefinition } from '@/features/home/config/home-cards.config'
import type { HomeCardId } from '@/features/home/types/home-cards'
import { cn } from '@/lib/utils/cn'

function SortableHomeCard({
  cardId,
  onRemove,
  children,
}: {
  cardId: HomeCardId
  onRemove: (id: HomeCardId) => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/home-card ring-dashed relative min-w-0 cursor-grab touch-none rounded-xl ring-1 ring-[var(--color-border)] active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      aria-label={`Drag ${homeCardDefinition(cardId).title}`}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onRemove(cardId)}
        className={cn(
          'pointer-events-auto absolute right-2 top-2 z-10',
          'text-muted-foreground hover:text-foreground hover:bg-hover-subtle cursor-pointer rounded-md p-1 transition-[opacity,colors] duration-200',
          'opacity-0 focus-visible:opacity-100 group-hover/home-card:opacity-100',
        )}
        aria-label={`Remove ${homeCardDefinition(cardId).title}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className={cn('pointer-events-none', isDragging && 'invisible')}>{children}</div>
    </div>
  )
}

export function HomeSortableCardsGrid({
  cardIds,
  onReorder,
  onRemove,
  renderCard,
}: {
  cardIds: HomeCardId[]
  onReorder: (activeId: HomeCardId, overId: HomeCardId) => void
  onRemove: (id: HomeCardId) => void
  renderCard: (cardId: HomeCardId) => ReactNode
}) {
  const [activeId, setActiveId] = useState<HomeCardId | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as HomeCardId)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return
    onReorder(active.id as HomeCardId, over.id as HomeCardId)
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={cardIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cardIds.map((cardId) => (
            <SortableHomeCard key={cardId} cardId={cardId} onRemove={onRemove}>
              {renderCard(cardId)}
            </SortableHomeCard>
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div className="ring-primary/40 cursor-grabbing rounded-xl shadow-lg ring-2">
            {renderCard(activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
