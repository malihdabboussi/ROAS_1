'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { OnboardingSetupWait } from '@/app/(auth)/onboarding/components/OnboardingSetupWait'
import { useProvisionStatus } from '@/app/(auth)/onboarding/hooks/useProvisionStatus'
import { useOrgStore } from '@/features/org/store/use-org-store'
import { backendGet } from '@/lib/api/backend-client'

type RuntimeProfile = {
  onboarding_completed?: boolean
  fly_machine_id?: string | null
  agent_runtime_type?: string | null
  agent_runtime_url?: string | null
}

function hasRuntime(profile: RuntimeProfile | null | undefined): boolean {
  const hasMachine =
    typeof profile?.fly_machine_id === 'string' && profile.fly_machine_id.trim().length > 0
  const hasSharedRailway =
    profile?.agent_runtime_type === 'shared_railway' &&
    typeof profile.agent_runtime_url === 'string' &&
    profile.agent_runtime_url.trim().length > 0
  return hasMachine || hasSharedRailway
}

export default function SettingUpPage() {
  const router = useRouter()
  const { isReady, isError, isRecoverable, isSlow, retry, stepLabel } = useProvisionStatus()

  const fetchMemberships = useOrgStore((s) => s.fetchMemberships)
  const skipWaitChecked = useRef(false)

  useEffect(() => {
    if (skipWaitChecked.current) return
    skipWaitChecked.current = true
    void (async () => {
      const profile = await backendGet<RuntimeProfile>('/api/profile').catch(() => null)

      if (profile?.onboarding_completed === true && hasRuntime(profile)) {
        await fetchMemberships()
        router.replace('/home')
      }
    })()
  }, [fetchMemberships, router])

  useEffect(() => {
    if (!isReady) return
    void (async () => {
      await fetchMemberships()
      router.replace('/home')
    })()
  }, [fetchMemberships, isReady, router])

  return (
    <OnboardingSetupWait
      isError={isError}
      isRecoverable={isRecoverable}
      isSlow={isSlow}
      stepLabel={stepLabel}
      onRetry={() => void retry()}
    />
  )
}
