'use client'

import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { AgentCheckpointListItem } from '../../services/agent-checkpoints.service'

interface AgentCheckpointRestoreDialogProps {
  checkpoint: AgentCheckpointListItem | null
  restoring: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function AgentCheckpointRestoreDialog({
  checkpoint,
  restoring,
  onCancel,
  onConfirm,
}: AgentCheckpointRestoreDialogProps) {
  if (!checkpoint) return null

  return createPortal(
    <div className="z-modal-backdrop-above flex items-center justify-center p-spacing-4">
      <div className="surface-card border-border w-[min(460px,92vw)] overflow-hidden rounded-2xl border shadow-2xl">
        <header className="border-border flex items-center justify-between border-b px-spacing-5 py-spacing-4">
          <h2 className="title-h6 text-foreground">Restore this version?</h2>
          <button type="button" onClick={onCancel} className="btn-icon-bare" aria-label="Close">
            <X className="icon-sm" />
          </button>
        </header>
        <div className="p-spacing-5">
          <p className="body-3 text-muted-foreground">
            I’ll bring this agent back to “{checkpoint.summary}” and save a new restore checkpoint.
          </p>
        </div>
        <footer className="border-border flex justify-end gap-spacing-2 border-t px-spacing-5 py-spacing-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={restoring}
            className="button-glass-neutral hover:bg-hover-subtle rounded-spacing-2 px-spacing-4 py-spacing-2"
          >
            Never mind
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={restoring}
            className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2"
          >
            {restoring ? 'Restoring...' : 'Restore version'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
