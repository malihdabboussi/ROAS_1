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
import { Columns2, RectangleHorizontal, Rows2, Rows3, X } from 'lucide-react'
import { homeCardDefinition } from '@/features/home/config/home-cards.config'
import type {
  HomeCardGridRows,
  HomeCardGridSize,
  HomeCardId,
} from '@/features/home/types/home-cards'
import { cn } from '@/lib/utils/cn'

function SortableHomeCard({
  cardId,
  size,
  rows,
  onRemove,
  onSetSize,
  onSetRows,
  children,
}: {
  cardId: HomeCardId
  size: HomeCardGridSize
  rows: HomeCardGridRows
  onRemove: (id: HomeCardId) => void
  onSetSize: (id: HomeCardId, size: HomeCardGridSize) => void
  onSetRows: (id: HomeCardId, rows: HomeCardGridRows) => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardId,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const title = homeCardDefinition(cardId).title

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/home-card ring-dashed relative min-w-0 cursor-grab touch-none rounded-xl ring-1 ring-[var(--color-border)] active:cursor-grabbing',
        size === 'full' && 'hd4-card-grid-item-full',
        rows === 1 && 'hd4-card-grid-item-rows-1',
        rows === 2 && 'hd4-card-grid-item-rows-2',
        rows === 3 && 'hd4-card-grid-item-rows-3',
        isDragging && 'opacity-40',
      )}
      aria-label={`Drag ${title}`}
      {...attributes}
      {...listeners}
    >
      <div className="pointer-events-auto absolute right-2 top-2 z-10 flex items-center gap-0.5">
        <div
          className={cn(
            'border-border bg-card flex items-center rounded-md border p-0.5 shadow-sm transition-opacity duration-200',
            'opacity-0 focus-within:opacity-100 group-hover/home-card:opacity-100',
          )}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onSetSize(cardId, 'half')}
            className={cn(
              'rounded-spacing-1 p-1 transition-colors',
              size === 'half'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle',
            )}
            aria-label={`Half width for ${title}`}
            aria-pressed={size === 'half'}
            title="Half width"
          >
            <Columns2 className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onSetSize(cardId, 'full')}
            className={cn(
              'rounded-spacing-1 p-1 transition-colors',
              size === 'full'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle',
            )}
            aria-label={`Full width for ${title}`}
            aria-pressed={size === 'full'}
            title="Full width"
          >
            <RectangleHorizontal className="h-3.5 w-3.5" aria-hidden />
          </button>
          <span className="bg-border h-spacing-4 w-px" aria-hidden />
          <button
            type="button"
            onClick={() => onSetRows(cardId, 1)}
            className={cn(
              'rounded-spacing-1 p-1 transition-colors',
              rows === 1
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle',
            )}
            aria-label={`One row tall for ${title}`}
            aria-pressed={rows === 1}
            title="One row tall"
          >
            <RectangleHorizontal className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onSetRows(cardId, 2)}
            className={cn(
              'rounded-spacing-1 p-1 transition-colors',
              rows === 2
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle',
            )}
            aria-label={`Two rows tall for ${title}`}
            aria-pressed={rows === 2}
            title="Two rows tall"
          >
            <Rows2 className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onSetRows(cardId, 3)}
            className={cn(
              'rounded-spacing-1 p-1 transition-colors',
              rows === 3
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-hover-subtle',
            )}
            aria-label={`Three rows tall for ${title}`}
            aria-pressed={rows === 3}
            title="Three rows tall"
          >
            <Rows3 className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onRemove(cardId)}
            className="text-muted-foreground hover:text-foreground hover:bg-hover-subtle rounded-spacing-1 p-1 transition-colors"
            aria-label={`Remove ${title}`}
            title="Remove"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div
        className={cn(
          'home-dashboard-sortable-card-content pointer-events-none',
          isDragging && 'invisible',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function HomeSortableCardsGrid({
  cardIds,
  cardSizes,
  cardRows,
  onReorder,
  onRemove,
  onSetSize,
  onSetRows,
  renderCard,
  variant = 'default',
}: {
  cardIds: HomeCardId[]
  cardSizes?: Partial<Record<HomeCardId, HomeCardGridSize>>
  cardRows?: Partial<Record<HomeCardId, HomeCardGridRows>>
  onReorder: (activeId: HomeCardId, overId: HomeCardId) => void
  onRemove: (id: HomeCardId) => void
  onSetSize: (id: HomeCardId, size: HomeCardGridSize) => void
  onSetRows: (id: HomeCardId, rows: HomeCardGridRows) => void
  renderCard: (cardId: HomeCardId) => ReactNode
  variant?: 'default' | 'v4'
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

  const sizeFor = (id: HomeCardId): HomeCardGridSize =>
    cardSizes?.[id] === 'full' ? 'full' : 'half'
  const rowsFor = (id: HomeCardId): HomeCardGridRows =>
    cardRows?.[id] ?? homeCardDefinition(id).defaultRows ?? 1

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={cardIds} strategy={rectSortingStrategy}>
        <div
          className={variant === 'v4' ? 'hd4-card-grid' : 'grid grid-cols-1 gap-6 md:grid-cols-2'}
        >
          {cardIds.map((cardId) => (
            <SortableHomeCard
              key={cardId}
              cardId={cardId}
              size={sizeFor(cardId)}
              rows={rowsFor(cardId)}
              onRemove={onRemove}
              onSetSize={onSetSize}
              onSetRows={onSetRows}
            >
              {renderCard(cardId)}
            </SortableHomeCard>
          ))}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div
            className={cn(
              'ring-primary/40 cursor-grabbing rounded-xl shadow-lg ring-2',
              sizeFor(activeId) === 'full' && 'hd4-card-grid-item-full',
              rowsFor(activeId) === 1 && 'hd4-card-grid-item-rows-1',
              rowsFor(activeId) === 2 && 'hd4-card-grid-item-rows-2',
              rowsFor(activeId) === 3 && 'hd4-card-grid-item-rows-3',
            )}
          >
            {renderCard(activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
