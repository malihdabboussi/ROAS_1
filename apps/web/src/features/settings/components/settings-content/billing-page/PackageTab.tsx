'use client'

import { Brain, Loader2 } from 'lucide-react'
import type { BillingStatusResponse } from '@/features/settings/types/billing.types'
import { SubscriptionStatusBadge } from '../billing/SubscriptionStatusBadge'
import { formatDate, formatNumber } from './utils/billing-format'

export function PackageTab({
  status,
  onUpgrade,
  onCancel,
  onManage,
  portalLoading,
}: {
  status: BillingStatusResponse | null
  onUpgrade: () => void
  onCancel: () => void
  onManage: () => void
  portalLoading: boolean
}) {
  if (!status) return null

  const plan = status.plan
  const sub = status.subscription
  const isFree = !plan || plan.slug === 'free'
  const isEnterprisePlan = plan?.slug?.startsWith('enterprise') ?? false
  const isCanceled = sub?.cancel_at_period_end
  const addons = status.addons ?? []
  const hasAddons = addons.length > 0
  const planLabel = hasAddons ? `${plan?.name ?? 'Free'} + Add-Ons` : (plan?.name ?? 'Free')
  const planMonthlyCents = plan
    ? plan.interval === 'year'
      ? Math.round(plan.price_amount / 12)
      : plan.price_amount
    : 0
  const addonMonthlyCents = addons.length * 1000
  const totalMonthlyCents = planMonthlyCents + addonMonthlyCents

  return (
    <div className="space-y-spacing-3">
      <div className="border-border pb-spacing-2 flex items-center justify-between border-b">
        <div>
          <p className="body-3 text-muted-foreground">Plan</p>
          <div className="gap-spacing-2 mt-0.5 flex items-center">
            <p className="body-2 text-foreground font-medium">{planLabel}</p>
            {sub?.status && (
              <SubscriptionStatusBadge
                status={sub.status}
                cancelAtPeriodEnd={sub.cancel_at_period_end ?? false}
              />
            )}
          </div>
        </div>
        {isEnterprisePlan && (
          <div className="text-right">
            <p className="body-2 text-foreground font-medium">Credits are charged at cost</p>
          </div>
        )}
        {!isFree && !isEnterprisePlan && plan && (
          <div className="text-right">
            <p className="body-3 text-muted-foreground">
              {plan.interval === 'year' ? 'Yearly' : 'Monthly'}
            </p>
            <p className="body-2 text-foreground">
              ${(plan.price_amount / 100).toFixed(0)}
              {plan.interval === 'year' ? '/yr' : '/mo'}
            </p>
          </div>
        )}
        {isFree && (
          <button
            onClick={onUpgrade}
            className="button-glass-accent rounded-lg px-4 py-2 text-sm font-medium"
          >
            <span className="relative z-10">Upgrade</span>
          </button>
        )}
      </div>

      {hasAddons && (
        <div className="border-border pb-spacing-2 border-b">
          <p className="body-3 text-muted-foreground mb-spacing-2">Add-Ons</p>
          <div className="space-y-spacing-1">
            {addons.map((addon, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="gap-spacing-2 flex items-center">
                  <Brain className="icon-sm text-foreground" />
                  <span className="body-3 text-foreground">Agent Brain</span>
                  <span className="badge-glass badge-glass-muted badge-glass-sm">
                    {addon.agentId}
                  </span>
                </div>
                <span className="body-3 text-foreground">
                  {isEnterprisePlan ? 'Included' : '$10/mo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isFree && !isEnterprisePlan && (
        <div className="border-border pb-spacing-2 flex items-center justify-between border-b">
          <p className="body-2 text-foreground font-medium">Monthly total</p>
          <p className="body-2 text-foreground font-bold">
            ${(totalMonthlyCents / 100).toFixed(0)}/mo
          </p>
        </div>
      )}

      {sub?.current_period_end && (
        <div className="border-border pb-spacing-2 flex items-center justify-between border-b">
          <div>
            <p className="body-3 text-muted-foreground">Billing cycle</p>
            <p className="body-2 text-foreground mt-0.5">
              {plan?.interval === 'year' ? 'Yearly' : 'Monthly'}
            </p>
          </div>
          <div className="text-right">
            <p className="body-3 text-muted-foreground">
              {isCanceled ? 'Cancels' : 'Next renewal'}
            </p>
            <p className="body-2 text-foreground">{formatDate(sub.current_period_end)}</p>
          </div>
        </div>
      )}

      {plan && (
        <div className="border-border pb-spacing-2 flex items-center justify-between border-b">
          <p className="body-3 text-muted-foreground">
            {isEnterprisePlan ? 'Monthly free credits' : 'Monthly credits'}
          </p>
          <p className="body-2 text-foreground font-medium">{formatNumber(plan.base_credits)}</p>
        </div>
      )}

      <div className="gap-spacing-2 pt-spacing-2 flex flex-col">
        <div className="gap-spacing-2 flex">
          <button
            onClick={onUpgrade}
            className="button-glass-accent flex-1 rounded-lg px-4 py-2 text-sm font-medium"
          >
            <span className="relative z-10">{isFree ? 'Choose a Plan' : 'Change Plan'}</span>
          </button>
          {!isFree && (
            <button
              onClick={onManage}
              disabled={portalLoading}
              className="button-glass-neutral hover:bg-hover-subtle hover:text-foreground flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                'Manage Subscription'
              )}
            </button>
          )}
        </div>
      </div>

      {!isFree && !isCanceled && (
        <div className="pt-1 text-right">
          <button
            onClick={onCancel}
            className="body-3 text-muted-foreground hover:text-destructive transition-colors"
          >
            Cancel subscription
          </button>
        </div>
      )}
    </div>
  )
}
