'use client'

import { useEffect, useRef } from 'react'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { useProvisionStatus } from '../hooks/useProvisionStatus'
import { OnboardingCreatingScreen } from './OnboardingCreatingScreen'

interface OnboardingWelcomeBackProps {
  onReady: () => void
}

export function OnboardingWelcomeBack({ onReady }: OnboardingWelcomeBackProps) {
  const { isReady, isError, retry } = useProvisionStatus()
  const provisionTriggered = useRef(false)

  useEffect(() => {
    if (provisionTriggered.current) return
    provisionTriggered.current = true
    void (async () => {
      try {
        const { backendPost } = await import('@/lib/api/backend-client')
        await backendPost('/api/machines/ensure-running', {})
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (isReady) onReady()
  }, [isReady, onReady])

  return (
    <AuthOrbShell showHeroOrb={false} showQuoteFooter={false} panelClassName="w-full max-w-[640px]">
      <div className="flex w-full flex-col items-center">
        <OnboardingCreatingScreen
          header={
            <div className="mb-spacing-4 w-full text-center">
              <h2 className="title-h3 text-foreground mb-spacing-2 font-semibold uppercase">
                WELCOME BACK
              </h2>
              <p className="body-2 text-muted-foreground mb-spacing-2">
                I borrowed your compute power to evolve while you were away.
              </p>
              <p className="body-2 text-muted-foreground">Setting things back up for you now...</p>
            </div>
          }
        />

        {isError ? (
          <button
            onClick={() => void retry()}
            className="mt-spacing-6 rounded-xl bg-[var(--color-secondary)] px-8 py-3 font-semibold text-[var(--color-foreground)]"
          >
            Try Again
          </button>
        ) : null}
      </div>
    </AuthOrbShell>
  )
}
