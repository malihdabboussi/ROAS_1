'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import {
  createMeetingAction,
  type MeetingAction,
} from '@/features/home/services/meeting-workspace-api'

function actionSourceLabel(action: MeetingAction): string {
  if (action.source_type === 'provider') return 'Fathom action item'
  if (action.source_type === 'manual') return 'Added live'
  return 'AI suggestion'
}

function ActionRow({
  action,
  onToggle,
}: {
  action: MeetingAction
  onToggle: (action: MeetingAction) => void
}) {
  const resolved = action.status === 'resolved'
  return (
    <button
      type="button"
      onClick={() => onToggle(action)}
      className="border-border hover:bg-hover-subtle gap-spacing-2 rounded-spacing-2 p-spacing-3 flex w-full items-start border text-left"
    >
      <span
        className={`mt-spacing-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          resolved ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
        }`}
      >
        {resolved ? <Check className="icon-xs" aria-hidden /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="body-3 text-foreground block">{action.title}</span>
        <span className="typo-caption text-muted-foreground mt-spacing-1 block">
          {action.canonical_assignee_name || 'Unassigned'} · {actionSourceLabel(action)}
        </span>
      </span>
    </button>
  )
}

export function MeetingActionItemsSection({
  spaceId,
  meetingItemId,
  actions,
  loading,
  onToggle,
  onCreated,
}: {
  spaceId: string
  meetingItemId: string
  actions: MeetingAction[]
  loading: boolean
  onToggle: (action: MeetingAction) => void
  onCreated: (action: MeetingAction) => void
}) {
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!composing) return
    inputRef.current?.focus()
  }, [composing])

  const resetComposer = () => {
    setDraft('')
    setComposing(false)
    setSaving(false)
  }

  const submit = async () => {
    const title = draft.trim()
    if (!title || saving) return
    const existingMatch = actions.find((action) => {
      const left = action.title.trim().toLowerCase().replace(/\s+/g, ' ')
      const right = title.toLowerCase().replace(/\s+/g, ' ')
      return left === right
    })
    if (existingMatch) {
      toast.success(HOME_TOAST_SUCCESS.MEETING_ACTION_ALREADY_EXISTS.userMessage)
      resetComposer()
      return
    }
    setSaving(true)
    try {
      const created = await createMeetingAction(spaceId, meetingItemId, { title })
      const alreadyListed = actions.some((action) => action.id === created.id)
      if (alreadyListed) {
        toast.success(HOME_TOAST_SUCCESS.MEETING_ACTION_ALREADY_EXISTS.userMessage)
      } else {
        onCreated(created)
        toast.success(HOME_TOAST_SUCCESS.MEETING_ACTION_CREATED.userMessage)
      }
      resetComposer()
    } catch {
      toast.error(HOME_TOAST_ERRORS.MEETING_ACTION_CREATE_FAILED.userMessage)
      setSaving(false)
    }
  }

  return (
    <section className="gap-spacing-3 flex flex-col">
      <div className="gap-spacing-2 flex items-center justify-between">
        <h2 className="body-3 text-foreground font-semibold">Action items</h2>
        <div className="gap-spacing-2 flex items-center">
          <span className="badge-glass badge-glass-muted">{actions.length}</span>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="btn-icon-bare"
            aria-label="Add action item"
            title="Add action item"
          >
            <Plus className="icon-sm" aria-hidden />
          </button>
        </div>
      </div>

      {composing ? (
        <form
          className="gap-spacing-2 flex items-center"
          onSubmit={(event) => {
            event.preventDefault()
            void submit()
          }}
        >
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                resetComposer()
              }
            }}
            placeholder="What needs to happen?"
            disabled={saving}
            className="input-glass input-leading body-3 h-spacing-9 rounded-spacing-2 pr-spacing-3 min-w-0 flex-1"
            aria-label="New action item"
          />
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="button-compact button-glass-primary disabled:opacity-50"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={resetComposer}
            disabled={saving}
            className="button-compact button-glass-neutral disabled:opacity-50"
          >
            Cancel
          </button>
        </form>
      ) : null}

      {actions.map((action) => (
        <ActionRow key={action.id} action={action} onToggle={onToggle} />
      ))}
      {!loading && actions.length === 0 && !composing ? (
        <p className="body-4 text-muted-foreground">
          No action items yet. Hit + to capture one during the call.
        </p>
      ) : null}
    </section>
  )
}
