'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

type MarkupElementTrace = {
  bounds: {
    x: number
    y: number
    width: number
    height: number
  } | null
}

interface PresentationMarkupOverlayProps<TTrace extends MarkupElementTrace = MarkupElementTrace> {
  selectedTrace: TTrace | null
  onAddComment: (body: string, trace: TTrace | null) => void
  onSendToVibe: (body: string, trace: TTrace | null) => void
}

export function PresentationMarkupOverlay<TTrace extends MarkupElementTrace>({
  selectedTrace,
  onAddComment,
  onSendToVibe,
}: PresentationMarkupOverlayProps<TTrace>) {
  const [draft, setDraft] = useState('')
  if (!selectedTrace?.bounds) return null
  const anchorTop = selectedTrace.bounds.y + selectedTrace.bounds.height + 8

  const submitComment = () => {
    const value = draft.trim()
    if (!value) return
    onAddComment(value, selectedTrace)
    setDraft('')
  }

  const sendToVibe = () => {
    const value = draft.trim()
    if (!value) return
    onSendToVibe(value, selectedTrace)
    setDraft('')
  }

  return (
    <div
      className="surface-card border-border z-dropdown rounded-spacing-3 p-spacing-3 pointer-events-auto absolute w-72 border shadow-lg"
      style={{
        left: `clamp(12px, ${selectedTrace.bounds.x}px, calc(100% - 288px))`,
        top: `clamp(12px, ${anchorTop}px, calc(100% - 132px))`,
      }}
    >
      <p className="body-4 text-muted-foreground mb-spacing-2">Markup</p>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') sendToVibe()
        }}
        autoFocus
        placeholder="Tell ROAS what to edit..."
        className="h-spacing-9 rounded-spacing-2 border-border bg-background px-spacing-3 body-3 text-foreground placeholder:text-muted-foreground w-full border outline-none focus:outline-none"
      />
      <div className="gap-spacing-2 mt-spacing-2 flex justify-end">
        <button
          type="button"
          onClick={submitComment}
          disabled={!draft.trim()}
          className="button-compact button-glass-neutral disabled:opacity-50"
        >
          Add comment
        </button>
        <button
          type="button"
          onClick={sendToVibe}
          disabled={!draft.trim()}
          className="button-compact button-glass-primary gap-spacing-1 disabled:opacity-50"
        >
          <Send className="icon-xs" />
          Send
        </button>
      </div>
    </div>
  )
}
