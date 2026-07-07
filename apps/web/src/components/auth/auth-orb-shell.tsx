'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { VibeyHeroDepthOrb } from '@/components/vibey/vibey-hero-depth-orb'

export function Typewriter({
  texts,
  speed = 60,
  deleteSpeed = 35,
  delay = 2500,
}: {
  texts: string[]
  speed?: number
  deleteSpeed?: number
  delay?: number
}) {
  const [display, setDisplay] = useState('')
  const [textIdx, setTextIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  const current = texts[textIdx] ?? ''

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        if (!deleting) {
          if (charIdx < current.length) {
            setDisplay(current.slice(0, charIdx + 1))
            setCharIdx((c) => c + 1)
          } else {
            setTimeout(() => setDeleting(true), delay)
          }
        } else {
          if (display.length > 0) {
            setDisplay((d) => d.slice(0, -1))
          } else {
            setDeleting(false)
            setCharIdx(0)
            setTextIdx((i) => (i + 1) % texts.length)
          }
        }
      },
      deleting ? deleteSpeed : speed,
    )
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, current, display, speed, deleteSpeed, delay, texts])

  return (
    <span>
      {display}
      <span className="text-primary animate-pulse">|</span>
    </span>
  )
}

export function AuthOrbShell({
  quotes = [],
  children,
  overlay,
  quoteAttribution = 'Vibey',
  panelClassName = 'card-glass max-w-[380px]',
  showHeroOrb = true,
  showQuoteFooter = true,
}: {
  quotes?: string[]
  children: ReactNode
  overlay?: ReactNode
  quoteAttribution?: string
  /** Panel wrapper classes (default matches login card width). */
  panelClassName?: string
  /** When false, only `auth-tailwash` shows (no 3D hero orb). */
  showHeroOrb?: boolean
  /** When false, hides the typewriter quote strip at the bottom. */
  showQuoteFooter?: boolean
}) {
  return (
    <div className="fixed inset-0 z-10 flex min-h-0 flex-col">
      <div className="absolute inset-0">
        <div className="auth-tailwash absolute inset-0" />
        {showHeroOrb ? (
          <div className="absolute inset-0">
            <VibeyHeroDepthOrb />
          </div>
        ) : null}
      </div>

      <div
        className={`pointer-events-none relative z-10 flex min-h-0 flex-1 flex-col ${showHeroOrb ? 'md:flex-row' : ''}`}
      >
        <div className="p-spacing-6 pointer-events-auto flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
          <div className={`p-spacing-8 w-full ${panelClassName}`}>{children}</div>
        </div>

        {showHeroOrb ? <div className="hidden min-h-0 flex-1 md:block" /> : null}
      </div>

      {showQuoteFooter ? (
        <div className="bottom-spacing-6 pointer-events-none absolute inset-x-0 z-10 hidden items-center justify-center md:flex">
          <div className="max-w-[320px] text-center">
            <p className="body-1 text-foreground h-8 font-medium">
              &ldquo;
              <Typewriter texts={quotes} />
              &rdquo;
            </p>
            <p className="body-3 text-muted-foreground mt-spacing-2">{quoteAttribution}</p>
          </div>
        </div>
      ) : null}

      {overlay}
    </div>
  )
}
