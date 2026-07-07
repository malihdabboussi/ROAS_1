'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Download,
  FileText,
  FolderKanban,
  Globe,
  Layers,
  Loader2,
  Lock,
  Mail,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  Mic,
  MousePointer2,
  Paperclip,
  Plug,
  Presentation,
  Rocket,
  Server,
  Settings2,
  Share2,
  Shield,
  Target,
  TrendingUp,
  Users,
  Video,
  Wand2,
  Zap,
} from 'lucide-react'
import { AppMockup } from '@/components/AppMockup'
import {
  INTEGRATIONS_HERO_LIBRARY,
  IntegrationsHeroMockup,
} from '@/components/feature-pages/IntegrationsHeroMockup'
import { AgentLibraryCarousel } from '@/components/marketing/AgentLibraryCarousel'
import { IntegrationKnowledgeIndexerMockup } from '@/components/marketing/IntegrationKnowledgeIndexerMockup'
import { IntegrationToolDispatcherMockup } from '@/components/marketing/IntegrationToolDispatcherMockup'
import { MarketingBrainGraphMockup } from '@/components/marketing/MarketingBrainGraphMockup'
import {
  MarketingCapabilitiesGtmMockup,
  MarketingCapabilitiesMediaMockup,
  MarketingCapabilitiesOpsMockup,
} from '@/components/marketing/MarketingCapabilitiesShowcaseMockups'
import { MarketingDailyDigestMockup } from '@/components/marketing/MarketingDailyDigestMockup'
import { MarketingHrLibraryMockup } from '@/components/marketing/MarketingHrLibraryMockup'
import { MarketingMissionActivityScoreMockup } from '@/components/marketing/MarketingMissionActivityScoreMockup'
import { MarketingMissionExecutionMockup } from '@/components/marketing/MarketingMissionExecutionMockup'
import { MarketingNorthstarGuardrailMockup } from '@/components/marketing/MarketingNorthstarGuardrailMockup'
import { MarketingOrgChartMockup } from '@/components/marketing/MarketingOrgChartMockup'
import { MarketingSkillBuilderMockup } from '@/components/marketing/MarketingSkillBuilderMockup'
import { MarketingSkillLibraryMockup } from '@/components/marketing/MarketingSkillLibraryMockup'
import {
  MARKETING_PREMADE_SKILL_LIBRARY_NAMES,
  MarketingSkillStackMockup,
} from '@/components/marketing/MarketingSkillStackMockup'
import { VibeyHeroDepthOrb } from '@/components/vibey/vibey-hero-depth-orb'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { MarketingHrShowcasePayload } from '@/lib/marketing-hr-showcase-data'
import { getPitchNav, PITCH_SLIDE_COUNT } from './pitch-nav-v1'
import { PitchSlideMapV1 } from './PitchSlideMapV1'

const TOTAL_SLIDES = PITCH_SLIDE_COUNT
/** 0-based index of the unified team → org slide (old slides 12+13). */
const TEAM_ORG_SLIDE_INDEX = 11

const agents = MARKETING_AGENT_LIBRARY_FALLBACK
const vibeyPortrait = VIBEY_MARKETING_PORTRAIT_FALLBACK
/** Pitch org-chart CEO — logo mark (not a photo), matches cover / brand. */
const VIBEY_ORG_CEO_LOGO_SRC = '/Logos/logov2/icon-white.png'

/**
 * Pitch-only face URLs for org slots where template library + de-dupe picked weak B&W or duplicate-looking shots.
 * Keys are `HIRED_POS` slot ids (see SlideTeamToOrgTransition).
 */
const PITCH_ORG_PORTRAIT_OVERRIDES: Record<string, string> = {
  h4: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces&auto=format&q=82',
  h6: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces&auto=format&q=82',
  h7: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=faces&auto=format&q=82',
}

function pickUniqueOrgPortraits(slots: { slotId: string; roleKey: string }[]): Map<string, string> {
  const used = new Set<string>()
  const out = new Map<string, string>()
  for (const s of slots) {
    const preferred = agents.find((a) => a.role_key === s.roleKey)
    let url = preferred?.image_url
    if (url && !used.has(url)) {
      used.add(url)
      out.set(s.slotId, url)
      continue
    }
    const fallback = agents.find((a) => !used.has(a.image_url))
    if (fallback) {
      used.add(fallback.image_url)
      out.set(s.slotId, fallback.image_url)
    } else {
      out.set(s.slotId, `https://i.pravatar.cc/128?u=${encodeURIComponent(s.slotId)}`)
    }
  }
  return out
}

/** Elbow path in viewBox coords (center = 500, 200). */
function orgChartEdgePath(ax: number, ay: number, bx: number, by: number, outPad = 34, inPad = 34) {
  const CX = 500
  const CY = 200
  const x1 = CX + ax
  const y1 = CY + ay + outPad
  const x2 = CX + bx
  const y2 = CY + by - inPad
  const midY = y1 + (y2 - y1) * 0.42
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`
}

const HR_SHOWCASE_FALLBACK: MarketingHrShowcasePayload = {
  hr: {
    name: 'Jordan',
    imageUrl:
      'https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/images/template-analyst-1774956098277.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvaW1hZ2VzL3RlbXBsYXRlLWFuYWx5c3QtMTc3NDk1NjA5ODI3Ny5qcGciLCJpYXQiOjE3NzQ5NTYwOTksImV4cCI6MjA5MDMxNjA5OX0.znp5arS29L1StmOXwVDtKiJvN7w1SbIIzn4zN1mh8JA',
  },
  insights: {
    team_gaps: [
      {
        gap: 'No dedicated analyst on active campaigns',
        severity: 'high',
        evidence:
          'Research and ICP work is falling back to strategists, slowing mission throughput.',
      },
      {
        gap: 'Creative capacity stretched',
        severity: 'medium',
        evidence: 'Copy and design requests are queuing behind a single marketing specialist.',
      },
    ],
    team_structure: {
      summary:
        'Strong leadership and execution agents; add depth in research and creative production.',
      strengths: [
        'Clear PM coverage for marketing campaigns',
        'Developer in place for integrations',
      ],
      improvements: [
        'Add analyst for market and competitor intel',
        'Expand creative bench before next launch spike',
      ],
    },
  },
  nextHire: {
    roleKey: 'analyst',
    displayName: 'Niko',
    role: 'Marketing Analyst',
    reason: 'Adds dedicated research and competitive intelligence before the next campaign wave.',
  },
}

// ─── Shared Components ────────────────────────────────────────────────────────

function Slide({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center overflow-hidden px-8 py-12 md:px-16 lg:px-24 ${className}`}
    >
      {children}
    </div>
  )
}

function SlideLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mb-4 inline-block rounded-full bg-white/[0.06] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50"
    >
      {children}
    </motion.span>
  )
}

function SlideTitle({
  children,
  delay = 0.3,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay }}
      className={`mx-auto max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl ${className}`}
    >
      {children}
    </motion.h2>
  )
}

function SlideSub({
  children,
  delay = 0.6,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-white/50 md:text-lg ${className}`}
    >
      {children}
    </motion.p>
  )
}

/** Wide % + scale() otherwise anchors left — shifts previews right and clips. */
function ScaledPitchMockup({
  heightClass,
  sizePercent,
  scale,
  opacityClass = 'opacity-70',
  clip = true,
  children,
}: {
  heightClass: string
  sizePercent: number
  scale: number
  opacityClass?: string
  /** When false, overflow visible so mockup animations aren’t clipped (pitch “How to Use Vibey”). */
  clip?: boolean
  children: React.ReactNode
}) {
  const pct = `${sizePercent}%`
  return (
    <div
      className={`relative mt-2 w-full rounded-xl ${clip ? 'overflow-hidden' : 'overflow-visible'} ${opacityClass} ${heightClass}`}
    >
      <div
        className="absolute left-1/2 top-0 origin-top"
        style={{
          width: pct,
          height: pct,
          transform: `translateX(-50%) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Full-viewport white burst; on complete runs once (close zoom + glow). */
function PitchFlashBurst({ tick, onComplete }: { tick: number; onComplete: () => void }) {
  if (tick <= 0) return null
  return (
    <motion.div
      key={tick}
      className="pointer-events-none fixed inset-0 z-[10001] bg-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.88, 0] }}
      transition={{ duration: 0.45, times: [0, 0.22, 1], ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={onComplete}
    />
  )
}

function StatCard({
  value,
  label,
  accent = 'emerald',
  index = 0,
  variant = 'gradient',
}: {
  value: string
  label: string
  accent?: 'emerald' | 'blue' | 'purple'
  index?: number
  /** `panel` — bordered cards matching Distribution / Commando deck slides */
  variant?: 'gradient' | 'panel'
}) {
  const colors = {
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-400',
  }
  const valueTint = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  }
  const ringTint = {
    emerald: 'ring-emerald-500/15',
    blue: 'ring-blue-500/15',
    purple: 'ring-purple-500/15',
  }
  if (variant === 'panel') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 + index * 0.12 }}
        className={`rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center ring-1 ${ringTint[accent]}`}
      >
        <div
          className={`font-[family-name:var(--font-site-headline)] text-2xl font-bold md:text-3xl ${valueTint[accent]}`}
        >
          {value}
        </div>
        <div className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
          {label}
        </div>
      </motion.div>
    )
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 + index * 0.12 }}
      className={`rounded-2xl bg-gradient-to-b p-6 text-center ${colors[accent]}`}
    >
      <div className="font-[family-name:var(--font-site-headline)] text-3xl font-bold md:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-xs font-medium uppercase tracking-wider text-white/40">{label}</div>
    </motion.div>
  )
}

function AgentAvatar({
  src,
  name,
  size = 56,
  className = '',
}: {
  src: string
  name?: string
  size?: number
  className?: string
}) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: size, height: size }}
    >
      <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
    </div>
  )
}

// ─── Slide 1: Cover ──────────────────────────────────────────────────────────

function SlideCover() {
  return (
    <Slide className="!py-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <img src="/Logos/logov2/icon-white.png" alt="Vibey" className="mb-6 h-14 w-14 opacity-80" />
        <h1 className="max-w-3xl text-center font-[family-name:var(--font-site-headline)] text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
          YOUR AI TEAM.
          <br />
          <span className="gradient-text">READY TO WORK.</span>
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 w-full max-w-3xl overflow-hidden rounded-2xl"
        >
          <video
            src="https://qfrvykscoymiwwgysvsr.supabase.co/storage/v1/object/sign/media/00000000-0000-0000-0000-000000000000/videos/1774967660254-Team%20page.mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9lZjJhZjEyZi1lYmFmLTRhNWItOTk1Zi0wZDUwY2Y2ZWNhZWUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWRpYS8wMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAvdmlkZW9zLzE3NzQ5Njc2NjAyNTQtVGVhbSBwYWdlLm1wNCIsImlhdCI6MTc3NDk2NzY2NCwiZXhwIjoyMDkwMzI3NjY0fQ.PJw_xGdGJqkFJ0uerQFGR7Hi8HV606NgWMKluIWmL1A"
            autoPlay
            loop
            muted
            playsInline
            className="h-auto w-full"
          />
        </motion.div>
      </motion.div>
    </Slide>
  )
}

// ─── Slide 2: Founders ───────────────────────────────────────────────────────

function SlideFounders() {
  return (
    <Slide>
      <SlideLabel>The Founders</SlideLabel>
      <SlideTitle>PROVEN TRACK RECORD</SlideTitle>
      <div className="mt-10 grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-white/[0.03] p-6"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-md" />
              <img
                src="/pitch/dylan.png"
                alt="Dylan Vanas"
                className="relative h-14 w-14 rounded-full object-cover"
              />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Dylan Vanas</div>
              <div className="text-sm text-white/40">CEO / Co-Founder</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-white/60">
            <li>Decade of performance marketing</li>
            <li>Built &amp; exited 2 companies (incl. DopeTech.com)</li>
            <li>Runs ROAS.co — now operating through Vibey</li>
            <li>Closes six-figure deals; demos product himself</li>
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl bg-white/[0.03] p-6"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-purple-500/20 blur-md" />
              <img
                src="/pitch/sefy.png"
                alt="Sefy Tofan"
                className="relative h-14 w-14 rounded-full object-cover"
              />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Sefy Tofan</div>
              <div className="text-sm text-white/40">CTO / Co-Founder</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-white/60">
            <li>Built 82-person marketing agency from $5 Fiverr gigs</li>
            <li>Replaced 82 employees with 17 AI agents ($550/mo)</li>
            <li>Self-taught engineer; built entire platform solo</li>
            <li>Manages enterprise clients + monitors logs in real-time</li>
          </ul>
        </motion.div>
      </div>
    </Slide>
  )
}

// ─── Slide 3: Problem ────────────────────────────────────────────────────────

