'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Brain,
  Check,
  ChevronDown,
  FileSearch,
  FolderKanban,
  Globe,
  ImagePlus,
  MessageSquare,
  Mic,
  RefreshCw,
  Coins,
  Zap,
} from 'lucide-react'

// ── Pro credit tiers (matches in-app) ──────────────────────────────────
const PRO_CREDIT_TIERS = [
  { credits: 8000, label: '8,000' },
  { credits: 12000, label: '12,000' },
  { credits: 16000, label: '16,000' },
  { credits: 20000, label: '20,000' },
  { credits: 40000, label: '40,000' },
  { credits: 63000, label: '63,000' },
  { credits: 85000, label: '85,000' },
  { credits: 110000, label: '110,000' },
]

// ── Pricing data (matches Stripe/DB) ───────────────────────────────────
const PLAN_PRICES: Record<string, { monthly: number; annual: number }> = {
  basic: { monthly: 20, annual: 200 },
  pro: { monthly: 40, annual: 400 },
  'pro-12k': { monthly: 60, annual: 600 },
  'pro-16k': { monthly: 80, annual: 800 },
  'pro-20k': { monthly: 100, annual: 1000 },
  'pro-40k': { monthly: 200, annual: 2000 },
  'pro-63k': { monthly: 315, annual: 3150 },
  'pro-85k': { monthly: 425, annual: 4250 },
  'pro-110k': { monthly: 550, annual: 5500 },
  ultra: { monthly: 200, annual: 2000 },
}

function formatCredits(n: number): string {
  return n.toLocaleString('en-US')
}

function formatCampaignLimit(): string {
  return 'Unlimited campaigns'
}

// ── Animated number (from app billing) ────────────────────────────────────
function useAnimatedNumber(from: number, to: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(from)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!active) {
      setValue(to)
      return
    }
    const startTime = performance.now()
    const diff = to - from
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + diff * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [from, to, duration, active])

  return value
}

function AnimatedPrice({ value, prevValue }: { value: number; prevValue: number }) {
  const animated = useAnimatedNumber(prevValue, value, 400, prevValue !== value)
  return <span className="display-price tabular-nums text-white">${animated.toLocaleString()}</span>
}

interface PlanFeature {
  icon: React.ComponentType<{ size?: string | number; className?: string }>
  text: string
}

function getPlanFeatures(planName: string, credits: number): PlanFeature[] {
  const name = planName.toLowerCase()
  const common = [
    { icon: RefreshCw, text: '200 refresh credits everyday' },
    { icon: Coins, text: `${formatCredits(credits)} credits / month` },
    { icon: FolderKanban, text: formatCampaignLimit() },
  ]

  if (name === 'basic') {
    return [
      ...common,
      { icon: MessageSquare, text: 'AI chat for everyday tasks' },
      { icon: Brain, text: 'Memory for standard context' },
      { icon: Mic, text: 'Voice chat included' },
      { icon: Globe, text: 'Web research included' },
      { icon: ImagePlus, text: 'Image generation included' },
      { icon: FileSearch, text: 'File analysis included' },
      { icon: Zap, text: 'Early access to beta features' },
    ]
  }

  if (name === 'pro') {
    return [
      ...common,
      { icon: MessageSquare, text: 'AI chat with self-set usage' },
      { icon: Brain, text: 'Memory with growing context' },
      { icon: Mic, text: 'Voice chat with extended sessions' },
      { icon: Globe, text: 'Web research scaled to your plan' },
      { icon: ImagePlus, text: 'Image generation for steady creation' },
      { icon: FileSearch, text: 'File analysis for changing needs' },
      { icon: Zap, text: 'Early access to beta features' },
    ]
  }

  return [
    ...common,
    { icon: MessageSquare, text: 'AI chat for large-scale work' },
    { icon: Brain, text: 'Memory for deep, long-term context' },
    { icon: Mic, text: 'Voice chat for sustained use' },
    { icon: Globe, text: 'Web research for heavy use' },
    { icon: ImagePlus, text: 'Image generation for batch production' },
    { icon: FileSearch, text: 'File analysis with large documents' },
    { icon: Zap, text: 'Early access to beta features' },
  ]
}

