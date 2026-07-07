'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { VibeyLoadingOrb } from '@/components/vibey/vibey-loading-orb'

const BADGE_A_PHRASES = [
  'Loading skills…',
  'Seeding memory…',
  'Syncing team…',
  'Writing identity…',
  'Mapping context…',
]

const BADGE_B_PHRASES = [
  'Identity ready',
  'Context mapped',
  'Capabilities loaded',
  'Memory online',
  'Team assembled',
]

function CyclingBadge({
  phrases,
  delayMs = 0,
  className,
}: {
  phrases: string[]
  delayMs?: number
  className?: string
}) {
  const [index, setIndex] = useState(0)
  const [textVisible, setTextVisible] = useState(false)

  useEffect(() => {
    const start = setTimeout(() => {
      setTextVisible(true)
      const interval = setInterval(() => {
        setTextVisible(false)
        setTimeout(() => {
          setIndex((prev) => (prev + 1) % phrases.length)
          setTextVisible(true)
        }, 600)
      }, 5000)
      return () => clearInterval(interval)
    }, delayMs)
    return () => clearTimeout(start)
  }, [delayMs, phrases.length])

  return (
    <div
      className={`chip-glass-neutral body-3 absolute z-10 rounded-full px-4 py-2 font-medium ${className ?? ''}`}
    >
      <span
        className="text-muted-foreground transition-all duration-700"
        style={{ opacity: textVisible ? 1 : 0 }}
      >
        {phrases[index]}
      </span>
    </div>
  )
}

