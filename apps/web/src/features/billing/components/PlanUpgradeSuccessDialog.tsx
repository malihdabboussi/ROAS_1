'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Check, Sparkles } from 'lucide-react'

interface PlanUpgradeSuccessDialogProps {
  open: boolean
  onClose: () => void
  planName: string
}

export function PlanUpgradeSuccessDialog({
  open,
  onClose,
  planName,
}: PlanUpgradeSuccessDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-modal-overlay fixed inset-0 z-50" />
        <DialogPrimitive.Content className="surface-card border-border fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border p-8 shadow-2xl">
          {/* Success Icon */}
          <div className="mb-6 text-center">
            <div className="border-primary/20 bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border">
              <Sparkles className="text-primary h-8 w-8" />
            </div>

            <DialogPrimitive.Title className="text-foreground text-lg font-semibold">
              WELCOME TO {planName.toUpperCase()}!
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="body-2 text-muted-foreground mt-1">
              Your plan has been upgraded successfully
            </DialogPrimitive.Description>

            {/* Features unlocked */}
            <div className="bg-secondary/30 border-border mt-6 space-y-2 rounded-xl border px-4 py-4 text-left">
              <p className="body-3 text-muted-foreground mb-3 text-center">
                You now have access to:
              </p>
              {[
                'More monthly credits',
                'Additional funnels & campaigns',
                'Custom domains',
                'Advanced features',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="text-success h-3.5 w-3.5 flex-shrink-0" />
                  <span className="body-3 text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action */}
          <button
            type="button"
            onClick={onClose}
            className="button-glass-primary w-full rounded-lg px-4 py-3 text-sm font-medium"
          >
            Let&apos;s go!
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
