'use client'

import { Link2, ListTodo, Sparkles, X } from 'lucide-react'
import type { CanvasPlaceholderAction } from '../types/whiteboard.types'

interface CanvasPlaceholderActionsProps {
  nodeId: string
  disabled?: boolean
  onAction?: (nodeId: string, action: CanvasPlaceholderAction) => void
}

const ACTIONS = [
  { id: 'create', label: 'Create', icon: Sparkles },
  { id: 'attach', label: 'Attach', icon: Link2 },
  { id: 'assign', label: 'Assign', icon: ListTodo },
  { id: 'dismiss', label: 'Dismiss', icon: X },
] as const

export function CanvasPlaceholderActions({
  nodeId,
  disabled = false,
  onAction,
}: CanvasPlaceholderActionsProps) {
  return (
    <div
      className="nodrag mt-spacing-2 gap-spacing-1 flex flex-wrap"
      aria-label="Missing asset actions"
    >
      {ACTIONS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={id === 'create' ? 'button-glass-primary' : 'button-ghost'}
          disabled={disabled}
          onClick={() => onAction?.(nodeId, id)}
        >
          <Icon className="h-3 w-3" />
          {label}
        </button>
      ))}
    </div>
  )
}
