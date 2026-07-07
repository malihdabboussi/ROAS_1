'use client'

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
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="surface-card relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] p-8 shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground absolute right-4 top-4 rounded p-1 transition-colors"
            aria-label="Close"
          >
            <X className="icon-sm" />
          </button>
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              {resourceName.toUpperCase()} LIMIT REACHED
            </h2>
            <p className="body-2 text-muted-foreground mt-2">
              You&apos;ve reached the maximum of{' '}
              <span className="text-foreground font-semibold">{maxAllowed}</span>{' '}
              {resourceName.toLowerCase()} on your {planName} plan. You currently have{' '}
              <span className="text-foreground font-semibold">{currentCount}</span>.
            </p>

            <div className="bg-[var(--color-secondary)]/30 mt-4 rounded-xl border border-[var(--color-border)] px-4 py-3">
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
        </div>
      </div>
    </>
  )
}