export function OnboardingCreatingScreen({
  header,
  stepLabel = 'Building your team',
}: {
  header?: ReactNode
  stepLabel?: string
} = {}) {
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  return (
    <div className="flex w-full flex-col items-center">
      {header ?? (
        <p className="text-foreground title-h1 mb-spacing-4 text-center">
          GETTING YOUR <span className="vibey-shine-text bg-clip-text text-transparent">VIBEY</span>{' '}
          UP TO SPEED
        </p>
      )}

      <div className="relative w-full max-w-[600px]">
        <div className="mb-1 flex justify-between gap-1.5 overflow-x-auto px-2 pb-1">
          {['Identity', 'Context', 'Capabilities', 'Memory'].map((label) => (
            <span
              key={label}
              className="chip-glass-neutral body-2 text-muted-foreground shrink-0 rounded-full px-3 py-1.5 font-medium sm:px-4"
            >
              {label}
            </span>
          ))}
        </div>

        <svg
          className="w-full text-[var(--color-border)]"
          viewBox="0 0 200 50"
          height="130"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id={g('purple-grad')} fx="1">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <mask id={g('mask-1')}>
              <path
                d="M 25 0 v 10 q 0 5 5 5 h 65 q 5 0 5 5 v 28"
                strokeWidth="0.6"
                stroke="white"
                fill="none"
              />
            </mask>
            <mask id={g('mask-2')}>
              <path
                d="M 75 0 v 6 q 0 5 5 5 h 15 q 5 0 5 5 v 28"
                strokeWidth="0.6"
                stroke="white"
                fill="none"
              />
            </mask>
            <mask id={g('mask-3')}>
              <path
                d="M 125 0 v 6 q 0 5 -5 5 h -15 q -5 0 -5 5 v 28"
                strokeWidth="0.6"
                stroke="white"
                fill="none"
              />
            </mask>
            <mask id={g('mask-4')}>
              <path
                d="M 175 0 v 10 q 0 5 -5 5 h -65 q -5 0 -5 5 v 28"
                strokeWidth="0.6"
                stroke="white"
                fill="none"
              />
            </mask>
          </defs>

          <g
            stroke="currentColor"
            fill="none"
            strokeWidth="0.4"
            strokeDasharray="100 100"
            pathLength="100"
          >
            <path d="M 25 0 v 10 q 0 5 5 5 h 65 q 5 0 5 5 v 28">
              <animate
                attributeName="stroke-dashoffset"
                from="100"
                to="0"
                dur="1.2s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.25,0.1,0.5,1"
                keyTimes="0; 1"
              />
            </path>
            <path d="M 75 0 v 6 q 0 5 5 5 h 15 q 5 0 5 5 v 28">
              <animate
                attributeName="stroke-dashoffset"
                from="100"
                to="0"
                dur="1.2s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.25,0.1,0.5,1"
                keyTimes="0; 1"
              />
            </path>
            <path d="M 125 0 v 6 q 0 5 -5 5 h -15 q -5 0 -5 5 v 28">
              <animate
                attributeName="stroke-dashoffset"
                from="100"
                to="0"
                dur="1.2s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.25,0.1,0.5,1"
                keyTimes="0; 1"
              />
            </path>
            <path d="M 175 0 v 10 q 0 5 -5 5 h -65 q -5 0 -5 5 v 28">
              <animate
                attributeName="stroke-dashoffset"
                from="100"
                to="0"
                dur="1.2s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.25,0.1,0.5,1"
                keyTimes="0; 1"
              />
            </path>
          </g>

          <g mask={`url(#${g('mask-1')})`}>
            <circle r="10" fill={`url(#${g('purple-grad')})`}>
              <animateMotion dur="2.4s" repeatCount="indefinite" begin="0s">
                <mpath href={`#${g('path-1')}`} />
              </animateMotion>
            </circle>
          </g>
          <g mask={`url(#${g('mask-2')})`}>
            <circle r="10" fill={`url(#${g('purple-grad')})`}>
              <animateMotion dur="2.4s" repeatCount="indefinite" begin="0.6s">
                <mpath href={`#${g('path-2')}`} />
              </animateMotion>
            </circle>
          </g>
          <g mask={`url(#${g('mask-3')})`}>
            <circle r="10" fill={`url(#${g('purple-grad')})`}>
              <animateMotion dur="2.4s" repeatCount="indefinite" begin="1.2s">
                <mpath href={`#${g('path-3')}`} />
              </animateMotion>
            </circle>
          </g>
          <g mask={`url(#${g('mask-4')})`}>
            <circle r="10" fill={`url(#${g('purple-grad')})`}>
              <animateMotion dur="2.4s" repeatCount="indefinite" begin="1.8s">
                <mpath href={`#${g('path-4')}`} />
              </animateMotion>
            </circle>
          </g>

          <path
            id={g('path-1')}
            d="M 25 0 v 10 q 0 5 5 5 h 65 q 5 0 5 5 v 28"
            fill="none"
            stroke="none"
          />
          <path
            id={g('path-2')}
            d="M 75 0 v 6 q 0 5 5 5 h 15 q 5 0 5 5 v 28"
            fill="none"
            stroke="none"
          />
          <path
            id={g('path-3')}
            d="M 125 0 v 6 q 0 5 -5 5 h -15 q -5 0 -5 5 v 28"
            fill="none"
            stroke="none"
          />
          <path
            id={g('path-4')}
            d="M 175 0 v 10 q 0 5 -5 5 h -65 q -5 0 -5 5 v 28"
            fill="none"
            stroke="none"
          />
        </svg>

        <div className="relative mx-auto -mt-6 w-full max-w-[520px]">
          <div className="bg-[var(--color-muted)]/30 absolute -bottom-3 left-1/2 h-20 w-[58%] -translate-x-1/2 rounded-lg" />

          <div className="chip-glass-neutral pointer-events-none absolute -top-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-1.5 will-change-[auto]">
            <Sparkles className="text-muted-foreground h-4 w-4" />
            <span className="body-2 text-muted-foreground font-medium">{stepLabel}</span>
          </div>

          <div className="surface-card border-subtle pointer-events-none relative z-10 flex h-56 w-full items-center justify-center overflow-hidden rounded-xl border">
            <CyclingBadge phrases={BADGE_A_PHRASES} delayMs={200} className="bottom-4 left-4" />
            <CyclingBadge phrases={BADGE_B_PHRASES} delayMs={2800} className="right-4 top-4" />

            {[
              { size: 100, delay: 0, offset: -36 },
              { size: 150, delay: 0.25, offset: -61 },
              { size: 200, delay: 0.5, offset: -86 },
              { size: 250, delay: 0.75, offset: -111 },
            ].map(({ size, delay, offset }) => (
              <motion.div
                key={size}
                className="border-subtle bg-[var(--color-muted)]/10 absolute rounded-full border-t"
                style={{ width: size, height: size, bottom: offset }}
                animate={{ scale: [0.98, 1.02, 0.98] }}
                transition={{ duration: 2, repeat: Infinity, delay, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <div className="border-subtle absolute -bottom-8 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border bg-[var(--color-card)]">
            <VibeyLoadingOrb state="processing" size="sm" cycleInterval={2800} />
          </div>
        </div>

        <div className="h-12" />
      </div>
    </div>
  )
}
