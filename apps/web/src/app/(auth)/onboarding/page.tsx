'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { VibeyAwakeningContainer } from '@/features/onboarding/containers/VibeyAwakeningContainer'
import { backendGet, backendPatch, backendPost } from '@/lib/api/backend-client'
import { clearActiveOrgStorage } from '@/lib/utils/org-storage'
import { OnboardingChannels } from './components/OnboardingChannels'
import { OnboardingCustomize } from './components/OnboardingCustomize'
import { OnboardingLetsStart } from './components/OnboardingLetsStart'
import { OnboardingQuestions } from './components/OnboardingQuestions'
import { OnboardingSetupWait } from './components/OnboardingSetupWait'
import { OnboardingSubscribe } from './components/OnboardingSubscribe'
import { OnboardingWelcomeBack } from './components/OnboardingWelcomeBack'
import { ONBOARDING_TOAST_ERRORS } from './config/onboarding-toast-errors.config'
import { useOnboardingStep } from './hooks/useOnboardingStep'
import { useProvisionStatus } from './hooks/useProvisionStatus'
import {
  clearStoredDirectInviteCode,
  getStoredDirectInviteCode,
  hasRuntimeEligibleOrgMembership,
  resolveOnboardedHomeAccess,
  shouldSkipSubscribeStep,
} from './lib/onboarding-access'

type RuntimeProfile = {
  onboarding_completed?: boolean
  account_mode?: string | null
  fly_machine_id?: string | null
  agent_runtime_type?: string | null
  agent_runtime_url?: string | null
  onboarding_animation_seen?: boolean
  onboarding_data?: { onboarding_step?: string } | null
}

function hasSharedRailwayRuntime(profile: RuntimeProfile | null | undefined): boolean {
  return (
    profile?.agent_runtime_type === 'shared_railway' &&
    typeof profile.agent_runtime_url === 'string' &&
    profile.agent_runtime_url.trim().length > 0
  )
}

function hasRuntime(profile: RuntimeProfile | null | undefined): boolean {
  const hasMachine =
    typeof profile?.fly_machine_id === 'string' && profile.fly_machine_id.trim().length > 0
  return hasMachine || hasSharedRailwayRuntime(profile)
}

