'use client'

import { useEffect, useRef } from 'react'
import { BookOpen, Briefcase, Code, ShoppingBag } from 'lucide-react'
import { CursorGlow } from '@/components/CursorGlow'

const useCases = [
  {
    icon: BookOpen,
    title: 'Course Creators',
    description:
      'Launch your course with a complete funnel, email sequence, and presentation: all from one conversation.',
  },
  {
    icon: Briefcase,
    title: 'Coaches & Consultants',
    description:
      'Build your client pipeline with high-converting landing pages and automated follow-up sequences.',
  },
  {
    icon: ShoppingBag,
    title: 'E-commerce Brands',
    description:
      'Create product launches, seasonal campaigns, and email flows that drive repeat purchases.',
  },
  {
    icon: Code,
    title: 'SaaS Founders',
    description:
      'Generate landing pages, onboarding emails, and growth campaigns without hiring a marketing team.',
  },
]

export function UseCases() {
  const headingRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { animate, stagger, onScroll } = await import('animejs')

        if (headingRef.current) {
          animate(headingRef.current, {
            opacity: [0, 1],
            translateY: [40, 0],
            duration: 800,
            ease: 'outExpo',
            autoplay: onScroll({ target: headingRef.current, enter: 'bottom -= 80px' }),
          })
        }

        if (gridRef.current) {
          const cards = gridRef.current.querySelectorAll('.usecase-card')
          animate(cards, {
            opacity: [0, 1],
            translateY: [50, 0],
            delay: stagger(120),
            duration: 800,
            ease: 'outExpo',
            autoplay: onScroll({ target: gridRef.current, enter: 'bottom -= 60px' }),
          })
        }
      } catch {
        if (headingRef.current) headingRef.current.style.opacity = '1'
        if (gridRef.current) {
          gridRef.current.querySelectorAll('.usecase-card').forEach((el) => {
            ;(el as HTMLElement).style.opacity = '1'
            ;(el as HTMLElement).style.transform = 'none'
          })
        }
      }
    }
    init()
  }, [])

  return (
    <section className="section-padding border-color-glass border-t">
      <div className="site-container">
        <div className="mx-auto max-w-5xl">
          <div ref={headingRef} className="mb-16 text-center" style={{ opacity: 0 }}>
            <p className="typo-caption text-secondary mb-4 font-semibold uppercase tracking-widest">
              Built for builders
            </p>
            <h2 className="h2 tracking-tight">
              Built for <span className="gradient-text">builders</span>
            </h2>
          </div>

          <div ref={gridRef} className="relative grid gap-6 sm:grid-cols-2">
            <CursorGlow />
            {useCases.map((uc) => {
              const Icon = uc.icon
              return (
                <div
                  key={uc.title}
                  className="usecase-card glass-card glass-card-hover flex items-start gap-5 rounded-2xl p-8"
                  style={{ opacity: 0, transform: 'translateY(50px)' }}
                >
                  <div className="feature-icon-chip h-12 w-12 flex-shrink-0">
                    <Icon size={24} className="text-secondary" />
                  </div>
                  <div>
                    <h3 className="h4 mb-2 text-white">{uc.title}</h3>
                    <p className="text-color-muted body-3 leading-relaxed">{uc.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
