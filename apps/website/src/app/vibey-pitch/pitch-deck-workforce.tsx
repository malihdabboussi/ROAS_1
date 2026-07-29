'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK as agents,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import { MarketingMemoryStackMockup } from '@/components/marketing/MarketingMemoryStackMockup'
import { Slide, SlideLabel, SlideTitle } from './pitch-slide-ui'
import { AgentAvatar } from './pitch-deck-shared'

/**
 * Pitch-only face URLs for org slots where template library + de-dupe picked weak B&W or duplicate-looking shots.
 * Keys are `HIRED_POS` slot ids (see SlideTeamToOrgTransition).
 */
const PITCH_ORG_PORTRAIT_OVERRIDES: Record<string, string> = {
  h4: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=faces&auto=format&q=82',
  h6: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=256&h=256&fit=crop&crop=faces&auto=format&q=82',
  h7: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=256&h=256&fit=crop&crop=faces&auto=format&q=82',
}

/** Pitch org-chart CEO — logo mark (not a photo), matches cover / brand. */
const VIBEY_ORG_CEO_LOGO_SRC = '/Logos/logov2/icon-white.png'

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

// ─── Slide 6 (Workforce Reveal) — Team scatter → Organized workforce (two phases) ─────

function SlideTeamToOrgTransition({ phase }: { phase: 0 | 1 }) {
  const [teamHiredOut, setTeamHiredOut] = useState(false)

  useEffect(() => {
    if (phase === 0) setTeamHiredOut(false)
  }, [phase])

  const BASE_ROLES: { roleKey: string; jobTitle: string }[] = [
    { roleKey: 'analyst', jobTitle: 'Marketing Analyst' },
    { roleKey: 'designer', jobTitle: 'Creative Designer' },
    { roleKey: 'pm_marketing', jobTitle: 'Social Media Manager' },
    { roleKey: 'copywriter', jobTitle: 'Copywriter' },
  ]

  const HIRE_ROLES: { id: string; roleKey: string; jobTitle: string; displayName?: string }[] = [
    { id: 'h1', roleKey: 'pm_operations', jobTitle: 'Ads Manager' },
    { id: 'h2', roleKey: 'pm_product', jobTitle: 'Email Marketer' },
    { id: 'h3', roleKey: 'developer', jobTitle: 'SEO Specialist' },
    { id: 'h4', roleKey: 'automation_integrations_engineer', jobTitle: 'Funnel Builder' },
    { id: 'h5', roleKey: 'analyst', jobTitle: 'YouTube Analyst', displayName: 'Soren' },
    { id: 'h6', roleKey: 'copywriter', jobTitle: 'Brand Strategist', displayName: 'Priya' },
    { id: 'h7', roleKey: 'designer', jobTitle: 'Video Editor', displayName: 'Avery' },
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
    <Slide className="!py-4">
      <div className="relative w-full shrink-0">
        <AnimatePresence mode="wait">
          {phase === 0 ? (
            <motion.div
              key="team-copy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="w-full"
            >
              <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5">
                <div className="grid w-full max-w-6xl items-center gap-8 max-md:gap-3 md:grid-cols-[1.08fr_0.92fr]">
                  <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45, duration: 0.45 }}
                    className="mx-auto w-full max-w-[460px] [&_.compare-hero-card-shell]:!min-h-[230px] [&_.compare-hero-card-shell]:sm:!min-h-[250px] [&_.compare-hero-card-shell]:!overflow-visible [&_.compare-hero-card-shell]:!rounded-none [&_.compare-hero-card-shell]:!border-0 [&_.compare-hero-card-shell]:!bg-transparent [&_.compare-hero-card-shell]:!backdrop-blur-none [&_.compare-hero-card-shell]:!shadow-none max-md:[&_.compare-hero-card-shell]:!min-h-[170px]"
                  >
                    <MarketingMemoryStackMockup />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.52, duration: 0.45 }}
                    className="mx-auto w-full max-w-xl p-1 max-md:px-0"
                  >
                    <div className="mb-4 text-center max-md:mb-2">
                      <h3 className="font-[family-name:var(--font-site-headline)] text-3xl font-bold leading-[0.95] tracking-tight text-white max-md:text-[1.55rem] md:text-4xl">
                        LAYER 1{' '}
                        <span className="line-through decoration-red-500 decoration-4">
                          PROMPT-POWERED
                        </span>
                      </h3>
                      <h3 className="mt-1 font-[family-name:var(--font-site-headline)] text-4xl font-bold leading-[0.92] tracking-tight text-white max-md:text-[2rem] md:text-[3rem]">
                        BRAIN-POWERED
                      </h3>
                    </div>
                    <h3 className="font-[family-name:var(--font-site-headline)] text-xl font-bold tracking-tight text-white max-md:text-lg">
                      FOUR SELF-IMPROVING BRAINS
                    </h3>
                    <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/75 max-md:mt-2 max-md:space-y-2 max-md:text-[13px]">
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                        <span>Personal brain: one for each person on your team</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                        <span>Agent brain: one for every agent you hire</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                        <span>Company brain: how your company thinks, prices, and operates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                        <span>Customer brain: built from your customers&apos; own words</span>
                      </li>
                    </ul>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="org-copy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="w-full"
            >
              <SlideTitle>LAYER 2: SUPERCHARGED AGENT WORKFLOWS</SlideTitle>

              <div className="mt-4 grid w-full max-w-6xl items-start gap-8 max-md:mt-2 max-md:gap-3 md:grid-cols-[1.08fr_0.92fr]">
                <motion.div
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="w-full"
                >
                  {/* CEO — same Rex avatar as the dispatcher center node */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-2 flex flex-col items-center gap-1"
                  >
                    <div className="relative">
                      <div className="absolute -inset-2 rounded-full bg-emerald-500/15 blur-md" />
                      <AgentAvatar src={VIBEY_MARKETING_PORTRAIT_FALLBACK} name="Pixel" size={56} />
                    </div>
                    <span className="text-xs font-semibold text-white">Pixel</span>
                    <span className="text-[10px] text-emerald-400">CEO</span>
                  </motion.div>

                  {/* Connector line */}
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ delay: 0.45 }}
                    className="mx-auto h-6 w-px origin-top bg-gradient-to-b from-emerald-500/30 to-white/10"
                  />

                  {/* Base agents row */}
                  <div className="mx-auto grid w-full max-w-xl grid-cols-4 gap-3 max-md:grid-cols-3 max-md:gap-1.5 max-[380px]:grid-cols-2">
                    {baseAgents.map((agent, i) => (
                      <motion.div
                        key={agent.slotId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.08 }}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-3"
                      >
                        <AgentAvatar src={agent.image_url} name={agent.default_name} size={40} />
                        <p className="text-[10px] font-semibold text-white/80">{agent.default_name}</p>
                        <p className="text-center text-[8px] font-medium uppercase tracking-wide text-emerald-400/70">{agent.jobTitle}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Hire section */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.85 }}
                    className="mt-5 flex flex-col items-center gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300/85 max-[380px]:hidden">
                        NEW AGENTS IN ONE CLICK →
                      </span>
                      <span className="hidden text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-300/85 max-[380px]:inline">
                        ADD AGENTS →
                      </span>
                      <motion.button
                        type="button"
                        onClick={() => setTeamHiredOut(true)}
                        disabled={teamHiredOut}
                        animate={
                          teamHiredOut
                            ? undefined
                            : {
                                opacity: [1, 0.72, 1],
                                boxShadow: [
                                  '0 0 0 rgba(16,185,129,0)',
                                  '0 0 24px rgba(16,185,129,0.5)',
                                  '0 0 0 rgba(16,185,129,0)',
                                ],
                              }
                        }
                        transition={{ duration: 1.05, repeat: Infinity, ease: 'easeInOut' }}
                        className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-6 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-emerald-200 transition-colors hover:border-emerald-300/70 hover:bg-emerald-500/25 disabled:cursor-default disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/35"
                      >
                        {teamHiredOut ? 'Added' : 'Add Agents'}
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Hired agents */}
                  <AnimatePresence>
                    {teamHiredOut && (
                      <>
                        <motion.div
                          initial={{ opacity: 0, scaleY: 0 }}
                          animate={{ opacity: 1, scaleY: 1 }}
                          transition={{ duration: 0.3 }}
                          className="mx-auto mt-3 h-4 w-px origin-top bg-gradient-to-b from-white/10 to-purple-500/20"
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                          className="mx-auto grid w-full max-w-3xl grid-cols-4 gap-2 max-md:grid-cols-3 max-[380px]:grid-cols-2 sm:grid-cols-7"
                        >
                          {hireAgents.map((agent, i) => (
                            <motion.div
                              key={agent.slotId}
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 120 }}
                              className="flex flex-col items-center gap-1 rounded-lg border border-purple-500/10 bg-purple-500/[0.04] px-1.5 py-2 max-md:px-1 max-md:py-1.5"
                            >
                              <AgentAvatar src={agent.image_url} name={agent.default_name} size={32} />
                              <p className="text-[8px] font-semibold text-white/70">{agent.default_name}</p>
                              <p className="text-center text-[7px] uppercase tracking-wide text-purple-400/60">{agent.jobTitle}</p>
                            </motion.div>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.38 }}
                  className="mx-auto w-full max-w-xl rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-6 ring-1 ring-purple-500/10 max-md:p-4"
                >
                  <ul className="space-y-2.5 text-sm leading-relaxed text-white/75 max-md:space-y-2 max-md:text-[13px]">
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300" />
                      <span>Agents don&apos;t start with a blank prompt</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300" />
                      <span>They start with everything your company knows</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300" />
                      <span>Research, content, support, outreach, and analysis are already context-aware</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300" />
                      <span>Work executes in your voice, for your customers, with your operating logic</span>
                    </li>
                  </ul>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Slide>
  )
}

export const TeamOrgPhaseContext = createContext<{ phase: 0 | 1 }>({ phase: 0 })

export function SlideTeamOrgDeck() {
  const { phase } = useContext(TeamOrgPhaseContext)
  return <SlideTeamToOrgTransition phase={phase} />
}