export default function OnboardingPage() {
  useEffect(() => {
    clearActiveOrgStorage()
  }, [])

  const router = useRouter()
  const searchParams = useSearchParams()
  const { step, setStep } = useOnboardingStep('awakening')
  const { isReady, isError, isRecoverable, isSlow, retry, stepLabel } = useProvisionStatus()
  const profileBootDone = useRef(false)
  const [profileReady, setProfileReady] = useState(false)
  const ceoPromoteStartedRef = useRef(false)
  const directInviteCodeRef = useRef<string | null>(null)
  const [provisionFailed, setProvisionFailed] = useState(false)

  const [customizeStyle, setCustomizeStyle] = useState<'bold' | 'balanced' | 'calm'>('balanced')
  const [customizeAvatarMode, setCustomizeAvatarMode] = useState<'animation' | 'portrait'>(
    'animation',
  )
  const [customizeAvatarUrl, setCustomizeAvatarUrl] = useState<string | null>(null)

  const getDirectInviteCode = useCallback(() => {
    const code = directInviteCodeRef.current ?? getStoredDirectInviteCode()
    directInviteCodeRef.current = code
    return code
  }, [])

  const provisionMachine = useCallback(async () => {
    const profile = await backendGet<RuntimeProfile>('/api/profile').catch(() => null)
    if (hasSharedRailwayRuntime(profile)) return

    const inviteCode = getDirectInviteCode()
    await backendPost('/api/machines/provision', inviteCode ? { invite_code: inviteCode } : {})
    if (inviteCode) {
      clearStoredDirectInviteCode()
      directInviteCodeRef.current = null
    }
  }, [getDirectInviteCode])

  useEffect(() => {
    if (profileBootDone.current) return
    profileBootDone.current = true
    const subscriptionSuccess = searchParams.get('subscription') === 'success'
    const directInviteCode = getDirectInviteCode()
    void (async () => {
      try {
        const profile = await backendGet<RuntimeProfile>('/api/profile')
        const runtimeReady = hasRuntime(profile)
        const accountMode = profile?.account_mode ?? 'personal'

        if (accountMode === 'org_only') {
          const homeAccess = await resolveOnboardedHomeAccess()
          router.replace(homeAccess === 'denied' ? '/no-org-access' : '/home')
          return
        }

        if (profile?.onboarding_completed === true && runtimeReady) {
          const homeAccess = await resolveOnboardedHomeAccess()
          if (homeAccess === 'denied') {
            setStep('subscribe')
            return
          }
          router.replace('/home')
          return
        }

        if (profile?.onboarding_completed === true && !runtimeReady) {
          setStep('welcome-back')
        } else {
          const savedStep = profile?.onboarding_data?.onboarding_step

          if (subscriptionSuccess && savedStep === 'subscribe') {
            if (!runtimeReady) {
              void provisionMachine().catch(() => {})
            }
            setStep('setup-wait')
          } else if (savedStep === 'subscribe') {
            const orgCovered = await hasRuntimeEligibleOrgMembership().catch(() => false)
            let subscriptionStatus: string | null = null

            if (!orgCovered) {
              const billing = await backendGet<{
                subscription?: { status?: string } | null
              }>('/api/billing/status').catch(() => null)
              subscriptionStatus = billing?.subscription?.status ?? null
            }

            const skipSubscribe = shouldSkipSubscribeStep({
              hasRuntimeEligibleOrgMembership: orgCovered,
              hasDirectInviteCode: Boolean(directInviteCode),
              subscriptionStatus,
            })

            if (skipSubscribe) {
              if (!runtimeReady) {
                void provisionMachine().catch(() => {})
              }
              setStep('setup-wait')
            } else {
              setStep('subscribe')
            }
          } else if (savedStep === 'channels') {
            setStep('channels')
          } else if (savedStep === 'questions') {
            setStep('questions')
          } else if (
            profile?.onboarding_animation_seen === true &&
            profile?.onboarding_completed !== true
          ) {
            setStep('customize')
          }
        }
      } catch {
      } finally {
        setProfileReady(true)
      }
    })()
  }, [getDirectInviteCode, provisionMachine, router, setStep, searchParams])

  const promoteCeo = useCallback(async () => {
    if (ceoPromoteStartedRef.current) return
    ceoPromoteStartedRef.current = true
    try {
      const { backendPost } = await import('@/lib/api/backend-client')
      await backendPost('/api/agents/onboard', {
        archetype: 'ceo',
        style: customizeStyle,
        avatar_mode: customizeAvatarMode,
        avatar_url:
          customizeAvatarMode === 'portrait' ? (customizeAvatarUrl ?? undefined) : undefined,
      })
    } catch {
      // Non-blocking: agent promotion failure shouldn't block onboarding completion
    }
  }, [customizeStyle, customizeAvatarMode, customizeAvatarUrl])

  const finalizeAndRedirect = useCallback(async () => {
    try {
      await backendPatch('/api/profile/onboarding', {
        onboarding_animation_seen: true,
        onboarding_completed: true,
        onboarding_data: {},
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : ONBOARDING_TOAST_ERRORS.ANIMATION_SEEN_FAILED.userMessage,
      )
    } finally {
      router.replace('/home')
    }
  }, [router])

  const setupWaitEnteredAt = useRef<number | null>(null)

  useEffect(() => {
    if (step === 'setup-wait' && !setupWaitEnteredAt.current) {
      setupWaitEnteredAt.current = Date.now()
      void promoteCeo()
      void (async () => {
        try {
          await provisionMachine()
        } catch {
          setProvisionFailed(true)
        }
      })()
    }
    if (step !== 'setup-wait') return
    if (!isReady) return

    const MIN_DISPLAY_MS = 500
    const elapsed = Date.now() - (setupWaitEnteredAt.current ?? Date.now())
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed)

    const timer = setTimeout(() => void finalizeAndRedirect(), remaining)
    return () => clearTimeout(timer)
  }, [isReady, step, finalizeAndRedirect, promoteCeo, provisionMachine])

  const handleFinishFlow = useCallback(async () => {
    const directInviteCode = getDirectInviteCode()
    if (directInviteCode) {
      setStep('setup-wait')
      return
    }

    const orgCovered = await hasRuntimeEligibleOrgMembership().catch(() => false)
    if (orgCovered) {
      setStep('setup-wait')
      return
    }

    setStep('subscribe')
  }, [getDirectInviteCode, setStep])

  const handleWelcomeBackReady = useCallback(() => {
    router.replace('/home')
  }, [router])

  const handleAwakeningComplete = useCallback(async () => {
    try {
      await backendPatch('/api/profile/onboarding', { onboarding_animation_seen: true })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : ONBOARDING_TOAST_ERRORS.ANIMATION_SEEN_FAILED.userMessage,
      )
    }
    setStep('customize')
  }, [setStep])

  if (!profileReady) {
    return <div className="surface-bg min-h-dvh w-full" />
  }

  if (step === 'welcome-back') {
    return <OnboardingWelcomeBack onReady={handleWelcomeBackReady} />
  }

  if (step === 'awakening') {
    return <VibeyAwakeningContainer onContinue={handleAwakeningComplete} />
  }

  if (step === 'lets-start') {
    return <OnboardingLetsStart onStart={() => setStep('customize')} />
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
        onBack={() => setStep('lets-start')}
      />
    )
  }

  if (step === 'questions') {
    return (
      <OnboardingQuestions
        onComplete={() => setStep('channels')}
        onError={(message) =>
          toast.error(message || ONBOARDING_TOAST_ERRORS.PROFILE_SAVE_FAILED.userMessage)
        }
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

  if (step === 'subscribe') {
    return <OnboardingSubscribe onBack={() => setStep('channels')} />
  }

  return (
    <OnboardingSetupWait
      isError={isError || provisionFailed}
      isRecoverable={isRecoverable || provisionFailed}
      isSlow={isSlow}
      stepLabel={stepLabel}
      onRetry={() => {
        setProvisionFailed(false)
        setupWaitEnteredAt.current = null
        if (getDirectInviteCode()) {
          void provisionMachine().catch(() => setProvisionFailed(true))
          return
        }
        void retry()
      }}
    />
  )
}
