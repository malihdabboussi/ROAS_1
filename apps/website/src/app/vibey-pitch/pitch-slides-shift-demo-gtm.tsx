'use client'

import { motion } from 'framer-motion'
import {
  Clock,
  Waypoints,
  Users,
} from 'lucide-react'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK as agentLib,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import { MarketingBrainGraphMockup } from '@/components/marketing/MarketingBrainGraphMockup'
import { SpacesHeroMockup } from '@/components/marketing/SpacesHeroMockup'
import { Slide, SlideLabel, SlideTitle } from './pitch-slide-ui'
import { AgentAvatar } from './pitch-deck-shared'

export function SlideProblemMemory() {
  const promise = {
    label: 'The promise',
    title: '"AI will make your team 10x faster"',
    thesis: 'So teams added tool after tool: ChatGPT here, Claude there, Notion AI somewhere else.',
    tone: 'text-purple-300',
    border: 'border-purple-500/25',
    bg: 'bg-purple-500/[0.09]',
    ring: 'ring-purple-500/20',
  } as const

  const reality = {
    label: 'The reality',
    title: 'Every new project starts from zero',
    thesis: "Decisions get re-explained, context lives in people's heads, and the human becomes memory and a bottleneck.",
    tone: 'text-amber-300',
    border: 'border-amber-500/25',
    bg: 'bg-amber-500/[0.09]',
    ring: 'ring-amber-500/20',
  } as const

  return (
    <Slide className="!py-4">
      <SlideTitle>AI IS EVERYWHERE. MEMORY IS NOWHERE.</SlideTitle>

      <div className="relative mt-8 w-full max-w-5xl max-md:mt-4">
        <div className="grid gap-4 md:grid-cols-2">
          {[promise, reality].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.1 }}
              className={`relative rounded-2xl border ${item.border} ${item.bg} p-5 ring-1 max-md:p-3.5 ${item.ring}`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${item.tone}`}>
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-bold leading-snug text-white max-md:text-2xl md:text-4xl">{item.title}</p>
              <p className={`mt-2 text-sm font-medium leading-snug max-md:text-[13px] ${item.tone}`}>{item.thesis}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="pointer-events-none absolute left-1/2 top-1/2 hidden h-px w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center md:flex"
        >
          <div className="h-px w-full bg-gradient-to-r from-purple-400/40 via-white/30 to-amber-300/40" />
          <span className="absolute h-2.5 w-2.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.58 }}
        className="mt-6 w-full max-w-4xl text-center max-md:mt-4"
      >
        <p className="mt-2 text-base font-medium leading-relaxed text-emerald-300 max-md:text-[14px]">
          Nobody built the infrastructure underneath that lets agents and humans work with all the
          same resources, information, and tools in one place.
        </p>
      </motion.div>
    </Slide>
  )
}

export function SlideTheShift() {
  const columns = [
    {
      year: '2024',
      label: 'Autonomous agents',
      thesis: '"Fire your team, trust the AI."',
      detail: 'Failed on reliability. Hallucinations, runaway loops, no accountability.',
      accent: 'from-purple-500/12',
      ring: 'ring-purple-500/15',
      border: 'border-purple-500/15',
      tone: 'text-purple-400',
      bg: 'bg-purple-500/15',
      icon: Clock,
    },
    {
      year: '2026',
      label: 'Human-agent hybrid',
      thesis: 'Humans manage, agents execute.',
      detail: 'Trust + autonomy. Salesforce, ServiceNow, Microsoft are all pivoting here.',
      accent: 'from-emerald-500/12',
      ring: 'ring-emerald-500/15',
      border: 'border-emerald-500/15',
      tone: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
      icon: Users,
    },
    {
      year: 'The Future',
      label: 'Hybrid by default',
      thesis: '"Every org chart blends humans and agents with shared memory."',
      detail:
        'The companies building the memory layer now will be impossible to displace later.',
      accent: 'from-emerald-500/15',
      ring: 'ring-emerald-500/25',
      border: 'border-emerald-500/25',
      tone: 'text-emerald-300',
      bg: 'bg-emerald-500/20',
      icon: Waypoints,
    },
  ]
  return (
    <Slide className="!py-4">
      <SlideTitle>THE MARKET IS MOVING HERE. WE&apos;RE ALREADY THERE.</SlideTitle>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mx-auto mt-6 max-w-3xl text-center text-lg leading-relaxed text-white/70 md:text-2xl"
      >
        2024 promised AI would replace your team. It didn&apos;t. The real shift is hybrid.
      </motion.p>

      <div className="relative mt-8 flex w-full max-w-2xl flex-col">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-white/10" />

        {columns.map((c, i) => (
          <motion.div
            key={c.year}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.18 }}
            className="relative flex gap-6 pb-8 last:pb-0"
          >
            {/* Dot */}
            <div className="relative z-10 flex shrink-0 flex-col items-center">
              <div className={`h-[23px] w-[23px] rounded-full border-2 ${c.border} ${c.bg}`} />
            </div>

            {/* Content */}
            <div className="-mt-0.5 flex-1">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${c.tone}`}>
                {c.year}
              </p>
              <p className="mt-1 text-lg font-bold text-white">{c.label}</p>
              <p className={`mt-1.5 text-sm font-medium leading-snug ${c.tone}`}>{c.thesis}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">{c.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

/** Slide 4 — Solution Trio. Three gradient cards: outcomes, marketing-native, hybrid workspace. */
const SOLUTION_TRIO_CARDS = [
    {
      title: 'FOUR SELF-IMPROVING BRAINS',
      bullets: [
        'Personal brain: one for each person on your team',
        'Agent brain: one for every agent you hire',
        'Company brain: how your company thinks, prices, and operates',
        "Customer brain: built from your customers' own words",
      ],
      accent: 'from-emerald-500/12',
      ring: 'ring-emerald-500/15',
      border: 'border-emerald-500/15',
      bulletDot: 'bg-emerald-300',
    },
    {
      title: 'SUPERCHARGED AGENT WORKFLOWS',
      bullets: [
        "Agents don't start with a blank prompt",
        'They start with everything your company knows',
        'Research, content, support, outreach, and analysis are already context-aware',
        'Work executes in your voice, for your customers, with your operating logic',
      ],
      accent: 'from-purple-500/12',
      ring: 'ring-purple-500/15',
      border: 'border-purple-500/15',
      bulletDot: 'bg-purple-300',
    },
    {
      title: 'HUMANS AND AGENTS TOGETHER',
      bullets: [
        'Humans and agents work in the same place',
        'Both operate from the same memory layer',
        'Docs, tasks, dashboards, and channels stay unified',
        'No switching between the AI world and the human world',
      ],
      accent: 'from-blue-500/12',
      ring: 'ring-blue-500/15',
      border: 'border-blue-500/15',
      bulletDot: 'bg-blue-300',
    },
  ] as const

export function SlideSolutionHeadline() {
  return (
    <Slide className="!py-4">
      <SlideLabel>The Solution</SlideLabel>
      <SlideTitle>Vibey turns company knowledge into structured memory, for a supercharged human + agent workspace.</SlideTitle>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-5 w-full max-w-5xl max-md:mt-3 [&_.mockup-frame]:!min-h-[220px] [&_.mockup-frame]:!rounded-2xl [&_.mockup-frame]:!border-white/[0.08] [&_.mockup-frame]:sm:!min-h-[280px] [&_.mockup-frame]:md:!min-h-[330px] [&_.studio-app-preview-root]:!rounded-2xl [&_.studio-app-preview-root]:!bg-black/20"
      >
        <MarketingBrainGraphMockup />
      </motion.div>
    </Slide>
  )
}

const PYRAMID_LAYERS = [
  {
    label: 'SPACES',
    body: 'where humans interact with the output',
    width: 'w-[54%]',
    tone: 'text-cyan-300',
    border: 'border-cyan-400/30',
    bg: 'from-cyan-500/[0.15] via-cyan-500/[0.05] to-transparent',
    glow: 'bg-cyan-300/20',
    chipClass: 'badge-glass-blue',
    plateBorder: 'border-cyan-400/20',
    rail: 'from-cyan-300/60 to-cyan-500/15',
  },
  {
    label: 'AGENTS',
    body: 'coordinated workers powered by shared context',
    width: 'w-[72%]',
    tone: 'text-purple-300',
    border: 'border-purple-400/30',
    bg: 'from-purple-500/[0.15] via-purple-500/[0.05] to-transparent',
    glow: 'bg-purple-300/20',
    chipClass: 'badge-glass-purple',
    plateBorder: 'border-purple-400/20',
    rail: 'from-purple-300/60 to-purple-500/15',
  },
  {
    label: 'BRAIN',
    body: 'personal + company + customer memory foundation',
    width: 'w-[92%]',
    tone: 'text-emerald-300',
    border: 'border-emerald-400/30',
    bg: 'from-emerald-500/[0.15] via-emerald-500/[0.05] to-transparent',
    glow: 'bg-emerald-300/20',
    chipClass: 'badge-glass-green',
    plateBorder: 'border-emerald-400/20',
    rail: 'from-emerald-300/60 to-emerald-500/15',
  },
] as const

export function SlideArchitecturePyramid() {
  const layerNotes: Record<string, string> = {
    BRAIN: 'layer 1',
    AGENTS: 'layer 2',
    SPACES: 'layer 3',
  }

  return (
    <Slide className="!py-4">
      <SlideLabel>The Solution</SlideLabel>
      <SlideTitle className="max-w-5xl text-balance">
        A unified brain that compounds on every action.
      </SlideTitle>
      <div className="mt-6 grid w-full max-w-5xl gap-6 max-md:mt-3">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="relative mx-auto flex w-full max-w-4xl flex-col items-center p-2 max-md:p-0 md:p-3"
        >
          <div className="flex w-full flex-col items-center gap-2">
            {PYRAMID_LAYERS.map((layer, index) => (
              <motion.div
                key={layer.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 + index * 0.1 }}
                className={`relative ${layer.width}`}
              >
                <div className={`pointer-events-none absolute -inset-x-3 -top-1 h-6 rounded-full blur-xl max-md:hidden ${layer.glow}`} />
                <div
                  className={`pointer-events-none absolute inset-x-2 -bottom-2 h-4 rounded-2xl border ${layer.plateBorder} bg-white/[0.02]`}
                  aria-hidden
                />
                <div
                  className={`relative overflow-hidden rounded-2xl border ${layer.border} bg-gradient-to-b ${layer.bg} px-4 py-3.5 text-center shadow-[0_16px_34px_rgba(0,0,0,0.45)] max-md:px-3 max-md:py-2.5`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-white/25" />
                  <div className="mb-1.5 flex items-center justify-center">
                    <span className={`${layer.chipClass} badge-glass-sm uppercase tracking-[0.16em]`}>
                      {layer.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/78 md:text-[13px]">
                    {layer.body}
                  </p>
                </div>
                {index < PYRAMID_LAYERS.length - 1 ? (
                  <div className={`mx-auto mt-1.5 h-2.5 w-px bg-gradient-to-b ${layer.rail}`} />
                ) : null}

                <div className="pointer-events-none absolute left-full top-1/2 ml-3 hidden -translate-y-1/2 items-center gap-1.5 md:flex">
                  <span className="-rotate-2 whitespace-nowrap font-serif text-base italic lowercase tracking-wide text-white/70">
                    {layerNotes[layer.label]}
                  </span>
                  <span className="text-sm font-semibold text-white/55">←</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Slide>
  )
}

export function SlideSolutionTrio() {
  return (
    <Slide className="!py-4">
      <SlideLabel>The Solution</SlideLabel>
      <div className="mt-3 grid w-full max-w-5xl gap-4 md:grid-cols-3">
        {SOLUTION_TRIO_CARDS.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + i * 0.12 }}
            className={`relative flex flex-col overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.accent} via-transparent to-transparent p-6 ring-1 ${c.ring}`}
          >
            <motion.div
              aria-hidden
              animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.9, 1.08, 0.9] }}
              transition={{ duration: 4.2, repeat: Infinity, delay: i * 0.2 }}
              className={`pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full ${c.bulletDot} opacity-25 blur-2xl`}
            />
            <h3 className="font-[family-name:var(--font-site-headline)] text-base font-bold tracking-tight text-white">
              {c.title}
            </h3>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-white/55">
              {c.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${c.bulletDot}`} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </Slide>
  )
}

/** Slide 7 — Org Chart Onboarding. Mixed human + agent hierarchy on day one. */
export function SlideOrgChartOnboarding() {
  const humans = [
    { name: 'CEO', role: 'Founder', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=256&h=256&fit=crop&crop=faces&auto=format&q=82' },
    { name: 'Marketing Director', role: 'Hiring Manager', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces&auto=format&q=82' },
    { name: 'Brand Lead', role: 'Voice Owner', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces&auto=format&q=82' },
  ]

  const BASE_ROLES = [
    { roleKey: 'analyst', jobTitle: 'Marketing Analyst' },
    { roleKey: 'designer', jobTitle: 'Creative Designer' },
    { roleKey: 'pm_marketing', jobTitle: 'Social Media Manager' },
    { roleKey: 'copywriter', jobTitle: 'Copywriter' },
  ]

  const baseAgents = BASE_ROLES.map((row) => {
    const a = agentLib.find((x) => x.role_key === row.roleKey)!
    return { ...a, jobTitle: row.jobTitle }
  })

  const HIRE_ROLES = [
    { id: 'h1', roleKey: 'pm_operations', jobTitle: 'Ads Manager' },
    { id: 'h2', roleKey: 'pm_product', jobTitle: 'Email Marketer' },
    { id: 'h3', roleKey: 'developer', jobTitle: 'SEO Specialist' },
    { id: 'h4', roleKey: 'automation_integrations_engineer', jobTitle: 'Funnel Builder' },
    { id: 'h5', roleKey: 'analyst', jobTitle: 'YouTube Analyst', displayName: 'Soren' },
    { id: 'h6', roleKey: 'copywriter', jobTitle: 'Brand Strategist', displayName: 'Priya' },
    { id: 'h7', roleKey: 'designer', jobTitle: 'Video Editor', displayName: 'Avery' },
  ]

  const hireAgents = HIRE_ROLES.map((row) => {
    const a = agentLib.find((x) => x.role_key === row.roleKey)!
    return { ...a, default_name: ('displayName' in row && row.displayName) || a.default_name, jobTitle: row.jobTitle, slotId: row.id }
  })

  const HumanBadge = () => (
    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider text-red-400">
      Human
    </span>
  )

  const HumanCard = ({ h, delay, size = 40 }: { h: { name: string; role: string; image: string }; delay: number; size?: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.04] px-2 py-3"
    >
      <img
        src={h.image}
        alt={h.name}
        className="rounded-full object-cover ring-1 ring-white/15"
        style={{ width: size, height: size }}
      />
      <p className="text-[10px] font-semibold text-white/80">{h.name}</p>
      <p className="text-center text-[8px] font-medium uppercase tracking-wide text-white/40">{h.role}</p>
      <HumanBadge />
    </motion.div>
  )

  return (
    <Slide className="!py-4">
      <SlideTitle>THE HYBRID ORG CHART</SlideTitle>

      {/* Founder above Vibey */}
      <HumanCard h={humans[0]!} delay={0.3} />

      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay: 0.45 }}
        className="h-4 w-px origin-top bg-gradient-to-b from-white/20 to-emerald-500/20"
      />

      {/* Vibey CMO */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col items-center gap-1"
      >
        <div className="relative">
          <div className="absolute -inset-2 rounded-full bg-emerald-500/15 blur-md" />
          <AgentAvatar src={VIBEY_MARKETING_PORTRAIT_FALLBACK} name="Vibey" size={48} />
        </div>
        <span className="text-[10px] font-semibold text-white">Vibey</span>
        <span className="text-[8px] text-emerald-400">CMO Agent</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay: 0.6 }}
        className="h-4 w-px origin-top bg-gradient-to-b from-emerald-500/30 to-white/10"
      />

      {/* Mixed row: base agents + humans interleaved */}
      <div className="mt-1 grid w-full max-w-3xl grid-cols-3 gap-3 max-md:gap-2 max-[380px]:grid-cols-2 sm:grid-cols-6">
        {/* Agent */}
        {baseAgents.slice(0, 2).map((agent, i) => (
          <motion.div
            key={agent.role_key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 + i * 0.08 }}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-3"
          >
            <AgentAvatar src={agent.image_url} name={agent.default_name} size={36} />
            <p className="text-[9px] font-semibold text-white/80">{agent.default_name}</p>
            <p className="text-center text-[7px] font-medium uppercase tracking-wide text-emerald-400/70">{agent.jobTitle}</p>
          </motion.div>
        ))}
        {/* Human */}
        <HumanCard h={humans[1]!} delay={0.8} size={36} />
        {/* Agent */}
        {baseAgents.slice(2).map((agent, i) => (
          <motion.div
            key={agent.role_key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 + i * 0.08 }}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-3"
          >
            <AgentAvatar src={agent.image_url} name={agent.default_name} size={36} />
            <p className="text-[9px] font-semibold text-white/80">{agent.default_name}</p>
            <p className="text-center text-[7px] font-medium uppercase tracking-wide text-emerald-400/70">{agent.jobTitle}</p>
          </motion.div>
        ))}
        {/* Human */}
        <HumanCard h={humans[2]!} delay={0.95} size={36} />
      </div>

      {/* Hired agents row */}
      <div className="mt-2 grid w-full max-w-3xl grid-cols-4 gap-2 max-md:grid-cols-3 max-[380px]:grid-cols-2 sm:grid-cols-7">
        {hireAgents.map((agent, i) => (
          <motion.div
            key={agent.slotId}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.05 + i * 0.05, type: 'spring', stiffness: 120 }}
            className="flex flex-col items-center gap-1 rounded-lg border border-purple-500/10 bg-purple-500/[0.04] px-1.5 py-2"
          >
            <AgentAvatar src={agent.image_url} name={agent.default_name} size={32} />
            <p className="text-[8px] font-semibold text-white/70">{agent.default_name}</p>
            <p className="text-center text-[7px] uppercase tracking-wide text-purple-400/60">{agent.jobTitle}</p>
          </motion.div>
        ))}
      </div>

      {/* Moat callout */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="mt-6 max-w-2xl text-center text-sm leading-relaxed text-white/55"
      >
        Vibey works alongside your team and creates an integrated memory workspace that companies
        will use for years or even decades.
      </motion.p>
    </Slide>
  )
}

export function SlideSpacesWorkspace() {
  const spacesBullets = [
    'Humans and agents work in the same place',
    'Both operate from the same memory layer',
    'Docs, tasks, dashboards, and channels stay unified',
    'No switching between the AI world and the human world',
  ] as const

  return (
    <Slide className="!py-4 max-md:!justify-start max-md:!py-2">
      <SlideLabel>Spaces</SlideLabel>
      <SlideTitle className="text-balance text-[52px] leading-[0.98] md:text-[56px] max-md:!text-[24px] max-md:!leading-[1.07] max-[430px]:!text-[22px] max-[380px]:!text-[20px]">
        LAYER 3 SPACES: YOUR NEW AGENT + HUMAN CO WORKSPACE
      </SlideTitle>
      <div className="mt-3 grid w-full max-w-6xl items-center gap-6 max-md:mt-2 max-md:gap-3 md:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="mx-auto w-full max-w-[500px] [&_.compare-hero-card-shell]:!min-h-[180px] [&_.compare-hero-card-shell]:sm:!min-h-[220px] [&_.compare-hero-card-shell]:lg:!min-h-[250px] [&_.compare-hero-card-shell]:max-md:!h-[260px] [&_.compare-hero-card-shell]:max-md:!min-h-[260px] [&_.compare-hero-card-shell]:max-[430px]:!h-[240px] [&_.compare-hero-card-shell]:max-[430px]:!min-h-[240px]"
        >
          <SpacesHeroMockup libraryAgents={agentLib} sizeVariant="deck" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.42 }}
          className="mx-auto w-full max-w-xl rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-6 ring-1 ring-blue-500/10 max-md:p-4"
        >
          <h3 className="font-[family-name:var(--font-site-headline)] text-xl font-bold tracking-tight text-white max-md:text-lg">
            HUMANS AND AGENTS TOGETHER
          </h3>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/75 max-md:mt-2 max-md:space-y-2 max-md:text-[13px]">
            {spacesBullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-300" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </Slide>
  )
}

