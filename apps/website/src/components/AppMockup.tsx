'use client'

import { useEffect, useRef } from 'react'
import {
  Box,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderKanban,
  Globe,
  LayoutDashboard,
  LayoutTemplate,
  MessageSquare,
  Mic,
  PanelLeftClose,
  PanelRightClose,
  Paperclip,
  Pin,
  Plus,
  Search,
  Settings,
  Star,
  Users,
} from 'lucide-react'
import { AppMockupCampaignPreviewRotator } from '@/components/AppMockupCampaignPreviewRotator'

/* ============================================================================
   Dark-mode glass style constants (replicated from app's globals.css dark mode)
   ============================================================================ */

const GLASS = {
  cardGlass: {
    background: 'linear-gradient(135deg, var(--glass-stop-05) 0%, var(--glass-stop-02) 100%)',
    border: '1px solid var(--border-strong)',
    boxShadow: '0 4px 16px var(--shadow-elevate), inset 0 1px 0 var(--glass-stop-10)',
  },
  inputGlass: {
    background: 'linear-gradient(135deg, var(--glass-stop-06) 0%, var(--glass-stop-02) 100%)',
    border: '1px solid var(--border-strong)',
    boxShadow: '0 4px 16px var(--shadow-elevate), inset 0 1px 0 var(--glass-stop-10)',
  },
  chipGlassPurple: {
    background:
      'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(199, 126, 255, 0.25) 50%, rgba(147, 51, 234, 0.12) 100%)',
    border: '1px solid rgba(199, 126, 255, 0.35)',
    boxShadow:
      '0 2px 12px rgba(147, 51, 234, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(147, 51, 234, 0.08)',
  },
  chipGlassGreen: {
    background:
      'linear-gradient(135deg, rgb(var(--accent-emerald-rgb) / 0.15) 0%, rgb(var(--accent-emerald-mid-rgb) / 0.22) 50%, rgb(var(--accent-emerald-rgb) / 0.12) 100%)',
    border: '1px solid rgb(var(--accent-emerald-rgb) / 0.35)',
    boxShadow:
      '0 2px 10px rgb(var(--accent-emerald-rgb) / 0.12), inset 0 1px 0 var(--glass-stop-10), inset 0 -1px 0 rgb(var(--accent-emerald-mid-rgb) / 0.06)',
    color: 'var(--accent-emerald)',
  },
  /* Matches apps/web `chip-glass-blue` (dark): blue, not brand purple secondary */
  chipGlassBlue: {
    background:
      'linear-gradient(135deg, rgb(var(--accent-blue-rgb) / 0.1) 0%, rgb(147 197 253 / 0.16) 50%, rgb(var(--accent-blue-rgb) / 0.08) 100%)',
    border: '1px solid rgb(96 165 250 / 0.25)',
    boxShadow:
      '0 2px 10px rgb(var(--accent-blue-rgb) / 0.1), inset 0 1px 0 var(--glass-stop-06), inset 0 -1px 0 rgb(var(--accent-blue-rgb) / 0.04)',
    color: 'rgb(147 197 253)',
  },
  chipGlassNeutral: {
    background:
      'linear-gradient(135deg, var(--glass-stop-04) 0%, var(--glass-stop-08) 50%, var(--glass-stop-04) 100%)',
    border: '1px solid var(--border-strong)',
    boxShadow:
      '0 2px 10px var(--shadow-elevate), inset 0 1px 0 var(--glass-stop-08), inset 0 -1px 0 var(--inset-shadow-dark)',
    color: 'var(--text-muted)',
  },
  /* Collapsed rail: campaigns control active (see SidebarStudioSection: color-secondary) */
  navRailCampaignsActive: {
    background: 'var(--bg-subtle-bright)',
    border: '1px solid var(--border-strong)',
    boxShadow: 'inset 0 1px 0 var(--glass-stop-08)',
    color: 'var(--text-primary)',
  },
  buttonGlassNeutral: {
    background:
      'linear-gradient(135deg, var(--glass-stop-06) 0%, var(--glass-stop-10) 50%, var(--glass-stop-05) 100%)',
    border: '1px solid var(--border-strong)',
    boxShadow:
      '0 2px 16px var(--shadow-elevate), inset 0 1px 0 var(--glass-stop-08), inset 0 -1px 0 var(--inset-shadow-dark)',
    color: 'var(--text-primary)',
  },
  avatarUser: {
    background:
      'linear-gradient(135deg, rgb(var(--accent-secondary-rgb)) 0%, rgb(var(--accent-secondary-deep-rgb)) 100%)',
    boxShadow: '0 0 10px rgb(var(--accent-secondary-rgb) / 0.15)',
  },
} as const

