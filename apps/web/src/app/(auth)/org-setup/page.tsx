'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { OnboardingChannels } from '../onboarding/components/OnboardingChannels'
import { OnboardingCustomize } from '../onboarding/components/OnboardingCustomize'
import { OnboardingSetupWait } from '../onboarding/components/OnboardingSetupWait'
import { OrgOnboardingQuestions } from '../onboarding/components/OrgOnboardingQuestions'

type OrgSetupStep = 'loading' | 'customize' | 'questions' | 'channels' | 'setup-wait'

export default function OrgSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<OrgSetupStep>('loading')
  const onboardStartedRef = useRef(false)
  const setupWaitEnteredAt = useRef<number | null>(null)
  const [onboardDone, setOnboardDone] = useState(false)
  const [onboardError, setOnboardError] = useState(false)

  const [customizeStyle, setCustomizeStyle] = useState<'bold' | 'balanced' | 'calm'>('balanced')
  const [customizeAvatarMode, setCustomizeAvatarMode] = useState<'animation' | 'portrait'>(
    'animation',
  )
  const [customizeAvatarUrl, setCustomizeAvatarUrl] = useState<string | null>(null)

  const activeOrg = useOrgStore((s) => {
    if (!s.activeOrgId) return null
    return s.memberships.find((m) => m.org_id === s.activeOrgId) ?? null
  })
  const orgDisplayName = activeOrg?.organizations?.name ?? null
  const fetchMemberships = useOrgStore((s) => s.fetchMemberships)
  const isLoaded = useOrgStore((s) => s.isLoaded)

  useEffect(() => {
    if (!isLoaded) void fetchMemberships()
  }, [isLoaded, fetchMemberships])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { backendGet } = await import('@/lib/api/backend-client')
        const status = await backendGet<{ onboarded: boolean }>('/api/agents/onboarding-status')
        if (cancelled) return
        if (status?.onboarded) {
          router.replace('/home')
          return
        }
        setStep('customize')
      } catch {
        if (!cancelled) setStep('customize')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const onboardOrg = useCallback(async () => {
    if (onboardStartedRef.current) return
    onboardStartedRef.current = true
    try {
      const { backendPost } = await import('@/lib/api/backend-client')
      await backendPost('/api/agents/onboard', {
        archetype: 'ceo',
        style: customizeStyle,
        avatar_mode: customizeAvatarMode,
        avatar_url:
          customizeAvatarMode === 'portrait' ? (customizeAvatarUrl ?? undefined) : undefined,
      })
      setOnboardDone(true)
    } catch {
      setOnboardError(true)
    }
  }, [customizeStyle, customizeAvatarMode, customizeAvatarUrl])

  useEffect(() => {
    if (step === 'setup-wait' && !setupWaitEnteredAt.current) {
      setupWaitEnteredAt.current = Date.now()
    }
    if (step !== 'setup-wait') return
    if (!onboardDone) return

    const MIN_DISPLAY_MS = 3000
    const elapsed = Date.now() - (setupWaitEnteredAt.current ?? Date.now())
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)

    const timer = setTimeout(() => router.replace('/home'), remaining)
    return () => clearTimeout(timer)
  }, [onboardDone, step, router])

  const handleFinishFlow = useCallback(() => {
    setStep('setup-wait')
    void onboardOrg()
  }, [onboardOrg])

  const handleRetry = useCallback(() => {
    setOnboardError(false)
    onboardStartedRef.current = false
    void onboardOrg()
  }, [onboardOrg])

  const handleBackToPersonal = useCallback(() => {
    useOrgStore.getState().setActiveOrg(null)
    window.location.href = '/home'
  }, [])

  if (step === 'loading') {
    return <div className="surface-bg min-h-dvh w-full" />
  }

  if (step === 'customize') {
    return (
      <OnboardingCustomize
        onComplete={(style, avatarMode, avatarUrl) => {
          setCustomizeStyle(style)
          setCustomizeAvatarMode(avatarMode)
          setCustomizeAvatarUrl(avatarUrl)
          setStep('questions')
        }}
        onBack={handleBackToPersonal}
        orgName={orgDisplayName}
      />
    )
  }

  if (step === 'questions') {
    return (
      <OrgOnboardingQuestions
        orgName={orgDisplayName}
        onComplete={() => setStep('channels')}
        onError={(msg) => toast.error(msg)}
      />
    )
  }

  if (step === 'channels') {
    return (
      <OnboardingChannels
        onComplete={() => void handleFinishFlow()}
        onBack={() => setStep('questions')}
      />
    )
  }

  return (
    <OnboardingSetupWait
      isError={onboardError}
      isRecoverable={onboardError}
      stepLabel="Building your team"
      onRetry={handleRetry}
    />
  )
}
