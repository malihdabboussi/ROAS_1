'use client'

import { Check, Loader2 } from 'lucide-react'
import type { SubscriptionPlan } from '@/features/settings/types/billing.types'

interface PlanCardProps {
  plan: SubscriptionPlan
  isCurrentPlan: boolean
  isAnnual: boolean
  onSelect: (planSlug: string) => void
  loading?: boolean
}

export default function PlanCard({
  plan,
  isCurrentPlan,
  isAnnual,
  onSelect,
  loading,
}: PlanCardProps) {
  const monthlyPrice = (plan.price_amount ?? 0) / 100
  const annualPrice = Math.round(monthlyPrice * 0.8) // 20% discount
  const displayPrice = isAnnual ? annualPrice : monthlyPrice
  const isFree = plan.slug === 'free'
  const isPopular = plan.slug.startsWith('pro')

  const formatCredits = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toString())

  // Derive feature list from plan's boolean capability flags
  const getFeatureList = (): string[] => {
    const features: string[] = []
    features.push('Unlimited campaigns')
    if (plan.can_voice_input) features.push('Voice input')
    if (plan.can_image_gen) features.push('Image generation')
    if (plan.can_advanced_analytics) features.push('Advanced analytics')
    if (plan.can_api_access) features.push('API access')
    if (plan.can_white_label) features.push('White label')
    if (plan.can_buy_credits) features.push('Buy extra credits')
    return features
  }

  const features = getFeatureList()

  return (
    <div
      className={`rounded-spacing-3 p-spacing-6 relative flex flex-col border transition-all ${
        isCurrentPlan
          ? 'border-primary bg-primary/5'
          : 'surface-card border-border hover:border-muted-foreground/40'
      }`}
    >
      {/* Popular badge */}
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="chip-glass-green px-spacing-3 rounded-full py-1 text-xs font-medium">
            Most Popular
          </span>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary px-spacing-3 text-background rounded-full py-1 text-xs font-medium">
            Current Plan
          </span>
        </div>
      )}

      {/* Plan name */}
      <h3 className="body-1 mt-spacing-2 text-foreground font-semibold">{plan.name}</h3>

      {/* Description if available */}
      {plan.description && (
        <p className="body-3 mt-spacing-1 text-muted-foreground">{plan.description}</p>
      )}

      {/* Price */}
      <div className="mt-spacing-3 mb-spacing-1">
        {isFree ? (
          <span className="text-foreground text-3xl font-bold">Free</span>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-foreground text-3xl font-bold">${displayPrice}</span>
            <span className="body-3 text-muted-foreground">/mo</span>
          </div>
        )}
        {!isFree && isAnnual && (
          <p className="body-3 text-muted-foreground mt-0.5">
            <span className="line-through">${monthlyPrice}/mo</span>{' '}
            <span className="text-primary">Save 20%</span>
          </p>
        )}
      </div>

      {/* Credits */}
      <p className="body-2 mb-spacing-4 text-muted-foreground">
        {formatCredits(plan.base_credits)} credits/month
      </p>

      {/* Features */}
      {features.length > 0 && (
        <ul className="mb-spacing-6 space-y-spacing-2 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="gap-spacing-2 flex items-start">
              <Check className="text-primary mt-0.5 h-4 w-4 flex-shrink-0" />
              <span className="body-3 text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* CTA Button */}
      <button
        onClick={() => onSelect(plan.slug)}
        disabled={isCurrentPlan || loading}
        className={`body-2 gap-spacing-2 rounded-spacing-2 py-spacing-2 flex w-full items-center justify-center font-medium transition-all ${
          isCurrentPlan
            ? 'bg-secondary text-muted-foreground cursor-default'
            : isFree
              ? 'bg-secondary text-foreground hover:bg-secondary/80'
              : 'bg-primary text-background hover:opacity-90'
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isCurrentPlan ? (
          'Current Plan'
        ) : isFree ? (
          'Get Started'
        ) : (
          'Upgrade'
        )}
      </button>
    </div>
  )
}
