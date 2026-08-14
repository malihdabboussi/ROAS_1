'use client'

import {
  Box,
  Circle,
  Frame,
  Hand,
  Library,
  MousePointer2,
  Sparkles,
  StickyNote,
  Type,
  Waypoints,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { WhiteboardTool } from '../types/whiteboard.types'

const TOOLS: Array<{ tool: WhiteboardTool; label: string; icon: typeof StickyNote }> = [
  { tool: 'select', label: 'Select', icon: MousePointer2 },
  { tool: 'hand', label: 'Hand', icon: Hand },
  { tool: 'note', label: 'Sticky note', icon: StickyNote },
  { tool: 'text', label: 'Text', icon: Type },
  { tool: 'shape', label: 'Shape', icon: Circle },
  { tool: 'card', label: 'Card', icon: Box },
  { tool: 'frame', label: 'Frame', icon: Frame },
  { tool: 'connector', label: 'Connector', icon: Waypoints },
]

interface WhiteboardToolbarProps {
  activeTool: WhiteboardTool
  onToolChange: (tool: WhiteboardTool) => void
  onOpenPixel: () => void
  onOpenResources: () => void
}

export function WhiteboardToolbar({
  activeTool,
  onToolChange,
  onOpenPixel,
  onOpenResources,
}: WhiteboardToolbarProps) {
  return (
    <div className="surface-card border-border left-spacing-3 gap-spacing-1 rounded-spacing-3 p-spacing-1 absolute top-1/2 z-20 flex -translate-y-1/2 flex-col border shadow-lg">
      {TOOLS.map(({ tool, label, icon: Icon }) => (
        <button
          key={tool}
          type="button"
          className={cn(
            'button-ghost rounded-spacing-2 flex h-10 w-10 items-center justify-center',
            activeTool === tool && 'button-glass-primary',
          )}
          onClick={() => onToolChange(tool)}
          title={label}
          aria-label={label}
          aria-pressed={activeTool === tool}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
      <div className="border-border border-t" />
      <button
        type="button"
        className="button-glass-neutral rounded-spacing-2 flex h-10 w-10 items-center justify-center"
        onClick={onOpenResources}
        title="Campaign resources"
        aria-label="Campaign resources"
      >
        <Library className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="button-glass-primary rounded-spacing-2 flex h-10 w-10 items-center justify-center"
        onClick={onOpenPixel}
        title="Build with Pixel"
        aria-label="Build with Pixel"
      >
        <Sparkles className="h-5 w-5" />
      </button>
    </div>
  )
}
