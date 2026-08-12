'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { SpaceMoveMenu, WorkItemList, WorkItemListRow } from '@/components/work-items'
import {
  HOME_TOAST_ERRORS,
  HOME_TOAST_SUCCESS,
} from '@/features/home/config/home-toast-errors.config'
import {
  createMeetingAction,
  type MeetingAction,
} from '@/features/home/services/meeting-workspace-api'

function actionSourceLabel(action: MeetingAction): string {
  if (action.source_type === 'provider') return 'Fathom'
  if (action.source_type === 'manual') return 'Added manually'
  return 'AI suggested'
}

/** Only Meetings-space follow_up items are real space items we can relocate. */
function isMovableAction(action: MeetingAction): boolean {
  return String(action.evidence?.origin ?? '') === 'meetings_space_follow_up'
}

function ActionRow({
  action,
  spaceId,
  onToggle,
  onMoved,
}: {
  action: MeetingAction
  spaceId: string
  onToggle: (action: MeetingAction) => void
  onMoved: (action: MeetingAction, destinationTitle: string) => void
}) {
  const resolved = action.status === 'resolved'
  const openTask = () => {
    window.dispatchEvent(
      new CustomEvent('vibey-open-artifact', {
        detail: {
          artifactType: 'task',
          artifactId: action.id,
          spaceId,
          name: action.title,
        },
      }),
    )
  }
  return (
    <WorkItemListRow
      title={action.title}
      struck={resolved}
      openLabel={`Open ${action.title}`}
      onOpen={openTask}
      leading={
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onToggle(action)
          }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
            resolved
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border hover:border-primary'
          }`}
          aria-label={
            resolved ? `Mark ${action.title} incomplete` : `Mark ${action.title} complete`
          }
          aria-pressed={resolved}
        >
          {resolved ? <Check className="icon-xs" aria-hidden /> : null}
        </button>
      }
      caption={
        <>
          <span className="truncate">{action.canonical_assignee_name || 'Unassigned'}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{actionSourceLabel(action)}</span>
        </>
      }
      trailing={
        isMovableAction(action) ? (
          <SpaceMoveMenu
            sourceSpaceId={spaceId}
            itemId={action.id}
            itemTitle={action.title}
            errorMessage={HOME_TOAST_ERRORS.MEETING_ACTION_MOVE_FAILED.userMessage}
            onMoved={(destination) => onMoved(action, destination.title)}
          />
        ) : undefined
      }
      trailingHoverReveal
    />
  )
}

export function MeetingActionItemsSection({
  spaceId,
  meetingItemId,
  actions,
  loading,
  onToggle,
  onCreated,
  onMoved,
}: {
  spaceId: string
  meetingItemId: string
  actions: MeetingAction[]
  loading: boolean
  onToggle: (action: MeetingAction) => void
  onCreated: (action: MeetingAction) => void
  onMoved: (action: MeetingAction) => void
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

  const handleMoved = useMemo(
    () => (action: MeetingAction, destinationTitle: string) => {
      toast.success(`Moved to ${destinationTitle}.`)
      onMoved(action)
    },
    [onMoved],
  )

  return (
    <section className="gap-spacing-3 flex flex-col">
      <div className="gap-spacing-2 flex items-center justify-between">
        <h2 className="body-3 text-foreground font-semibold">Action items ({actions.length})</h2>
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="button-compact button-glass-neutral"
          aria-label="Add action item"
          title="Add action item"
        >
          Add action
        </button>
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

      {actions.length > 0 ? (
        <WorkItemList>
          {actions.map((action) => (
            <ActionRow
              key={action.id}
              action={action}
              spaceId={spaceId}
              onToggle={onToggle}
              onMoved={handleMoved}
            />
          ))}
        </WorkItemList>
      ) : null}
      {!loading && actions.length === 0 && !composing ? (
        <p className="body-4 text-muted-foreground">No action items yet.</p>
      ) : null}
    </section>
  )
}
