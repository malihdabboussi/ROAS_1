'use client'

import { motion } from 'framer-motion'
import { Rocket, TrendingUp, Users, Zap } from 'lucide-react'
import {
  DISPATCHER_MARTECH_SPRAWL_CARDS,
  IntegrationToolDispatcherMockup,
} from '@/components/marketing/IntegrationToolDispatcherMockup'
import { Slide, SlideLabel, SlideTitle, SlideSub } from './pitch-slide-ui'

// ─── Slide 1: Cover ──────────────────────────────────────────────────────────

export function SlideCover() {
  return (
    <Slide className="!py-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center"
      >
        <h1 className="max-w-4xl text-center font-[family-name:var(--font-site-headline)] text-3xl font-bold leading-[1.12] tracking-tight text-white max-md:text-[1.8rem] max-md:leading-[1.04] md:text-5xl lg:text-6xl">
          THE MEMORY LAYER FOR HUMAN-AGENT TEAMS
          <br />
          BUILT FOR HOW COMPANIES ACTUALLY WORK.
        </h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 w-full max-w-2xl overflow-hidden rounded-2xl max-md:mt-4"
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

export function SlideFounders() {
  return (
    <Slide>
      <SlideLabel>The Founders</SlideLabel>
      <SlideTitle>AN EXPERIENCED TEAM AT THE PERFECT TIME.</SlideTitle>
      <div className="mt-10 grid w-full max-w-4xl gap-8 max-md:mt-5 max-md:gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl bg-white/[0.03] p-6 max-md:p-4"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-md" />
              <img
                src="/pitch/dylan.png"
                alt="Dylan Vanas"
                className="relative h-14 w-14 rounded-full object-cover max-md:h-11 max-md:w-11"
              />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Dylan Vanas</div>
              <div className="text-sm text-white/40">CEO / Co-Founder</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-white/60 max-md:text-[12px] max-md:leading-relaxed">
            <li>Decade in performance marketing; built and exited 2 companies, including DopeTech.com</li>
            <li>Running ROAS.co, his team copy-pasted client context into LLMs on every project</li>
            <li>Built ROAS to fix it; closes six-figure deals and demos product live</li>
            <li>Invested $50K personal capital before raising a dollar</li>
          </ul>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl bg-white/[0.03] p-6 max-md:p-4"
        >
          <div className="mb-4 flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-full bg-purple-500/20 blur-md" />
              <img
                src="/pitch/sefy.png"
                alt="Sefy Tofan"
                className="relative h-14 w-14 rounded-full object-cover max-md:h-11 max-md:w-11"
              />
            </div>
            <div>
              <div className="text-lg font-bold text-white">Sefy Tofan</div>
              <div className="text-sm text-white/40">CTO / Co-Founder</div>
            </div>
          </div>
          <ul className="space-y-2 text-sm text-white/60 max-md:text-[12px] max-md:leading-relaxed">
            <li>Started building a personal AI brain two years ago because chat memory was not enough</li>
            <li>
              Rebuilt an 82-person agency as a 17-agent + small human team — proof of the hybrid
              thesis.
            </li>
            <li>Self-taught engineer; built the entire platform solo</li>
            <li>Manages enterprise clients and monitors system logs in real time</li>
          </ul>
        </motion.div>
      </div>
    </Slide>
  )
}

/** Slide 4 table: artifact row vs ChatGPT · Claude · Manus vs ROAS.
 * Platform shorthand reflects public positioning (GPT agent mode & connectors,
 * Claude app artifacts + Claude Code/agent SDK general execution, Manus autonomous
 * web/spreadsheet/design workflows), not exhaustive feature parity. */
function GeneralistVersusMarketingTable() {
  type Cap = 'yes' | 'partial' | 'no'
  const rows: { artifact: string; gpt: Cap; claude: Cap; manus: Cap; vibey: Cap }[] = [
    { artifact: 'Offer strategy & buyer personas', gpt: 'partial', claude: 'partial', manus: 'partial', vibey: 'yes' },
    { artifact: 'Live funnels on your domain', gpt: 'no', claude: 'no', manus: 'yes', vibey: 'yes' },
    { artifact: 'Email sequences that send', gpt: 'no', claude: 'no', manus: 'no', vibey: 'yes' },
    { artifact: 'Ads live on Meta', gpt: 'partial', claude: 'partial', manus: 'partial', vibey: 'yes' },
    { artifact: 'Social posts published', gpt: 'partial', claude: 'partial', manus: 'partial', vibey: 'yes' },
    { artifact: 'CRM & lead attribution', gpt: 'no', claude: 'no', manus: 'partial', vibey: 'yes' },
    { artifact: 'Branded presentations', gpt: 'yes', claude: 'yes', manus: 'yes', vibey: 'yes' },
  ]

  const icon = (cap: Cap) => {
    if (cap === 'yes') return <span className="text-emerald-400">✓</span>
    if (cap === 'partial') return <span className="text-amber-400/70">~</span>
    return <span className="text-red-400/50">✕</span>
  }

  const thArtifact =
    'w-[32%] px-3 py-3 text-left align-bottom text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50'
  const thLogoCol = 'w-[17%] px-1 py-3 align-bottom text-[9px] font-semibold uppercase tracking-[0.12em]'
  const tdArtifact = 'px-3 py-2 text-left text-[11px] font-medium text-white/85'
  const tdPlat =
    'max-w-[5.5rem] px-2 py-2 text-center text-[10px] leading-snug text-white/45 sm:max-w-none sm:text-[11px]'

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-black/20">
      <table className="w-full min-w-[560px] table-fixed border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            <th className={thArtifact}>Artifact</th>
            <th className={thLogoCol}>
              <div className="flex flex-col items-center gap-1.5">
                <img
                  src="/compare/chatgpt-logo.svg"
                  alt=""
                  className="mx-auto h-8 w-auto max-w-[7rem] object-contain opacity-95"
                  loading="lazy"
                />
                <span className="text-purple-400/80">ChatGPT</span>
              </div>
            </th>
            <th className={thLogoCol}>
              <div className="flex flex-col items-center gap-1.5">
                <img
                  src="/compare/anthropic.svg"
                  alt=""
                  className="mx-auto h-6 w-auto object-contain opacity-95"
                  loading="lazy"
                />
                <span className="text-orange-300/80">Claude</span>
              </div>
            </th>
            <th className={thLogoCol}>
              <div className="flex flex-col items-center gap-1.5">
                <img
                  src="/compare/manus-glyph-white.svg"
                  alt=""
                  className="mx-auto h-8 w-8 object-contain opacity-95"
                  loading="lazy"
                />
                <span className="text-sky-300/80">Manus</span>
              </div>
            </th>
            <th className={thLogoCol}>
              <div className="flex flex-col items-center gap-1.5">
                <img
                  src="/Logos/logov2/icon-white.png"
                  alt=""
                  className="mx-auto h-7 w-7 object-contain opacity-95"
                  loading="lazy"
                />
                <span className="text-emerald-400/90">Pixel</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.artifact} className="border-b border-white/[0.06] last:border-b-0">
              <td className={tdArtifact}>{r.artifact}</td>
              <td className="px-2 py-2.5 text-center text-sm">{icon(r.gpt)}</td>
              <td className="px-2 py-2.5 text-center text-sm">{icon(r.claude)}</td>
              <td className="px-2 py-2.5 text-center text-sm">{icon(r.manus)}</td>
              <td className="px-2 py-2.5 text-center text-sm">{icon(r.vibey)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-center gap-5 border-t border-white/[0.06] px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-white/40">
          <span className="text-emerald-400">✓</span> End-to-end
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-white/40">
          <span className="text-amber-400/70">~</span> Partial
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-white/40">
          <span className="text-red-400/50">✕</span> Not supported
        </span>
      </div>
    </div>
  )
}

// ─── Slide 3: Problem — Generalist Agents Give You Tools, Not Outcomes ───────

export function SlideProblemAgents() {
  return (
    <Slide className="!py-4">
      <SlideTitle>GENERALIST AGENTS GIVE YOU TOOLS, NOT OUTCOMES.</SlideTitle>

      <div className="mx-auto mt-6 w-full max-w-2xl">
        {[
          'Claude writes your copy. Manus generates a slide. ChatGPT drafts your ad. None of them launch the campaign.',
          'They give you capabilities. Not the shipped result on your domain, your ad account, your audience.',
          'Marketing needs a specialist that goes from brief to live. No one built it yet.',
        ].map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 border-t border-white/[0.08] py-3 last:border-b"
          >
            <span className="font-[family-name:var(--font-site-headline)] text-xl font-semibold tabular-nums text-white/30">
              {String(i + 1).padStart(2, '0')}
            </span>
            <p className="text-sm leading-relaxed text-white/70 md:text-[15px]">{line}</p>
          </motion.div>
        ))}
      </div>
      {/* Original illustration (commented out for quick rollback):
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-4 w-full max-w-5xl"
      >
        <IntegrationToolDispatcherMockup embedTransparent />
      </motion.div>
      */}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-6 w-full max-w-4xl"
      >
        <GeneralistVersusMarketingTable />
      </motion.div>
    </Slide>
  )
}

