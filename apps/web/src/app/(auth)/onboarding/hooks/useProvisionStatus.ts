'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { backendGet, backendPost } from '@/lib/api/backend-client'

export type OnboardingStep =
  | 'joining_workspace'
  | 'building_team'
  | 'preparing_workspace'
  | 'turning_things_on'
  | 'running_final_check'

type OnboardingRetryAction = 'provision_machine' | 'ensure_running' | 'onboard_org' | null

type OnboardingStatus = {
  overall: 'working' | 'ready' | 'recoverable_error'
  current_step: OnboardingStep
  runtime: {
    ready: boolean
    machine_id: string | null
    state: string | null
  }
  org: {
    ready: boolean
    active_org_id: string | null
  }
  retry_action: OnboardingRetryAction
}

const STEP_LABELS: Record<OnboardingStep, string> = {
  joining_workspace: 'Joining your workspace',
  building_team: 'Building your team',
  preparing_workspace: 'Preparing your workspace',
  turning_things_on: 'Turning things on',
  running_final_check: 'Running a final check',
}

type UseProvisionStatusResult = {
  isReady: boolean
  isError: boolean
  isRecoverable: boolean
  isSlow: boolean
  status: OnboardingStatus | null
  currentStep: OnboardingStep
  stepLabel: string
  retryAction: OnboardingRetryAction
  retry: () => Promise<void>
}

export function useProvisionStatus(): UseProvisionStatusResult {
  const [isReady, setIsReady] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isSlow, setIsSlow] = useState(false)
  const [status, setStatus] = useState<OnboardingStatus | null>(null)
  const pollingRef = useRef<number | null>(null)
  const slowTimerRef = useRef<number | null>(null)
  const activeRef = useRef(true)

  const checkProvisionStatus = useCallback(async () => {
    try {
      const nextStatus = await backendGet<OnboardingStatus>('/api/onboarding/status')

      if (!activeRef.current) return
      setStatus(nextStatus)
      setIsReady(nextStatus.overall === 'ready')
      setIsError(nextStatus.overall === 'recoverable_error')
    } catch {
      if (!activeRef.current) return
      setIsError(true)
    }
  }, [])

  const retry = useCallback(async () => {
    try {
      setIsError(false)
      const nextStatus = await backendPost<OnboardingStatus>('/api/onboarding/retry', {})
      if (!activeRef.current) return
      setStatus(nextStatus)
      setIsReady(nextStatus.overall === 'ready')
      setIsError(nextStatus.overall === 'recoverable_error')
    } catch {
      if (!activeRef.current) return
      setIsError(true)
    }
  }, [])

  useEffect(() => {
    activeRef.current = true
    void checkProvisionStatus()
    slowTimerRef.current = window.setTimeout(() => {
      if (activeRef.current) setIsSlow(true)
    }, 45_000)

    pollingRef.current = window.setInterval(() => {
      if (isReady) return
      void checkProvisionStatus()
    }, 1500)

    return () => {
      activeRef.current = false
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
      }
      if (slowTimerRef.current) {
        window.clearTimeout(slowTimerRef.current)
      }
    }
  }, [checkProvisionStatus, isReady])

  const currentStep = status?.current_step ?? 'preparing_workspace'
  return {
    isReady,
    isError,
    isRecoverable: status?.overall === 'recoverable_error',
    isSlow: isSlow && !isReady,
    status,
    currentStep,
    stepLabel: STEP_LABELS[currentStep],
    retryAction: status?.retry_action ?? null,
    retry,
  }
}
