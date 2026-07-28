'use client'

import { useState } from 'react'
import { backendPost } from '@/lib/api/backend-client'
import type { YourTurnItem } from '../../services/your-turn.service'

export interface YourTurnSubtaskDrawerProps {
  item: YourTurnItem
  presentation?: 'modal' | 'panel'
  onClose: () => void
  onActionCompleted: () => void
}

export function YourTurnSubtaskDrawer({
  item,
  presentation = 'modal',
  onClose,
  onActionCompleted,
}: YourTurnSubtaskDrawerProps) {
  const [summary, setSummary] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missionId = item.mission_id
  const subtaskId = item.id

  const callAction = async (
    action: 'complete-human' | 'block-human',
    body: Record<string, unknown>,
  ) => {
    if (!missionId) return
    setBusy(true)
    setError(null)
    try {
      await backendPost(`/api/missions/${missionId}/subtasks/${subtaskId}/${action}`, body)
      onActionCompleted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal={presentation === 'modal'}
      className={
        presentation === 'panel'
          ? 'flex h-full min-h-0 w-full flex-col overflow-y-auto'
          : 'bg-modal-overlay z-modal fixed inset-0 flex items-end justify-end sm:items-center sm:justify-center'
      }
    >
      <div
        className={
          presentation === 'panel'
            ? 'bg-background p-spacing-4 w-full'
            : 'bg-background rounded-t-spacing-3 sm:rounded-spacing-3 p-spacing-6 w-full sm:max-w-lg'
        }
      >
        <div className="mb-spacing-4 flex items-center justify-between">
          <h2 className="heading-4 text-foreground font-medium">{item.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        </div>

        <label className="body-3 text-muted-foreground mb-spacing-1 block">Your summary</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={5}
          placeholder="Write a short summary of what you did, links to files, decisions you made..."
          className="px-spacing-3 py-spacing-2 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
        />

        <label className="body-3 text-muted-foreground mb-spacing-1 mt-spacing-4 block">
          Or flag this as blocked
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Reason if this is blocked (optional)"
          className="px-spacing-3 py-spacing-2 body-2 rounded-spacing-2 border-border surface-bg placeholder:text-muted-foreground text-foreground w-full border"
        />

        {error && <p className="body-3 mt-spacing-2 text-destructive">{error}</p>}

        <div className="mt-spacing-6 gap-spacing-3 flex items-center justify-end">
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={() => callAction('block-human', { reason: reason.trim() })}
            className="button-glass-destructive rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 font-medium disabled:opacity-50"
          >
            Block
          </button>
          <button
            type="button"
            disabled={busy || !summary.trim()}
            onClick={() => callAction('complete-human', { summary: summary.trim() })}
            className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-2 font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}
