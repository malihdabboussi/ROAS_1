'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import type { SubscriptionPlan } from '@/features/settings/types/billing.types'
import { AnimatedPrice } from './AnimatedPrice'
import { getPlanFeatures, getPlanSubtitle } from './plan-features'
import { PRO_CREDIT_TIERS } from './plans-tab.constants'
import { PlansTabFooterSection } from './PlansTabFooterSection'
import { formatNumber } from './utils/billing-format'

export function PlansTab({
  plans,
  currentSlug,
  currentPlanName: _currentPlanName,
  currentCredits,
  currentMonthlyPrice: _currentMonthlyPrice,
  isAnnual,
  onToggleAnnual,
  onSelect,
  checkoutLoading,
  autoRechargeEnabled,
}: {
  plans: SubscriptionPlan[]
  currentSlug: string
  currentPlanName: string
  currentCredits: number
  currentMonthlyPrice: number
  isAnnual: boolean
  onToggleAnnual: () => void
  onSelect: (
    slug: string,
    name: string,
    credits: number,
    monthlyPrice: number,
    direction: 'upgrade' | 'downgrade',
  ) => void
  checkoutLoading: string | null
  autoRechargeEnabled: boolean
}) {
  const [proDropdownOpen, setProDropdownOpen] = useState(false)
  const [selectedProTierIdx, setSelectedProTierIdx] = useState(0)
  const [priceAnimKey, setPriceAnimKey] = useState(0)
  const prevPricesRef = useRef<Record<string, number>>({})

  const selectedProTier = PRO_CREDIT_TIERS[selectedProTierIdx]!

  const proSlug =
    selectedProTier.slugBase === 'pro'
      ? isAnnual
        ? 'pro-annual'
        : 'pro-monthly'
      : `${selectedProTier.slugBase}-${isAnnual ? 'annual' : 'monthly'}`

  const proMatchedPlan = plans.find((p) => p.slug === proSlug)
  const proPrice = proMatchedPlan
    ? proMatchedPlan.price_amount / 100
    : selectedProTier.credits / 200
  const proMonthlyPrice = isAnnual ? Math.ceil(proPrice / 12) : Math.round(proPrice)

  const handleTierChange = (idx: number) => {
    prevPricesRef.current['pro'] = proMonthlyPrice
    setSelectedProTierIdx(idx)
    setProDropdownOpen(false)
    setPriceAnimKey((k) => k + 1)
  }

  const prevIntervalRef = useRef(isAnnual)
  useEffect(() => {
    if (prevIntervalRef.current !== isAnnual) {
      const prevInterval = prevIntervalRef.current ? 'year' : 'month'
      const mainSlugs = prevIntervalRef.current
        ? ['basic-annual', 'pro-annual', 'ultra-annual']
        : ['basic-monthly', 'pro-monthly', 'ultra-monthly']
      for (const slug of mainSlugs) {
        const p = plans.find((pl) => pl.slug === slug)
        if (p) {
          const price = p.price_amount / 100
          const mo = prevInterval === 'year' ? Math.ceil(price / 12) : Math.round(price)
          prevPricesRef.current[slug.replace(/-monthly|-annual/, '')] = mo
        }
      }
      prevPricesRef.current['pro'] = proMonthlyPrice
      setPriceAnimKey((k) => k + 1)
      prevIntervalRef.current = isAnnual
    }
  }, [isAnnual, plans, proMonthlyPrice])

  const mainSlugs = isAnnual
    ? ['basic-annual', 'pro-annual', 'ultra-annual']
    : ['basic-monthly', 'pro-monthly', 'ultra-monthly']
  const paidPlans = plans.filter((p) => mainSlugs.includes(p.slug))

  const getPlanTier = (slug: string) => {
    if (slug.startsWith('basic')) return 0
    if (slug.startsWith('pro')) return 1
    if (slug.startsWith('ultra')) return 2
    return -1
  }
  const currentTier = getPlanTier(currentSlug)

  return (
    <div className="space-y-spacing-4">
      <h2 className="title-h3 text-foreground text-center uppercase">VIBEY PRICING PLANS</h2>

      <div className="gap-spacing-3 flex items-center justify-center">
        <span
          className={`body-2 ${!isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isAnnual}
          onClick={onToggleAnnual}
          className="switch-glass-primary relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300"
        >
          <span
            className={`switch-glass-primary-thumb pointer-events-none block h-4 w-4 rounded-full transition-transform duration-300 ${isAnnual ? 'translate-x-4' : 'translate-x-1'}`}
          />
        </button>
        <span
          className={`body-2 ${isAnnual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
        >
          Annual <span className="text-primary font-semibold">(2 months free)</span>
        </span>
      </div>

      <div className="gap-spacing-4 grid grid-cols-1 md:grid-cols-3">
        {paidPlans.map((plan) => {
          const isPro = plan.name.toLowerCase() === 'pro'

          const effectiveSlug = isPro ? proSlug : plan.slug
          const isCurrent = isPro
            ? effectiveSlug === currentSlug
            : effectiveSlug === currentSlug || plan.slug === currentSlug

          const displayPrice = isPro ? proPrice : (plan.price_amount ?? 0) / 100
          const monthlyPrice = isPro
            ? proMonthlyPrice
            : plan.interval === 'year'
              ? Math.ceil(displayPrice / 12)
              : Math.round(displayPrice)

          const priceKey = isPro ? 'pro' : plan.name.toLowerCase()

          const effectiveCredits = isPro ? selectedProTier.credits : plan.base_credits
          const effectiveMaxCampaigns = isPro
            ? (proMatchedPlan?.max_campaigns ?? plan.max_campaigns)
            : plan.max_campaigns
          const features = getPlanFeatures(plan.name, effectiveCredits, effectiveMaxCampaigns)
          const subtitle = getPlanSubtitle(plan.name)

          return (
            <div
              key={plan.id}
              className={`rounded-spacing-3 border-border p-spacing-4 flex flex-col border transition-colors ${
                isCurrent ? 'card-glass-blue' : isPro ? 'surface-card card-elevated' : ''
              }`}
              style={
                isPro && !isCurrent
                  ? { boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35), 0 2px 12px rgba(0, 0, 0, 0.2)' }
                  : undefined
              }
            >
              <div className="mb-spacing-1">
                <div className="gap-spacing-1 flex items-baseline">
                  <AnimatedPrice
                    key={`${priceKey}-${priceAnimKey}`}
                    value={monthlyPrice}
                    prevValue={prevPricesRef.current[priceKey] ?? monthlyPrice}
                  />
                  {!isPro && (
                    <span className="body-3 text-muted-foreground font-normal">
                      / month{isAnnual ? ', billed yearly' : ''}
                    </span>
                  )}
                </div>
              </div>

              <p className="body-3 text-muted-foreground mb-spacing-3">{subtitle}</p>

              {(() => {
                const targetTier = getPlanTier(effectiveSlug)
                const isUpward =
                  targetTier > currentTier ||
                  (targetTier === currentTier && isPro && effectiveCredits > currentCredits)
                const direction: 'upgrade' | 'downgrade' = isUpward ? 'upgrade' : 'downgrade'
                const displayName = isPro ? `Pro (${formatNumber(effectiveCredits)})` : plan.name
                const label = isCurrent
                  ? 'Current Plan'
                  : currentTier >= 0
                    ? targetTier > currentTier
                      ? 'Upgrade'
                      : targetTier < currentTier
                        ? 'Downgrade'
                        : isPro && effectiveSlug !== currentSlug
                          ? effectiveCredits > currentCredits
                            ? 'Upgrade'
                            : 'Downgrade'
                          : isAnnual
                            ? 'Switch to Annual'
                            : 'Switch to Monthly'
                    : 'Get started'

                return (
                  <button
                    onClick={() =>
                      onSelect(
                        effectiveSlug,
                        displayName,
                        effectiveCredits,
                        monthlyPrice,
                        direction,
                      )
                    }
                    disabled={isCurrent || checkoutLoading === effectiveSlug}
                    className={`mb-spacing-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                      isCurrent ? 'button-glass-neutral' : 'button-glass-accent'
                    }`}
                  >
                    <span className="relative z-10">
                      {checkoutLoading === effectiveSlug || checkoutLoading === plan.slug ? (
                        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                      ) : (
                        label
                      )}
                    </span>
                  </button>
                )
              })()}

              {isPro && (
                <div className="mb-spacing-3 relative">
                  <button
                    type="button"
                    onClick={() => setProDropdownOpen(!proDropdownOpen)}
                    className="border-border hover:bg-hover-subtle flex w-full items-center justify-between rounded-lg border px-3 py-2.5 transition-colors"
                  >
                    <span className="body-2 text-foreground">
                      {formatNumber(selectedProTier.credits)} credits / month
                    </span>
                    <ChevronDown
                      className={`icon-sm text-muted-foreground transition-transform ${proDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {proDropdownOpen && (
                    <div className="border-border surface-card absolute left-0 right-0 top-full z-50 mt-1 max-h-[280px] overflow-y-auto rounded-lg border shadow-lg">
                      {PRO_CREDIT_TIERS.map((tier, idx) => {
                        const isSelected = selectedProTierIdx === idx
                        return (
                          <button
                            key={tier.credits}
                            type="button"
                            onClick={() => handleTierChange(idx)}
                            className={`flex w-full items-center justify-between px-3 py-3 text-left transition-colors ${
                              isSelected ? 'bg-primary/5' : 'hover:bg-hover-subtle'
                            }`}
                          >
                            <span className="body-2 text-foreground">
                              {formatNumber(tier.credits)} credits / month
                            </span>
                            {isSelected && <Check className="icon-sm text-primary" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-spacing-2 flex-1">
                {features.map((feat, i) => (
                  <div key={i} className="gap-spacing-2 flex items-start">
                    <div className="mt-0.5 flex-shrink-0">{feat.icon}</div>
                    <span className="body-3 text-muted-foreground">{feat.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <PlansTabFooterSection autoRechargeEnabled={autoRechargeEnabled} currentSlug={currentSlug} />
    </div>
  )
}
