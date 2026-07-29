'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { WaitlistAwareLink } from '@/components/WaitlistAwareLink'

export function FinalCTA() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { animate, onScroll } = await import('animejs')

        if (sectionRef.current) {
          animate(sectionRef.current, {
            opacity: [0, 1],
            translateY: [40, 0],
            duration: 900,
            ease: 'outExpo',
            autoplay: onScroll({ target: sectionRef.current, enter: 'bottom -= 80px' }),
          })
        }
      } catch {
        if (sectionRef.current) sectionRef.current.style.opacity = '1'
      }
    }
    init()
  }, [])

  return (
    <section className="section-padding relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgb(var(--accent-secondary-rgb) / 0.1), transparent 70%)',
        }}
      />

      <div className="site-container relative">
        <div
          ref={sectionRef}
          className="relative mx-auto max-w-4xl text-center"
          style={{ opacity: 0 }}
        >
          <h2 className="h1 mb-6 tracking-tight">
            Stop building marketing. <span className="gradient-text">Start growing.</span>
          </h2>

          <p className="text-color-muted body-1 mx-auto mb-10 max-w-2xl">
            Describe your business. Get a complete campaign. Launch in minutes, not months.
          </p>

          <WaitlistAwareLink
            href="https://app.vibey.im/login"
            className="glow-emerald animate-glow-pulse bg-emerald-accent text-on-emerald body-1 group inline-flex items-center gap-2 rounded-xl px-10 py-5 font-bold transition-all hover:brightness-110"
          >
            Get Early Access
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </WaitlistAwareLink>

          <p className="text-color-dim body-3 mt-6">
            Early Access — $97/mo &middot; Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  )
}
