'use client'

import { motion } from 'framer-motion'
import {
  Brain,
  ChevronDown,
  Clock,
  FolderKanban,
  Globe,
  Layers,
  Mail,
  Mic,
  Paperclip,
  Plug,
  Server,
  Settings2,
  Shield,
  Target,
  Wand2,
  Zap,
} from 'lucide-react'
import { IntegrationsHeroMockup } from '@/components/feature-pages/IntegrationsHeroMockup'
import { AgentLibraryCarousel } from '@/components/marketing/AgentLibraryCarousel'
import { MarketingBrainGraphMockup } from '@/components/marketing/MarketingBrainGraphMockup'
import { MarketingCapabilitiesGtmMockup } from '@/components/marketing/MarketingCapabilitiesShowcaseMockups'
import { MarketingDailyDigestMockup } from '@/components/marketing/MarketingDailyDigestMockup'
import { MarketingHrLibraryMockup } from '@/components/marketing/MarketingHrLibraryMockup'
import { MarketingMissionActivityScoreMockup } from '@/components/marketing/MarketingMissionActivityScoreMockup'
import { MarketingNorthstarGuardrailMockup } from '@/components/marketing/MarketingNorthstarGuardrailMockup'
import { MarketingSkillBuilderMockup } from '@/components/marketing/MarketingSkillBuilderMockup'
import { MarketingSkillLibraryMockup } from '@/components/marketing/MarketingSkillLibraryMockup'
import { MarketingSkillStackMockup } from '@/components/marketing/MarketingSkillStackMockup'
import { VibeyHeroDepthOrb } from '@/components/vibey/vibey-hero-depth-orb'
import { MARKETING_AGENT_LIBRARY_FALLBACK as agents } from '@/lib/agent-library-fallback'
import type { MarketingHrShowcasePayload } from '@/lib/marketing-hr-showcase-data'
import { Slide, SlideLabel, SlideTitle, SlideSub } from './pitch-slide-ui'

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

// ─── Slide 23: Appendix — Meet Vibey ─────────────────────────────────────────

export function SlideMeetVibey() {
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

        <div className="rounded-b-spacing-4 bg-color-surface relative z-0 mx-4 -mt-1 flex items-center px-4 pb-2.5 pt-3">
          <div className="text-color-muted body-4 flex items-center gap-1.5">
            <FolderKanban className="h-3 w-3" />
            <span className="font-medium">Select campaign</span>
            <ChevronDown className="h-2.5 w-2.5" />
          </div>
        </div>

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

// ─── Slide 24: HR ────────────────────────────────────────────────────────────

export function SlideHR() {
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

// ─── Slide 25: Four pillars ───────────────────────────────────────────────────

export function SlideSolutionFourPillars() {
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
            <div className="relative h-[120px] w-full overflow-hidden bg-black/20 sm:h-[140px]">
              {p.mockup}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
            </div>

            <div className="flex flex-col items-center px-3 py-3 text-center">
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${p.iconBg}`}>
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

// ─── Slide 26: The Brain ─────────────────────────────────────────────────────

export function SlideBrain() {
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

// ─── Slide 27: Cloud Computer ────────────────────────────────────────────────

export function SlideCloudComputer() {
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

// ─── Slide 28: Skills Combined ───────────────────────────────────────────────

export function SlideSkillsCombined() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Skills</SlideLabel>
      <SlideTitle>
        100+ PREMADE SKILLS — <span className="gradient-text">OR BUILD YOUR OWN</span>
      </SlideTitle>
      <SlideSub delay={0.45}>
        Tested marketing plays out of the box. Or import a doc, chat with the agent, and ship a
        custom skill in minutes.
      </SlideSub>

      <div className="mt-6 grid w-full max-w-6xl gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] ring-1 ring-white/[0.06]"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
              <Layers size={13} />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
              Premade library
            </p>
          </div>
          <div className="relative h-[280px] overflow-hidden bg-black/20">
            <div className="pointer-events-none h-full w-full">
              <MarketingSkillLibraryMockup />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
          </div>
          <div className="px-4 py-3">
            <p className="text-[12px] leading-relaxed text-white/55">
              100+ marketing plays — funnel builds, ad reviews, audits, launches. Pre-tested,
              versioned, ready to ship.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] ring-1 ring-white/[0.06]"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/15 text-purple-400">
              <Wand2 size={13} />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
              Custom skill builder
            </p>
          </div>
          <div className="relative h-[280px] overflow-hidden bg-black/20">
            <div className="pointer-events-none h-full w-full">
              <MarketingSkillBuilderMockup />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0a0a0f] to-transparent" />
          </div>
          <div className="px-4 py-3">
            <p className="text-[12px] leading-relaxed text-white/55">
              Import an SOP, chat with the agent, ship a versioned skill the whole team can run.
            </p>
          </div>
        </motion.div>
      </div>
    </Slide>
  )
}

// ─── Slide 29: Pre-loaded & Hireable ─────────────────────────────────────────

export function SlidePreloaded() {
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

// ─── Slide 30: Integrations ──────────────────────────────────────────────────

export function SlideIntegrationsMerged() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Integrations</SlideLabel>
      <SlideTitle>
        36+ <span className="gradient-text">NATIVE INTEGRATIONS</span>
      </SlideTitle>
      <SlideSub delay={0.45}>
        Live OAuth connections. Real actions. Pulls context, pushes updates, respects boundaries.
      </SlideSub>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6 w-full max-w-6xl overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] ring-1 ring-white/[0.06]"
      >
        <div className="pointer-events-none">
          <IntegrationsHeroMockup embedTransparent />
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85 }}
        className="mt-5 max-w-3xl text-center text-[12px] leading-relaxed text-white/45 sm:text-[13px]"
      >
        From Notion to Meta Ads, every integration is a real action surface — agents read context,
        execute changes, and keep your stack in sync without bespoke glue code.
      </motion.p>
    </Slide>
  )
}

// ─── Slide 31: Capabilities GTM ────────────────────────────────────────────────

export function SlideCapGTM() {
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

// ─── Slide 32: Autopilot ─────────────────────────────────────────────────────

export function SlideAutopilot() {
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
