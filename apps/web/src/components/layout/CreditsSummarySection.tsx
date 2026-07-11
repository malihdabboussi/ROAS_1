'use client'

import { BadgeDollarSign, ChevronRight } from 'lucide-react'
import type { BillingStatusResponse } from '@/lib/billing/billing.types'

function formatFull(n: number): string {
  return n.toLocaleString('en-US')
}

type CreditsSummarySectionProps = {
  status: BillingStatusResponse | null
  loading: boolean
  displayTotal: number
  balanceKnown: boolean
  onAddCredits: () => void
  onViewUsage: () => void
}

export function CreditsSummarySection({
  status,
  loading,
  displayTotal,
  balanceKnown,
  onAddCredits,
  onViewUsage,
}: CreditsSummarySectionProps) {
  const balance = status?.balance
  const planName = status?.plan?.name ?? 'Free'
  const monthlyRemaining = balance ? Math.max(0, balance.baseCredits - balance.baseCreditsUsed) : 0
  const monthlyCap = balance?.baseCredits ?? 0
  const rollover = balance?.rolloverCredits ?? 0
  const addonRemaining = balance
    ? Math.max(0, balance.purchasedCredits - balance.purchasedCreditsUsed)
    : 0
  const creditIconClass = 'icon-md shrink-0'

  return (
    <div className="border-b border-[var(--color-border)]">
      <div className="card-glass p-spacing-3">
        <div className="mb-spacing-3 gap-spacing-2 pb-spacing-3 flex items-start justify-between border-b border-dashed border-[var(--color-border)]">
          {loading && !status ? (
            <span className="inline-block h-5 w-16 animate-pulse rounded bg-[var(--color-secondary)]" />
          ) : (
            <span className="title-h4 text-card-foreground leading-tight">{planName}</span>
          )}
          <button
            type="button"
            onClick={onAddCredits}
            className="button-glass-gold body-3 rounded-spacing-1 px-spacing-2 py-spacing-1 shrink-0 font-medium"
          >
            Add credits
          </button>
        </div>

        {loading && !balance ? (
          <div className="space-y-spacing-2">
            <div className="flex items-center justify-between gap-2">
              <span className="body-2 text-card-foreground flex items-center gap-1">
                <BadgeDollarSign
                  className={`${creditIconClass} text-[var(--color-muted-foreground)]`}
                />
                Credits
              </span>
              <span className="inline-block h-4 w-12 animate-pulse rounded bg-[var(--color-secondary)]" />
            </div>
            <div className="body-3 space-y-spacing-1 pl-1 text-[var(--color-muted-foreground)]">
              <div className="flex items-center justify-between gap-2">
                <span>Rollover</span>
                <span className="inline-block h-3 w-8 animate-pulse rounded bg-[var(--color-secondary)]" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Monthly credits</span>
                <span className="inline-block h-3 w-14 animate-pulse rounded bg-[var(--color-secondary)]" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Add-on credits</span>
                <span className="inline-block h-3 w-8 animate-pulse rounded bg-[var(--color-secondary)]" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-spacing-2">
            <div className="flex items-center justify-between gap-2">
              <span className="body-2 text-card-foreground flex items-center gap-1">
                <BadgeDollarSign
                  className={`${creditIconClass} text-[var(--color-muted-foreground)]`}
                />
                Credits
              </span>
              <span className="body-2 text-card-foreground font-semibold">
                {balanceKnown ? formatFull(balance?.totalAvailable ?? displayTotal) : '—'}
              </span>
            </div>

            <div className="body-3 space-y-spacing-1 pl-1 text-[var(--color-muted-foreground)]">
              <div className="flex items-center justify-between gap-2">
                <span>Rollover</span>
                <span>{formatFull(rollover)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Monthly credits</span>
                <span>
                  {formatFull(monthlyRemaining)} / {formatFull(monthlyCap)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span>Add-on credits</span>
                <span>{formatFull(addonRemaining)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onViewUsage}
        className="body-3 px-spacing-3 py-spacing-2 flex w-full items-center justify-between text-left text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
      >
        View usage
        <ChevronRight className={creditIconClass} />
      </button>
    </div>
  )
}
