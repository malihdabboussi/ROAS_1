'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { DELEGATION_MODE_MESSAGES } from '../../config/delegation-messages.config'
import type { DelegationDispatchMode } from '../../services/delegation-intake.service'
import { FloatingPanel } from './FloatingPanel'

const MODES: DelegationDispatchMode[] = ['batch', 'review', 'urgent']

export function DelegationBulkPanel({
  anchorRef,
  selectedCount,
  busy,
  onDelegate,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  selectedCount: number
  busy: boolean
  onDelegate: (mode: DelegationDispatchMode, note: string) => void
  onClose: () => void
}) {
  const [mode, setMode] = useState<DelegationDispatchMode>('review')
  const [note, setNote] = useState('')

  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose} width={360}>
      <div className="gap-spacing-3 p-spacing-3 flex flex-col">
        <div>
          <p className="body-2 text-foreground font-medium">
            Delegate {selectedCount} selected task{selectedCount === 1 ? '' : 's'}
          </p>
          <p className="body-4 text-muted-foreground">
            Pixel will consolidate these before the team sees them.
          </p>
        </div>

        <div className="gap-spacing-2 grid grid-cols-3">
          {MODES.map((option) => {
            const message = DELEGATION_MODE_MESSAGES[option]
            const selected = mode === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setMode(option)}
                className={cn(
                  'rounded-spacing-2 p-spacing-2 body-4 border text-left transition-colors',
                  selected
                    ? 'card-glass-blue text-foreground'
                    : 'button-glass-neutral text-muted-foreground border-transparent',
                )}
              >
                <span className="block font-medium">{message.label}</span>
              </button>
            )
          })}
        </div>

        <p className="body-4 text-muted-foreground">{DELEGATION_MODE_MESSAGES[mode].description}</p>

        <label className="gap-spacing-1 flex flex-col">
          <span className="body-4 text-muted-foreground">Delegation note</span>
          <textarea
            aria-label="Delegation note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add urgency, context, or the outcome you want."
            className="input-glass body-3 text-foreground h-spacing-20 w-full resize-none"
          />
        </label>

        <div className="gap-spacing-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelegate(mode, note)}
            className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
          >
            Send to Delegation Desk
          </button>
        </div>
      </div>
    </FloatingPanel>
  )
}