interface AppMockupProps {
  withPerimeterLight?: boolean
  className?: string
}

export function AppMockup({ withPerimeterLight = false, className = '' }: AppMockupProps) {
  const perimeterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!withPerimeterLight || !perimeterRef.current) return

    let cancelled = false

    const init = async () => {
      const { animate, stagger } = await import('animejs')
      if (cancelled || !perimeterRef.current) return

      const w = perimeterRef.current.offsetWidth
      const h = perimeterRef.current.offsetHeight
      const spacing = 8
      const frag = document.createDocumentFragment()
      const positions: { x: number; y: number }[] = []

      for (let x = 0; x <= w; x += spacing) positions.push({ x, y: 0 })
      for (let y = spacing; y <= h; y += spacing) positions.push({ x: w, y })
      for (let x = w - spacing; x >= 0; x -= spacing) positions.push({ x, y: h })
      for (let y = h - spacing; y > 0; y -= spacing) positions.push({ x: 0, y })

      const total = positions.length
      const half = Math.floor(total / 2)

      positions.forEach((pos, i) => {
        const t = i / total
        let r: number, g: number, b: number
        if (t < 0.25) {
          const p = t / 0.25
          r = Math.round(147 + (52 - 147) * p)
          g = Math.round(51 + (211 - 51) * p)
          b = Math.round(234 + (153 - 234) * p)
        } else if (t < 0.75) {
          r = 52
          g = 211
          b = 153
        } else {
          const p = (t - 0.75) / 0.25
          r = Math.round(52 + (147 - 52) * p)
          g = Math.round(211 + (51 - 211) * p)
          b = Math.round(153 + (234 - 153) * p)
        }

        const dotA = document.createElement('div')
        dotA.className = 'perim-a'
        dotA.style.left = `${pos.x}px`
        dotA.style.top = `${pos.y}px`
        dotA.style.color = `rgb(${r},${g},${b})`
        frag.appendChild(dotA)

        const t2 = ((i + half) % total) / total
        let r2: number, g2: number, b2: number
        if (t2 < 0.25) {
          const p = t2 / 0.25
          r2 = Math.round(147 + (52 - 147) * p)
          g2 = Math.round(51 + (211 - 51) * p)
          b2 = Math.round(234 + (153 - 234) * p)
        } else if (t2 < 0.75) {
          r2 = 52
          g2 = 211
          b2 = 153
        } else {
          const p = (t2 - 0.75) / 0.25
          r2 = Math.round(52 + (147 - 52) * p)
          g2 = Math.round(211 + (51 - 211) * p)
          b2 = Math.round(153 + (234 - 153) * p)
        }

        const dotB = document.createElement('div')
        dotB.className = 'perim-b'
        dotB.style.left = `${pos.x}px`
        dotB.style.top = `${pos.y}px`
        dotB.style.color = `rgb(${r2},${g2},${b2})`
        frag.appendChild(dotB)
      })

      perimeterRef.current.appendChild(frag)

      const duration = 1200
      const totalStagger = total * 25

      function flowA() {
        if (cancelled) return
        animate('.perim-a', {
          opacity: [{ to: 0.6 }, { to: 0 }],
          scale: [{ to: 1.8 }, { to: 1 }],
          delay: stagger(25, { ease: 'inOutQuad' }),
          duration,
          ease: 'inOutQuad',
          onComplete: flowA,
        })
      }

      function flowB() {
        if (cancelled) return
        animate('.perim-b', {
          opacity: [{ to: 0.6 }, { to: 0 }],
          scale: [{ to: 1.8 }, { to: 1 }],
          delay: stagger(25, { ease: 'inOutQuad' }),
          duration,
          ease: 'inOutQuad',
          onComplete: flowB,
        })
      }

      setTimeout(() => {
        if (cancelled) return
        flowA()
        setTimeout(flowB, totalStagger / 2)
      }, 2200)
    }

    init()
    return () => {
      cancelled = true
    }
  }, [withPerimeterLight])

  return (
    <div className={`site-mock-dark relative z-[1] ${className}`}>
      {/* Perimeter light */}
      {withPerimeterLight && (
        <div
          ref={perimeterRef}
          className="pointer-events-none absolute -inset-[3px] z-0 overflow-hidden rounded-[17px]"
        />
      )}

      {/* Mockup frame */}
      <div className="app-mockup-scale hero-screenshot-frame bg-color-deep relative z-[1] overflow-hidden rounded-[14px] shadow-2xl">
        {/* Real Vibey Studio UI: collapsed sidebar (72px) floating rail like production */}
        <div className="bg-color-deep flex h-[520px] sm:h-[500px] lg:h-[600px]">
          {/* ── Studio Sidebar (matches app md:w-[72px] collapsed rail) ── */}
          <div className="hidden w-[72px] flex-shrink-0 items-stretch py-3 pl-2 md:flex">
            <div
              className="flex w-full flex-col rounded-2xl overflow-hidden shadow-2xl"
              style={GLASS.cardGlass}
            >
              {/* 1. Logo Area */}
              <div className="flex h-14 items-center justify-center pt-1 shrink-0">
                <button className="cursor-pointer transition-opacity hover:opacity-80">
                  <img src="/Logos/logov2/icon-white.png" alt="Vibey" className="h-10 w-10" />
                </button>
              </div>

              {/* 2. Main Navigation Rail */}
              <nav className="scrollbar-hide flex flex-1 flex-col items-center gap-0.5 px-1 py-2 overflow-y-auto">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg mb-1"
                  style={GLASS.chipGlassGreen}
                >
                  <Plus size={20} strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-color-dimmer transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Building2 size={20} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-color-dimmer transition-colors hover:bg-white/5 hover:text-white"
                >
                  <Search size={20} strokeWidth={2} />
                </button>

                <div className="my-1 h-px w-8 bg-white/5" />

                <button
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={GLASS.chipGlassPurple}
                >
                  <FolderKanban size={20} strokeWidth={2} />
                </button>
                <button className="text-color-dimmer hover:bg-white/5 flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-white">
                  <MessageSquare size={20} strokeWidth={2} />
                </button>
              </nav>

              {/* 3. Footer Section */}
              <div className="flex flex-col items-center gap-2 py-2 shrink-0">
                <div
                  className="flex w-full flex-col items-center gap-1.5 px-1 pt-1"
                  style={{ borderTop: '1px solid var(--border-glass)' }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-lg"
                    style={GLASS.avatarUser}
                  >
                    YT
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Chat Interface: 35% on lg (hidden below lg) ── */}
          <div className="bg-color-deep hidden min-w-0 flex-[35_1_0%] flex-col lg:flex">
            <div className="flex-1 space-y-3 overflow-hidden px-4 pt-4 md:px-6">
              <div className="rounded-xl px-4 py-3" style={GLASS.cardGlass}>
                <p className="text-color-primary whitespace-pre-wrap text-[13px] leading-relaxed">
                  Build me a complete lead generation campaign for my SaaS product targeting startup
                  founders.
                </p>
              </div>

              <div className="text-color-primary text-[12px] leading-relaxed">
                <p>
                  <strong>Perfect.</strong> I&apos;m building a full campaign for you:
                </p>
                <div className="mt-2 space-y-1.5">
                  {[
                    {
                      num: '1',
                      label: 'Offer',
                      desc: 'SaaS launch power offer with ICP + buyer persona.',
                    },
                    {
                      num: '2',
                      label: 'Landing Page',
                      desc: 'Conversion-optimized funnel targeting founders.',
                    },
                    {
                      num: '3',
                      label: 'Email Sequence',
                      desc: '5-part nurture series for demo booking.',
                    },
                    {
                      num: '4',
                      label: 'Meta Ads',
                      desc: 'Feed creative + copy variations.',
                    },
                    {
                      num: '5',
                      label: 'Presentation',
                      desc: '"The Sales Automation Playbook" guide.',
                    },
                    {
                      num: '6',
                      label: 'Instagram Post',
                      desc: 'Launch carousel for social.',
                    },
                  ].map((item) => (
                    <p key={item.num}>
                      <strong>
                        {item.num}. {item.label}
                      </strong>{' '}
                      : {item.desc}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 pt-2 md:px-8">
              <div className="flex flex-col overflow-hidden rounded-2xl" style={GLASS.inputGlass}>
                <div className="min-h-[60px] px-4 pt-3">
                  <span className="text-color-muted text-[13px]">
                    Message Vibe... (@ to tag offers or docs)
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <button
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                    style={GLASS.buttonGlassNeutral}
                  >
                    <Paperclip size={14} />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                      style={GLASS.buttonGlassNeutral}
                    >
                      <Mic size={14} />
                    </button>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                      style={GLASS.buttonGlassNeutral}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Campaign Preview Panel: 65% on lg, full width below lg ── */}
          <div className="bg-color-deep flex min-w-0 flex-1 flex-col lg:flex-[65_1_0%]">
            <div className="bg-color-deep flex flex-wrap items-center gap-1 pr-4 pt-4 max-lg:pl-4">
              <div
                className="flex h-8 items-center gap-2 rounded-xl px-3"
                style={GLASS.chipGlassBlue}
              >
                <Box size={16} strokeWidth={2} />
                <span className="text-[11px] font-semibold">Artifacts</span>
              </div>
              <div
                className="flex h-8 items-center justify-center rounded-xl px-2"
                style={GLASS.chipGlassNeutral}
              >
                <LayoutDashboard size={16} strokeWidth={2} />
              </div>
              <div
                className="flex h-8 items-center justify-center rounded-xl px-2"
                style={GLASS.chipGlassNeutral}
              >
                <Users size={16} strokeWidth={2} />
              </div>
              <div
                className="flex h-8 items-center justify-center rounded-xl px-2"
                style={GLASS.chipGlassNeutral}
              >
                <Folder size={16} strokeWidth={2} />
              </div>
              <div
                className="flex h-8 items-center justify-center rounded-xl px-2"
                style={GLASS.chipGlassNeutral}
              >
                <CalendarClock size={16} strokeWidth={2} />
              </div>
              <div
                className="hidden h-8 items-center justify-center rounded-xl px-2 md:flex"
                style={GLASS.chipGlassNeutral}
              >
                <Settings size={16} strokeWidth={2} />
              </div>
              <button
                type="button"
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
                style={GLASS.chipGlassNeutral}
                title="Minimize"
              >
                <PanelRightClose size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4 pr-4 pt-4 max-lg:pl-4">
              <AppMockupCampaignPreviewRotator
                glass={{
                  cardGlass: GLASS.cardGlass,
                  chipGlassGreen: GLASS.chipGlassGreen,
                  chipGlassNeutral: GLASS.chipGlassNeutral,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