function SlideProblem() {
  return (
    <Slide className="!py-6">
      <SlideLabel>The Problem</SlideLabel>
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl bg-purple-500/[0.04] p-6"
        >
          <h3 className="font-[family-name:var(--font-site-headline)] text-2xl font-bold text-purple-400 md:text-3xl">
            MARKETING IS BROKEN
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li className="flex gap-3">
              <span className="mt-1 text-purple-400/60">×</span>
              <span>
                The average SMB uses{' '}
                <a
                  href="https://chiefmartec.com/martech-landscape"
                  target="_blank"
                  rel="noopener"
                  className="border-b border-white/20 text-white/80 hover:text-white"
                >
                  7.2 marketing tools
                </a>{' '}
                that don&apos;t talk to each other
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-purple-400/60">×</span> 2–4 weeks to launch a single
              campaign
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-purple-400/60">×</span> Brand voice becomes Frankenstein
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-purple-400/60">×</span> The execution gap kills more
              businesses than bad strategy
            </li>
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-purple-500/[0.04] p-6"
        >
          <h3 className="font-[family-name:var(--font-site-headline)] text-2xl font-bold text-purple-400 md:text-3xl">
            AI AGENTS ARE UNSOLVED
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-white/60">
            <li className="flex gap-3">
              <span className="mt-1 text-purple-400/60">×</span>
              <span>
                Gartner predicts{' '}
                <a
                  href="https://www.gartner.com/en/newsroom/press-releases/2024-10-21-gartner-says-by-2028-33-percent-of-enterprise-software-applications-will-include-agentic-ai"
                  target="_blank"
                  rel="noopener"
                  className="border-b border-white/20 text-white/80 hover:text-white"
                >
                  40% of enterprise apps
                </a>{' '}
                will embed AI agents by end of 2026
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-purple-400/60">×</span> Claude, Cursor, ChatGPT — single
              agents on your laptop
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-purple-400/60">×</span> No turnkey multi-agent system
              exists
            </li>
            <li className="flex gap-3">
              <span className="mt-1 text-purple-400/60">×</span> Enterprise needs remain unmet
            </li>
          </ul>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-4 w-full max-w-5xl"
      >
        <IntegrationToolDispatcherMockup embedTransparent />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 4: Market ─────────────────────────────────────────────────────────

function SlideMarket() {
  const stats = [
    {
      value: '$10.9B',
      label: 'Agentic AI Market 2026',
      icon: TrendingUp,
      color: 'emerald' as const,
    },
    { value: '$199B', label: 'Projected by 2034', icon: Rocket, color: 'purple' as const },
    { value: '44%', label: 'CAGR Over 9 Years', icon: Zap, color: 'emerald' as const },
    { value: '5→40%', label: 'Enterprise AI Agents', icon: Users, color: 'purple' as const },
  ]

  const insights = [
    {
      text: 'Fastest-growing tech category since cloud',
      highlight: "340% higher spending velocity than RPA's peak",
    },
    {
      text: '93% of business leaders believe',
      highlight: 'scaling AI agents in 12 months creates competitive advantage',
    },
    { text: '1,445% surge', highlight: 'in multi-agent system inquiries Q1 2024 → Q2 2025' },
  ]

  return (
    <Slide>
      <SlideLabel>The Market</SlideLabel>
      <SlideTitle>WHY NOW</SlideTitle>
      <div className="mt-10 grid w-full max-w-4xl grid-cols-2 gap-5 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.2, duration: 0.5, type: 'spring', stiffness: 150 }}
            className="relative overflow-hidden rounded-2xl bg-white/[0.03] p-6 text-center"
          >
            <motion.div
              animate={{
                boxShadow: [
                  `0 0 0px ${stat.color === 'emerald' ? 'rgba(52,211,153,0)' : 'rgba(168,85,247,0)'}`,
                  `0 0 30px ${stat.color === 'emerald' ? 'rgba(52,211,153,0.15)' : 'rgba(168,85,247,0.15)'}`,
                  `0 0 0px ${stat.color === 'emerald' ? 'rgba(52,211,153,0)' : 'rgba(168,85,247,0)'}`,
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
              className="absolute inset-0 rounded-2xl"
            />
            <div className="relative">
              <div
                className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
                  stat.color === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-purple-500/15 text-purple-400'
                }`}
              >
                <stat.icon size={18} />
              </div>
              <div
                className={`font-[family-name:var(--font-site-headline)] text-3xl font-bold md:text-4xl ${
                  stat.color === 'emerald' ? 'text-emerald-400' : 'text-purple-400'
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-2 text-[10px] font-medium uppercase tracking-wider text-white/40">
                {stat.label}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.4 }}
        className="mt-5 text-center text-[10px] text-white/25"
      >
        Source: Precedence Research, Gartner
      </motion.div>
      <div className="mt-5 w-full max-w-3xl space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.6 + i * 0.2, duration: 0.4 }}
            className="flex items-start gap-3 rounded-lg px-4 py-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1.7 + i * 0.2, type: 'spring' }}
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
            />
            <p className="text-sm text-white/40">
              {insight.text} <span className="font-medium text-white/60">{insight.highlight}</span>
            </p>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 5: Meet Vibey ─────────────────────────────────────────────────────

function SlideMeetVibey() {
  const CHIPS = [
    { label: 'Build Funnel', icon: Layers },
    { label: 'Email Sequence', icon: Mail },
    { label: 'Run Ads', icon: Target },
    { label: 'Create Website', icon: Globe },
  ]

  return (
    <Slide className="!py-4">
      <SlideLabel>The Solution</SlideLabel>
      <motion.h2
        initial={{ opacity: 0, y: 30, scale: 1.1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-2xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl"
      >
        MEET THE MOST POWERFUL <span className="gradient-text">AGENT</span>
      </motion.h2>

      {/* Orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="pointer-events-none relative -mb-6 mt-2 h-[220px] w-[220px] overflow-visible md:h-[260px] md:w-[260px]"
      >
        <div className="absolute -inset-10">
          <VibeyHeroDepthOrb />
        </div>
      </motion.div>

      {/* Chat composer — mirrors homepage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="mt-4 w-full max-w-2xl"
      >
        <div className="input-glass rounded-spacing-4 relative flex flex-col overflow-hidden">
          <div className="flex-1 px-4 pt-3">
            <div className="body-3 placeholder-muted min-h-[48px] w-full bg-transparent text-white/30">
              What are we creating today?
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full">
                <Paperclip className="h-3.5 w-3.5 text-white/40" />
              </div>
              <div className="button-glass-neutral flex h-8 items-center gap-1 rounded-full px-2">
                <Settings2 className="h-3.5 w-3.5 text-white/40" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full">
                <Mic className="h-3.5 w-3.5 text-white/40" />
              </div>
              <div className="button-glass-neutral flex h-8 w-8 items-center justify-center rounded-full opacity-30">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white/40"
                >
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Campaign toolbar */}
        <div className="rounded-b-spacing-4 bg-color-surface relative z-0 mx-4 -mt-1 flex items-center px-4 pb-2.5 pt-3">
          <div className="text-color-muted body-4 flex items-center gap-1.5">
            <FolderKanban className="h-3 w-3" />
            <span className="font-medium">Select campaign</span>
            <ChevronDown className="h-2.5 w-2.5" />
          </div>
        </div>

        {/* Capability chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="mt-3 flex flex-wrap items-center justify-center gap-1.5"
        >
          {CHIPS.map((chip, i) => (
            <motion.span
              key={chip.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + i * 0.08 }}
              className="body-3 text-color-muted flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 font-medium"
            >
              <chip.icon className="h-3 w-3" />
              {chip.label}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="body-3 text-color-muted flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1 font-medium"
          >
            More
            <ChevronDown className="h-2.5 w-2.5" />
          </motion.span>
        </motion.div>
      </motion.div>
    </Slide>
  )
}

// ─── Slide 6: Four pillars (intro) ─────────────────────────────────────────────

function SlideSolutionFourPillars() {
  return (
    <Slide className="!py-4">
      <SlideLabel>The Solution</SlideLabel>
      <SlideTitle>
        WHAT MAKES IT <span className="gradient-text">DIFFERENT</span>
      </SlideTitle>
      <SlideSub delay={0.4}>
        Memory, compute, skills, and integrations — built as one system.
      </SlideSub>

      <div className="mt-5 grid w-full max-w-5xl grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            title: 'The Brain',
            desc: 'Compounding memory that learns your business.',
            accent: 'from-purple-500/12',
            ring: 'ring-purple-500/15',
            border: 'border-purple-500/15',
            iconBg: 'bg-purple-500/15 text-purple-400',
            icon: Brain,
            mockup: (
              <div
                className="pointer-events-none h-full w-full origin-top-left scale-[0.38]"
                style={{ width: '263%', height: '263%' }}
              >
                <MarketingBrainGraphMockup />
              </div>
            ),
          },
          {
            title: 'Cloud Computer',
            desc: 'Dedicated runtime — always on, always executing.',
            accent: 'from-emerald-500/12',
            ring: 'ring-emerald-500/15',
            border: 'border-emerald-500/15',
            iconBg: 'bg-emerald-500/15 text-emerald-400',
            icon: Server,
            mockup: (
              <div className="flex h-full w-full flex-col gap-1 overflow-hidden rounded-lg bg-[#0d0d0f] p-2 font-mono text-[7px] leading-relaxed">
                <div className="flex items-center gap-1 border-b border-white/[0.06] pb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[6px] text-white/25">agent-runtime</span>
                </div>
                <p className="text-emerald-400/80">$ vibey agent start</p>
                <p className="text-white/40">✓ Cloud instance (2 vCPU)</p>
                <p className="text-white/40">✓ Brain loaded (847 mem)</p>
                <p className="text-white/40">✓ Skills mounted: 23</p>
                <p className="text-purple-400/70">→ Running campaign…</p>
              </div>
            ),
          },
          {
            title: 'Skills',
            desc: 'Pre-built plays plus your own SOPs.',
            accent: 'from-blue-500/12',
            ring: 'ring-blue-500/15',
            border: 'border-blue-500/15',
            iconBg: 'bg-blue-500/15 text-blue-400',
            icon: Layers,
            mockup: (
              <div
                className="pointer-events-none h-full w-full origin-top-left scale-[0.32]"
                style={{ width: '313%', height: '313%' }}
              >
                <MarketingSkillStackMockup embedTransparent />
              </div>
            ),
          },
          {
            title: 'Integrations',
            desc: '36+ native connections. Real OAuth actions.',
            accent: 'from-amber-500/12',
            ring: 'ring-amber-500/15',
            border: 'border-amber-500/15',
            iconBg: 'bg-amber-500/15 text-amber-400',
            icon: Plug,
            mockup: (
              <div className="pointer-events-none h-full w-full">
                <IntegrationsHeroMockup embedTransparent />
              </div>
            ),
          },
        ].map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`relative flex flex-col overflow-hidden rounded-2xl border ${p.border} bg-gradient-to-br ${p.accent} via-transparent to-transparent ring-1 ${p.ring}`}
          >
            {/* Mockup preview */}
            <div className="relative h-[120px] w-full overflow-hidden bg-black/20 sm:h-[140px]">
              {p.mockup}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
            </div>

            {/* Label */}
            <div className="flex flex-col items-center px-3 py-3 text-center">
              <div
                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${p.iconBg}`}
              >
                <p.icon size={15} />
              </div>
              <h3 className="text-sm font-bold text-white">{p.title}</h3>
              <p className="mt-1.5 text-[10px] leading-snug text-white/45">{p.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 7: The Brain ──────────────────────────────────────────────────────

function SlideBrain() {
  return (
    <Slide className="!px-4 !py-6">
      <SlideLabel>The Brain</SlideLabel>
      <SlideTitle>
        <span className="gradient-text">3 LAYERS</span> OF COMPOUNDING MEMORY
      </SlideTitle>
      <SlideSub>Gets smarter every interaction. Teach it once, it knows forever.</SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 w-full max-w-4xl"
      >
        <MarketingBrainGraphMockup />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 8: Cloud Computer ─────────────────────────────────────────────────

function SlideCloudComputer() {
  const terminalLines = [
    { text: '$ vibey agent start --mode=autonomous', color: 'text-emerald-400' },
    { text: '  ✓ Cloud instance provisioned (2 vCPU, 4GB)', color: 'text-white/50' },
    { text: '  ✓ Agent brain loaded (847 memories)', color: 'text-white/50' },
    { text: '  ✓ Skills mounted: 23 active', color: 'text-white/50' },
    { text: '  ✓ Integrations connected: Meta, Stripe, HubSpot', color: 'text-white/50' },
    { text: '  ● Running campaign: SaaS Launch Q1', color: 'text-emerald-400' },
    { text: '  → Executing: Email sequence (3/5 sent)', color: 'text-purple-400' },
    { text: '  → Monitoring: Funnel conversion rate 4.2%', color: 'text-purple-400' },
    { text: '  ↻ Next cycle in 15 minutes...', color: 'text-white/30' },
  ]

  return (
    <Slide>
      <SlideLabel>Cloud Computer</SlideLabel>
      <SlideTitle>
        DEDICATED MACHINE. <span className="gradient-text">24/7.</span>
      </SlideTitle>
      <SlideSub>
        Works while you sleep. Your agent has its own cloud computer running around the clock.
      </SlideSub>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-8 flex w-full max-w-5xl items-start justify-center gap-8"
      >
        {/* Virtual terminal */}
        <div className="flex-1 overflow-hidden rounded-xl bg-[#0d0d0f]">
          <div className="flex items-center gap-1.5 bg-white/[0.03] px-4 py-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="ml-3 text-[10px] font-medium text-white/25">
              vibey-cloud — agent-runtime
            </span>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="ml-auto flex items-center gap-1.5"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] font-medium text-emerald-400/70">LIVE</span>
            </motion.div>
          </div>
          <div className="p-4 font-mono text-xs leading-relaxed">
            {terminalLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.25, duration: 0.3 }}
                className={line.color}
              >
                {line.text}
              </motion.div>
            ))}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ delay: 3.5, duration: 1, repeat: Infinity }}
              className="mt-1 inline-block h-3.5 w-1.5 bg-emerald-400/80"
            />
          </div>
        </div>

        {/* Right side: features */}
        <div className="flex w-[220px] shrink-0 flex-col gap-3">
          {[
            { icon: Clock, label: 'Always Running', desc: 'Never sleeps, never stops' },
            { icon: Shield, label: 'Isolated Environment', desc: 'Secure, dedicated compute' },
            { icon: Zap, label: 'Instant Execution', desc: 'Tasks run in real-time' },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + i * 0.2 }}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <item.icon size={14} className="text-purple-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">{item.label}</div>
                <div className="text-[10px] text-white/35">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Slide>
  )
}

// ─── Slide 9: Skills Intro ───────────────────────────────────────────────────

function SlideSkillsIntro() {
  return (
    <Slide className="!px-4 !py-6">
      <SlideLabel>Skills</SlideLabel>
      <SlideTitle>
        100+ PREMADE <span className="gradient-text">SKILLS</span>
      </SlideTitle>
      <SlideSub>
        Upload SOPs — it masters them permanently. Each agent operates with their own skills.
      </SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 w-full max-w-3xl"
      >
        <MarketingSkillLibraryMockup />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 10: Integrations Intro ────────────────────────────────────────────

function SlideIntegrationsIntro() {
  return (
    <Slide className="!px-4 !py-6">
      <SlideLabel>Integrations</SlideLabel>
      <SlideTitle>
        36+ <span className="gradient-text">NATIVE INTEGRATIONS</span>
      </SlideTitle>
      <SlideSub>
        Live, authenticated OAuth connections executing real actions on your behalf.
      </SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 w-full max-w-4xl"
      >
        <IntegrationKnowledgeIndexerMockup embedTransparent />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 11: Solution summary (pillars + bullets) ───────────────────────

function SlideSolutionSummary() {
  const recap = [
    { title: 'Brain', icon: Brain },
    { title: 'Cloud', icon: Server },
    { title: 'Skills', icon: Layers },
    { title: 'Integrations', icon: Plug },
  ]
  const bullets = [
    'Deploys live landing pages to YOUR domain',
    'Publishes ads directly to Meta with images & targeting',
    'Sends email sequences from your verified domain',
    'Captures every lead with source tracking',
    'Plans, executes, reviews, and retries — autonomously',
  ]

  return (
    <Slide className="!py-3">
      <SlideLabel>The Solution</SlideLabel>
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-lg font-bold tracking-tight text-white md:text-2xl lg:text-3xl"
      >
        HOW IT ALL <span className="gradient-text">COMES TOGETHER</span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto mt-2 max-w-xl text-center text-xs text-white/40 md:text-sm"
      >
        The same four pillars — now shipping real work. Raw inputs in; structured execution out.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.55 }}
        className="mt-5 flex flex-wrap items-center justify-center gap-5 md:gap-10"
      >
        {recap.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.45 + i * 0.12,
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 md:h-11 md:w-11">
              <p.icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/45">
              {p.title}
            </span>
          </motion.div>
        ))}
      </motion.div>

      <div className="mx-auto mt-5 w-full max-w-4xl space-y-2">
        {bullets.map((bullet, i) => (
          <motion.div
            key={bullet}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.65 + i * 0.16,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex items-start gap-3"
          >
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <span className="font-[family-name:var(--font-site-headline)] text-sm font-bold leading-snug tracking-tight text-white md:text-base lg:text-lg">
              {bullet}
            </span>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 12: Team scatter → Organized workforce (two steps, one mounted slide) ─────────

function SlideTeamToOrgTransition({ phase }: { phase: 0 | 1 }) {
  const [teamHiredOut, setTeamHiredOut] = useState(false)

  useEffect(() => {
    if (phase === 0) setTeamHiredOut(false)
  }, [phase])

  const BASE_ROLES: { roleKey: string; jobTitle: string }[] = [
    { roleKey: 'analyst', jobTitle: 'Bookkeeper' },
    { roleKey: 'designer', jobTitle: 'Customer Support' },
    { roleKey: 'pm_marketing', jobTitle: 'Social Media Manager' },
    { roleKey: 'copywriter', jobTitle: 'Content Researcher' },
  ]

  const HIRE_ROLES: { id: string; roleKey: string; jobTitle: string; displayName?: string }[] = [
    { id: 'h1', roleKey: 'pm_operations', jobTitle: 'Chief Operating Officer' },
    { id: 'h2', roleKey: 'pm_product', jobTitle: 'Chief Product Officer' },
    { id: 'h3', roleKey: 'developer', jobTitle: 'VP Engineering' },
    { id: 'h4', roleKey: 'automation_integrations_engineer', jobTitle: 'Head of Integrations' },
    { id: 'h5', roleKey: 'analyst', jobTitle: 'Strategic Finance Lead', displayName: 'Soren' },
    { id: 'h6', roleKey: 'copywriter', jobTitle: 'Head of Partnerships', displayName: 'Priya' },
    { id: 'h7', roleKey: 'designer', jobTitle: 'Creative Director', displayName: 'Avery' },
  ]

  const baseAgents = BASE_ROLES.map((row) => {
    const a = agents.find((x) => x.role_key === row.roleKey)!
    return { ...a, jobTitle: row.jobTitle, slotId: row.roleKey }
  })

  const hireAgents = HIRE_ROLES.map((row) => {
    const a = agents.find((x) => x.role_key === row.roleKey)!
    const displayName = row.displayName ?? a.default_name
    return { ...a, default_name: displayName, jobTitle: row.jobTitle, slotId: row.id }
  })

  /** HIRED_ORG_ORDER mixes hire slots (h1…) with base IC slots (analyst, designer, …). */
  const orgRowBySlotId = (slotId: string) =>
    hireAgents.find((h) => h.slotId === slotId) ?? baseAgents.find((b) => b.slotId === slotId)

  /** When hired: exec row under CEO → IC / leads under the right exec (proper reporting). Order matches layout map. */
  const HIRED_POS: Record<string, { x: number; y: number }> = {
    h1: { x: -300, y: 46 },
    h2: { x: 0, y: 46 },
    h3: { x: 300, y: 46 },
    analyst: { x: -410, y: 138 },
    designer: { x: -268, y: 138 },
    h5: { x: -126, y: 138 },
    pm_marketing: { x: 38, y: 138 },
    copywriter: { x: 168, y: 138 },
    h6: { x: 298, y: 138 },
    h7: { x: 438, y: 138 },
    h4: { x: 300, y: 228 },
  }

  const HIRED_ORG_ORDER = [
    'h1',
    'h2',
    'h3',
    'analyst',
    'designer',
    'h5',
    'pm_marketing',
    'copywriter',
    'h6',
    'h7',
    'h4',
  ] as const

  const hirePortraitMap = pickUniqueOrgPortraits(
    HIRED_ORG_ORDER.map((slotId) => {
      const row = orgRowBySlotId(slotId)!
      return { slotId, roleKey: row.role_key }
    }),
  )

  const orgAgentsHired = HIRED_ORG_ORDER.map((slotId) => {
    const row = orgRowBySlotId(slotId)!
    const pos = HIRED_POS[slotId]!
    const portrait = hirePortraitMap.get(slotId) ?? row.image_url
    const image_url = PITCH_ORG_PORTRAIT_OVERRIDES[slotId] ?? portrait
    return { ...row, image_url, orgX: pos.x, orgY: pos.y }
  })

  const orgAgents = teamHiredOut ? orgAgentsHired : baseAgents

  const scatterPositions = [
    { x: -180, y: -100, rotate: -8 },
    { x: 170, y: -80, rotate: 12 },
    { x: -120, y: 90, rotate: 6 },
    { x: 150, y: 100, rotate: -10 },
  ]

  const baseOrgPositions = [
    { x: -200, y: 54 },
    { x: -68, y: 54 },
    { x: 68, y: 54 },
    { x: 200, y: 54 },
  ]

  const orgEdgesHired: { from: string; to: string }[] = [
    { from: 'ceo', to: 'h1' },
    { from: 'ceo', to: 'h2' },
    { from: 'ceo', to: 'h3' },
    { from: 'h1', to: 'analyst' },
    { from: 'h1', to: 'designer' },
    { from: 'h1', to: 'h5' },
    { from: 'h2', to: 'pm_marketing' },
    { from: 'h2', to: 'copywriter' },
    { from: 'h2', to: 'h6' },
    { from: 'h2', to: 'h7' },
    { from: 'h3', to: 'h4' },
  ]

  const isOrg = phase === 1

  return (
    <Slide className={`!py-4 ${isOrg ? '!items-stretch !justify-between' : ''}`}>
      <div className="relative min-h-[8rem] w-full shrink-0">
        <AnimatePresence mode="wait">
          {phase === 0 ? (
            <motion.div
              key="team-copy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="text-center"
            >
              <h2 className="max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
                YOU DON&apos;T JUST GET ONE.
                <br />
                <span className="gradient-text">YOU GET AN ENTIRE TEAM.</span>
              </h2>
              <p className="mt-3 text-sm text-white/40">
                20+ specialist agents. Each with their own brain, skills, tools, and expertise.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="org-copy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="text-center"
            >
              <SlideLabel>The Organized Workforce</SlideLabel>
              <SlideTitle>
                AN <span className="gradient-text">ORGANIZED WORKFORCE</span>
              </SlideTitle>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className={`relative mt-4 flex w-full max-w-[min(1120px,100%)] items-center justify-center transition-[height,min-height] duration-500 ease-out ${
          isOrg
            ? teamHiredOut
              ? 'h-[min(500px,58vh)] min-h-[460px] flex-1'
              : 'min-h-[280px] flex-1'
            : 'h-[280px]'
        }`}
      >
        <motion.div
          initial={isOrg ? false : { opacity: 0, scale: 0 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: isOrg ? (teamHiredOut ? -78 : -56) : 0,
          }}
          transition={
            isOrg
              ? { duration: 0.75, type: 'spring', stiffness: 80 }
              : { delay: 0.6, type: 'spring', stiffness: 180 }
          }
          className="absolute flex flex-col items-center gap-1"
        >
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-emerald-500/15 blur-lg" />
            <div
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-white/[0.14] to-white/[0.05] ring-2 ring-emerald-500/35"
              title="Vibey"
            >
              <img src={VIBEY_ORG_CEO_LOGO_SRC} alt="Vibey" className="h-9 w-9 object-contain" />
            </div>
          </div>
          <span className="text-xs font-semibold text-white">Vibey</span>
          <span className="text-[10px] text-emerald-400">CEO</span>
        </motion.div>

        {(isOrg ? orgAgents : baseAgents).map((agent, i) => {
          const ox =
            isOrg && teamHiredOut && 'orgX' in agent
              ? (agent as { orgX: number }).orgX
              : isOrg
                ? baseOrgPositions[i]!.x
                : scatterPositions[i]!.x
          const oy =
            isOrg && teamHiredOut && 'orgY' in agent
              ? (agent as { orgY: number }).orgY
              : isOrg
                ? baseOrgPositions[i]!.y
                : scatterPositions[i]!.y
          const isNewHireCard = Boolean(isOrg && teamHiredOut && i >= 3)
          return (
            <motion.div
              key={agent.slotId}
              initial={
                isOrg
                  ? isNewHireCard
                    ? { opacity: 0, scale: 0.2 }
                    : false
                  : { opacity: 0, scale: 0 }
              }
              animate={{
                opacity: 1,
                scale: 1,
                x: ox,
                y: oy,
                rotate: isOrg ? 0 : scatterPositions[i]!.rotate,
              }}
              transition={
                isOrg
                  ? {
                      duration: isNewHireCard ? 0.55 : 0.75,
                      delay: isNewHireCard ? (i - 3) * 0.06 : i * 0.08,
                      type: 'spring',
                      stiffness: 80,
                      damping: 15,
                    }
                  : { delay: 0.9 + i * 0.15, type: 'spring', stiffness: 120, damping: 12 }
              }
              className="absolute flex w-[min(148px,26vw)] max-w-[148px] flex-col items-center gap-0.5 sm:w-[min(152px,22vw)] sm:max-w-[152px]"
            >
              <motion.div
                animate={isOrg ? { y: 0 } : { y: [0, -5, 0] }}
                transition={
                  isOrg ? { duration: 0.3 } : { duration: 2.5 + i * 0.4, repeat: Infinity }
                }
              >
                <AgentAvatar src={agent.image_url} name={agent.default_name} size={50} />
              </motion.div>
              {isOrg ? (
                <>
                  <span className="text-center text-[7px] font-semibold uppercase leading-snug tracking-wide text-emerald-400/95 sm:text-[8px] md:text-[9px]">
                    {agent.jobTitle}
                  </span>
                  <span className="text-center text-[9px] text-white/45 sm:text-[10px]">
                    {agent.default_name}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-medium text-white/60">{agent.default_name}</span>
              )}
            </motion.div>
          )
        })}

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ overflow: 'visible' }}
          viewBox="0 0 1000 400"
          preserveAspectRatio="xMidYMid meet"
        >
          {baseAgents.map((agent, i) => (
            <motion.line
              key={`sc-${agent.slotId}`}
              x1="500"
              y1="200"
              x2={500 + scatterPositions[i]!.x}
              y2={200 + scatterPositions[i]!.y}
              stroke="rgba(52,211,153,0.12)"
              strokeWidth="1"
              strokeDasharray="4 4"
              vectorEffect="non-scaling-stroke"
              initial={{ opacity: 0 }}
              animate={{ opacity: isOrg ? 0 : 1 }}
              transition={{ duration: 0.25 }}
            />
          ))}
          {isOrg && teamHiredOut && (
            <g>
              {orgEdgesHired.map((e, ei) => {
                const CEO = { x: 0, y: -86 }
                const pos: Record<string, { x: number; y: number }> = { ceo: CEO, ...HIRED_POS }
                const a = pos[e.from]
                const b = pos[e.to]
                if (!a || !b) return null
                return (
                  <motion.path
                    key={`${e.from}-${e.to}`}
                    d={orgChartEdgePath(a.x, a.y, b.x, b.y)}
                    fill="none"
                    stroke="rgba(168,85,247,0.45)"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.35, delay: 0.12 + ei * 0.04 }}
                  />
                )
              })}
            </g>
          )}
          {isOrg &&
            !teamHiredOut &&
            baseAgents.map((agent, i) => (
              <motion.line
                key={`org-flat-${agent.slotId}`}
                x1="500"
                y1="142"
                x2={500 + baseOrgPositions[i]!.x}
                y2={200 + baseOrgPositions[i]!.y - 10}
                stroke="rgba(168,85,247,0.35)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.05 }}
              />
            ))}
        </svg>
      </div>

      <AnimatePresence>
        {isOrg && (
          <motion.div
            key="org-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-auto flex w-full max-w-4xl shrink-0 flex-col items-center gap-5 px-2 pb-1"
          >
            <div className="flex w-full max-w-3xl flex-col items-center gap-3">
              <p className="text-center text-sm leading-relaxed text-white/55 md:text-base">
                Give them your SOPs and the end result you want — they work for you.
              </p>
              <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:flex-wrap sm:justify-center">
                <span className="text-center text-sm text-white/40">
                  Need new team members? <span className="text-white/55">Hire more.</span>
                </span>
                <button
                  type="button"
                  onClick={() => setTeamHiredOut(true)}
                  disabled={teamHiredOut}
                  className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:border-emerald-400/50 hover:bg-emerald-500/20 disabled:cursor-default disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35"
                >
                  {teamHiredOut ? 'Hired' : 'Hire'}
                </button>
              </div>
            </div>
            <p className="text-center font-[family-name:var(--font-site-headline)] text-xl font-semibold leading-snug tracking-tight text-white/90 md:text-2xl lg:text-3xl">
              That&apos;s exactly what Vibey does — with AI agents instead of only employees.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Slide>
  )
}

const TeamOrgPhaseContext = createContext<{ phase: 0 | 1 }>({ phase: 0 })

function SlideTeamOrgDeck() {
  const { phase } = useContext(TeamOrgPhaseContext)
  return <SlideTeamToOrgTransition phase={phase} />
}

// ─── Slide 13: HR ────────────────────────────────────────────────────────────

function SlideHR() {
  return (
    <Slide className="!px-4 !py-4">
      <SlideLabel>Organizational HR</SlideLabel>
      <SlideTitle>EVERY ORG HAS ITS OWN HR</SlideTitle>
      <SlideSub>
        Hire, train, and trust. Your HR agent analyzes gaps and recommends specialists.
      </SlideSub>
      <div className="mt-6 grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full"
        >
          <MarketingHrLibraryMockup data={HR_SHOWCASE_FALLBACK} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full"
        >
          <MarketingMissionActivityScoreMockup />
        </motion.div>
      </div>
    </Slide>
  )
}

// ─── Slide 14: Skills 100+ Premade (library only) ───────────────────────────

// ─── Slide 15: Import SOP + create / chat (upload left, builder right) ───────

type SkillsPremadePhase = 'drag' | 'upload'

const SKILL_IMPORT_STATUS_LINES = [
  'Parsing document structure…',
  'Mapping workflows to the skill graph…',
  'Compiling 100+ premade plays…',
] as const

function PitchSkillImportLoadingPanel({ compact = false }: { compact?: boolean }) {
  const [lineIdx, setLineIdx] = useState(0)

  useEffect(() => {
    const t = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % SKILL_IMPORT_STATUS_LINES.length)
    }, 650)
    return () => window.clearInterval(t)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`mx-auto w-full rounded-xl bg-[rgba(12,12,16,0.96)] backdrop-blur-xl ${
        compact ? 'max-w-full px-4 py-3' : 'max-w-md px-5 py-4'
      }`}
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90">
            Importing to skill engine
          </span>
        </div>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/35" />
      </div>
      <div className="mt-4 space-y-3">
        <p className="text-[11px] font-medium leading-relaxed text-white/55">
          Same ingestion pipeline as Brain memories — structured docs become executable skills.
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.1, ease: [0.22, 0.61, 0.36, 1] }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-white/35">
          <span>Confidence</span>
          <span className="font-semibold text-emerald-400/90">Building…</span>
        </div>
        <motion.p
          key={lineIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-[11px] text-white/45"
        >
          {SKILL_IMPORT_STATUS_LINES[lineIdx]}
        </motion.p>
      </div>
    </motion.div>
  )
}

function SlideSkills() {
  return (
    <Slide className="!justify-start !px-4 !py-6 md:!px-10">
      <SlideLabel>SOPs = Skills</SlideLabel>
      <SlideTitle>100+ PREMADE SKILLS</SlideTitle>
      <SlideSub>
        A built-in library of marketing and ops plays — funnels, ads, CRM, content, and more. Pick
        one and deploy, or start from scratch on the next slide.
      </SlideSub>

      <div className="mt-5 grid w-full max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[minmax(220px,300px)_1fr] lg:gap-10">
        <div className="flex max-h-[min(520px,54vh)] flex-col rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            In the library
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Sample of skills that ship in the box — 100+ total across acquisition, retention, and
            ops.
          </p>
          <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1 text-left [scrollbar-width:thin]">
            {MARKETING_PREMADE_SKILL_LIBRARY_NAMES.map((name, i) => (
              <motion.li
                key={name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.02 }}
                className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug text-white/75"
              >
                <span
                  className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/85"
                  aria-hidden
                />
                <span>{name}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="relative min-h-[min(480px,48vh)] w-full min-w-0">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 lg:text-left">
            Pre-built library
          </p>
          <div className="relative min-h-[460px] w-full md:origin-top md:scale-[0.92]">
            <MarketingSkillStackMockup embedTransparent />
          </div>
        </div>
      </div>
    </Slide>
  )
}

// ─── Slide 15: Import SOP + create (upload left, chat right) ─────────────────

function SlideSkillsCreate() {
  const [phase, setPhase] = useState<SkillsPremadePhase>('drag')
  const isDragging = phase === 'drag'
  const showUpload = phase === 'upload'

  useEffect(() => {
    const toUpload = window.setTimeout(() => setPhase('upload'), 2300)
    return () => window.clearTimeout(toUpload)
  }, [])

  return (
    <Slide className="!justify-start !px-4 !py-6 md:!px-10">
      <SlideLabel>Custom Skills</SlideLabel>
      <SlideTitle>
        CREATE YOUR OWN <span className="gradient-text">SKILLS</span>
      </SlideTitle>
      <SlideSub>
        Drop a doc or SOP on the left — ingestion runs into the skill engine. On the right, describe
        and chat until the skill is exactly how you want it. Then it stays in your library.
      </SlideSub>

      <div className="mt-6 grid w-full max-w-7xl grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Import
            </p>
            <p className="mt-1 text-xs text-white/45">
              Google Drive, PDF, or video — same pipeline as Brain memories; structured docs become
              executable skills.
            </p>
          </div>

          <div className="relative mx-auto aspect-[4/3] w-full max-w-lg md:mx-0">
            <div className="absolute inset-0 rounded-2xl bg-emerald-500/[0.04]" />
            <div className="border-white/18 pointer-events-none absolute inset-[7%] rounded-xl border border-dashed bg-white/[0.02]" />
            <p className="pointer-events-none absolute bottom-[10%] left-0 right-0 text-center text-[10px] text-white/30">
              {isDragging ? 'Dragging into workspace…' : 'Dropped — ingesting below'}
            </p>

            <motion.div
              className="border-white/12 absolute z-20 flex w-[min(260px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 items-center gap-3 rounded-xl border bg-[rgba(18,18,22,0.95)] px-3.5 py-2.5 shadow-[0_14px_44px_rgba(0,0,0,0.5)]"
              initial={false}
              animate={
                isDragging
                  ? { left: ['14%', '50%'], top: ['22%', '50%'], opacity: 1, scale: 1 }
                  : { left: '50%', top: '50%', opacity: 1, scale: 1 }
              }
              transition={
                isDragging
                  ? { duration: 2.15, ease: [0.22, 1, 0.36, 1], times: [0, 1] }
                  : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <div className="relative flex h-11 w-9 shrink-0 items-center justify-center rounded-md bg-blue-500/20">
                <FileText className="h-5 w-5 text-blue-300" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 text-left">
                <div className="truncate text-xs font-semibold text-white">
                  Q4_GTM_Playbook.gdoc
                </div>
                <div className="text-[10px] text-white/40">Google Docs · Shared with workspace</div>
              </div>
              {!isDragging && (
                <CheckCircle2
                  className="absolute -right-1 -top-1 h-5 w-5 text-emerald-400 drop-shadow-md"
                  aria-hidden
                />
              )}
            </motion.div>

            <motion.div
              className="pointer-events-none absolute z-30 -translate-x-1 -translate-y-1 text-white"
              initial={false}
              animate={
                isDragging
                  ? { left: ['22%', '56%'], top: ['30%', '56%'], opacity: 1 }
                  : { left: '56%', top: '56%', opacity: 1 }
              }
              transition={
                isDragging
                  ? { duration: 2.15, ease: [0.22, 1, 0.36, 1], times: [0, 1] }
                  : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <MousePointer2
                className="h-7 w-7 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
                fill="white"
                stroke="#0a0a0b"
                strokeWidth={1.25}
              />
            </motion.div>
          </div>

          <AnimatePresence>
            {showUpload && (
              <motion.div
                key="upload-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <PitchSkillImportLoadingPanel compact />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Chat to build
            </p>
            <p className="mt-1 text-xs text-white/45">
              Natural-language skill spec — refine in thread until it saves to your workspace.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="w-full min-w-0"
          >
            <MarketingSkillBuilderMockup />
          </motion.div>
        </div>
      </div>
    </Slide>
  )
}

// ─── Slide 17: Pre-loaded & Hireable ─────────────────────────────────────────

function SlidePreloaded() {
  return (
    <Slide className="!px-4 !py-4">
      <SlideLabel>Your Team</SlideLabel>
      <SlideTitle>PRE-LOADED &amp; HIREABLE</SlideTitle>
      <SlideSub>20+ agents ready day one. Or hire your own — just describe the role.</SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 w-full max-w-4xl"
      >
        <AgentLibraryCarousel agents={agents} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-4 px-4 py-2.5 text-center text-sm text-emerald-400"
      >
        Describe a role. HR builds a custom agent — brain, skills, authority — tailored to your
        business.
      </motion.div>
    </Slide>
  )
}

// ─── Slide 18: Autopilot ─────────────────────────────────────────────────────

function SlideAutopilot() {
  return (
    <Slide className="!px-2 !py-4">
      <SlideLabel>Autonomous Operations</SlideLabel>
      <SlideTitle>AUTOPILOT</SlideTitle>
      <SlideSub>Define your North Star. Agents run autonomously toward it.</SlideSub>
      <div className="mt-4 grid w-full max-w-6xl gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="w-full"
        >
          <MarketingNorthstarGuardrailMockup />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="w-full"
        >
          <MarketingDailyDigestMockup />
        </motion.div>
      </div>
    </Slide>
  )
}

// ─── Slide 19: How to Use Vibey (overview) ───────────────────────────────────

function SlideTwoWaysWork() {
  const [zoom, setZoom] = useState<'none' | 'studio' | 'missions'>('none')
  const [glowStudio, setGlowStudio] = useState(false)
  const [glowMissions, setGlowMissions] = useState(false)
  const [flashTick, setFlashTick] = useState(0)
  const flashCloseTarget = useRef<'studio' | 'missions'>('studio')

  const handleFlashComplete = () => {
    setZoom('none')
    if (flashCloseTarget.current === 'studio') {
      setGlowStudio(true)
      window.setTimeout(() => setGlowStudio(false), 1300)
    } else {
      setGlowMissions(true)
      window.setTimeout(() => setGlowMissions(false), 1300)
    }
  }

  const requestCloseZoom = (which: 'studio' | 'missions') => {
    flashCloseTarget.current = which
    setFlashTick((t) => t + 1)
  }

  return (
    <Slide className="relative !py-4">
      <SlideLabel>How It Works</SlideLabel>
      <SlideTitle>TWO WAYS TO WORK WITH VIBEY</SlideTitle>

      <div className="mx-auto mt-6 grid w-full max-w-6xl gap-8 md:grid-cols-2 md:gap-10">
        <motion.div
          initial={{ opacity: 0, x: -24, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.35, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={`group flex min-w-0 cursor-pointer flex-col items-center gap-3 rounded-2xl p-3 outline-none transition-shadow duration-500 md:items-stretch ${
            glowStudio ? 'shadow-[0_0_56px_rgba(52,211,153,0.28)]' : ''
          } focus-visible:ring-2 focus-visible:ring-emerald-500/50`}
          role="button"
          tabIndex={0}
          onClick={() => setZoom('studio')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setZoom('studio')
            }
          }}
          aria-label="Open Studio preview"
        >
          <div className="w-full text-center">
            <h3 className="pointer-events-none font-[family-name:var(--font-site-headline)] text-2xl font-bold text-white transition-colors group-hover:text-emerald-200/95">
              STUDIO
            </h3>
            <p className="pointer-events-none mt-1 text-center text-sm text-white/50">
              Chat with your AI team. Artifacts update live.
            </p>
          </div>
          <div className="pointer-events-none w-full">
            <ScaledPitchMockup
              heightClass="min-h-[min(400px,44vh)] h-[min(400px,44vh)]"
              sizePercent={200}
              scale={0.48}
              clip={false}
            >
              <MarketingCapabilitiesGtmMockup embedTransparent />
            </ScaledPitchMockup>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24, scale: 0.94 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ delay: 0.48, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={`group flex min-w-0 cursor-pointer flex-col items-center gap-3 rounded-2xl p-3 outline-none transition-shadow duration-500 md:items-stretch ${
            glowMissions ? 'shadow-[0_0_56px_rgba(168,85,247,0.3)]' : ''
          } focus-visible:ring-2 focus-visible:ring-purple-500/50`}
          role="button"
          tabIndex={0}
          onClick={() => setZoom('missions')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setZoom('missions')
            }
          }}
          aria-label="Open Missions preview"
        >
          <div className="w-full text-center">
            <h3 className="pointer-events-none font-[family-name:var(--font-site-headline)] text-2xl font-bold text-white transition-colors group-hover:text-purple-200/95">
              MISSIONS
            </h3>
            <p className="pointer-events-none mt-1 text-center text-sm text-white/50">
              Describe an idea. They plan, execute, and deliver.
            </p>
          </div>
          <div className="pointer-events-none w-full">
            <ScaledPitchMockup
              heightClass="min-h-[min(400px,44vh)] h-[min(400px,44vh)]"
              sizePercent={200}
              scale={0.48}
              clip={false}
            >
              <MarketingMissionExecutionMockup />
            </ScaledPitchMockup>
          </div>
        </motion.div>
      </div>

      <PitchFlashBurst tick={flashTick} onComplete={handleFlashComplete} />

      <AnimatePresence>
        {zoom === 'studio' && (
          <motion.div
            key="zoom-studio"
            role="dialog"
            aria-modal
            aria-label="Studio preview"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: '50% 45%' }}
            className="fixed inset-0 z-[10000] flex flex-col bg-[#09090b] px-4 pb-6 pt-16 md:px-10 md:pt-20"
          >
            <div className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/80">
                  Studio
                </p>
                <p className="text-sm text-white/50">
                  Full preview — artifacts update as you chat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => requestCloseZoom('studio')}
                className="rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
              >
                Continue
              </button>
            </div>
            <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto">
              <MarketingCapabilitiesGtmMockup embedTransparent />
            </div>
          </motion.div>
        )}
        {zoom === 'missions' && (
          <motion.div
            key="zoom-missions"
            role="dialog"
            aria-modal
            aria-label="Missions preview"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: '50% 45%' }}
            className="fixed inset-0 z-[10000] flex flex-col bg-[#09090b] px-4 pb-6 pt-16 md:px-10 md:pt-20"
          >
            <div className="mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400/90">
                  Missions
                </p>
                <p className="text-sm text-white/50">
                  CEO agent plans, delegates, and ships execution.
                </p>
              </div>
              <button
                type="button"
                onClick={() => requestCloseZoom('missions')}
                className="rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
              >
                Continue
              </button>
            </div>
            <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto">
              <MarketingMissionExecutionMockup />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Slide>
  )
}

// ─── Slide 19: Studio ────────────────────────────────────────────────────────

function SlideStudio() {
  return (
    <Slide className="!px-2 !py-4">
      <SlideLabel>Studio</SlideLabel>
      <SlideTitle>THE STUDIO</SlideTitle>
      <SlideSub>Chat on the left. Artifacts on the right. No forms, just talk.</SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-6 w-full max-w-6xl"
      >
        <AppMockup />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 21: Missions ──────────────────────────────────────────────────────

function SlideMissions() {
  return (
    <Slide className="!px-4 !py-6">
      <SlideLabel>Missions</SlideLabel>
      <SlideTitle>DELEGATION AT SCALE</SlideTitle>
      <SlideSub>
        Brief it. The CEO agent plans, delegates, and manages execution autonomously.
      </SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 w-full max-w-4xl"
      >
        <MarketingMissionExecutionMockup />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 22: Communications ────────────────────────────────────────────────

function SlideComms() {
  const channels = [
    {
      iconSrc: null,
      iconFallback: <Globe size={20} className="text-emerald-400" />,
      label: 'vibey.im',
      desc: 'Full Studio experience in your browser. Real-time collaboration with your AI team.',
      delay: 0.3,
      comingSoon: false,
    },
    {
      iconSrc: '/Integrations/Slack.png',
      iconFallback: null,
      label: 'Slack',
      desc: 'Agents live in your channels. Pull info, review data, execute tasks — from tools your team already uses.',
      delay: 0.45,
      comingSoon: false,
    },
    {
      iconSrc: null,
      iconFallback: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#29B6F6">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      ),
      label: 'Telegram',
      desc: 'Message your agents from anywhere. Brian Ron Mark even uses it as a support agent for his clients.',
      delay: 0.6,
      comingSoon: false,
    },
    {
      iconSrc: null,
      iconFallback: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      label: 'WhatsApp',
      desc: 'Bring your AI team to WhatsApp conversations.',
      delay: 0.75,
      comingSoon: true,
    },
  ]

  return (
    <Slide className="!py-4">
      <SlideLabel>Communications</SlideLabel>
      <SlideTitle>AGENTS COME TO YOU</SlideTitle>
      <div className="mt-6 grid w-full max-w-5xl gap-4 md:grid-cols-2">
        <div className="space-y-3">
          {channels.map((ch) => (
            <motion.div
              key={ch.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: ch.delay }}
              className={`rounded-2xl p-4 ${ch.comingSoon ? 'opacity-50' : ''}`}
            >
              <div className="mb-2 flex items-center gap-2">
                {ch.iconSrc ? (
                  <img src={ch.iconSrc} alt={ch.label} className="h-6 w-6 rounded" />
                ) : (
                  ch.iconFallback
                )}
                <span className="text-sm font-semibold text-white">{ch.label}</span>
                {ch.comingSoon && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/40">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40">{ch.desc}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full"
        >
          <MarketingDailyDigestMockup />
        </motion.div>
      </div>
    </Slide>
  )
}

// ─── Slide 23: Two Ways It Works ─────────────────────────────────────────────

function SlideTwoWaysWorks() {
  const [zoom, setZoom] = useState<'none' | 'integrations' | 'capabilities'>('none')
  const [glowInt, setGlowInt] = useState(false)
  const [glowCap, setGlowCap] = useState(false)
  const [flashTick, setFlashTick] = useState(0)
  const flashCloseTarget = useRef<'integrations' | 'capabilities'>('integrations')

  const integrationsSorted = useMemo(
    () => [...INTEGRATIONS_HERO_LIBRARY].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

  const handleFlashComplete = () => {
    setZoom('none')
    if (flashCloseTarget.current === 'integrations') {
      setGlowInt(true)
      window.setTimeout(() => setGlowInt(false), 1300)
    } else {
      setGlowCap(true)
      window.setTimeout(() => setGlowCap(false), 1300)
    }
  }

  const requestCloseZoom = (which: 'integrations' | 'capabilities') => {
    flashCloseTarget.current = which
    setFlashTick((t) => t + 1)
  }

  return (
    <Slide className="relative !py-4">
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-4 inline-block rounded-full bg-white/[0.06] px-4 py-1.5 text-[11px] font-semibold tracking-wide text-white/50"
      >
        The Two Core Power Features
      </motion.span>
      <SlideTitle>INTEGRATIONS + CAPABILITIES</SlideTitle>

      <div className="mx-auto mt-6 grid w-full max-w-6xl gap-8 md:grid-cols-2 md:gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className={`flex min-w-0 flex-col items-center gap-3 rounded-2xl p-3 transition-shadow duration-500 md:items-stretch ${
            glowInt ? 'shadow-[0_0_56px_rgba(168,85,247,0.22)]' : ''
          }`}
        >
          <h3 className="text-center font-[family-name:var(--font-site-headline)] text-2xl font-bold text-white">
            36+ INTEGRATIONS
          </h3>
          <p className="text-center text-sm text-white/50">
            Live OAuth connections to every tool your business runs on.
          </p>
          <button
            type="button"
            onClick={() => setZoom('integrations')}
            className="mx-auto rounded-full border border-purple-500/25 bg-purple-500/[0.08] px-4 py-1.5 text-[11px] font-semibold text-purple-200/90 transition-colors hover:border-purple-400/40 hover:bg-purple-500/[0.14]"
          >
            30-second iterations
          </button>
          <div className="mt-1 grid w-full min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-4">
            <div className="relative h-[min(360px,42vh)] min-h-0 w-full overflow-hidden rounded-xl border border-white/[0.07] md:h-[min(400px,44vh)]">
              <IntegrationsHeroMockup embedTransparent />
            </div>
            <div className="flex min-h-0 flex-col rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 md:h-[min(400px,44vh)] md:max-h-[min(400px,44vh)]">
              <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                All integrations
              </p>
              <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1 text-left [scrollbar-width:thin]">
                {integrationsSorted.map((int, i) => (
                  <motion.li
                    key={int.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.015 }}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-white/80"
                  >
                    <span className="h-1 w-1 shrink-0 rounded-full bg-purple-400/75" aria-hidden />
                    <span>{int.name}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.58 }}
          className={`flex min-w-0 flex-col items-center gap-3 rounded-2xl p-3 transition-shadow duration-500 md:items-stretch ${
            glowCap ? 'shadow-[0_0_56px_rgba(52,211,153,0.24)]' : ''
          }`}
        >
          <h3 className="text-center font-[family-name:var(--font-site-headline)] text-2xl font-bold text-white">
            UNLIMITED CAPABILITIES
          </h3>
          <p className="text-center text-sm text-white/50">
            From funnels to video editing — real, deployable output.
          </p>
          <button
            type="button"
            onClick={() => setZoom('capabilities')}
            className="mx-auto rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-1.5 text-[11px] font-semibold text-emerald-200/90 transition-colors hover:border-emerald-400/40 hover:bg-emerald-500/[0.14]"
          >
            Launched campaigns
          </button>
          <ScaledPitchMockup
            heightClass="min-h-[min(400px,44vh)] h-[min(400px,44vh)]"
            sizePercent={200}
            scale={0.48}
            clip={false}
          >
            <MarketingCapabilitiesMediaMockup embedTransparent />
          </ScaledPitchMockup>
        </motion.div>
      </div>

      <PitchFlashBurst tick={flashTick} onComplete={handleFlashComplete} />

      <AnimatePresence>
        {zoom === 'integrations' && (
          <motion.div
            key="zoom-int"
            role="dialog"
            aria-modal
            aria-label="Integrations preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="fixed inset-0 z-[10000] flex flex-col bg-[#09090b] px-4 pb-6 pt-16 md:px-10 md:pt-20"
          >
            <div className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400/85">
                  Integrations
                </p>
                <p className="text-sm text-white/50">
                  Live tool routing — OAuth, webhooks, and real actions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => requestCloseZoom('integrations')}
                className="rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
              >
                Continue
              </button>
            </div>
            <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-2 lg:gap-8">
              <div className="relative min-h-[280px] overflow-hidden rounded-xl border border-white/[0.08] lg:min-h-0">
                <IntegrationsHeroMockup embedTransparent />
              </div>
              <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                  All integrations
                </p>
                <ul className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-left [scrollbar-width:thin]">
                  {integrationsSorted.map((int) => (
                    <li
                      key={int.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-white/85"
                    >
                      <span
                        className="h-1 w-1 shrink-0 rounded-full bg-purple-400/75"
                        aria-hidden
                      />
                      <span>{int.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
        {zoom === 'capabilities' && (
          <motion.div
            key="zoom-cap"
            role="dialog"
            aria-modal
            aria-label="Capabilities preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="fixed inset-0 z-[10000] flex flex-col bg-[#09090b] px-4 pb-6 pt-16 md:px-10 md:pt-20"
          >
            <div className="mx-auto flex w-full max-w-6xl shrink-0 items-center justify-between gap-4 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/85">
                  Capabilities
                </p>
                <p className="text-sm text-white/50">
                  Media, audio, and deployable outputs on your cloud machine.
                </p>
              </div>
              <button
                type="button"
                onClick={() => requestCloseZoom('capabilities')}
                className="rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"
              >
                Continue
              </button>
            </div>
            <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-y-auto">
              <MarketingCapabilitiesMediaMockup embedTransparent />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Slide>
  )
}

// ─── Slide 24: Integrations ──────────────────────────────────────────────────

function SlideIntegrations() {
  return (
    <Slide className="!px-2 !py-4">
      <SlideLabel>Integrations</SlideLabel>
      <SlideTitle>
        36+ <span className="gradient-text">NATIVE INTEGRATIONS</span>
      </SlideTitle>
      <SlideSub>
        Authorize once. Vibey pulls context, pushes updates, and respects workspace boundaries.
      </SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-6 w-full max-w-5xl flex-1"
      >
        <IntegrationsHeroMockup embedTransparent />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 24: Capabilities GTM (after integrations hero; cap overview removed) ─

function SlideCapGTM() {
  return (
    <Slide className="!px-4 !py-6">
      <SlideLabel>Capabilities</SlideLabel>
      <SlideTitle>
        MARKETING &amp; <span className="gradient-text">GO-TO-MARKET</span>
      </SlideTitle>
      <SlideSub>
        Funnels, ads, email sequences, landing pages — deployed live to your domains.
      </SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 w-full max-w-4xl"
      >
        <MarketingCapabilitiesGtmMockup />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 27: Capabilities Media ────────────────────────────────────────────

function SlideCapMedia() {
  return (
    <Slide className="!px-4 !py-6">
      <SlideLabel>Capabilities</SlideLabel>
      <SlideTitle>
        MEDIA &amp; <span className="gradient-text">PRODUCTION</span>
      </SlideTitle>
      <SlideSub>Video generation, editing, images, and audio — production-ready assets.</SlideSub>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-6 w-full max-w-4xl"
      >
        <MarketingCapabilitiesMediaMockup />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 28: Capabilities Ops ──────────────────────────────────────────────

function SlideCapOps() {
  return (
    <Slide>
      <SlideLabel>Capabilities</SlideLabel>
      <SlideTitle>
        BUSINESS OPERATIONS &amp; <span className="gradient-text">BEYOND</span>
      </SlideTitle>
      <SlideSub>
        Financial planning, presentations, coding, custom apps — your blank canvas.
      </SlideSub>
      <div className="mt-8 grid w-full max-w-4xl grid-cols-2 gap-6 md:grid-cols-3">
        {[
          {
            label: 'Financial Planning',
            desc: 'Generate reports and dashboards',
            icon: TrendingUp,
          },
          { label: 'Presentations', desc: 'PDF/PPTX with branded design', icon: Presentation },
          { label: 'Coding & Apps', desc: 'Built and deployed to URL', icon: Code2 },
          { label: 'Social Content', desc: 'Scheduled to LinkedIn and Instagram', icon: Share2 },
          { label: 'Video & Images', desc: 'Generated, edited, production-ready', icon: Video },
          { label: 'Chrome Extension', desc: 'Agents take actions on your accounts', icon: Globe },
        ].map((cap, i) => (
          <motion.div
            key={cap.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.12 }}
            className="flex flex-col items-center gap-2 p-4 text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <cap.icon size={20} className="text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-white">{cap.label}</div>
            <div className="text-[11px] text-white/40">{cap.desc}</div>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 27–28: Surprising use cases — intro + preview (before deep dives) ─

function SlideSurprisingUseCasesIntro() {
  return (
    <Slide className="!py-8">
      <SlideLabel>Surprising use cases</SlideLabel>
      <SlideTitle>
        THE <span className="gradient-text">PLAYBOOK</span>
        <br />
        ISN&apos;T THE WHOLE STORY
      </SlideTitle>
      <SlideSub>
        These are the use cases — but there are surprising things we&apos;ve seen our users do. For
        example:
      </SlideSub>
    </Slide>
  )
}

function SlideSurprisingUseCasesPreview() {
  const items = [
    { n: '1', line: 'Financial tracking' },
    { n: '2', line: 'Automated client onboarding' },
    { n: '3', line: 'Campaign launch (million-dollar campaign)' },
  ] as const

  return (
    <Slide className="!py-8">
      <SlideLabel>Surprising use cases</SlideLabel>
      <SlideTitle>
        THREE <span className="gradient-text">SURPRISING</span>
        <br />
        USE CASES
      </SlideTitle>
      <div className="mx-auto mt-10 flex w-full max-w-2xl flex-col gap-5">
        {items.map((item, i) => (
          <motion.div
            key={item.n}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-baseline gap-4 border-b border-white/[0.08] pb-5 last:border-0 last:pb-0"
          >
            <span className="font-[family-name:var(--font-site-headline)] text-2xl font-bold tabular-nums text-emerald-400/90 md:text-3xl">
              {item.n}
            </span>
            <span className="font-[family-name:var(--font-site-headline)] text-lg font-semibold tracking-tight text-white md:text-xl">
              {item.line}
            </span>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 29: Use Case — Financial Dashboard ───────────────────────────────

function SlideUseCaseFinance() {
  const integrations = [
    { name: 'Stripe', src: '/Integrations/Stripe.png' },
    { name: 'Whop', src: '/Integrations/Whop.png' },
    { name: 'GHL', src: '/Integrations/GHL.png' },
    { name: 'Google Sheets', src: '/Integrations/GoogleSheets.png' },
    { name: 'FanBasis', src: '/Integrations/FanBasis.png' },
  ]

  const chartPoints = [20, 35, 28, 45, 38, 52, 48, 65, 58, 72, 68, 80]
  const polyline = chartPoints
    .map((y, i) => `${(i / (chartPoints.length - 1)) * 100},${100 - y}`)
    .join(' ')
  const areaPath = `0,100 ${polyline} 100,100`

  return (
    <Slide className="!py-3">
      <SlideLabel>Surprising Use Case #1</SlideLabel>
      <SlideTitle>
        FINANCIAL <span className="gradient-text">DASHBOARD</span>
      </SlideTitle>

      {/* Dashboard + Client */}
      <div className="mt-5 grid w-full max-w-5xl gap-5 md:grid-cols-[1fr_1.4fr]">
        {/* Brian profile + integrations above (blue stack for vertical balance vs dashboard) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.4 }}
          className="flex flex-col items-center"
        >
          {/* Integration logos — blue chrome, above screenshot */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mb-4 flex w-full flex-wrap items-center justify-center gap-x-1 gap-y-2 sm:gap-x-2"
          >
            {integrations.map((int, i) => (
              <motion.div
                key={int.name}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.85 + i * 0.1, type: 'spring' }}
                className="flex items-center gap-1 sm:gap-2"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/35 bg-blue-500/15 p-1 shadow-[0_0_16px_rgb(var(--accent-blue-rgb)/0.22)] sm:h-10 sm:w-10">
                  <img
                    src={int.src}
                    alt={int.name}
                    className="h-full w-full rounded object-contain"
                  />
                </div>
                {i < integrations.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.95 + i * 0.1 }}
                    className="hidden h-px w-4 origin-left bg-blue-400/45 sm:block sm:w-5"
                  />
                )}
              </motion.div>
            ))}
          </motion.div>

          <img src="/pitch/brian-mark.png" alt="Brian Ron Mark" className="w-full rounded-xl" />
          <p className="mt-2 text-center text-xs text-white/40">Brian Ron Mark • 637K followers</p>
          <p className="text-[10px] text-emerald-400">Enterprise Plan</p>
        </motion.div>

        {/* Glass-card dashboard — app style */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 1.6 }}
          className="space-y-3"
        >
          {/* Funnels card */}
          <div className="glass-card p-4" style={{ transform: 'rotate(0.5deg)' }}>
            <div className="mb-2 flex items-center gap-2">
              <Globe size={12} className="text-emerald-400" />
              <p className="text-[12px] font-bold text-white">Funnels</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'PAGE VIEWS', value: '12,490', change: '↑129%' },
                { label: 'OPT-INS', value: '2,847', change: '↑108%' },
                { label: 'CONVERSIONS', value: '1,143', change: '↑92%' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.8 + i * 0.1 }}
                >
                  <p className="text-[7px] font-semibold uppercase tracking-wider text-white/30">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-[16px] font-bold leading-none text-white">{s.value}</p>
                  <p className="mt-0.5 text-[10px] font-semibold text-emerald-400">{s.change}</p>
                </motion.div>
              ))}
            </div>
            <div className="relative mt-3 h-[50px] w-full">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="finChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(var(--accent-secondary-rgb) / 0.2)" />
                    <stop offset="100%" stopColor="rgb(var(--accent-secondary-rgb) / 0)" />
                  </linearGradient>
                </defs>
                <polygon points={areaPath} fill="url(#finChartGrad)" />
                <polyline
                  points={polyline}
                  fill="none"
                  stroke="var(--accent-secondary)"
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>

          {/* Revenue + Ads row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4" style={{ transform: 'rotate(-1deg)' }}>
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp size={12} className="text-purple-400" />
                <p className="text-[12px] font-bold text-white">Revenue</p>
              </div>
              {[
                { label: 'MRR', value: '$127K' },
                { label: 'LTV', value: '$4,290' },
                { label: 'Churn', value: '2.1%' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-0.5">
                  <span className="text-[10px] text-white/40">{row.label}</span>
                  <span className="text-[11px] font-bold text-emerald-400">{row.value}</span>
                </div>
              ))}
            </div>
            <div className="glass-card p-4" style={{ transform: 'rotate(1.5deg)' }}>
              <div className="mb-2 flex items-center gap-2">
                <Target size={12} className="text-emerald-400" />
                <p className="text-[12px] font-bold text-white">Ads</p>
              </div>
              {[
                { label: 'Impressions', value: '23.1k' },
                { label: 'Clicks', value: '1,847' },
                { label: 'Cost/lead', value: '$2.40' },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-0.5">
                  <span className="text-[10px] text-white/40">{row.label}</span>
                  <span className="text-[11px] font-bold text-purple-400">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </Slide>
  )
}

// ─── Slide 30: Use Case — ROAS.co Onboarding ────────────────────────────────

const ROAS_ONBOARDING_STEPS = [
  {
    title: 'New client hits Slack',
    did: 'Onboarding is triggered from Slack — the agent picks up the thread and starts the workflow.',
    img: '/pitch/case-study/slack-onboard.png',
  },
  {
    title: 'Strategy brief in-channel',
    did: 'Research and a concrete strategy brief are posted back in Slack for the team to review.',
    img: '/pitch/case-study/slack-strategy.png',
  },
  {
    title: 'Buyer persona document',
    did: 'A full buyer persona is generated from the brief so creative and funnel stay aligned.',
    img: '/pitch/case-study/buyer-persona.png',
  },
  {
    title: 'Funnel draft — hero & page',
    did: 'The live funnel structure and hero are drafted so stakeholders see the real experience.',
    img: '/pitch/case-study/funnel-hero.png',
  },
  {
    title: 'Funnel live on host',
    did: 'The funnel is published to the live host — ready to iterate and launch.',
    img: '/pitch/case-study/funnel-host.png',
  },
  {
    title: 'Campaign creative — variation 1',
    did: 'On-brand ad creative is produced as part of the same onboarding run.',
    img: '/pitch/case-study/ad-1.png',
  },
  {
    title: 'Campaign creative — variation 2',
    did: 'Multiple angles so media testing can start without another round of manual work.',
    img: '/pitch/case-study/ad-2.png',
  },
  {
    title: 'Campaign creative — variation 3',
    did: 'Enough variants to launch tests the same week the client is onboarded.',
    img: '/pitch/case-study/ad-3.png',
  },
] as const

function SlideUseCaseROAS() {
  const [step, setStep] = useState(0)
  const total = ROAS_ONBOARDING_STEPS.length
  const s = ROAS_ONBOARDING_STEPS[step]!

  const goNext = () => setStep((i) => Math.min(i + 1, total - 1))
  const goPrev = () => setStep((i) => Math.max(i - 1, 0))

  return (
    <Slide className="!items-center !justify-start !overflow-hidden !px-4 !py-3 md:!px-8 md:!py-4">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-5xl flex-1 flex-col gap-2">
        <div className="flex shrink-0 flex-col items-center text-center">
          <SlideLabel>Surprising Use Case #2</SlideLabel>
          <SlideTitle className="!text-2xl md:!text-4xl lg:!text-5xl">
            AUTOMATED <span className="gradient-text">CLIENT ONBOARDING</span>
          </SlideTitle>
          <p className="mx-auto mt-1 max-w-2xl text-xs text-white/45 md:text-sm">
            ROAS.co built a custom onboarding skill in Vibey, wired to Slack. Click through each
            step — full screenshots, one at a time.
          </p>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col items-center">
          <div className="flex w-full shrink-0 flex-col items-center gap-1 pb-0 pt-0">
            <h3 className="text-center text-base font-semibold text-white md:text-lg">{s.title}</h3>
            <p className="max-w-2xl text-center text-[11px] leading-snug text-white/55 md:text-sm">
              {s.did}
            </p>
          </div>

          <div className="relative mt-1 flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, y: 14, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.985 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative mx-auto flex w-full max-w-2xl cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-black/20 shadow-[0_16px_48px_rgba(0,0,0,0.4)] md:max-w-3xl ${
                  step < total - 1 ? '' : 'cursor-default'
                }`}
                onClick={() => {
                  if (step < total - 1) goNext()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (step < total - 1) goNext()
                  }
                }}
              >
                <img
                  src={s.img}
                  alt={s.title}
                  className="mx-auto h-auto max-h-[min(38vh,340px)] w-auto max-w-full object-contain object-center sm:max-h-[min(42vh,380px)] md:max-h-[min(44vh,420px)]"
                />
              </motion.div>
            </AnimatePresence>

            <div className="mt-3 flex w-full max-w-2xl shrink-0 items-center justify-center gap-2 pb-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
                disabled={step === 0}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
              >
                ← Back
              </button>
              <div className="flex items-center gap-1.5 px-2">
                {ROAS_ONBOARDING_STEPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setStep(i)
                    }}
                    className={`h-2 rounded-full transition-all ${
                      i === step ? 'w-6 bg-emerald-500' : 'w-2 bg-white/15 hover:bg-white/25'
                    }`}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                disabled={step >= total - 1}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  )
}

// ─── Slide 32: Business Model ────────────────────────────────────────────────

function SlideModel() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Business Model</SlideLabel>
      <SlideTitle>THE MODEL</SlideTitle>
      <SlideSub delay={0.45}>
        Two engines. SaaS scales horizontally. Enterprise scales revenue per account.
      </SlideSub>

      <div className="mt-6 grid w-full max-w-5xl gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-br from-blue-500/[0.08] via-transparent to-transparent p-4 ring-1 ring-blue-500/20 sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
              <Layers size={16} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-400/90">
                Self-serve
              </p>
              <p className="text-sm font-bold text-white">Tier-Based SaaS</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { name: 'Free', price: '$0' },
              { name: 'Basic', price: '$20' },
              { name: 'Pro', price: '$40' },
              { name: 'Ultra', price: '$200' },
            ].map((p) => (
              <div
                key={p.name}
                className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-black/30 px-2 py-3"
              >
                <span className="text-[10px] font-medium text-white/40">{p.name}</span>
                <span className="mt-1 text-base font-bold text-white">{p.price}</span>
                <span className="text-[9px] text-white/25">/mo</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] text-white/35">+ Credit-based usage on top</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
          className="flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent p-4 ring-1 ring-emerald-500/20 sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Settings2 size={16} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/90">
                High-touch
              </p>
              <p className="text-sm font-bold text-white">Service as a Product</p>
            </div>
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-white/55 sm:text-sm">
            Dedicated onboarding, buildout, and integration for enterprise clients. We set up and
            install their AI agent workforce — customized to their business.
          </p>
          <div className="mt-auto rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-2.5 text-center text-sm font-semibold text-emerald-400">
            $9K – $20K+/mo retainers
          </div>
        </motion.div>
      </div>

      <div className="mt-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35"
        >
          Revenue levers
        </motion.p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              title: 'Seats & tiers',
              body: 'Users upgrade as agent usage grows — natural expansion revenue.',
              icon: Users,
              tone: 'text-purple-400',
              bg: 'bg-purple-500/12',
            },
            {
              title: 'Credit consumption',
              body: 'Agents burn compute credits on every task — usage grows with adoption.',
              icon: Zap,
              tone: 'text-amber-400',
              bg: 'bg-amber-500/12',
            },
            {
              title: 'Enterprise retainers',
              body: 'High-ACV contracts with onboarding, custom agents, and dedicated support.',
              icon: Shield,
              tone: 'text-emerald-400',
              bg: 'bg-emerald-500/12',
            },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.58 + i * 0.1 }}
              className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left"
            >
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.tone}`}
              >
                <c.icon size={18} />
              </div>
              <div className="text-sm font-semibold text-white">{c.title}</div>
              <p className="mt-2 text-[11px] leading-relaxed text-white/45">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Slide>
  )
}

// ─── Slide 33: Traction ──────────────────────────────────────────────────────

function SlideTraction() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Traction</SlideLabel>
      <SlideTitle>BOOTSTRAPPED · PRE-REVENUE</SlideTitle>
      <SlideSub delay={0.45}>
        Capital-efficient build — signed creators, enterprise design partners, and growing demand.
      </SlideSub>

      <div className="mt-5 grid w-full max-w-5xl gap-4 md:grid-cols-2">
        {/* Adley */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.07] via-transparent to-transparent ring-1 ring-emerald-500/20"
        >
          <img
            src="/pitch/adley.png"
            alt="Adley Kinsman"
            className="h-44 w-full object-cover object-top sm:h-52"
          />
          <div className="p-4">
            <p className="text-sm font-bold text-white">Adley Kinsman</p>
            <p className="mt-0.5 text-[11px] text-emerald-400/80">
              1.2M followers · 3B+ views / mo
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/55">
              Signed affiliate — enterprise and power-user awareness through ongoing creator
              content.
            </p>
          </div>
        </motion.div>

        {/* Brian Ron Mark */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.08] via-transparent to-transparent ring-1 ring-violet-500/20"
        >
          <img
            src="/pitch/brian-mark.png"
            alt="Brian Ron Mark"
            className="h-44 w-full object-cover object-top sm:h-52"
          />
          <div className="p-4">
            <p className="text-sm font-bold text-white">Brian Ron Mark</p>
            <p className="mt-0.5 text-[11px] text-violet-400/80">
              637K followers · Performance marketing
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-white/55">
              Trusted voice in the funnel — demos, proof, and long-form education for high-intent
              buyers.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Enterprise design partners footnote */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-4 w-full max-w-5xl rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5"
      >
        <p className="text-center text-[11px] leading-relaxed text-white/50 sm:text-xs">
          Enterprise design partners are using Vibey in real workflows — proof of demand that helped
          us balance costs while staying{' '}
          <span className="font-medium text-white/75">bootstrapped and pre-revenue</span>. Clear
          path to repeatable ARR once we scale.
        </p>
      </motion.div>
    </Slide>
  )
}

// ─── Case study: Neel Dhingra ($1M webinar) — follows use case #2 (ROAS onboarding) as use case #3 ─

function SlideCaseStudy() {
  const workflow = [
    {
      step: '01',
      label: 'Ad strategy planned',
      icon: Target,
      accent: 'text-blue-400',
      bg: 'bg-blue-500/15',
    },
    {
      step: '02',
      label: 'Ad graphics created',
      icon: Wand2,
      accent: 'text-violet-400',
      bg: 'bg-violet-500/15',
    },
    {
      step: '03',
      label: 'Launched to Meta',
      icon: Rocket,
      accent: 'text-amber-400',
      bg: 'bg-amber-500/15',
    },
    {
      step: '04',
      label: 'Campaign optimized',
      icon: TrendingUp,
      accent: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
    },
  ]

  return (
    <Slide className="!items-center !justify-start !overflow-hidden !px-4 !py-3 md:!px-6 md:!py-4">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-2">
        <div className="flex shrink-0 flex-col items-center text-center">
          <SlideLabel>Surprising Use Case #3</SlideLabel>
          <SlideTitle className="!text-2xl md:!text-4xl">
            CAMPAIGN PLANNED. <span className="gradient-text">LIVE RESULTS.</span>
          </SlideTitle>
          <p className="mx-auto mt-1 max-w-2xl text-xs text-white/45 md:text-sm">
            Neel Dhingra used Vibey to plan, design, launch, and optimize his entire &ldquo;Escape
            the Middle&rdquo; webinar campaign — on a flight.
          </p>
        </div>

        {/* Platform-style shell */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0f]"
        >
          {/* Mock toolbar */}
          <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] px-4 py-2">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <span className="ml-2 text-[10px] font-medium text-white/30">
              Vibey · Mission: Escape the Middle Campaign
            </span>
            <span className="ml-auto rounded-md bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
              Completed
            </span>
          </div>

          {/* Content area */}
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 md:flex-row md:p-4">
            {/* Left column: profile, workflow, meta table */}
            <div className="flex shrink-0 flex-col gap-3 md:w-[260px]">
              {/* Neel profile */}
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <img
                  src="/pitch/case-study/neel-stage.png"
                  alt="Neel Dhingra"
                  className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                />
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-white">Neel Dhingra</p>
                  <p className="text-[10px] text-white/40">Real estate · FWD Events</p>
                </div>
              </div>

              {/* Workflow steps */}
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">
                  What Vibey did
                </p>
                <div className="space-y-2">
                  {workflow.map((w, i) => (
                    <motion.div
                      key={w.step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.08 }}
                      className="flex items-center gap-2.5"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${w.bg} ${w.accent}`}
                      >
                        <w.icon size={13} />
                      </span>
                      <p className="min-w-0 flex-1 text-[11px] font-medium text-white/80">
                        {w.label}
                      </p>
                      <CheckCircle2 size={12} className="shrink-0 text-emerald-400/70" />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Meta ad results — styled table */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <p className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">
                  Meta ad results
                </p>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Results', 'Reach', 'Freq.', 'CPR'].map((h) => (
                        <th key={h} className="pb-1.5 text-[9px] font-semibold text-white/35">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pt-2">
                        <span className="text-[13px] font-bold text-white">28</span>
                        <span className="ml-1 text-[8px] text-white/30">Leads</span>
                      </td>
                      <td className="pt-2 text-[12px] font-semibold text-white/70">2,566</td>
                      <td className="pt-2 text-[12px] text-white/50">1.42</td>
                      <td className="pt-2">
                        <span className="text-[13px] font-bold text-emerald-400">$3.85</span>
                        <span className="ml-1 text-[8px] text-white/30">/ lead</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </motion.div>
            </div>

            {/* Right column: images laid out by natural orientation */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
              {/* Ad creatives — vertical image, takes its own column */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 md:w-[42%]"
              >
                <p className="mb-2 shrink-0 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">
                  Ad creatives · Generated by Vibey
                </p>
                <img
                  src="/pitch/case-study/neel-ad-creatives.png"
                  alt="Ad creatives generated by Vibey"
                  className="min-h-0 w-full flex-1 rounded-lg object-contain object-top ring-1 ring-white/[0.06]"
                />
              </motion.div>

              {/* Live event + sold out — horizontal images, stacked */}
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <p className="mb-2 shrink-0 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">
                    Live event
                  </p>
                  <img
                    src="/pitch/case-study/neel-stage.png"
                    alt="Neel on stage"
                    className="min-h-0 w-full flex-1 rounded-lg object-contain object-center ring-1 ring-white/[0.06]"
                  />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75 }}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                >
                  <p className="mb-2 shrink-0 text-[9px] font-semibold uppercase tracking-[0.15em] text-white/30">
                    Sold out
                  </p>
                  <img
                    src="/pitch/case-study/neel-soldout.png"
                    alt="Sold out event"
                    className="min-h-0 w-full flex-1 rounded-lg object-contain object-center ring-1 ring-white/[0.06]"
                  />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Bottom results bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex shrink-0 items-center justify-between border-t border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="text-[11px] font-medium text-white/70">Campaign outcome</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-white/50">6,000 registrations</span>
              <span className="text-sm font-bold text-emerald-400">$1M webinar revenue</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Slide>
  )
}

