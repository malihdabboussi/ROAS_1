'use client'

import { Plus } from 'lucide-react'

export function MeetingNoteCapture({
  count,
  note,
  noteType,
  saving,
  onNoteChange,
  onNoteTypeChange,
  onSave,
}: {
  count: number
  note: string
  noteType: 'observation' | 'call_quote'
  saving: boolean
  onNoteChange: (value: string) => void
  onNoteTypeChange: (value: 'observation' | 'call_quote') => void
  onSave: () => void
}) {
  return (
    <section className="section-card gap-spacing-3 p-spacing-4 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="body-3 text-foreground font-semibold">Live notes & snippets</h2>
        <span className="badge-glass badge-glass-muted">{count}</span>
      </div>
      <p className="body-4 text-muted-foreground">
        Saved entries appear in the connected meeting conversation in the main chat.
      </p>
      <div className="gap-spacing-2 flex">
        <button
          type="button"
          onClick={() => onNoteTypeChange('observation')}
          className={`button-compact ${
            noteType === 'observation' ? 'button-glass-primary' : 'button-glass-neutral'
          }`}
        >
          Live note
        </button>
        <button
          type="button"
          onClick={() => onNoteTypeChange('call_quote')}
          className={`button-compact ${
            noteType === 'call_quote' ? 'button-glass-primary' : 'button-glass-neutral'
          }`}
        >
          Call snippet
        </button>
      </div>
      <textarea
        value={note}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="Add a live note or paste a call snippet…"
        className="input-glass body-3 text-foreground p-spacing-2 min-h-20 w-full resize-none border-0 bg-transparent outline-none"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={!note.trim() || saving}
        className="button-compact button-glass-primary gap-spacing-1 self-end disabled:opacity-50"
      >
        <Plus className="icon-sm" aria-hidden />
        Add to meeting chat
      </button>
    </section>
  )
}
