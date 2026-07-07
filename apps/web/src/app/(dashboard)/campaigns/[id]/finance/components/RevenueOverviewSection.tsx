'use client'

import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, DollarSign, Receipt, RefreshCw, Undo2, Wallet } from 'lucide-react'
import type { CampaignStripeOverview } from '@/features/studio/services/analytics.service'
import { TIME_LABELS } from '../constants'
import type { TimeRange } from '../types'
import { fmt } from '../utils/financeFormatters'

interface Props {
  campaignName?: string | null
  timeRange: TimeRange
  timeRangeOpen: boolean
  setTimeRangeOpen: (value: boolean | ((v: boolean) => boolean)) => void
  timeRangeBtnRef: RefObject<HTMLButtonElement | null>
  timeRangePos: { top: number; left: number }
  setTimeRange: (range: TimeRange) => void
  loadOverview: () => Promise<void>
  overviewLoading: boolean
  overview: CampaignStripeOverview | null
  currency: string
  /** When true, no outer card around header + KPI grid (e.g. Spaces finance view). */
  embedded?: boolean
  /** When true, hide time range + refresh in header (Spaces reporting toolbar). */
  hideHeaderControls?: boolean
}

export function RevenueOverviewSection({
  campaignName,
  timeRange,
  timeRangeOpen,
  setTimeRangeOpen,
  timeRangeBtnRef,
  timeRangePos,
  setTimeRange,
  loadOverview,
  overviewLoading,
  overview,
  currency,
  embedded = false,
  hideHeaderControls = false,
}: Props) {
  const rootClassName = embedded ? 'flex flex-col gap-4' : 'card-glass p-5'

  return (
    <div className={rootClassName}>
      <div
        className={`flex items-center ${hideHeaderControls ? '' : 'justify-between'} ${embedded ? '' : 'mb-4'}`}
      >
        <div>
          <p className="body-2 text-foreground font-semibold">Revenue Overview</p>
          <p className="body-4 text-muted-foreground mt-0.5">
            {campaignName ? `${campaignName} · ` : ''}Stripe Connect
          </p>
        </div>
        {!hideHeaderControls ? (
          <div className="flex items-center gap-2">
            <div>
              <button
                ref={timeRangeBtnRef}
                type="button"
                onClick={() => setTimeRangeOpen((v) => !v)}
                className="chip-glass-neutral body-4 text-muted-foreground flex items-center gap-1 rounded-lg px-3 py-1.5"
              >
                {TIME_LABELS[timeRange]}
                <ChevronDown className="h-3 w-3" />
              </button>
              {timeRangeOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    data-dropdown
                    className="dropdown-menu-solid z-dropdown rounded-spacing-2 p-spacing-2 fixed min-w-40"
                    style={{
                      top: timeRangePos.top,
                      left: timeRangePos.left,
                      transform: 'translateX(-100%)',
                    }}
                  >
                    {(Object.keys(TIME_LABELS) as TimeRange[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setTimeRange(key)
                          setTimeRangeOpen(false)
                        }}
                        className={`body-3 rounded-spacing-1 px-spacing-2 py-spacing-2 block w-full text-left ${
                          timeRange === key
                            ? 'dropdown-option-selected'
                            : 'text-muted-foreground hover:bg-hover-subtle hover:text-foreground'
                        }`}
                      >
                        {TIME_LABELS[key]}
                      </button>
                    ))}
                  </div>,
                  document.body,
                )}
            </div>
            <button
              type="button"
              onClick={() => void loadOverview()}
              disabled={overviewLoading}
              className="btn-icon-glass rounded-spacing-2"
            >
              <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: 'Gross Revenue',
            value: overview?.gross ?? 0,
            icon: DollarSign,
            color: 'text-emerald-400',
          },
          { label: 'Refunds', value: overview?.refunds ?? 0, icon: Undo2, color: 'text-red-400' },
          {
            label: 'Stripe Fees',
            value: overview?.fees ?? 0,
            icon: Receipt,
            color: 'text-amber-400',
          },
          {
            label: 'Net Revenue',
            value: overview?.net ?? 0,
            icon: Wallet,
            color: 'text-blue-400',
          },
        ].map((m) => (
          <div key={m.label} className="card-glass p-4">
            <div className="text-muted-foreground mb-2 flex items-center gap-2">
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <span className="body-4">{m.label}</span>
            </div>
            <p className="text-foreground text-xl font-bold">
              {overviewLoading ? '—' : fmt(m.value, currency)}
            </p>
          </div>
        ))}
      </div>

      {overview && overview.transactionsCount > 0 && (
        <p className="body-4 text-muted-foreground mt-3">
          {overview.transactionsCount} transaction
          {overview.transactionsCount !== 1 ? 's' : ''}
          {overview.refundRate > 0 && ` · ${(overview.refundRate * 100).toFixed(1)}% refund rate`}
        </p>
      )}
    </div>
  )
}