// ─── Slide 35: Gameplan Acquisition ──────────────────────────────────────────

function SlideAcquisition() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Distribution</SlideLabel>
      <SlideTitle>ACQUISITION</SlideTitle>
      <SlideSub delay={0.45}>
        Warm demand from trusted voices, convert with demos and proof, then scale with education and
        partners — not one channel, one system.
      </SlideSub>

      <div className="mt-6 flex w-full max-w-5xl flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.07] via-transparent to-transparent p-4 sm:p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Megaphone size={16} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/90">
                  Reach
                </p>
                <p className="text-sm font-bold text-white">Affiliate & creator pull</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <img
                src="/pitch/adley.png"
                alt="Adley Kinsman"
                className="h-[4.5rem] w-[5.5rem] shrink-0 rounded-lg object-cover object-top ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">Adley Kinsman</div>
                <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                  1.2M followers · 3B+ views / mo
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-white/60">
                  Signed affiliate — surfaces Vibey to enterprise and power users with ongoing
                  content.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.08] via-transparent to-transparent p-4 sm:p-5"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                <Target size={16} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-violet-400/90">
                  Convert
                </p>
                <p className="text-sm font-bold text-white">Founder-led enterprise</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border border-white/[0.06] bg-black/30 p-3">
              <img
                src="/pitch/dylan.png"
                alt="Dylan Vanas"
                className="h-[4.5rem] w-[5.5rem] shrink-0 rounded-lg object-cover object-top ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">Dylan Vanas</div>
                <p className="mt-0.5 text-[11px] leading-snug text-white/45">
                  CEO · Performance marketing
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-white/60">
                  Direct pipeline: demos, scoping, and hands-on rollout for high-ACV accounts.
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35"
          >
            Scale & repeat
          </motion.p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                title: 'Creators & influencers',
                body: 'Pipeline of voices in AI and marketing — billions of impressions, always-on awareness.',
                icon: Users,
                tone: 'text-purple-400',
                bg: 'bg-purple-500/12',
              },
              {
                title: 'Webinars & school',
                body: 'Education-first acquisition: teach agents and safe workflows; high-intent sign-ups.',
                icon: Video,
                tone: 'text-blue-400',
                bg: 'bg-blue-500/12',
              },
              {
                title: 'Agency white-label',
                body: 'Partners deliver Vibey under their brand — expand revenue without linear headcount.',
                icon: Share2,
                tone: 'text-emerald-400',
                bg: 'bg-emerald-500/12',
              },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58 + i * 0.1 }}
                className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left"
              >
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} ${c.tone}`}
                >
                  <c.icon size={18} />
                </div>
                <div className="text-sm font-semibold text-white">{c.title}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/45">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95 }}
          className="text-center text-[11px] text-white/30"
        >
          + additional affiliates and partner conversations in flight
        </motion.p>
      </div>
    </Slide>
  )
}

// ─── Slide 36: Gameplan Retention ────────────────────────────────────────────

function SlideRetention() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Distribution</SlideLabel>
      <SlideTitle>RETENTION</SlideTitle>
      <SlideSub delay={0.45}>
        Keep customers because the product gets stickier over time — and enterprise accounts have a
        real relationship, not a ticket queue.
      </SlideSub>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] text-white/35"
      >
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-medium text-white/50">
          Land
        </span>
        <span className="text-white/20">→</span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-medium text-white/50">
          Expand usage
        </span>
        <span className="text-white/20">→</span>
        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-1 font-medium text-emerald-400/90">
          Lock in
        </span>
      </motion.div>

      <div className="mt-6 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            r: 'Community & coaches',
            detail:
              'Education and support woven into the ecosystem — creators as teachers, not just billboards.',
            icon: Users,
            accent: 'from-purple-500/15 to-transparent',
            ring: 'ring-purple-500/20',
          },
          {
            r: 'Memory that compounds',
            detail:
              'Every campaign trains context. Month six should be faster and sharper than month one.',
            icon: Brain,
            accent: 'from-emerald-500/15 to-transparent',
            ring: 'ring-emerald-500/20',
          },
          {
            r: 'Workflow & data moat',
            detail:
              'Skills, brain, and integrations live here. Switching means rebuilding your AI workforce from zero.',
            icon: Lock,
            accent: 'from-amber-500/12 to-transparent',
            ring: 'ring-amber-500/15',
          },
          {
            r: 'Enterprise partnership',
            detail:
              'Onboarding, success, and roadmap alignment — high-touch where ARR justifies it.',
            icon: Shield,
            accent: 'from-blue-500/15 to-transparent',
            ring: 'ring-blue-500/20',
          },
        ].map((c, i) => (
          <motion.div
            key={c.r}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.1 }}
            className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${c.accent} p-5 ring-1 ${c.ring}`}
          >
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/35 ring-1 ring-white/10">
                <c.icon size={20} className="text-white/85" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white">{c.r}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/45 sm:text-xs">
                  {c.detail}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 37: Competition ───────────────────────────────────────────────────

