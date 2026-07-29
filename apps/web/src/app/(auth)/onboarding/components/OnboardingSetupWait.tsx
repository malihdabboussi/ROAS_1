'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AuthOrbShell } from '@/components/auth/auth-orb-shell'
import { OnboardingCreatingScreen } from './OnboardingCreatingScreen'

interface OnboardingSetupWaitProps {
  isError: boolean
  isRecoverable?: boolean
  isSlow?: boolean
  stepLabel?: string
  onRetry: () => void
}

const LEARNING_CARDS = [
  {
    title: 'Meet your core team',
    body: 'Your team starts with three agents: Pixel, Atlas, and Jaime. Pixel is your main point of contact. Ask Pixel to create, plan, research, organize, or help move work forward across the platform.',
  },
  {
    title: 'Atlas manages your Brain',
    body: 'Atlas helps keep your knowledge useful. It can organize notes, extract important context, clean up messy information, and make sure your agents can find what they need later.',
  },
  {
    title: 'Jaime helps you hire',
    body: 'Jaime is your HR agent. Tell Jaime what kind of teammate you need, and she can help shape the role, suggest the right agent, and guide you through adding them to your team.',
  },
  {
    title: 'Your Brain is the memory layer',
    body: 'ROAS stores context in different Brains: personal knowledge, company knowledge, customer knowledge, and agent knowledge. This helps your team remember what matters instead of starting from scratch.',
  },
  {
    title: 'Start by talking naturally',
    body: 'You do not need to learn commands first. Start by telling Pixel what you want to make, fix, research, or organize. Pixel will help choose the right next step.',
  },
  {
    title: 'Your agents work together',
    body: 'Pixel can coordinate with specialized agents as your workspace grows. You can keep things simple at first, then hire more help when the work becomes more specific.',
  },
]

function OnboardingLearningCard() {
  const [index, setIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion()
  const card = LEARNING_CARDS[index] ?? LEARNING_CARDS[0]!

  useEffect(() => {
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % LEARNING_CARDS.length)
    }, 8_000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <section className="surface-card border-subtle mt-spacing-6 h-spacing-48 rounded-spacing-4 p-spacing-4 w-full overflow-hidden border">
      <AnimatePresence mode="wait">
        <motion.div
          key={card.title}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="flex h-full flex-col justify-between"
        >
          <div>
            <p className="body-2 text-foreground font-semibold">{card.title}</p>
            <p className="body-3 text-muted-foreground mt-spacing-3">{card.body}</p>
          </div>

          <div className="gap-spacing-2 flex items-center justify-center" aria-hidden="true">
            {LEARNING_CARDS.map((item, dotIndex) => (
              <span
                key={item.title}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  dotIndex === index
                    ? 'bg-primary w-6 opacity-100'
                    : 'bg-muted-foreground w-1.5 opacity-30'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

export function OnboardingSetupWait({
  isError,
  isRecoverable = isError,
  isSlow = false,
  stepLabel = 'Preparing your workspace',
  onRetry,
}: OnboardingSetupWaitProps) {
  return (
    <AuthOrbShell showHeroOrb={false} showQuoteFooter={false} panelClassName="w-full max-w-[640px]">
      <div className="flex w-full flex-col items-center">
        <OnboardingCreatingScreen stepLabel={stepLabel} />

        {isSlow && !isError ? (
          <p className="body-3 text-muted-foreground mt-spacing-2 text-center">
            This is taking longer than usual. We’re still working on it.
          </p>
        ) : null}

        <OnboardingLearningCard />

        {isError && isRecoverable ? (
          <div className="mt-spacing-6 flex flex-col items-center">
            <p className="body-3 text-muted-foreground text-center">
              Setup paused before everything was ready.
            </p>
            <button
              onClick={onRetry}
              className="button-glass-accent button-default mt-spacing-3 rounded-spacing-2 px-spacing-4 font-semibold"
            >
              Retry setup
            </button>
          </div>
        ) : null}
      </div>
    </AuthOrbShell>
  )
}
