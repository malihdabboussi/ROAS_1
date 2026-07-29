'use client'

import { VibeyLoadingSphereSimple } from '@/components/vibey/vibey-loading-sphere-simple'

interface OnboardingLetsStartProps {
  onStart: () => void
}

export function OnboardingLetsStart({ onStart }: OnboardingLetsStartProps) {
  return (
    <div className="surface-bg flex min-h-dvh w-full flex-col items-center justify-center">
      <div className="mb-8 h-36 w-36 md:h-48 md:w-48">
        <VibeyLoadingSphereSimple size="small" state="idle" showBackground={false} />
      </div>

      <h1 className="mb-4 text-center text-4xl font-bold uppercase text-[var(--color-foreground)]">
        PIXEL
      </h1>
      <p className="body-1 mb-10 text-center text-[var(--color-muted-foreground)]">JUST FLOW</p>

      <button
        onClick={onStart}
        className="rounded-xl bg-[var(--color-primary)] px-8 py-3 font-semibold text-[var(--color-background)] transition-all hover:opacity-90"
      >
        LET&apos;S START
      </button>
    </div>
  )
}
