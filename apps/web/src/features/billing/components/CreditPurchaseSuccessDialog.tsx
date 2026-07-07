'use client'

import { useEffect, useRef, useState } from 'react'

interface CreditPurchaseSuccessDialogProps {
  open: boolean
  onClose: () => void
  previousCredits: number
  currentCredits: number
}

/**
 * Animated counter — counts from `from` to `to` over `duration` ms with ease-out cubic.
 * 1:1 port of legacy AnimatedNumber component behavior.
 */
function AnimatedNumber({
  from,
  to,
  duration,
  format,
}: {
  from: number
  to: number
  duration: number
  format: (n: number) => string
}) {
  const [value, setValue] = useState(from)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    const diff = to - from

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + diff * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [from, to, duration])

  return <>{format(value)}</>
}

export function CreditPurchaseSuccessDialog({
  open,
  onClose,
  previousCredits,
  currentCredits,
}: CreditPurchaseSuccessDialogProps) {
  if (!open) return null

  return (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 z-50 bg-modal-overlay" onClick={onClose} />

      {/* Centered Content */}
      <div className="p-spacing-6 fixed inset-0 z-50 flex items-center justify-center">
        <div className="surface-card card-elevated rounded-spacing-4 p-spacing-8 wizard-container-border w-full max-w-md">
          {/* Success Icon - Large, centered */}
          <div className="mb-spacing-6 text-center">
            <div className="mb-spacing-4 border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full border">
              <svg
                className="h-8 w-8 text-[var(--color-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="title-h3 mb-spacing-2">Credits Added!</h2>
            <p className="body-2 text-muted-foreground mb-spacing-4">
              Your credit balance has been updated
            </p>

            {/* Animated Number - Large, prominent */}
            <div className="py-spacing-6 px-spacing-4 rounded-spacing-2 bg-[var(--color-muted)]/30 border border-[var(--color-border)]">
              <p className="body-3 text-muted-foreground mb-spacing-2">Total Credits Available</p>
              <p className="title-h2 text-foreground font-bold">
                <AnimatedNumber
                  from={previousCredits}
                  to={currentCredits}
                  duration={2000}
                  format={(n) => n.toLocaleString()}
                />
              </p>
            </div>
          </div>

          {/* Action Button - Glass Accent */}
          <button
            onClick={onClose}
            className="button-glass-accent px-spacing-4 py-spacing-3 w-full rounded-lg text-sm font-medium"
          >
            <span className="relative z-10">Got it</span>
          </button>
        </div>
      </div>
    </>
  )
}
