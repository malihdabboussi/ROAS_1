'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { BillingStatusResponse } from '@/features/settings/types/billing.types'
import type { PendingPlanChange } from '../types'
import { formatNumber } from '../utils/billing-format'

export function PlanChangeConfirmDialog({
  pendingPlanChange,
  status,
  onDismiss,
  onConfirm,
}: {
  pendingPlanChange: PendingPlanChange | null
  status: BillingStatusResponse | null
  onDismiss: () => void
  onConfirm: () => void
}) {
  return (
    <DialogPrimitive.Root
      open={pendingPlanChange !== null}
      onOpenChange={(open) => {
        if (!open) onDismiss()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="z-modal-backdrop fixed inset-0" />
        <DialogPrimitive.Content className="z-modal-layer-3 p-spacing-4 fixed inset-0 flex items-center justify-center">
          <div className="surface-card wizard-container-border rounded-spacing-4 w-full max-w-md">
            <div className="px-spacing-6 pt-spacing-6 pb-spacing-2">
              <DialogPrimitive.Title className="title-h6 text-center">
                {pendingPlanChange?.direction === 'upgrade'
                  ? 'Confirm Upgrade'
                  : 'Confirm Downgrade'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="body-3 text-muted-foreground mt-spacing-2 text-center">
                {pendingPlanChange?.direction === 'upgrade'
                  ? 'You are about to upgrade your plan.'
                  : 'You are about to downgrade your plan.'}
              </DialogPrimitive.Description>
            </div>

            {pendingPlanChange && (
              <div className="px-spacing-6 py-spacing-4 space-y-spacing-3">
                <div className="border-border rounded-spacing-2 p-spacing-3 space-y-spacing-2 border">
                  <div className="flex items-center justify-between">
                    <span className="body-3 text-muted-foreground">Plan</span>
                    <div className="gap-spacing-2 flex items-center">
                      <span className="body-2 text-muted-foreground">
                        {status?.plan?.name ?? 'Free'}
                      </span>
                      <span className="body-3 text-muted-foreground">→</span>
                      <span className="body-2 text-foreground font-medium">
                        {pendingPlanChange.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-3 text-muted-foreground">Credits / month</span>
                    <div className="gap-spacing-2 flex items-center">
                      <span className="body-2 text-muted-foreground">
                        {formatNumber(status?.plan?.base_credits ?? 0)}
                      </span>
                      <span className="body-3 text-muted-foreground">→</span>
                      <span className="body-2 text-foreground font-medium">
                        {formatNumber(pendingPlanChange.credits)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="body-3 text-muted-foreground">Price / month</span>
                    <div className="gap-spacing-2 flex items-center">
                      <span className="body-2 text-muted-foreground">
                        $
                        {status?.plan
                          ? status.plan.interval === 'year'
                            ? Math.ceil(status.plan.price_amount / 100 / 12)
                            : Math.round(status.plan.price_amount / 100)
                          : 0}
                      </span>
                      <span className="body-3 text-muted-foreground">→</span>
                      <span className="body-2 text-foreground font-medium">
                        ${pendingPlanChange.monthlyPrice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-spacing-6 py-spacing-4 border-border gap-spacing-2 flex items-center justify-between border-t">
              <button
                type="button"
                onClick={onDismiss}
                className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="button-glass-accent flex-1 rounded-lg px-4 py-2 text-sm font-medium"
              >
                <span className="relative z-10">
                  {pendingPlanChange?.direction === 'upgrade'
                    ? 'Confirm Upgrade'
                    : 'Confirm Downgrade'}
                </span>
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
