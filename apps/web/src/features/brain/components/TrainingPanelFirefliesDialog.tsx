'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Loader2, X } from 'lucide-react'
import { formatTrainingPanelMeetingTime } from '../hooks/training-panel-call-import-helpers'
import type { FirefliesTranscript } from '../services/user-brain-import.service'

interface TrainingPanelFirefliesDialogProps {
  importingMeetingId: string | null
  loading: boolean
  onImportTranscript: (transcript: FirefliesTranscript) => void | Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  transcripts: FirefliesTranscript[]
}

export function TrainingPanelFirefliesDialog({
  importingMeetingId,
  loading,
  onImportTranscript,
  onOpenChange,
  open,
  transcripts,
}: TrainingPanelFirefliesDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false)
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Import Fireflies Calls</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="relative h-full w-full max-w-none sm:h-auto sm:max-h-[85vh] sm:max-w-2xl">
            <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex h-full flex-col overflow-hidden">
              <div className="px-spacing-4 sm:px-spacing-6 pt-spacing-4 pb-spacing-2">
                <div className="flex items-center justify-between">
                  <h2 className="title-h6">FIREFLIES CALLS</h2>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="btn-icon-bare"
                  >
                    <X className="icon-xs" />
                  </button>
                </div>
                <p className="body-3 text-muted-foreground mt-spacing-1">
                  One click import runs crystallization and memory extraction.
                </p>
              </div>
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-2 flex-1 overflow-y-auto">
                {loading ? (
                  <div className="body-3 text-muted-foreground py-spacing-4 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : transcripts.length === 0 ? (
                  <p className="body-3 text-muted-foreground py-spacing-4 text-center">
                    No Fireflies calls found.
                  </p>
                ) : (
                  transcripts.map((transcript) => {
                    const importing = importingMeetingId === `fireflies:${transcript.id}`
                    return (
                      <div
                        key={transcript.id}
                        className="border-border rounded-spacing-2 bg-muted/20 px-spacing-3 py-spacing-2 gap-spacing-3 flex items-center justify-between border"
                      >
                        <div className="min-w-0">
                          <p className="body-3 text-foreground truncate font-medium">
                            {transcript.title || 'Untitled Meeting'}
                          </p>
                          <p className="typo-caption text-muted-foreground">
                            {formatTrainingPanelMeetingTime(transcript.date)}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!!importingMeetingId}
                          onClick={() => void onImportTranscript(transcript)}
                          className="button-glass-accent px-spacing-3 body-4 shrink-0 rounded-lg py-1 font-medium disabled:opacity-40"
                        >
                          {importing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Import'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
