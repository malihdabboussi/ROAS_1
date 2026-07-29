'use client'

import { useEffect, useRef } from 'react'
import { MessageSquare, Rocket, Wand2 } from 'lucide-react'

const steps = [
  {
    icon: MessageSquare,
    number: 1,
    title: 'Tell Pixel about your business',
    description:
      'Describe your product, audience, and goals. ROAS asks smart follow-up questions to nail your positioning.',
  },
  {
    icon: Wand2,
    number: 2,
    title: 'Review your campaign',
    description:
      'ROAS builds everything: funnels, emails, offers, presentations. Preview each piece and make changes in real-time.',
  },
  {
    icon: Rocket,
    number: 3,
    title: 'Launch and grow',
    description:
      'Export or publish directly. Your complete marketing machine is live in minutes, not months.',
  },
]

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { animate, stagger, onScroll } = await import('animejs')

        if (sectionRef.current) {
          animate(sectionRef.current, {
            opacity: [0, 1],
            translateY: [40, 0],
            duration: 800,
            ease: 'outExpo',
            autoplay: onScroll({ target: sectionRef.current, enter: 'bottom -= 80px' }),
          })
        }

        if (cardsRef.current) {
          const cards = cardsRef.current.querySelectorAll('.step-card')
          animate(cards, {
            opacity: [0, 1],
            translateY: [50, 0],
            delay: stagger(200),
            duration: 900,
            ease: 'outExpo',
            autoplay: onScroll({ target: cardsRef.current, enter: 'bottom -= 60px' }),
          })
        }

        // Animate connecting line width on scroll
        if (lineRef.current) {
          animate(lineRef.current, {
            scaleX: [0, 1],
            opacity: [0, 1],
            duration: 1200,
            ease: 'outExpo',
            autoplay: onScroll({ target: lineRef.current, enter: 'bottom -= 100px' }),
          })
        }
      } catch {
        if (sectionRef.current) sectionRef.current.style.opacity = '1'
        if (lineRef.current) {
          lineRef.current.style.opacity = '1'
          lineRef.current.style.transform = 'none'
        }
        if (cardsRef.current) {
          cardsRef.current.querySelectorAll('.step-card').forEach((el) => {
            ;(el as HTMLElement).style.opacity = '1'
            ;(el as HTMLElement).style.transform = 'none'
          })
        }
      }
    }
    init()
  }, [])

  return (
    <section className="section-padding relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgb(var(--accent-secondary-rgb) / 0.03), transparent)',
        }}
      />

      <div className="site-container relative">
        <div ref={sectionRef} className="mb-20 text-center" style={{ opacity: 0 }}>
          <p className="typo-caption text-secondary mb-4 font-semibold uppercase tracking-widest">
            How it works
          </p>
          <h2 className="h2 tracking-tight">
            Three steps. <span className="gradient-text">Zero complexity.</span>
          </h2>
        </div>

        <div ref={cardsRef} className="relative grid gap-8 md:grid-cols-3 md:gap-12">
          {/* Connecting line (desktop) */}
          <div
            ref={lineRef}
            className="absolute left-[16%] right-[16%] top-20 hidden h-px origin-left md:block"
            style={{
              background:
                'linear-gradient(to right, transparent, rgb(var(--accent-emerald-rgb) / 0.4), transparent)',
              opacity: 0,
              transform: 'scaleX(0)',
            }}
          />

          {steps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.number}
                className="step-card relative text-center"
                style={{ opacity: 0, transform: 'translateY(50px)' }}
              >
                {/* Icon with number badge */}
                <div className="how-step-icon relative mb-6 h-16 w-16">
                  <Icon size={28} className="text-secondary" />
                  <span className="bg-accent-secondary shadow-warm-badge body-4 absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full font-bold text-white">
                    {step.number}
                  </span>
                </div>

                <h3 className="h3 mb-3 text-white">{step.title}</h3>
                <p className="text-color-muted body-3 leading-relaxed">{step.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
