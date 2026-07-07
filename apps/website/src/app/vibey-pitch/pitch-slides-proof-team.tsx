'use client'

import { motion } from 'framer-motion'
import {
  Check,
  Code2,
  Megaphone,
  Minus,
  MessageSquare,
  Server,
  Shield,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Slide, SlideLabel, SlideTitle, SlideSub } from './pitch-slide-ui'

export function SlideCompetition() {
  type Cap = 'yes' | 'partial' | 'no'
  const pillars = [
    'Decisions: Why choices were made, not just what was decided',
    'Customer patterns: Signals from every interaction, compounding over time',
    'Operating judgment: Exceptions, preferences, how work actually flows',
    'Compounds with use: More usage = smarter agents, specifically for your business',
  ] as const

  const generalistRows: { artifact: string; obsidian: Cap; gpt: Cap; claude: Cap; manus: Cap; vibey: Cap }[] = [
    {
      artifact:
        'Full marketing suite to build buyer personas, launch live brains, send emails, create and post social content, and run ads',
      obsidian: 'no',
      gpt: 'partial',
      claude: 'partial',
      manus: 'partial',
      vibey: 'yes',
    },
    { artifact: 'CRM & lead attribution', obsidian: 'no', gpt: 'no', claude: 'no', manus: 'partial', vibey: 'yes' },
    { artifact: 'Store and retrieve documents', obsidian: 'yes', gpt: 'partial', claude: 'partial', manus: 'partial', vibey: 'yes' },
    { artifact: 'Agent execution layer', obsidian: 'no', gpt: 'no', claude: 'no', manus: 'partial', vibey: 'yes' },
    { artifact: 'Compounding business context', obsidian: 'no', gpt: 'no', claude: 'no', manus: 'no', vibey: 'yes' },
    { artifact: 'Lightweight user memory', obsidian: 'partial', gpt: 'yes', claude: 'yes', manus: 'partial', vibey: 'yes' },
    { artifact: 'Structured company model', obsidian: 'no', gpt: 'no', claude: 'no', manus: 'no', vibey: 'yes' },
    { artifact: 'Autonomous execution', obsidian: 'no', gpt: 'no', claude: 'no', manus: 'yes', vibey: 'yes' },
    { artifact: 'Build and run agents', obsidian: 'no', gpt: 'partial', claude: 'partial', manus: 'yes', vibey: 'yes' },
    { artifact: 'Accumulated operating judgment', obsidian: 'no', gpt: 'no', claude: 'no', manus: 'no', vibey: 'yes' },
    { artifact: 'No engineering team required', obsidian: 'yes', gpt: 'yes', claude: 'yes', manus: 'partial', vibey: 'yes' },
  ]

  const icon = (value: Cap) => {
    if (value === 'yes') {
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
          <Check size={13} />
        </span>
      )
    }
    if (value === 'partial') {
      return (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300">
          <Minus size={13} />
        </span>
      )
    }
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-300">
        <X size={13} />
      </span>
    )
  }

  return (
    <Slide className="!py-4">
      <SlideTitle>COMPETITIVE LANDSCAPE</SlideTitle>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mt-6 w-full max-w-6xl overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/20 max-md:mt-3"
      >
        <table className="w-full min-w-[760px] table-fixed border-collapse max-[430px]:min-w-[700px] max-[380px]:min-w-[650px]">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="w-[34%] px-3 py-3 text-left text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50">
                Artifact
              </th>
              <th className="w-[13.2%] px-1 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50">
                <div className="flex flex-col items-center gap-1.5">
                  <img src="/Logos/logov2/icon-white.png" alt="Vibey" className="h-6 w-6 object-contain opacity-95" loading="lazy" />
                  <span className="text-emerald-400/90">Vibey</span>
                </div>
              </th>
              <th className="w-[13.2%] px-1 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50">
                <div className="flex flex-col items-center gap-1.5">
                  <img src="/compare/chatgpt-logo.svg" alt="ChatGPT" className="h-7 w-auto object-contain opacity-95" loading="lazy" />
                  <span className="text-purple-400/80">ChatGPT</span>
                </div>
              </th>
              <th className="w-[13.2%] px-1 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50">
                <div className="flex flex-col items-center gap-1.5">
                  <img src="/compare/anthropic.svg" alt="Claude" className="h-5 w-auto object-contain opacity-95" loading="lazy" />
                  <span className="text-orange-300/80">Claude</span>
                </div>
              </th>
              <th className="w-[13.2%] px-1 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50">
                <div className="flex flex-col items-center gap-1.5">
                  <img src="/compare/manus-glyph-white.svg" alt="Manus" className="h-7 w-7 object-contain opacity-95" loading="lazy" />
                  <span className="text-sky-300/80">Manus</span>
                </div>
              </th>
              <th className="w-[13.2%] px-1 py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50">
                <div className="flex flex-col items-center gap-1.5">
                  <img src="/compare/obsidian.svg" alt="Obsidian" className="h-7 w-7 object-contain opacity-95" loading="lazy" />
                  <span className="text-violet-300/80">Obsidian</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {generalistRows.map((r) => (
              <tr key={r.artifact} className="border-b border-white/[0.06] last:border-b-0">
                <td className="px-3 py-2.5 text-left text-[11px] font-medium text-white/85">{r.artifact}</td>
                <td className="px-2 py-2.5 text-center">{icon(r.vibey)}</td>
                <td className="px-2 py-2.5 text-center">{icon(r.gpt)}</td>
                <td className="px-2 py-2.5 text-center">{icon(r.claude)}</td>
                <td className="px-2 py-2.5 text-center">{icon(r.manus)}</td>
                <td className="px-2 py-2.5 text-center">{icon(r.obsidian)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75 }}
        className="mt-5 w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 max-md:mt-3 max-md:max-h-[30svh] max-md:overflow-y-auto max-md:p-4"
      >
        <p className="text-lg font-bold text-white max-md:text-base">What Vibey understands that nobody else does</p>
        <p className="mt-2 text-sm leading-relaxed text-white/70 max-md:text-[13px]">
          The hard part is not making another agent. The hard part is giving agents the same context
          a great employee builds after working inside a company for years. That context is not just
          documents - it is decisions, exceptions, customer signals, emotional patterns, and repeated
          ways of working.
        </p>
        <ul className="mt-3 grid gap-2 text-[12px] leading-relaxed text-white/78 max-md:text-[11px] md:grid-cols-2">
          {pillars.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </Slide>
  )
}

export function SlideCompetitionDeepDive() {
  const cards = [
    {
      title: 'Knowledge Tools',
      tools: 'Obsidian · Notion AI · Mem',
      body:
        'Document systems with AI search bolted on. Useful for storing notes. Cannot turn company knowledge into agent workflows.',
      checks: ['Store and retrieve documents'],
      misses: ['No agent execution layer', 'No compounding business context'],
      accent: 'from-cyan-500/15 to-transparent',
      ring: 'ring-cyan-500/20',
      border: 'border-cyan-500/20',
    },
    {
      title: 'AI Chat',
      tools: 'ChatGPT Teams · Claude · Gemini',
      body:
        'Added memory features, but lightweight. They may recall a fact or a conversation - not how your company thinks, sells, or makes decisions.',
      checks: ['Lightweight user memory'],
      misses: ['No structured company model', 'No autonomous execution'],
      accent: 'from-purple-500/15 to-transparent',
      ring: 'ring-purple-500/20',
      border: 'border-purple-500/20',
    },
    {
      title: 'Agent Platforms',
      tools: 'Relevance AI · CrewAI · LangChain',
      body:
        'Help developers build agents and workflows. Powerful, but agents still start from a prompt and a tool list. No persistent business understanding.',
      checks: ['Build and run agents'],
      misses: ['No accumulated operating judgment', 'Requires engineering team to deploy'],
      accent: 'from-emerald-500/15 to-transparent',
      ring: 'ring-emerald-500/20',
      border: 'border-emerald-500/20',
    },
  ] as const

  return (
    <Slide className="!py-4">
      <SlideLabel>COMPETITIVE LANDSCAPE</SlideLabel>
      <SlideSub className="max-w-4xl">
        Every competitor stops short. None of them connect structured company knowledge to the agents
        that execute work. That connection is the product.
      </SlideSub>

      <div className="mt-5 grid w-full max-w-6xl gap-4 md:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 + i * 0.08 }}
            className={`rounded-2xl border ${card.border} bg-gradient-to-br ${card.accent} p-5 ring-1 ${card.ring}`}
          >
            <p className="text-base font-bold text-white">{card.title}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/50">
              {card.tools}
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-white/65">{card.body}</p>

            <ul className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-white/78">
              {card.checks.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 shrink-0 text-emerald-300" />
                  <span>{line}</span>
                </li>
              ))}
              {card.misses.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <X size={13} className="mt-0.5 shrink-0 text-red-300" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.58 }}
        className="mt-5 text-center text-sm font-semibold text-amber-300"
      >
        The missing layer: structured company context that agents actually use
      </motion.p>

    </Slide>
  )
}

