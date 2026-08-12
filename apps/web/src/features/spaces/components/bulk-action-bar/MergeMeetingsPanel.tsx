'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { MEETING_MERGE_MESSAGES } from '../../config/meeting-merge-messages.config'
import { meetingHasRecording, rankMergeSurvivorId } from '../../lib/meeting-merge'
import type { SpaceItem } from '../../types'
import { FloatingPanel } from './FloatingPanel'

export function MergeMeetingsPanel({
  anchorRef,
  selectedItems,
  busy,
  onMerge,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  selectedItems: SpaceItem[]
  busy: boolean
  onMerge: (survivorItemId: string) => void
  onClose: () => void
}) {
  const [survivorId, setSurvivorId] = useState<string | null>(() =>
    rankMergeSurvivorId(selectedItems),
  )

  return (
    <FloatingPanel anchorRef={anchorRef} onClose={onClose} width={360}>
      <div className="gap-spacing-3 p-spacing-3 flex flex-col">
        <div>
          <p className="body-2 text-foreground font-medium">
            {MEETING_MERGE_MESSAGES.PANEL_TITLE(selectedItems.length)}
          </p>
          <p className="body-4 text-muted-foreground">{MEETING_MERGE_MESSAGES.PANEL_DESCRIPTION}</p>
        </div>

        <div className="gap-spacing-1 flex max-h-56 flex-col overflow-y-auto">
          {selectedItems.map((item) => {
            const selected = item.id === survivorId
            const callDate = readCallDate(item)
            return (
              <label
                key={item.id}
                className={cn(
                  'rounded-spacing-2 p-spacing-2 gap-spacing-2 flex cursor-pointer items-center border transition-colors',
                  selected
                    ? 'card-glass-blue text-foreground'
                    : 'button-glass-neutral text-muted-foreground border-transparent',
                )}
              >
                <input
                  type="radio"
                  name="merge-survivor"
                  checked={selected}
                  onChange={() => setSurvivorId(item.id)}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="body-3 truncate font-medium">{item.title}</span>
                  <span className="body-4 text-muted-foreground gap-spacing-2 flex items-center">
                    {callDate && <span>{callDate}</span>}
                    {meetingHasRecording(item) && (
                      <span className="text-foreground">
                        {MEETING_MERGE_MESSAGES.HAS_RECORDING}
                      </span>
                    )}
                  </span>
                </span>
              </label>
            )
          })}
        </div>

        <div className="gap-spacing-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="button-glass-neutral rounded-spacing-2 px-spacing-3 py-spacing-2 body-3"
          >
            {MEETING_MERGE_MESSAGES.CANCEL}
          </button>
          <button
            type="button"
            disabled={busy || !survivorId}
            onClick={() => survivorId && onMerge(survivorId)}
            className="button-glass-accent rounded-spacing-2 px-spacing-3 py-spacing-2 body-3 font-medium disabled:opacity-50"
          >
            {MEETING_MERGE_MESSAGES.CONFIRM}
          </button>
        </div>
      </div>
    </FloatingPanel>
  )
}

function readCallDate(item: SpaceItem): string | null {
  const cd = (item.custom_data ?? {}) as Record<string, unknown>
  const raw = typeof cd.call_date === 'string' ? cd.call_date : item.due_date
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString()
}
