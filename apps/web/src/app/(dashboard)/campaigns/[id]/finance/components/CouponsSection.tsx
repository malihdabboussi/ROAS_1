'use client'

import { ChevronDown, Plus, Tag } from 'lucide-react'
import { ListSkeleton } from '@/components/ui/feedback/ListSkeleton'
import type { StripeCoupon } from '@/features/studio/services/analytics.service'
import { NEW_BTN_CLASS } from '../constants'
import { fmt } from '../utils/financeFormatters'

interface Props {
  couponsOpen: boolean
  setCouponsOpen: (value: boolean | ((v: boolean) => boolean)) => void
  coupons: StripeCoupon[]
  objectsLoading: boolean
  setShowNewCouponModal: (open: boolean) => void
  hideNewButton?: boolean
  filterQuery?: string
}

export function CouponsSection({
  couponsOpen,
  setCouponsOpen,
  coupons,
  objectsLoading,
  setShowNewCouponModal,
  hideNewButton = false,
  filterQuery = '',
}: Props) {
  const fq = filterQuery.trim().toLowerCase()
  const couponsFiltered = fq
    ? coupons.filter(
        (c) => c.id.toLowerCase().includes(fq) || (c.name ?? '').toLowerCase().includes(fq),
      )
    : coupons

  return (
    <div className="card-glass p-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCouponsOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <ChevronDown
            className={`text-muted-foreground h-4 w-4 transition-transform ${couponsOpen ? '' : '-rotate-90'}`}
          />
          <div className="text-left">
            <p className="body-2 text-foreground font-semibold">
              {`Coupons (${couponsFiltered.length}${fq && coupons.length !== couponsFiltered.length ? ` / ${coupons.length}` : ''})`}
            </p>
            <p className="body-4 text-muted-foreground mt-0.5">
              Discount codes tagged to this campaign
            </p>
          </div>
        </button>
        {!hideNewButton ? (
          <button
            type="button"
            onClick={() => setShowNewCouponModal(true)}
            className={NEW_BTN_CLASS}
          >
            <Plus className="h-3.5 w-3.5" /> New Coupon
          </button>
        ) : null}
      </div>

      {couponsOpen && (
        <div className="mt-4">
          {objectsLoading ? (
            <ListSkeleton rows={3} label="Loading..." />
          ) : coupons.length === 0 ? (
            <p className="body-4 text-muted-foreground">No coupons yet.</p>
          ) : couponsFiltered.length === 0 ? (
            <p className="body-4 text-muted-foreground">No coupons match your search.</p>
          ) : (
            <div className="space-y-2">
              {couponsFiltered.map((coupon) => (
                <div
                  key={coupon.id}
                  className="bg-surface-subtle flex items-center justify-between gap-3 rounded-xl border border-white/5 px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Tag className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="body-3 text-foreground font-mono font-bold">
                          {coupon.id}
                        </span>
                        {coupon.name && (
                          <span className="body-4 text-muted-foreground">{coupon.name}</span>
                        )}
                        {!coupon.valid && (
                          <span className="body-4 text-destructive rounded-full bg-red-500/10 px-2 py-0.5">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="body-4 text-muted-foreground mt-0.5">
                        {coupon.percent_off != null
                          ? `${coupon.percent_off}% off`
                          : coupon.amount_off != null && coupon.currency
                            ? `${fmt(coupon.amount_off / 100, coupon.currency)} off`
                            : ''}
                        {' · '}
                        {coupon.duration}
                        {coupon.duration_in_months ? ` (${coupon.duration_in_months}mo)` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="body-3 text-foreground font-semibold">{coupon.times_redeemed}</p>
                    <p className="body-4 text-muted-foreground">
                      {coupon.max_redemptions ? `/ ${coupon.max_redemptions}` : 'uses'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
