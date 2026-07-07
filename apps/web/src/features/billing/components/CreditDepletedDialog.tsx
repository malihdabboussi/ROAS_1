'use client'

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
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="surface-card w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>

            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              CREDITS DEPLETED
            </h2>
            <p className="body-2 text-muted-foreground mt-2">
              You&apos;ve used all your credits for this month. To continue using AI features, you
              can {isFreeUser ? 'upgrade your plan' : 'buy more credits or upgrade your plan'}.
            </p>
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
        </div>
      </div>
    </>
  )
}
