'use client'

import { useEffect, useRef } from 'react'
import { BarChart3, FileText, Globe, Layers, Mail, PenTool, Search, Target } from 'lucide-react'

const roles = [
  { icon: PenTool, label: 'Copywriter' },
  { icon: Target, label: 'Funnel Hacker' },
  { icon: Layers, label: 'Designer' },
  { icon: Mail, label: 'Email Marketer' },
  { icon: BarChart3, label: 'Analyst' },
  { icon: FileText, label: 'Content Strategist' },
  { icon: Globe, label: 'Web Developer' },
  { icon: Search, label: 'SEO Specialist' },
]

export function SocialProof() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const rolesRef = useRef<HTMLDivElement>(null)

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

        if (rolesRef.current) {
          const items = rolesRef.current.querySelectorAll('.role-pill')
          animate(items, {
            opacity: [0, 1],
            translateY: [20, 0],
            scale: [0.9, 1],
            delay: stagger(80),
            duration: 600,
            ease: 'outExpo',
            autoplay: onScroll({ target: rolesRef.current, enter: 'bottom -= 60px' }),
          })
        }
      } catch {
        if (sectionRef.current) sectionRef.current.style.opacity = '1'
        if (rolesRef.current) {
          rolesRef.current.querySelectorAll('.role-pill').forEach((el) => {
            ;(el as HTMLElement).style.opacity = '1'
            ;(el as HTMLElement).style.transform = 'none'
          })
        }
      }
    }
    init()
  }, [])

  return (
    <section className="section-padding border-section relative overflow-hidden border-t">
      <div className="site-container">
        <div className="mx-auto max-w-4xl">
          <div ref={sectionRef} className="mb-12 text-center" style={{ opacity: 0 }}>
            <p className="typo-caption text-secondary mb-4 font-semibold uppercase tracking-widest">
              The General Marketing Assistant, every role
            </p>
            <h2 className="h2 tracking-tight">
              Replace your entire marketing team{' '}
              <span className="gradient-text">with one conversation.</span>
            </h2>
            <p className="text-color-muted body-2 mx-auto mt-5 max-w-xl">
              ROAS gives every founder the same advantage.
            </p>
          </div>

          {/* Role pills */}
          <div ref={rolesRef} className="flex flex-wrap items-center justify-center gap-3">
            {roles.map((role) => {
              const Icon = role.icon
              return (
                <div
                  key={role.label}
                  className="role-pill glass-card flex items-center gap-2.5 rounded-full px-5 py-2.5 transition-colors"
                  style={{ opacity: 0, transform: 'translateY(20px) scale(0.9)' }}
                >
                  <Icon size={16} className="text-secondary" />
                  <span className="body-3 font-medium text-white">{role.label}</span>
                </div>
              )
            })}
          </div>

          {/* Built by line */}
          <div className="mt-12 text-center">
            <div className="glass-card mx-auto inline-flex items-center gap-2 rounded-full px-5 py-2">
              <span className="bg-emerald-accent h-2 w-2 animate-pulse rounded-full" />
              <span className="text-color-muted body-3">
                Now in public beta: built by the team behind{' '}
                <span className="font-medium text-white">Olympus Digital</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
