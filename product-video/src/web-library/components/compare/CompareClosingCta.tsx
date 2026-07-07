'use client'

import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { CompareWaitlistButton } from '@/components/compare/CompareWaitlistButton'

export function CompareClosingCta(props: { headline: string; subhead: string }) {
  return (
    <section className="relative overflow-hidden pb-10 pt-6 md:pb-14 md:pt-8">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 40%, rgb(var(--accent-secondary-rgb) / 0.14), transparent 65%), radial-gradient(ellipse 50% 45% at 50% 100%, rgb(var(--accent-emerald-rgb) / 0.08), transparent 55%)',
        }}
      />
      <AnimateOnScroll>
        <div className="site-container relative">
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="glass-card border-section rounded-3xl border px-6 py-12 md:px-10 md:py-14">
              <h2 className="h2 mb-5 tracking-tight text-white md:mb-6">{props.headline}</h2>
              <p className="text-text-muted body-2 mx-auto mb-8 max-w-xl leading-relaxed md:mb-10">
                {props.subhead}
              </p>
              <CompareWaitlistButton className="chip-glass-emerald body-3 rounded-full px-10 py-3 font-semibold">
                Join Waitlist
              </CompareWaitlistButton>
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}
