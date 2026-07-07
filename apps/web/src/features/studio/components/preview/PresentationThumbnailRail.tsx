'use client'

import { useMemo, useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils/cn'
import { buildPresentationSlideThumbnailSrcDoc } from '../../lib/presentation-slide-thumbnail.util'
import type { PresentationBundle, PresentationSlideThumbnail } from '../../types'
import { PresentationSlideMiniPreview } from './PresentationSlideMiniPreview'

interface PresentationThumbnailRailProps {
  thumbnails: PresentationSlideThumbnail[]
  bundle: PresentationBundle | null
  activeSlideIndex: number | null
  onSelectSlide: (index: number) => void
  onReorderSlides?: (fromIndex: number, toIndex: number) => void | Promise<void>
  reordering?: boolean
}

function slideSortableId(index: number) {
  return `slide-${index}`
}

function InsertionLine() {
  return (
    <div className="pointer-events-none relative z-10 -my-[3px] flex h-[6px] items-center px-2">
      <div className="resize-divider-line-blue-horizontal-full h-[2px] flex-1" />
    </div>
  )
}

function SlideThumbnailPreview({
  bundle,
  slideIndex,
  title,
}: {
  bundle: PresentationBundle | null
  slideIndex: number
  title: string
}) {
  const srcDoc = useMemo(() => {
    if (!bundle) return null
    return buildPresentationSlideThumbnailSrcDoc(bundle, slideIndex)
  }, [bundle, slideIndex])

  if (!srcDoc) {
    return (
      <div className="bg-card flex h-full w-full items-center justify-center">
        <span className="body-4 text-muted-foreground">{slideIndex + 1}</span>
      </div>
    )
  }

  return <PresentationSlideMiniPreview srcDoc={srcDoc} title={title} />
}

function SortableSlideThumbnail({
  slide,
  bundle,
  selected,
  reorderEnabled,
  reordering,
  onSelectSlide,
  isOver,
  insertPosition,
}: {
  slide: PresentationSlideThumbnail
  bundle: PresentationBundle | null
  selected: boolean
  reorderEnabled: boolean
  reordering: boolean
  onSelectSlide: (index: number) => void
  isOver: boolean
  insertPosition: 'before' | 'after' | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } =
    useSortable({
      id: slideSortableId(slide.index),
      disabled: !reorderEnabled || reordering,
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSorting ? transition : undefined,
    opacity: isDragging ? 0.35 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isOver && insertPosition === 'before' ? <InsertionLine /> : null}
      <button
        {...(reorderEnabled ? { ...attributes, ...listeners } : {})}
        type="button"
        onClick={() => onSelectSlide(slide.index)}
        aria-label={`Slide ${slide.index + 1}`}
        aria-pressed={selected}
        className={cn(
          'rounded-spacing-2 relative w-full overflow-hidden border text-left transition-colors',
          selected ? 'border-border bg-hover-subtle/40' : 'border-border hover:bg-hover-subtle',
          reordering && 'pointer-events-none opacity-60',
          reorderEnabled && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {selected ? (
          <span
            className="resize-divider-line-blue-compact pointer-events-none absolute bottom-1 left-0 top-1 z-10 w-px"
            aria-hidden
          />
        ) : null}
        <div className="relative aspect-video w-full overflow-hidden">
          <SlideThumbnailPreview
            bundle={bundle}
            slideIndex={slide.index}
            title={slide.title || slide.label}
          />
          <span className="body-4 text-foreground bg-background/85 rounded-spacing-1 px-spacing-1 absolute bottom-1 right-1 tabular-nums">
            {slide.index + 1}
          </span>
        </div>
      </button>
      {isOver && insertPosition === 'after' ? <InsertionLine /> : null}
    </div>
  )
}

export function PresentationThumbnailRail({
  thumbnails,
  bundle,
  activeSlideIndex,
  onSelectSlide,
  onReorderSlides,
  reordering = false,
}: PresentationThumbnailRailProps) {
  const reorderEnabled = Boolean(onReorderSlides) && thumbnails.length > 1
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [overSide, setOverSide] = useState<'before' | 'after'>('before')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  )

  const sortableIds = useMemo(
    () => thumbnails.map((slide) => slideSortableId(slide.index)),
    [thumbnails],
  )

  const activeSlide = useMemo(() => {
    if (!activeId) return null
    const index = Number(activeId.replace('slide-', ''))
    return thumbnails.find((slide) => slide.index === index) ?? null
  }, [activeId, thumbnails])

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragOver(event: DragOverEvent) {
    const { over, active } = event
    if (!over) {
      setOverId(null)
      return
    }
    setOverId(String(over.id))
    const overRect = over.rect
    const dragY = active.rect.current.translated?.top
    if (overRect && dragY != null) {
      const midY = overRect.top + overRect.height / 2
      setOverSide(dragY < midY ? 'before' : 'after')
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    setOverId(null)
    const { active, over } = event
    if (!over || active.id === over.id || !onReorderSlides) return

    const fromIndex = thumbnails.findIndex((slide) => slideSortableId(slide.index) === active.id)
    const toIndex = thumbnails.findIndex((slide) => slideSortableId(slide.index) === over.id)
    if (fromIndex < 0 || toIndex < 0) return

    let insertAt = overSide === 'after' ? toIndex + 1 : toIndex
    if (fromIndex < insertAt) insertAt -= 1
    if (fromIndex === insertAt) return

    void onReorderSlides(fromIndex, insertAt)
  }

  function handleDragCancel() {
    setActiveId(null)
    setOverId(null)
  }

  function getInsertPosition(itemId: string): 'before' | 'after' | null {
    if (!activeId || !overId || activeId === overId) return null
    if (itemId !== overId) return null
    return overSide
  }

  const list = (
    <div className="gap-spacing-2 p-spacing-2 flex flex-col">
      {thumbnails.length === 0 ? (
        <p className="typo-caption text-muted-foreground px-spacing-1">No slides found</p>
      ) : (
        thumbnails.map((slide) => (
          <SortableSlideThumbnail
            key={slideSortableId(slide.index)}
            slide={slide}
            bundle={bundle}
            selected={activeSlideIndex === slide.index}
            reorderEnabled={reorderEnabled}
            reordering={reordering}
            onSelectSlide={onSelectSlide}
            isOver={getInsertPosition(slideSortableId(slide.index)) !== null}
            insertPosition={getInsertPosition(slideSortableId(slide.index))}
          />
        ))
      )}
    </div>
  )

  return (
    <aside className="border-border bg-background/95 h-full w-full min-w-0 shrink-0 overflow-y-auto border-r">
      {reorderEnabled ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {list}
          </SortableContext>
          <DragOverlay dropAnimation={null}>
            {activeSlide ? (
              <div className="rounded-spacing-2 border-border bg-card w-spacing-60 overflow-hidden border shadow-lg">
                <div className="relative aspect-video w-full overflow-hidden">
                  <SlideThumbnailPreview
                    bundle={bundle}
                    slideIndex={activeSlide.index}
                    title={activeSlide.title || activeSlide.label}
                  />
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        list
      )}
    </aside>
  )
}