function SlideCompetition() {
  const competitors = [
    {
      name: 'Claude',
      logo: '/compare/anthropic.svg',
      them: "Single agent on your laptop. Can't deploy.",
      vibey: 'Team of specialists. Deploys funnels, ads, emails — production.',
      accent: 'from-orange-500/12',
      ring: 'ring-orange-500/15',
      border: 'border-orange-500/15',
    },
    {
      name: 'ChatGPT',
      logo: '/compare/openai.svg',
      them: 'General-purpose chatbot. No deployment.',
      vibey: 'Production-grade output to your domains, not just previews.',
      accent: 'from-emerald-500/12',
      ring: 'ring-emerald-500/15',
      border: 'border-emerald-500/15',
    },
    {
      name: 'Manus',
      logo: '/compare/manus.svg',
      them: 'One prompt, one result.',
      vibey: 'Breaks missions into subtasks, assigns specialists, manages dependencies.',
      accent: 'from-blue-500/12',
      ring: 'ring-blue-500/15',
      border: 'border-blue-500/15',
    },
    {
      name: 'Viktor',
      logo: '/compare/viktor.svg',
      them: 'AI coworker in Slack with 3K+ tools.',
      vibey: "Doesn't build funnels, deploy pages, send sequences, or manage campaigns.",
      accent: 'from-violet-500/12',
      ring: 'ring-violet-500/15',
      border: 'border-violet-500/15',
    },
  ]

  return (
    <Slide className="!py-4">
      <SlideLabel>Positioning</SlideLabel>
      <SlideTitle>COMPETITIVE LANDSCAPE</SlideTitle>
      <SlideSub delay={0.45}>
        No competitor combines a multi-agent workforce + marketing OS + production-grade deployment.
      </SlideSub>

      <div className="mt-6 flex w-full max-w-4xl flex-col gap-3">
        {competitors.map((r, i) => (
          <motion.div
            key={r.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className={`relative overflow-hidden rounded-2xl border ${r.border} bg-gradient-to-r ${r.accent} via-transparent to-transparent ring-1 ${r.ring}`}
          >
            <div className="flex items-start gap-4 p-4 sm:items-center sm:gap-5 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/40 ring-1 ring-white/10">
                <img src={r.logo} alt={r.name} className="h-5 w-5 opacity-90" />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
                <div className="shrink-0 sm:w-[80px]">
                  <p className="text-sm font-bold text-white">{r.name}</p>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                      Them
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/50 sm:text-xs">
                      {r.them}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400/50">
                      Vibey
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-emerald-400/90 sm:text-xs">
                      {r.vibey}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 38: Team ──────────────────────────────────────────────────────────

function SlideTeamOps() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Team</SlideLabel>
      <SlideTitle>COMMANDO TEAMS</SlideTitle>
      <SlideSub delay={0.45}>Stay lean. Scale fast and aggressively.</SlideSub>
      <div className="mt-6 grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            dept: 'Management',
            detail: 'Dylan (CEO) + Sefy (CTO)',
            cost: '$8K/m ×2',
            icon: Users,
            accent: 'from-emerald-500/15 to-transparent',
            ring: 'ring-emerald-500/20',
          },
          {
            dept: 'Engineering',
            detail: '3 full-stack engineers',
            cost: '$10K/dev/m',
            icon: Code2,
            accent: 'from-blue-500/15 to-transparent',
            ring: 'ring-blue-500/20',
          },
          {
            dept: 'Marketing & Sales',
            detail: 'Dylan + partnerships + affiliates',
            cost: 'Performance-based',
            icon: Megaphone,
            accent: 'from-purple-500/15 to-transparent',
            ring: 'ring-purple-500/20',
          },
          {
            dept: 'Support & QA',
            detail: 'DevOps + Design + QA',
            cost: '$30K/m total',
            icon: Server,
            accent: 'from-amber-500/12 to-transparent',
            ring: 'ring-amber-500/15',
          },
          {
            dept: 'Coaches & Enterprise',
            detail: 'Relationship managers',
            cost: 'Revenue share',
            icon: MessageSquare,
            accent: 'from-violet-500/12 to-transparent',
            ring: 'ring-violet-500/20',
          },
          {
            dept: 'R&D',
            detail: 'Hardware, compute, data',
            cost: 'Post-raise',
            icon: Zap,
            accent: 'from-cyan-500/12 to-transparent',
            ring: 'ring-cyan-500/15',
          },
        ].map((t, i) => (
          <motion.div
            key={t.dept}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${t.accent} p-5 ring-1 ${t.ring}`}
          >
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/35 ring-1 ring-white/10">
                <t.icon size={20} className="text-white/85" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">{t.dept}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/45 sm:text-xs">
                  {t.detail}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-white/35 sm:text-xs">{t.cost}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 38: Funding timeline, April close, post-funding, team hub ─────────

function SlideFundingRunway() {
  const [todayShort, setTodayShort] = useState('')

  useEffect(() => {
    setTodayShort(
      new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    )
  }, [])

  const timeline = [
    {
      key: 'boot',
      label: 'Bootstrapped',
      sub: 'Shipped product · design partners',
      state: 'done' as const,
    },
    {
      key: 'raise',
      label: 'Active raise',
      sub: '$5.5M seed · 10%',
      date: todayShort || '…',
      state: 'now' as const,
    },
    {
      key: 'apr',
      label: 'Capital in',
      sub: 'Target: Apr 30, 2026',
      state: 'deadline' as const,
    },
    {
      key: 'exec',
      label: 'Execute',
      sub: '24-mo plan · team scale',
      state: 'next' as const,
    },
    {
      key: 'a',
      label: 'Series A',
      sub: '$100M+ trajectory',
      state: 'future' as const,
    },
  ]

  return (
    <Slide className="!py-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-5">
        <div className="flex shrink-0 flex-col items-center text-center">
          <SlideLabel>Runway</SlideLabel>
          <SlideTitle className="!text-2xl md:!text-4xl lg:!text-5xl">
            TIMELINE & <span className="gradient-text">HOW WE SCALE</span>
          </SlideTitle>
          <SlideSub delay={0.4}>
            From bootstrapped to Series A — capital secured, team scaled, enterprise shipped.
          </SlideSub>
        </div>

        {/* Timeline */}
        <div className="w-full">
          <div className="-mx-1 overflow-x-auto pb-1 md:mx-0 md:overflow-visible">
            <div className="flex min-w-0 snap-x snap-mandatory gap-2 px-1 md:grid md:grid-cols-5 md:gap-3 md:px-0">
              {timeline.map((t, i) => {
                const isNow = t.state === 'now'
                const isDeadline = t.state === 'deadline'
                const isDone = t.state === 'done'
                return (
                  <motion.div
                    key={t.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    className={`relative min-w-[140px] max-w-[180px] shrink-0 snap-start rounded-2xl border p-3.5 text-left md:min-w-0 md:max-w-none ${
                      isNow
                        ? 'border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.12] to-transparent ring-1 ring-emerald-500/25'
                        : isDeadline
                          ? 'border-amber-400/35 bg-gradient-to-br from-amber-500/[0.1] to-transparent ring-1 ring-amber-500/20'
                          : isDone
                            ? 'border-white/[0.08] bg-white/[0.03]'
                            : 'border-white/[0.07] bg-white/[0.02]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/40 text-[10px] font-bold tabular-nums text-white/50 ring-1 ring-white/10">
                        {i + 1}
                      </span>
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          isNow
                            ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                            : isDeadline
                              ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                              : isDone
                                ? 'bg-white/40'
                                : 'bg-white/15'
                        }`}
                        aria-hidden
                      />
                    </div>
                    <div className="text-[11px] font-bold uppercase leading-tight tracking-wide text-white md:text-[12px]">
                      {t.label}
                    </div>
                    <div className="mt-1.5 text-[9px] leading-snug text-white/45 md:text-[10px]">
                      {t.sub}
                    </div>
                    {isNow && (
                      <div className="mt-2 border-t border-white/[0.06] pt-2">
                        <span className="text-[9px] font-semibold text-emerald-400/90">
                          {t.date}
                        </span>
                        <span className="ml-1.5 text-[8px] uppercase tracking-widest text-emerald-400/60">
                          · Today
                        </span>
                      </div>
                    )}
                    {isDeadline && (
                      <div className="mt-2 border-t border-white/[0.06] pt-2 text-[8px] font-semibold uppercase tracking-widest text-amber-200/90">
                        Close window
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Two detail cards */}
        <div className="grid w-full gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-purple-500/15 to-transparent p-5 ring-1 ring-purple-500/20"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400">
                <Rocket size={16} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-purple-400/90">
                  Post-close
                </p>
                <p className="text-sm font-bold text-white">Once we&apos;re funded</p>
              </div>
            </div>
            <ul className="space-y-2 text-[11px] leading-relaxed text-white/50 sm:text-[12px]">
              <li className="flex gap-2">
                <span className="shrink-0 text-purple-400/70">→</span>
                Scale hiring per the $5.5M plan — eng, GTM, compliance, buffer.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-purple-400/70">→</span>
                Ship enterprise roadmap: SOC2, SSO, mission SLAs.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 text-purple-400/70">→</span>
                Drive to 10K users &amp; $500K+ MRR on the milestones in The Ask.
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.62 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-emerald-500/15 to-transparent p-5 ring-1 ring-emerald-500/20"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Share2 size={16} />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/90">
                  Team model
                </p>
                <p className="text-sm font-bold text-white">How the team ties together</p>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-white/50 sm:text-[12px]">
              Small commando teams stay autonomous but run on{' '}
              <span className="font-medium text-white/75">one platform layer</span> — shared brain,
              skills, and missions — so leadership sets north star, specialists execute in parallel,
              and nothing ships without passing through the same Vibey OS.
            </p>
          </motion.div>
        </div>
      </div>
    </Slide>
  )
}

// ─── Slide 39: The Ask ───────────────────────────────────────────────────────

function SlideAsk() {
  return (
    <Slide className="!py-4">
      <SlideLabel>The Ask</SlideLabel>
      <SlideTitle>THE ASK</SlideTitle>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="mt-4 flex flex-col items-center"
      >
        <h2 className="font-[family-name:var(--font-site-headline)] text-5xl font-bold text-white md:text-7xl">
          $5.5M
        </h2>
        <p className="mt-1.5 text-base text-white/40">10% equity&ensp;·&ensp;$55M post-money</p>
      </motion.div>

      <div className="mt-6 grid w-full max-w-5xl gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-br from-blue-500/[0.08] via-transparent to-transparent p-4 ring-1 ring-blue-500/20 sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
              <FolderKanban size={16} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-400/90">
                Allocation
              </p>
              <p className="text-sm font-bold text-white">Use of Funds</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Team / Payroll (24mo)', amount: '$2.5M', pct: 45, color: 'bg-blue-500/60' },
              {
                label: 'R&D (agents, skills, tokens)',
                amount: '$1.0M',
                pct: 18,
                color: 'bg-violet-500/60',
              },
              { label: 'Infra + Compliance', amount: '$750K', pct: 14, color: 'bg-emerald-500/60' },
              { label: 'Marketing & Growth', amount: '$500K', pct: 9, color: 'bg-amber-500/60' },
              { label: 'Operations + Buffer', amount: '$750K', pct: 14, color: 'bg-white/30' },
            ].map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] text-white/50">{f.label}</span>
                  <span className="text-[11px] font-semibold text-white/70">{f.amount}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${f.pct}%` }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className={`h-full rounded-full ${f.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-transparent p-4 ring-1 ring-emerald-500/20 sm:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Target size={16} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400/90">
                Targets
              </p>
              <p className="text-sm font-bold text-white">12–18 Month Milestones</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { k: 'Users', v: '10,000', icon: Users },
              { k: 'Enterprise', v: '200+', icon: Globe },
              { k: 'MRR', v: '$500K+', icon: TrendingUp },
              { k: 'Compliance', v: 'SOC2 + HIPAA', icon: Shield },
            ].map((m, i) => (
              <motion.div
                key={m.k}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5"
              >
                <m.icon size={14} className="shrink-0 text-white/30" />
                <span className="flex-1 text-[12px] text-white/55">{m.k}</span>
                <span className="text-[12px] font-semibold text-white">{m.v}</span>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.08] px-3 py-2.5"
          >
            <span className="text-[12px] font-medium text-emerald-400/80">Series A target</span>
            <span className="text-sm font-bold text-emerald-400">$100M+</span>
          </motion.div>
        </motion.div>
      </div>
    </Slide>
  )
}

// ─── Slide 40: Vision ────────────────────────────────────────────────────────

function SlideVision() {
  const phases = [
    {
      phase: 'Phase 1',
      title: 'Vibey',
      desc: 'Dominate the attention graph. Creators, coaches, agencies, performance marketers.',
      active: true,
      icon: Rocket,
      accent: 'emerald',
      from: 'from-emerald-500/[0.1]',
      ring: 'ring-emerald-500/20',
      border: 'border-emerald-500/20',
      badge: 'bg-emerald-500/20 text-emerald-400',
      label: 'text-emerald-400/90',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
    },
    {
      phase: 'Phase 2',
      title: 'Custom LLM',
      desc: 'Purpose-built language models for marketing and business operations.',
      active: false,
      icon: Brain,
      accent: 'violet',
      from: 'from-violet-500/[0.08]',
      ring: 'ring-violet-500/15',
      border: 'border-white/[0.07]',
      badge: '',
      label: 'text-violet-400/90',
      iconBg: 'bg-violet-500/15 text-violet-400',
    },
    {
      phase: 'Phase 3',
      title: 'Hardware + Compute',
      desc: 'Compute for margin & moat. Ambient AI layer. On-body devices.',
      active: false,
      icon: Server,
      accent: 'blue',
      from: 'from-blue-500/[0.08]',
      ring: 'ring-blue-500/15',
      border: 'border-white/[0.07]',
      badge: '',
      label: 'text-blue-400/90',
      iconBg: 'bg-blue-500/15 text-blue-400',
    },
  ]

  return (
    <Slide className="!py-4">
      <SlideLabel>The Vision</SlideLabel>
      <SlideTitle>THE FUTURE</SlideTitle>
      <SlideSub delay={0.45}>
        Three phases from AI workforce to full-stack compute company.
      </SlideSub>

      <div className="mt-6 grid w-full max-w-5xl gap-4 md:grid-cols-3">
        {phases.map((p, i) => (
          <motion.div
            key={p.phase}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.12 }}
            className={`relative flex flex-col overflow-hidden rounded-2xl border ${p.border} bg-gradient-to-br ${p.from} via-transparent to-transparent p-5 ring-1 ${p.ring}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.iconBg}`}>
                <p.icon size={16} />
              </span>
              <p className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${p.label}`}>
                {p.phase}
              </p>
            </div>
            <div className="text-lg font-bold text-white">{p.title}</div>
            <p className="mt-2 flex-1 text-[12px] leading-relaxed text-white/45">{p.desc}</p>
            {p.active && (
              <div
                className={`mt-3 inline-flex w-fit rounded-full ${p.badge} px-3 py-1 text-[11px] font-semibold`}
              >
                Current
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

// ─── Slide 40: CTA ─────────────────────────────────────────────────────────────

function SlideCTA() {
  return (
    <Slide>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mb-8 h-[160px] w-[160px] md:h-[200px] md:w-[200px]"
        >
          <VibeyHeroDepthOrb />
        </motion.div>
        <h2 className="max-w-3xl text-center font-[family-name:var(--font-site-headline)] text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
          YOUR AI TEAM.
          <br />
          <span className="gradient-text">READY TO WORK.</span>
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
        >
          {[
            { name: 'Dylan Vanas', email: 'dylan@vibey.im', role: 'CEO', img: '/pitch/dylan.png' },
            { name: 'Sefy Paulin', email: 'sefy@vibey.im', role: 'CTO', img: '/pitch/sefy.png' },
          ].map((p, i) => (
            <motion.div
              key={p.email}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.12 }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.04]"
            >
              <img
                src={p.img}
                alt={p.name}
                className="h-10 w-10 shrink-0 rounded-full object-cover object-top ring-1 ring-white/10"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{p.name}</p>
                <p className="text-[11px] text-white/40">
                  {p.role}&ensp;·&ensp;{p.email}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-5 text-base font-semibold text-white/50"
        >
          vibey.im
        </motion.p>
      </motion.div>
    </Slide>
  )
}

// ─── All Slides ───────────────────────────────────────────────────────────────

const SLIDES = [
  SlideCover, // 1
  SlideFounders, // 2
  SlideProblem, // 3
  SlideMarket, // 4
  SlideMeetVibey, // 5
  SlideSolutionFourPillars, // 6
  SlideBrain, // 7
  SlideCloudComputer, // 8
  SlideSkillsIntro, // 9
  SlideIntegrationsIntro, // 10
  SlideSolutionSummary, // 11
  SlideTeamOrgDeck, // 12 — team scatter → organized workforce (two in-slide steps)
  SlideHR, // 13
  SlideSkills, // 14
  SlideSkillsCreate, // 15
  SlidePreloaded, // 16
  SlideAutopilot, // 17
  SlideTwoWaysWork, // 18
  SlideStudio, // 19
  SlideMissions, // 20
  SlideComms, // 21
  SlideTwoWaysWorks, // 22
  SlideIntegrations, // 23
  SlideCapGTM, // 24
  SlideCapMedia, // 25
  SlideCapOps, // 26
  SlideSurprisingUseCasesIntro, // 27
  SlideSurprisingUseCasesPreview, // 28
  SlideUseCaseFinance, // 29 — surprising use case #1
  SlideUseCaseROAS, // 30 — #2
  SlideCaseStudy, // 31 — #3 (Neel Dhingra)
  SlideModel, // 32
  SlideTraction, // 33
  SlideAcquisition, // 34
  SlideRetention, // 35
  SlideCompetition, // 36
  SlideTeamOps, // 37
  SlideFundingRunway, // 38 — timeline, April close, post-funding
  SlideAsk, // 39
  SlideVision, // 40
  SlideCTA, // 41
]

// ─── Main Deck ────────────────────────────────────────────────────────────────

export function PitchDeckV1() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(0)
  /** Second step of unified slide 12 (team → org); first next advances phase, second next changes deck index. */
  const [teamOrgPhase, setTeamOrgPhase] = useState<0 | 1>(0)
  const [mapOpen, setMapOpen] = useState(false)

  const wheelAccumRef = useRef(0)
  /** After one slide change from the wheel, ignore further deltas until input goes quiet (stops trackpad inertia firing many slides). */
  const wheelNavConsumedThisGestureRef = useRef(false)
  const wheelGestureQuietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const WHEEL_DELTA_THRESHOLD = 48
  /** No wheel events for this long = end of gesture; allow next slide on next scroll. */
  const WHEEL_GESTURE_QUIET_MS = 200

  const clearWheelGestureQuietTimer = useCallback(() => {
    if (wheelGestureQuietTimerRef.current) {
      clearTimeout(wheelGestureQuietTimerRef.current)
      wheelGestureQuietTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    wheelAccumRef.current = 0
    wheelNavConsumedThisGestureRef.current = false
    clearWheelGestureQuietTimer()
  }, [current, clearWheelGestureQuietTimer])

  useEffect(() => {
    if (mapOpen) {
      wheelAccumRef.current = 0
      wheelNavConsumedThisGestureRef.current = false
      clearWheelGestureQuietTimer()
    }
  }, [mapOpen, clearWheelGestureQuietTimer])

  const jumpToSlide = useCallback(
    (index: number) => {
      setMapOpen(false)
      setDirection(index > current ? 1 : -1)
      if (index === TEAM_ORG_SLIDE_INDEX) setTeamOrgPhase(0)
      setCurrent(index)
    },
    [current],
  )

  const backToStart = useCallback(() => {
    setMapOpen(false)
    setDirection(-1)
    setTeamOrgPhase(0)
    setCurrent(0)
  }, [])

  const go = useCallback(
    (delta: number) => {
      if (delta > 0 && current === TEAM_ORG_SLIDE_INDEX && teamOrgPhase === 0) {
        setTeamOrgPhase(1)
        return
      }
      if (delta < 0 && current === TEAM_ORG_SLIDE_INDEX && teamOrgPhase === 1) {
        setTeamOrgPhase(0)
        return
      }

      const next = current + delta
      if (next < 0 || next >= TOTAL_SLIDES) return

      setDirection(delta)

      if (next === TEAM_ORG_SLIDE_INDEX) {
        if (current === TEAM_ORG_SLIDE_INDEX - 1) setTeamOrgPhase(0)
        else if (current === TEAM_ORG_SLIDE_INDEX + 1) setTeamOrgPhase(1)
      } else if (current === TEAM_ORG_SLIDE_INDEX && next === TEAM_ORG_SLIDE_INDEX + 1) {
        setTeamOrgPhase(0)
      }

      setCurrent(next)
    },
    [current, teamOrgPhase],
  )

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (mapOpen) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setMapOpen(false)
        }
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        if (current < TOTAL_SLIDES - 1) go(1)
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (current > 0) go(-1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [go, mapOpen, current])

  useEffect(() => {
    if (mapOpen) return
    const el = document.getElementById('pitch-slide-container')
    if (!el) return

    const bumpGestureQuiet = () => {
      clearWheelGestureQuietTimer()
      wheelGestureQuietTimerRef.current = setTimeout(() => {
        wheelNavConsumedThisGestureRef.current = false
        wheelAccumRef.current = 0
        wheelGestureQuietTimerRef.current = null
      }, WHEEL_GESTURE_QUIET_MS)
    }

    const onWheel = (e: WheelEvent) => {
      const dy = e.deltaY
      if (dy === 0) return
      e.preventDefault()

      bumpGestureQuiet()

      if (wheelNavConsumedThisGestureRef.current) {
        return
      }

      wheelAccumRef.current += dy
      const a = wheelAccumRef.current

      if (Math.abs(a) < WHEEL_DELTA_THRESHOLD) {
        return
      }

      const goingDown = a > 0
      wheelAccumRef.current = 0

      if (goingDown) {
        if (current >= TOTAL_SLIDES - 1) return
      } else {
        if (current <= 0) return
      }

      wheelNavConsumedThisGestureRef.current = true
      if (goingDown) go(1)
      else go(-1)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      clearWheelGestureQuietTimer()
    }
  }, [mapOpen, current, go, clearWheelGestureQuietTimer])

  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    if (exportOpen) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [exportOpen])

  const handleExport = useCallback(
    async (format: 'pdf' | 'pptx') => {
      setExportOpen(false)
      const saved = current
      const savedOrgPhase = teamOrgPhase
      const slideContainer = document.getElementById('pitch-slide-container')
      if (!slideContainer) return

      const { default: html2canvas } = await import('html2canvas')
      const images: string[] = []
      for (let i = 0; i < TOTAL_SLIDES; i++) {
        setDirection(i > saved ? 1 : -1)
        setCurrent(i)
        if (i === TEAM_ORG_SLIDE_INDEX) setTeamOrgPhase(1)
        await new Promise((r) => setTimeout(r, 1200))
        const canvas = await html2canvas(slideContainer, {
          backgroundColor: '#09090b',
          scale: 2,
          useCORS: true,
          logging: false,
        })
        images.push(canvas.toDataURL('image/png'))
      }

      setCurrent(saved)
      setTeamOrgPhase(savedOrgPhase)
      setDirection(0)

      if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf')
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] })
        for (let i = 0; i < images.length; i++) {
          if (i > 0) pdf.addPage([1920, 1080], 'landscape')
          pdf.addImage(images[i]!, 'PNG', 0, 0, 1920, 1080)
        }
        pdf.save('Vibey-Pitch-Deck.pdf')
      } else {
        await new Promise<void>((resolve, reject) => {
          if ((window as any).PptxGenJS) {
            resolve()
            return
          }
          const s = document.createElement('script')
          s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js'
          s.onload = () => resolve()
          s.onerror = () => reject(new Error('Failed to load pptxgenjs'))
          document.head.appendChild(s)
        })
        const PptxGenJS = (window as any).PptxGenJS
        const pptx = new PptxGenJS()
        pptx.layout = 'LAYOUT_WIDE'
        for (const img of images) {
          const slide = pptx.addSlide()
          slide.background = { color: '09090b' }
          slide.addImage({ data: img, x: 0, y: 0, w: 13.33, h: 7.5 })
        }
        await pptx.writeFile({ fileName: 'Vibey-Pitch-Deck.pptx' })
      }
    },
    [current, teamOrgPhase],
  )

  const pitchNav = useMemo(() => getPitchNav(current), [current])

  const SlideComponent = SLIDES[current]!

  return (
    <TeamOrgPhaseContext.Provider value={{ phase: teamOrgPhase }}>
      <div className="fixed inset-0 z-[9999] flex flex-col bg-[#09090b]">
        <div className="absolute left-0 right-0 top-0 z-50 h-0.5 bg-white/5">
          <motion.div
            className="h-full"
            style={{
              background:
                'linear-gradient(90deg, rgb(var(--accent-secondary-rgb)), rgb(var(--accent-secondary-mid-rgb)), rgb(var(--accent-emerald-rgb)))',
            }}
            animate={{ width: `${((current + 1) / TOTAL_SLIDES) * 100}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {!mapOpen && (
          <div className="pointer-events-none absolute left-3 top-2.5 z-[55] max-w-[min(100%,calc(100%-11rem))] md:left-5 md:top-3.5">
            <span className="inline-block rounded-md border border-emerald-500/35 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300/95">
              {pitchNav.badge}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute right-0 top-0 z-[70] flex justify-end gap-2 pr-3 pt-2.5 md:pr-5 md:pt-3.5">
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={backToStart}
              className="shrink-0 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-white/60 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white md:px-3 md:text-xs"
              title="Jump to first slide"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={() => setMapOpen((o) => !o)}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium backdrop-blur-sm transition-colors md:px-3 md:text-xs ${
                mapOpen
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/35'
                  : 'bg-white/[0.06] text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              title={mapOpen ? 'Close map' : 'Deck map'}
            >
              <MapIcon size={13} />
              Map
            </button>
            <div ref={exportRef} className="relative flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => setExportOpen(!exportOpen)}
                className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-white/60 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white md:px-3 md:text-xs"
              >
                <Download size={13} />
                Export
                <ChevronDown
                  size={12}
                  className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-[80] mt-1 w-40 overflow-hidden rounded-lg bg-[#18181b] shadow-xl">
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <FileText size={13} /> Export as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('pptx')}
                    className="flex w-full items-center gap-2 bg-white/[0.03] px-3 py-2.5 text-left text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <Presentation size={13} /> Export as PPTX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <motion.div
            id="pitch-slide-container"
            animate={{ opacity: mapOpen ? 0 : 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={`relative min-h-0 flex-1 overflow-hidden ${mapOpen ? 'pointer-events-none' : ''}`}
            aria-hidden={mapOpen}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={current}
                custom={direction}
                initial={{ opacity: 0, x: direction >= 0 ? 60 : -60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction >= 0 ? -60 : 60 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute inset-0"
              >
                <SlideComponent />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <AnimatePresence initial={false}>
            {mapOpen && (
              <motion.div
                key="pitch-map-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 z-[60] flex min-h-0 flex-col bg-[#09090b]"
              >
                <PitchSlideMapV1 currentSlide={current} onSelectSlide={jumpToSlide} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative z-50 border-t border-white/[0.07] bg-[#09090b]">
          {!mapOpen && (
            <div className="flex items-center justify-center gap-3 bg-emerald-500/[0.12] px-4 py-2.5 md:px-6 md:py-3">
              <span className="shrink-0 rounded-md bg-emerald-500/25 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-300 md:text-sm">
                Part {pitchNav.sectionNum}
              </span>
              <span className="text-white/25">·</span>
              <p className="truncate text-sm font-semibold md:text-base">
                <span className="text-emerald-300/90">{pitchNav.crumbs[0]}</span>
                {pitchNav.crumbs.length > 1 && (
                  <>
                    <span className="text-white/30">{' › '}</span>
                    <span className="text-white/90">{pitchNav.crumbs.slice(1).join('  ›  ')}</span>
                  </>
                )}
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5 md:px-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={current === 0}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-20"
                title="Previous slide"
              >
                <ArrowLeft size={16} />
              </button>
            </div>

            <div className="flex min-h-8 max-w-[min(100%,52vw)] flex-1 items-center justify-center gap-0.5 overflow-x-auto py-0.5 md:max-w-none">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDirection(i > current ? 1 : -1)
                    if (i === TEAM_ORG_SLIDE_INDEX) setTeamOrgPhase(0)
                    setCurrent(i)
                  }}
                  className={`h-1.5 shrink-0 rounded-full transition-all ${
                    i === current ? 'w-4 bg-emerald-500' : 'w-1 bg-white/15 hover:bg-white/25'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs tabular-nums text-white/30">
                {current + 1}/{TOTAL_SLIDES}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={current === TOTAL_SLIDES - 1}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-20"
                title="Next slide"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </TeamOrgPhaseContext.Provider>
  )
}