export function SlideScalePlan() {
  const gtmBullets = [
    'Self-serve: bottom-up adoption where one power user brings the team, then the company.',
    'Education + partnerships engine: content, webinars, challenges, creators, and affiliates.',
    'Enterprise + direct sales: high-ticket contact-sales implementations where $10K/month lives.',
  ]

  const cards = [
    {
      title: 'ICP AT SCALE',
      body:
        'Creators, coaches, marketing teams, sports associations, staffing/HR firms, and any org running agents that needs a memory layer.',
      icon: Users,
      accent: 'from-emerald-500/15 to-transparent',
      ring: 'ring-emerald-500/20',
    },
    {
      title: 'PRICING ELASTICITY',
      body:
        '$9.5K/month for full enterprise, $2.5K-$4K/month for associations and smaller teams.',
      icon: Shield,
      accent: 'from-blue-500/15 to-transparent',
      ring: 'ring-blue-500/20',
    },
    {
      title: 'SALES MOTION',
      body:
        'Agents run research, outreach, and follow-up. Humans close. Two enterprise closes/month covers rep cost and generates margin.',
      icon: Megaphone,
      accent: 'from-purple-500/15 to-transparent',
      ring: 'ring-purple-500/20',
    },
    {
      title: 'PARTNERSHIP CHANNEL',
      body:
        'JV with Adley (June launch), Viralish challenge, and agency affiliates create distribution multipliers.',
      icon: MessageSquare,
      accent: 'from-amber-500/12 to-transparent',
      ring: 'ring-amber-500/15',
    },
    {
      title: 'PRODUCT-LED GROWTH',
      body:
        'More users -> more brain training -> more agent usage -> more credits. Switching costs compound as memory grows.',
      icon: Zap,
      accent: 'from-violet-500/12 to-transparent',
      ring: 'ring-violet-500/20',
    },
    {
      title: 'WHAT CAPITAL BUYS',
      body:
        '2 enterprise sales reps, 1 developer, marketing acceleration, and enterprise features (SOC2, SSO, SLAs).',
      icon: Server,
      accent: 'from-cyan-500/12 to-transparent',
      ring: 'ring-cyan-500/15',
    },
  ]

  return (
    <Slide className="!py-4">
      <SlideLabel>The Plan</SlideLabel>
      <SlideTitle>HOW WE SCALE</SlideTitle>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-5 w-full max-w-5xl rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-4 max-md:mt-3 max-md:px-4 max-md:py-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/90">
          Go-to-market motion
        </p>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-white/70">
          {gtmBullets.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/90" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      <div className="mt-6 grid w-full max-w-5xl grid-cols-1 gap-4 max-md:mt-3 max-md:gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.07 }}
            className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${card.accent} p-5 ring-1 max-md:p-4 ${card.ring}`}
          >
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/35 ring-1 ring-white/10">
                <card.icon size={20} className="text-white/85" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">{card.title}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/50 max-[430px]:text-[10px] sm:text-xs">
                  {card.body}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-center text-[12px] text-white/55 max-md:mt-3 max-md:text-[11px]">
        Enterprise clients target: <span className="font-semibold text-white/80">200 accounts</span>{' '}
        at $2K/month average = $4.8M ARR.
      </p>
    </Slide>
  )
}

// ─── Slide: Team ─────────────────────────────────────────────────────────────

export function SlideTeamOps() {
  return (
    <Slide className="!py-4">
      <SlideLabel>Team</SlideLabel>
      <SlideTitle>COMMANDO TEAMS</SlideTitle>
      <SlideSub delay={0.45}>
        Small. Fast. No bloat. Every person owns a surface area that matters.
      </SlideSub>
      <div className="mt-6 grid w-full max-w-5xl grid-cols-1 gap-4 max-md:mt-3 max-md:gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
            className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br ${t.accent} p-5 ring-1 max-md:p-4 ${t.ring}`}
          >
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/35 ring-1 ring-white/10">
                <t.icon size={20} className="text-white/85" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white">{t.dept}</div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/45 max-[430px]:text-[10px] sm:text-xs">
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
