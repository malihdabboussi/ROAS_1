'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface LimitReachedDialogProps {
  open: boolean
  onClose: () => void
  onUpgrade: () => void
  resourceName: string
  currentCount: number
  maxAllowed: number
  planName: string
}

/**
 * Shown when the user hits a plan limit for a specific resource
 * (e.g., max funnels, campaigns, domains).
 */
export function LimitReachedDialog({
  open,
  onClose,
  onUpgrade,
  resourceName,
  currentCount,
  maxAllowed,
  planName,
}: LimitReachedDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-modal-overlay fixed inset-0 z-50" />
        <DialogPrimitive.Content className="surface-card border-border fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border p-8 shadow-2xl">
          <DialogPrimitive.Close
            type="button"
            className="text-muted-foreground hover:text-foreground absolute right-4 top-4 rounded p-1 transition-colors"
            aria-label="Close campaign limit dialog"
          >
            <X className="icon-sm" />
          </DialogPrimitive.Close>
          <div className="mb-6 text-center">
            <DialogPrimitive.Title className="text-foreground text-lg font-semibold">
              {resourceName.toUpperCase()} LIMIT REACHED
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="body-2 text-muted-foreground mt-2">
              You&apos;ve reached the maximum of{' '}
              <span className="text-foreground font-semibold">{maxAllowed}</span>{' '}
              {resourceName.toLowerCase()} on your {planName} plan. You currently have{' '}
              <span className="text-foreground font-semibold">{currentCount}</span>.
            </DialogPrimitive.Description>

            <div className="bg-secondary/30 border-border mt-4 rounded-xl border px-4 py-3">
              <p className="body-3 text-muted-foreground">
                Upgrade your plan to get more {resourceName.toLowerCase()} and unlock additional
                features.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onUpgrade}
              className="button-glass-primary w-full rounded-lg px-4 py-3 text-sm font-medium"
            >
              Upgrade Plan
            </button>
            <button
              type="button"
              onClick={onClose}
              className="body-3 text-muted-foreground hover:text-foreground w-full py-2 text-center transition-colors"
            >
              Maybe later
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
