'use client'

import { useCallback, useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Diamond, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { crystallizeCortexMax } from '../services/brain.service'

interface CrystallizeBrainModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brainId: string | null
  brainLabel: string
  onQueued?: () => void
}

export function CrystallizeBrainModal({
  open,
  onOpenChange,
  brainId,
  brainLabel,
  onQueued,
}: CrystallizeBrainModalProps) {
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSubmitting(false)
    }
  }, [open])

  const handleSubmit = useCallback(async () => {
    if (!brainId || submitting) return

    setSubmitting(true)
    try {
      await crystallizeCortexMax(brainId)
      toast.success("All set. Atlas is crystallizing this brain's Cortex Max.")
      onQueued?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start crystallization.")
    } finally {
      setSubmitting(false)
    }
  }, [brainId, onOpenChange, onQueued, submitting])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content
          className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false)
          }}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Crystallize Brain</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <div className="surface-card card-elevated rounded-spacing-4 wizard-container-border flex w-full max-w-xl flex-col overflow-hidden">
            <div className="border-border px-spacing-5 py-spacing-3 flex shrink-0 items-center justify-between border-b">
              <div className="flex min-w-0 items-center gap-2">
                <Diamond className="icon-sm text-muted-foreground" />
                <div className="min-w-0">
                  <h2 className="title-h6">CRYSTALLIZE</h2>
                  <p className="body-4 text-muted-foreground truncate">{brainLabel}</p>
                </div>
              </div>
              <button type="button" onClick={() => onOpenChange(false)} className="btn-icon-bare">
                <X className="icon-xs" />
              </button>
            </div>

            <div className="px-spacing-5 py-spacing-4 gap-spacing-3 flex flex-col">
              <p className="body-3 text-muted-foreground">
                Are you sure you want to send Atlas a task to create Cortex Max documents, beliefs,
                and perspectives for this brain?
              </p>
            </div>

            <div className="border-border px-spacing-5 py-spacing-4 gap-spacing-2 flex justify-end border-t">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="button-glass-neutral rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 disabled:opacity-40"
              >
                Never mind
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !brainId}
                className="button-glass-accent rounded-spacing-2 px-spacing-4 py-spacing-2 body-3 gap-spacing-2 flex items-center disabled:opacity-40"
              >
                {submitting ? (
                  <Loader2 className="icon-xs animate-spin" />
                ) : (
                  <Diamond className="icon-xs" />
                )}
                Yes
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
