'use client'

import { useCallback, useState } from 'react'
import { Check, Rocket, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { createCheckout } from '@/features/settings/services/billing-api'

const FEATURES = [
  '19,400 credits per month',
  'Unlimited campaigns',
  'Up to 10 published funnels',
  '5 custom domains',
  'AI image generation',
  'Voice input',
  'Advanced analytics',
  'Priority support',
]

interface OnboardingSubscribeProps {
  onBack?: () => void
  onContinueFree?: () => void | Promise<void>
  showContinueFree?: boolean
}

export function OnboardingSubscribe({
  onBack,
  onContinueFree,
  showContinueFree = false,
}: OnboardingSubscribeProps) {
  const [loading, setLoading] = useState(false)
  const [continuingFree, setContinuingFree] = useState(false)

  const handleSubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const appUrl = window.location.origin
      const result = await createCheckout(
        'early-access',
        'monthly',
        `${appUrl}/onboarding?subscription=success`,
        `${appUrl}/onboarding`,
      )
      if (result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not start checkout. Please try again.',
      )
      setLoading(false)
    }
  }, [])

  return (
    <AuthOrbShell
      showHeroOrb={false}
      showQuoteFooter={false}
      panelClassName="card-glass-full container-modal-md w-full"
    >
      <div className="w-full">
        <div className="mb-spacing-6 text-center">
          <div className="mb-spacing-4 flex justify-center">
            <div className="rounded-spacing-3 flex h-16 w-16 items-center justify-center bg-white/5">
              <Rocket className="icon-lg text-foreground" />
            </div>
          </div>
          <h2 className="title-h1 text-foreground">
            YOUR AGENT IS READY TO{' '}
            <span className="vibey-shine-text bg-clip-text text-transparent">LAUNCH</span>
          </h2>
          <p className="body-2 text-muted-foreground mt-spacing-2">
            Subscribe to activate your agent and start growing.
          </p>
        </div>

        <div className="rounded-spacing-3 p-spacing-6 mb-spacing-6 border-border bg-surface-subtle border">
          <div className="mb-spacing-4 flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="icon-sm text-foreground" />
              <span className="body-1 text-foreground font-semibold">Early Access</span>
            </div>
            <div className="text-right">
              <span className="title-h2 text-foreground">$97</span>
              <span className="body-3 text-muted-foreground">/mo</span>
            </div>
          </div>

          <div className="space-y-spacing-2">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="icon-xs shrink-0 text-emerald-400" />
                <span className="body-3 text-muted-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => void handleSubscribe()}
          disabled={loading}
          className="button-glass-accent rounded-spacing-2 py-spacing-3 w-full font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="relative z-10">
            {loading ? 'Redirecting to checkout…' : 'Subscribe — $97/mo'}
          </span>
        </button>

        <p className="body-4 text-muted-foreground/60 mt-spacing-3 text-center">
          Cancel anytime. Billed monthly via Stripe.
        </p>

        {showContinueFree && onContinueFree && (
          <button
            type="button"
            onClick={() => {
              setContinuingFree(true)
              void Promise.resolve(onContinueFree()).finally(() => setContinuingFree(false))
            }}
            disabled={loading || continuingFree}
            className="body-3 text-muted-foreground hover:text-foreground mt-spacing-4 w-full text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {continuingFree ? 'Setting up free access…' : 'Continue for free'}
          </button>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="body-3 text-muted-foreground hover:text-foreground mt-spacing-4 w-full text-center transition-colors"
          >
            Go back
          </button>
        )}
      </div>
    </AuthOrbShell>
  )
}