// ─── Slide 4: Problem — Tool Sprawl or Legacy Platforms ──────────────────────

export function SlideProblemSprawl() {
  return (
    <Slide className="!py-4">
      <SlideTitle>COMPANIES ARE DROWNING IN DISCONNECTED AI.</SlideTitle>
      <SlideSub delay={0.45}>
        Companies are wiring AI into Slack, Zoom, Gmail, calls, docs, and CRMs. Every tool thinks
        it is the only one in the room.
      </SlideSub>

      <div className="mt-6 grid w-full max-w-6xl gap-6 max-md:mt-4 max-md:gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-full lg:max-w-[92%]"
        >
          <IntegrationToolDispatcherMockup
            embedTransparent
            actionCards={DISPATCHER_MARTECH_SPRAWL_CARDS}
            stackRoleLabel="Stack tool"
          />
        </motion.div>

        <div className="w-full">
          {[
            'The average team uses 7+ AI tools just to complete one workflow. None of them share context.',
            'The human is both the glue and the bottleneck. Every new task starts with: "Let me give you some context."',
            'So AI feels generic. Because it is. It has no idea who you are, how you sell, or who your customers are.',
          ].map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 border-t border-white/[0.08] py-3 last:border-b"
            >
              <span className="font-[family-name:var(--font-site-headline)] text-xl font-semibold tabular-nums text-white/30">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[15px] leading-relaxed text-white/70 max-md:text-[13px] md:text-[17px]">{line}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Slide>
  )
}

// ─── Slide 4: Market ─────────────────────────────────────────────────────────

export function SlideMarket() {
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
