'use client'

import { useEffect, useRef } from 'react'
import { BarChart3, FileText, Globe, Layers, Mail, Palette, PenTool, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CursorGlow } from '@/components/CursorGlow'

interface Role {
  icon: LucideIcon
  role: string
  title: string
  description: string
}

const roles: Role[] = [
  {
    icon: PenTool,
    role: 'Your Copywriter',
    title: 'Writes copy that sounds like you',
    description:
      'Emails, ad copy, landing pages, headlines: all in your voice. Not templates. Not AI slop. Vibey learns your brand and writes like you would, just faster.',
  },
  {
    icon: Layers,
    role: 'Your Funnel Hacker',
    title: 'Builds complete conversion funnels',
    description:
      'Landing page → presentation → email sequence → offer. One conversation, one complete funnel. No drag-and-drop. No templates. Just describe what you sell.',
  },
  {
    icon: Palette,
    role: 'Your Designer',
    title: 'Creates pages and assets',
    description:
      'Professional landing pages, presentations, and visual assets. No Canva. No freelancers. Tell Vibey what you need, get production-ready output.',
  },
  {
    icon: Mail,
    role: 'Your Email Marketer',
    title: 'Builds sequences that nurture and convert',
    description:
      'Welcome series, sales sequences, re-engagement campaigns. Vibey writes the full sequence, sets the timing, and nails the CTAs.',
  },
  {
    icon: BarChart3,
    role: 'Your Analyst',
    title: 'Tracks what\u2019s working',
    description:
      'See credits used, campaigns launched, and performance data in one dashboard. Know where to double down and where to cut.',
  },
  {
    icon: FileText,
    role: 'Your Content Strategist',
    title: 'Plans docs, guides, and presentations',
    description:
      'PDFs, checklists, playbooks: Vibey creates the assets that capture leads and build your list. Strategy and execution in one step.',
  },
  {
    icon: Globe,
    role: 'Your Web Developer',
    title: 'Codes and publishes pages',
    description:
      'Full Next.js pages, published and live. No staging. No deploy pipeline. Vibey builds it, you review it, it\u2019s live.',
  },
  {
    icon: Search,
    role: 'Your SEO Specialist',
    title: 'Optimizes for search and discovery',
    description:
      'Meta tags, keyword targeting, structured content: baked into every page and post Vibey creates. Not an afterthought.',
  },
]

export function Features() {
  const gridRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)

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
          const cards = gridRef.current.querySelectorAll('.feature-card')
          animate(cards, {
            opacity: [0, 1],
            translateY: [50, 0],
            scale: [0.95, 1],
            delay: stagger(80),
            duration: 800,
            ease: 'outExpo',
            autoplay: onScroll({ target: gridRef.current, enter: 'bottom -= 60px' }),
          })
        }
      } catch {
        if (headingRef.current) headingRef.current.style.opacity = '1'
        if (gridRef.current) {
          gridRef.current.querySelectorAll('.feature-card').forEach((el) => {
            ;(el as HTMLElement).style.opacity = '1'
            ;(el as HTMLElement).style.transform = 'none'
          })
        }
      }
    }
    init()
  }, [])

  return (
    <section className="section-padding relative">
      <div className="site-container">
        <div ref={headingRef} className="mb-16 text-center" style={{ opacity: 0 }}>
          <p className="typo-caption text-secondary mb-4 font-semibold uppercase tracking-widest">
            Every role. The General Marketing Assistant.
          </p>
          <h2 className="h2 tracking-tight">
            The team you&apos;d hire: <span className="gradient-text">without the headcount.</span>
          </h2>
          <p className="text-color-muted body-2 mx-auto mt-4 max-w-2xl">
            Vibey replaces eight marketing roles with one conversation. Same output. Fraction of the
            cost. Available 24/7.
          </p>
        </div>

        <div ref={gridRef} className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <CursorGlow />
          {roles.map((r) => {
            const Icon = r.icon
            return (
              <div
                key={r.role}
                className="feature-card glass-card glass-card-hover group h-full rounded-2xl p-6"
                style={{ opacity: 0, transform: 'translateY(50px) scale(0.95)' }}
              >
                <div className="feature-icon-chip mb-4 h-10 w-10">
                  <Icon size={20} className="text-secondary" />
                </div>
                <p className="text-secondary body-4 mb-1 font-semibold uppercase tracking-wider">
                  {r.role}
                </p>
                <h3 className="h4 mb-2 text-white">{r.title}</h3>
                <p className="text-color-muted body-3 leading-relaxed">{r.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
