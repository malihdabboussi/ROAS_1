'use client'

import { useCallback, useState } from 'react'

export type OnboardingStep =
  | 'awakening'
  | 'lets-start'
  | 'customize'
  | 'questions'
  | 'channels'
  | 'subscribe'
  | 'setup-wait'
  | 'welcome-back'

const STEP_ORDER: OnboardingStep[] = [
  'awakening',
  'lets-start',
  'customize',
  'questions',
  'channels',
  'subscribe',
  'setup-wait',
]

type UseOnboardingStepResult = {
  step: OnboardingStep
  setStep: (step: OnboardingStep) => void
  nextStep: () => void
  prevStep: () => void
}

export function useOnboardingStep(
  initialStep: OnboardingStep = 'awakening',
): UseOnboardingStepResult {
  const [step, setStepState] = useState<OnboardingStep>(initialStep)

  const setStep = useCallback((value: OnboardingStep) => {
    setStepState(value)
  }, [])

  const nextStep = useCallback(() => {
    setStepState((current) => {
      const currentIndex = STEP_ORDER.indexOf(current)
      const nextIndex = Math.min(STEP_ORDER.length - 1, currentIndex + 1)
      return STEP_ORDER[nextIndex] ?? current
    })
  }, [])

  const prevStep = useCallback(() => {
    setStepState((current) => {
      const currentIndex = STEP_ORDER.indexOf(current)
      const prevIndex = Math.max(0, currentIndex - 1)
      return STEP_ORDER[prevIndex] ?? current
    })
  }, [])

  return { step, setStep, nextStep, prevStep }
}
