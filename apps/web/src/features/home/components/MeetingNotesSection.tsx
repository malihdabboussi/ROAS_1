'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import {
  addMeetingSnippet,
  type MeetingSnippet,
} from '@/features/home/services/meeting-workspace-api'

export function MeetingNotesSection({
  spaceId,
  meetingItemId,
  snippets,
  onCreated,
}: {
  spaceId: string
  meetingItemId: string
  snippets: MeetingSnippet[]
  onCreated: (snippet: MeetingSnippet) => void
}) {
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (composing) inputRef.current?.focus()
  }, [composing])

  const resetComposer = () => {
    setDraft('')
    setComposing(false)
    setSaving(false)
  }

  const submit = async () => {
    const text = draft.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      const created = await addMeetingSnippet(spaceId, meetingItemId, {
        text,
        sourceLabel: 'Workspace note',
      })
      onCreated(created)
      toast.success(HOME_TOAST_SUCCESS.MEETING_NOTE_ADDED.userMessage)
      resetComposer()
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_NOTE_CREATE_FAILED.userMessage)
      setSaving(false)
    }
  }

  return (
    <section className="gap-spacing-3 flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="body-3 text-foreground font-semibold">
          Notes{snippets.length > 0 ? ` (${snippets.length})` : ''}
        </h2>
        {!composing ? (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="button-compact button-glass-neutral"
          >
            Add note
          </button>
        ) : null}
      </div>

      {composing ? (
        <form
          className="gap-spacing-2 flex flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                resetComposer()
              }
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                void submit()
              }
            }}
            placeholder="Jot a note for this meeting…"
            disabled={saving}
            rows={3}
            className="input-glass body-3 rounded-spacing-2 p-spacing-3 w-full resize-y"
            aria-label="New meeting note"
          />
          <div className="gap-spacing-2 flex items-center">
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              className="button-compact button-glass-primary disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save note'}
            </button>
            <button
              type="button"
              onClick={resetComposer}
              disabled={saving}
              className="button-compact button-glass-neutral disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {snippets.length > 0 ? (
        <div className="gap-spacing-2 flex flex-col">
          {snippets.map((snippet) => (
            <div key={snippet.id} className="surface-card rounded-spacing-2 p-spacing-3">
              <p className="body-3 text-foreground whitespace-pre-wrap">{snippet.text}</p>
              {snippet.source_label ? (
                <p className="typo-caption text-muted-foreground mt-spacing-1">
                  {snippet.source_label}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : !composing ? (
        <p className="body-4 text-muted-foreground">
          No notes yet — add one here or dump it in the meeting chat.
        </p>
      ) : null}
    </section>
  )
}
