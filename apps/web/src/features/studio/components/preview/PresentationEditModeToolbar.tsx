'use client'

import {
  Edit3,
  GalleryVertical,
  MessageSquare,
  MousePointer2,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { PresentationEditMode } from '../../types'

const MODES: Array<{
  id: PresentationEditMode
  label: string
  icon: typeof MousePointer2
}> = [
  { id: 'markup', label: 'Markup', icon: MousePointer2 },
  { id: 'edit', label: 'Design', icon: Edit3 },
  { id: 'tweaks', label: 'Tweaks', icon: SlidersHorizontal },
  { id: 'comments', label: 'Comments', icon: MessageSquare },
]

interface PresentationEditModeToolbarProps {
  mode: PresentationEditMode
  thumbnailsOpen: boolean
  onModeChange: (mode: PresentationEditMode) => void
  onToggleThumbnails: () => void
  /** Tooltip/aria for the rail toggle (default: Slides). Funnels pass Pages. */
  thumbnailsToggleLabel?: string
}

export function PresentationEditModeToolbar({
  mode,
  thumbnailsOpen,
  onModeChange,
  onToggleThumbnails,
  thumbnailsToggleLabel = 'Slides',
}: PresentationEditModeToolbarProps) {
  const sectionButtonClass = (selected: boolean) =>
    cn(
      'gap-spacing-1 h-spacing-7 rounded-spacing-2 px-spacing-2 body-4 flex items-center transition-colors',
      selected
        ? 'bg-primary/10 text-foreground'
        : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
    )

  return (
    <div className="gap-spacing-2 flex items-center">
      <div className="gap-spacing-1 flex items-center">
        {MODES.map((item) => {
          const Icon = item.icon
          const selected = mode === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onModeChange(selected ? 'preview' : item.id)}
              className={sectionButtonClass(selected)}
              aria-pressed={selected}
            >
              <Icon className="icon-xs" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onToggleThumbnails}
        data-tooltip={thumbnailsToggleLabel}
        data-side="bottom"
        aria-label={thumbnailsToggleLabel}
        aria-pressed={thumbnailsOpen}
        className={cn(
          'tooltip h-spacing-7 w-spacing-7 rounded-spacing-2 inline-flex shrink-0 items-center justify-center transition-colors',
          thumbnailsOpen
            ? 'bg-primary/10 text-foreground'
            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground',
        )}
      >
        <GalleryVertical className="icon-xs shrink-0" />
      </button>
    </div>
  )
}
