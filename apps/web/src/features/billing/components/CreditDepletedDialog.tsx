'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertCircle, Zap } from 'lucide-react'

interface CreditDepletedDialogProps {
  open: boolean
  onClose: () => void
  onBuyCredits: () => void
  onUpgrade: () => void
  isFreeUser: boolean
}

/**
 * Shown when the user has 0 credits remaining.
 * Blocks AI actions with a CTA to buy credits or upgrade.
 */
export function CreditDepletedDialog({
  open,
  onClose,
  onBuyCredits,
  onUpgrade,
  isFreeUser,
}: CreditDepletedDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="bg-modal-overlay fixed inset-0 z-50" />
        <DialogPrimitive.Content className="surface-card border-border fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="border-destructive/20 bg-destructive/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border">
              <AlertCircle className="text-destructive h-8 w-8" />
            </div>

            <DialogPrimitive.Title className="text-foreground text-lg font-semibold">
              CREDITS DEPLETED
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="body-2 text-muted-foreground mt-2">
              You&apos;ve used all your credits for this month. To continue using AI features, you
              can {isFreeUser ? 'upgrade your plan' : 'buy more credits or upgrade your plan'}.
            </DialogPrimitive.Description>
          </div>

          <div className="space-y-2">
            {!isFreeUser && (
              <button
                type="button"
                onClick={onBuyCredits}
                className="gap-spacing-2 bg-secondary text-foreground hover:bg-secondary/80 flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition-colors"
              >
                <Zap className="h-4 w-4" />
                Buy More Credits
              </button>
            )}
            <button
              type="button"
              onClick={onUpgrade}
              className="button-glass-primary w-full rounded-lg px-4 py-3 text-sm font-medium"
            >
              {isFreeUser ? 'Upgrade Plan' : 'Upgrade for More Credits'}
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
