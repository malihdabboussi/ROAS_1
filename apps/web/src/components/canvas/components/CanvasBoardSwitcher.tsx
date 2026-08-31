'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { CANVAS_VIEW_MESSAGES } from '../canvas-view.messages.config'
import type { CampaignWhiteboard } from '../types/whiteboard.types'

interface CanvasBoardSwitcherProps {
  boards: CampaignWhiteboard[]
  selectedBoardId: string
  creating: boolean
  error: string | null
  onSelect: (boardId: string) => void
  onCreate: (title: string) => void
}

export function CanvasBoardSwitcher({
  boards,
  selectedBoardId,
  creating,
  error,
  onSelect,
  onCreate,
}: CanvasBoardSwitcherProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')

  return (
    <div className="surface-card border-border gap-spacing-2 px-spacing-3 py-spacing-2 flex items-center border-b">
      <label className="body-4 text-muted-foreground" htmlFor="campaign-canvas-select">
        Canvas
      </label>
      <select
        id="campaign-canvas-select"
        className="input-glass min-w-48"
        value={selectedBoardId}
        onChange={(event) => onSelect(event.target.value)}
      >
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.title}
          </option>
        ))}
      </select>
      {formOpen ? (
        <form
          className="gap-spacing-2 flex items-center"
          onSubmit={(event) => {
            event.preventDefault()
            const nextTitle = title.trim()
            if (!nextTitle) return
            onCreate(nextTitle)
            setTitle('')
          }}
        >
          <input
            className="input-glass"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={CANVAS_VIEW_MESSAGES.createPlaceholder}
            maxLength={120}
            autoFocus
          />
          <button type="submit" className="button-glass-primary" disabled={creating}>
            Create
          </button>
          <button
            type="button"
            className="button-ghost rounded-spacing-2 flex h-10 w-10 items-center justify-center"
            onClick={() => setFormOpen(false)}
            aria-label="Cancel new canvas"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="button-glass-neutral gap-spacing-1 flex items-center"
          onClick={() => setFormOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {CANVAS_VIEW_MESSAGES.createLabel}
        </button>
      )}
      {error && <span className="body-4 text-destructive">{error}</span>}
    </div>
  )
}
