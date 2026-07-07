'use client'

import { AlertCircle } from 'lucide-react'
import type { UserSubscription } from '@/features/settings/types/billing.types'
import { formatDate } from '../utils/billing-format'

export function BillingAlertsSection({
  error,
  hasStatus,
  onDismissError,
  isCanceled,
  subscription,
  onReactivate,
  onManageSubscription,
  portalLoading,
}: {
  error: string | null
  hasStatus: boolean
  onDismissError: () => void
  isCanceled: boolean | null | undefined
  subscription: UserSubscription | null | undefined
  onReactivate: () => void
  onManageSubscription: () => void
  portalLoading: boolean
}) {
  return (
    <>
      {error && hasStatus && (
        <div className="gap-spacing-2 rounded-spacing-2 border-destructive/30 bg-destructive/5 p-spacing-3 flex items-center border">
          <AlertCircle className="text-destructive h-4 w-4 flex-shrink-0" />
          <p className="body-3 text-destructive">{error}</p>
          <button onClick={onDismissError} className="body-3 text-muted-foreground ml-auto">
            Dismiss
          </button>
        </div>
      )}

      {isCanceled && subscription?.current_period_end && (
        <div className="gap-spacing-3 rounded-spacing-3 p-spacing-4 flex items-start border border-amber-500/30 bg-amber-500/5">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div className="flex-1">
            <h3 className="body-2 text-foreground font-semibold">Cancellation Scheduled</h3>
            <p className="body-3 mt-spacing-1 text-muted-foreground">
              Your subscription will end on{' '}
              <span className="text-foreground font-semibold">
                {formatDate(subscription.current_period_end)}
              </span>
              . You&apos;ll keep full access until then.
            </p>
            <button
              onClick={onReactivate}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground mt-spacing-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
            >
              Reactivate Subscription
            </button>
          </div>
        </div>
      )}

      {subscription?.status === 'past_due' && (
        <div className="gap-spacing-3 rounded-spacing-3 border-destructive/30 bg-destructive/5 p-spacing-4 flex items-start border">
          <AlertCircle className="text-destructive mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="body-2 text-foreground font-semibold">Payment Failed</h3>
            <p className="body-3 mt-spacing-1 text-muted-foreground">
              Your last payment didn&apos;t go through. Update your payment method to keep access.
            </p>
            <button
              onClick={onManageSubscription}
              disabled={portalLoading}
              className="body-3 mt-spacing-2 rounded-spacing-2 bg-destructive px-spacing-3 py-1.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {portalLoading ? 'Loading...' : 'Update Payment Method'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
