'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Loader2 } from 'lucide-react'
import type { BrainOption } from '@/components/deliverables/deliverable-preview-modal.types'

export function DeliverablePreviewBrainConfirmDialog({
  confirmBrain,
  setConfirmBrain,
  brainIngesting,
  onConfirmIngest,
}: {
  confirmBrain: BrainOption | null
  setConfirmBrain: (o: BrainOption | null) => void
  brainIngesting: boolean
  onConfirmIngest: () => void
}) {
  return (
    <DialogPrimitive.Root
      open={!!confirmBrain}
      onOpenChange={(open) => {
        if (!open) setConfirmBrain(null)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 sm:p-spacing-4 md:p-spacing-6 fixed inset-0 flex items-center justify-center overflow-hidden p-2">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Ingest into Brain</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          {confirmBrain && (
            <div className="surface-card card-elevated wizard-container-border rounded-spacing-4 container-modal-sm relative flex w-full flex-col overflow-hidden shadow-xl">
              <div className="px-spacing-6 pt-spacing-4 pb-spacing-2">
                <h3 className="title-h6 text-foreground">Ingest into Brain</h3>
                <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-1">
                  Are you sure you want to ingest this deliverable into{' '}
                  <span className="text-foreground font-semibold">{confirmBrain.label}?</span>
                </DialogPrimitive.Description>
              </div>
              <div className="border-border px-spacing-6 py-spacing-4 gap-spacing-2 flex items-center justify-end border-t">
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    disabled={brainIngesting}
                    className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="button"
                  onClick={() => void onConfirmIngest()}
                  disabled={brainIngesting}
                  className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="gap-spacing-2 relative z-10 flex items-center">
                    {brainIngesting && <Loader2 className="icon-sm animate-spin" />}
                    {brainIngesting ? 'Sending...' : 'Yes, ingest'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
