'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { X } from 'lucide-react'
import type { Segment } from '@/lib/properties/segments'

interface SegmentViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  viewingSegment: Segment | null
}

export function SegmentViewDialog({ open, onOpenChange, viewingSegment }: SegmentViewDialogProps) {
  return (
    <DialogPrimitive.Root open={open && !!viewingSegment} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop-above fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-4 p-spacing-4 fixed inset-0 flex items-center justify-center overflow-hidden">
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>View Segment</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="surface-card wizard-container-border rounded-spacing-4 relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-close-absolute flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-hover-subtle)] hover:text-[var(--foreground)]"
            >
              <X className="icon-sm" />
            </button>
            <div className="px-spacing-6 pt-spacing-6 pb-spacing-2 flex-shrink-0">
              <h2 className="title-h6">View Segment</h2>
              <p className="body-3 text-muted-foreground mt-spacing-1">
                Segment details and filters.
              </p>
            </div>
            {viewingSegment && (
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-4 flex-1 overflow-y-auto">
                <div>
                  <label className="body-3 text-muted-foreground">Segment Name</label>
                  <div className="mt-spacing-2 body-2 text-foreground">{viewingSegment.name}</div>
                </div>
                {viewingSegment.description && (
                  <div>
                    <label className="body-3 text-muted-foreground">Description</label>
                    <div className="mt-spacing-2 body-2 text-foreground">
                      {viewingSegment.description}
                    </div>
                  </div>
                )}
                <div>
                  <label className="body-3 text-muted-foreground">Lead Count</label>
                  <div className="mt-spacing-2 body-2 text-foreground font-medium">
                    {viewingSegment.lead_count.toLocaleString()} leads
                  </div>
                </div>
                <div>
                  <label className="body-3 text-muted-foreground">Created</label>
                  <div className="mt-spacing-2 body-2 text-muted-foreground">
                    {new Date(viewingSegment.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}
            <div className="px-spacing-6 py-spacing-4 border-border flex flex-shrink-0 items-center justify-end border-t">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="button-glass-neutral rounded-lg px-4 py-2 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
