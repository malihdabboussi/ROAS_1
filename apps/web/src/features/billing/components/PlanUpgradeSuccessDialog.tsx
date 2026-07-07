'use client'

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
  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div className="surface-card w-full max-w-md overflow-hidden rounded-2xl border border-[var(--color-border)] p-8 shadow-2xl">
          {/* Success Icon */}
          <div className="mb-6 text-center">
            <div className="border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border">
              <Sparkles className="text-primary h-8 w-8" />
            </div>

            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              WELCOME TO {planName.toUpperCase()}!
            </h2>
            <p className="body-2 text-muted-foreground mt-1">
              Your plan has been upgraded successfully
            </p>

            {/* Features unlocked */}
            <div className="bg-[var(--color-secondary)]/30 mt-6 space-y-2 rounded-xl border border-[var(--color-border)] px-4 py-4 text-left">
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
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
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
        </div>
      </div>
    </>
  )
}