export function PricingPreview() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [proTierIdx, setProTierIdx] = useState(0)
  const [proDropdownOpen, setProDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [intervalAnimKey, setIntervalAnimKey] = useState(0)
  const [tierAnimKey, setTierAnimKey] = useState(0)
  const prevPricesRef = useRef<Record<string, number>>({})
  const prevIntervalRef = useRef(isAnnual)

  const selectedProTier = PRO_CREDIT_TIERS[proTierIdx]!
  const proSlug = proTierIdx === 0 ? 'pro' : `pro-${selectedProTier.credits / 1000}k`

  // Track interval changes — save OLD prices, bump interval key (all 3 cards animate)
  useEffect(() => {
    if (prevIntervalRef.current !== isAnnual) {
      const wasAnnual = prevIntervalRef.current
      const mainSlugs = ['basic', 'pro', 'ultra']
      for (const slug of mainSlugs) {
        const prices = PLAN_PRICES[slug === 'pro' ? proSlug : slug]
        const oldMo = wasAnnual ? Math.ceil(prices.annual / 12) : prices.monthly
        prevPricesRef.current[slug] = oldMo
      }
      setIntervalAnimKey((k) => k + 1)
      prevIntervalRef.current = isAnnual
    }
  }, [isAnnual, proSlug])

  // Tier change — only Pro animates; Basic/Ultra stay static (clear their prev so no animation)
  const handleTierChange = (idx: number) => {
    const currentPrices = PLAN_PRICES[proSlug]
    prevPricesRef.current['pro'] = isAnnual
      ? Math.ceil(currentPrices.annual / 12)
      : currentPrices.monthly
    delete prevPricesRef.current['basic']
    delete prevPricesRef.current['ultra']
    setProTierIdx(idx)
    setProDropdownOpen(false)
    setTierAnimKey((k) => k + 1)
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProDropdownOpen(false)
      }
    }
    if (proDropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [proDropdownOpen])

  const plans = [
    { name: 'Basic', slug: 'basic' },
    { name: 'Pro', slug: 'pro', highlighted: true },
    { name: 'Ultra', slug: 'ultra' },
  ]

  return (
    <section className="relative pb-20 pt-6">
      <div className="site-container">
        <div className="border-section bg-color-deep/95 supports-[backdrop-filter]:bg-color-deep/80 sticky top-20 z-30 -mx-6 border-b px-6 py-4 backdrop-blur-md before:absolute before:bottom-full before:left-0 before:right-0 before:h-20 before:bg-color-deep/95 before:backdrop-blur-md supports-[backdrop-filter]:before:bg-color-deep/80 md:static md:z-auto md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none md:before:hidden">
          <div className="mx-auto max-w-5xl text-center md:mb-12">
            <h2 className="h2 tracking-tight text-white">Simple, transparent plans</h2>

            <div
              className="mt-4 flex cursor-pointer select-none flex-col items-center gap-3 min-[400px]:flex-row min-[400px]:justify-center md:mt-8"
              onClick={() => setIsAnnual(!isAnnual)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsAnnual(!isAnnual)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Toggle monthly or annual billing"
              aria-pressed={isAnnual}
            >
              <div className="flex w-full max-w-[280px] items-center justify-between gap-3 min-[400px]:w-auto min-[400px]:max-w-none min-[400px]:justify-center">
                <span
                  className={`body-3 shrink-0 font-medium ${!isAnnual ? 'text-white' : 'text-color-dim'}`}
                >
                  Monthly
                </span>
                <span
                  role="switch"
                  aria-checked={isAnnual}
                  className="switch-glass-primary relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-all duration-300"
                >
                  <span
                    className={`switch-glass-primary-thumb pointer-events-none block h-4 w-4 rounded-full transition-transform duration-300 ${
                      isAnnual ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </span>
                <span
                  className={`body-3 shrink-0 text-right font-medium min-[400px]:text-left ${isAnnual ? 'text-white' : 'text-color-dim'}`}
                >
                  Annual{' '}
                  <span className="text-emerald-accent font-semibold">(2 months free)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="mt-6 grid gap-6 overflow-visible sm:mt-0 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const isPro = plan.slug === 'pro'
              const effectiveSlug = isPro ? proSlug : plan.slug
              const planPrices = PLAN_PRICES[effectiveSlug]
              const monthlyPrice = isAnnual ? Math.ceil(planPrices.annual / 12) : planPrices.monthly
              const yearlyPrice = planPrices.annual
              const planCredits = isPro
                ? selectedProTier.credits
                : plan.slug === 'basic'
                  ? 4000
                  : 40000
              const features = getPlanFeatures(plan.name, planCredits)

              return (
                <div
                  key={plan.name}
                  className={`pricing-card glass-card hover-bg-mock-white-05 relative flex flex-col rounded-2xl p-8 transition-all duration-200 hover:translate-y-[-2px] ${
                    plan.highlighted ? 'pricing-card-highlighted' : ''
                  } ${isPro && proDropdownOpen ? 'z-20 overflow-visible' : ''} ${isPro ? 'overflow-visible' : ''}`}
                >
                  {plan.highlighted && (
                    <div className="bg-accent-secondary body-4 absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 font-bold text-white">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="h4 mb-2 text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <AnimatedPrice
                        key={
                          isPro
                            ? `pro-${intervalAnimKey}-${tierAnimKey}`
                            : `${plan.slug}-${intervalAnimKey}`
                        }
                        value={monthlyPrice}
                        prevValue={prevPricesRef.current[plan.slug.toLowerCase()] ?? monthlyPrice}
                      />
                      <span className="text-color-muted body-3">
                        /mo{isAnnual ? ', billed yearly' : ''}
                      </span>
                    </div>
                    {isAnnual && (
                      <p className="text-color-dim body-4 mt-1">
                        ${yearlyPrice.toLocaleString()}/year
                      </p>
                    )}
                  </div>

                  {isPro && (
                    <div ref={dropdownRef} className="relative mb-6">
                      <button
                        type="button"
                        onClick={() => setProDropdownOpen(!proDropdownOpen)}
                        className="pricing-glass-trigger border-strong bg-color-subtle body-3 flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-white transition-colors"
                      >
                        <span>{formatCredits(selectedProTier.credits)} credits / month</span>
                        <ChevronDown
                          size={16}
                          className={`text-color-muted transition-transform ${proDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {proDropdownOpen && (
                        <div className="border-strong bg-color-panel-mid absolute left-0 right-0 top-full z-[90] mt-1 max-h-[240px] overflow-y-auto rounded-xl border shadow-xl">
                          {PRO_CREDIT_TIERS.map((tier, idx) => {
                            const isSelected = proTierIdx === idx
                            const tierSlug = idx === 0 ? 'pro' : `pro-${tier.credits / 1000}k`
                            const tierPrices = PLAN_PRICES[tierSlug]
                            const tierMoPrice = isAnnual
                              ? Math.ceil(tierPrices.annual / 12)
                              : tierPrices.monthly

                            return (
                              <button
                                key={tier.credits}
                                type="button"
                                onClick={() => handleTierChange(idx)}
                                className={`body-3 flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${
                                  isSelected
                                    ? 'pricing-tier-selected'
                                    : 'text-color-muted hover:bg-color-subtle-hover hover:text-white'
                                }`}
                              >
                                <span>{formatCredits(tier.credits)} credits / month</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-color-dim body-4">${tierMoPrice}/mo</span>
                                  {isSelected && (
                                    <Check size={14} className="text-emerald-accent" />
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <ul className="mb-8 flex-1 space-y-3">
                    {features.map((feature) => (
                      <li
                        key={feature.text}
                        className="text-color-muted body-3 flex items-start gap-2"
                      >
                        <feature.icon size={16} className="mt-0.5 flex-shrink-0 text-white" />
                        {feature.text}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="https://app.vibey.im/register"
                    className={`body-3 block w-full rounded-xl py-3 text-center font-semibold transition-all ${
                      plan.highlighted
                        ? 'button-glass-secondary'
                        : 'pricing-cta-outline border-color-glass border text-white'
                    }`}
                  >
                    Get Early Access
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
