'use client'

import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import { BarChart3, Briefcase, LayoutTemplate } from 'lucide-react'
import { motion } from 'framer-motion'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

type LaneCard = {
  title: string
  subtitle: string
  evidence: string
  chips: string[]
  icon: LucideIcon
  iconWrap: string
  rotateDeg: number
  position: { top?: string; right?: string; bottom?: string; left?: string }
  z: number
  /** `left: 50%` + motion `x: '-50%'` for horizontal centering with stagger transforms. */
  centered?: boolean
}

/** HR mockup–inspired glass cards: three overlapping delegation lanes (marketing / research / ops). */
const LANE_CARDS: LaneCard[] = [
  {
    title: 'Marketing campaigns',
    subtitle: 'Growth & launch outputs',
    evidence:
      'You describe the campaign or launch outcome—ICP, offer, channels, tone—and agents turn it into real assets: multi-step nurture sequences, full funnel pages with registration and thank-you paths, paid social and search creative, and serialized social drops. Everything lands in one mission with previews, version history, and a single approval flow so you are not chasing files across tools.',
    chips: ['Sequences', 'Funnels', 'Ads', 'Social'],
    icon: LayoutTemplate,
    iconWrap: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-400',
    rotateDeg: 1.25,
    position: { top: '1.75rem', left: 'clamp(0.5rem, 2.5vw, 1.5rem)' },
    z: 10,
  },
  {
    title: 'Research and analysis',
    subtitle: 'Intel & narrative',
    evidence:
      'When you need depth before you ship, the research lane produces competitor teardowns, positioning matrices, and market maps tied to your Brain so claims stay consistent. Analysts pull structured content research—what is ranking, what angles are tired, and what proof your ICP expects—then package it as briefs and slide-ready narratives your copy and design work can execute against without another kickoff meeting.',
    chips: ['Competitors', 'Market map', 'Content intel'],
    icon: BarChart3,
    iconWrap: 'border-secondary-light/30 bg-secondary-light/10 text-secondary-light',
    rotateDeg: -1.35,
    position: { top: '2.25rem', right: 'clamp(0.5rem, 2.5vw, 1.5rem)' },
    z: 20,
  },
  {
    title: 'Operations and content',
    subtitle: 'Systems & comms',
    evidence:
      'Behind-the-scenes work still has to get done: client onboarding flows with clear steps and owners, weekly or daily status digests for stakeholders, meeting summaries that capture decisions and owners, and long-form posts drafted from call transcripts or voice notes. Those outputs stay aligned to your workspace templates and voice so ops documentation does not read like a different company than your marketing.',
    chips: ['Onboarding', 'Digests', 'Meetings', 'Long-form'],
    icon: Briefcase,
    iconWrap: 'border-amber-400/25 bg-amber-400/10 text-amber-400',
    rotateDeg: -1.75,
    position: { bottom: '2rem', left: '50%' },
    z: 30,
    centered: true,
  },
]

const STAGGER_SEC = 0.42
const ENTER_DURATION = 0.52
const ENTER_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

function DelegationLaneCard({ card, index }: { card: LaneCard; index: number }) {
  const Icon = card.icon
  const style: CSSProperties = {
    zIndex: card.z,
    top: card.position.top,
    right: card.position.right,
    bottom: card.position.bottom,
    left: card.position.left,
  }

  const motionXY = card.centered
    ? {
        initial: { opacity: 0, y: 40, rotate: card.rotateDeg, x: '-50%' },
        whileInView: { opacity: 1, y: 0, rotate: card.rotateDeg, x: '-50%' },
      }
    : {
        initial: { opacity: 0, y: 40, rotate: card.rotateDeg },
        whileInView: { opacity: 1, y: 0, rotate: card.rotateDeg },
      }

  return (
    <motion.div
      className="glass-card absolute flex w-[min(100%,320px)] max-w-[320px] flex-col gap-3 p-4 shadow-xl sm:w-[308px]"
      style={style}
      {...motionXY}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        delay: index * STAGGER_SEC,
        duration: ENTER_DURATION,
        ease: ENTER_EASE,
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${card.iconWrap}`}
          >
            <Icon size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-bold leading-tight text-white sm:text-xs">{card.title}</h3>
            <p className="text-text-muted text-[9px] font-medium uppercase tracking-wider">{card.subtitle}</p>
          </div>
        </div>
        <div className="indicator-dot-glass indicator-dot-glass-green mt-1 h-2 w-2 shrink-0 rounded-full" />
      </div>

      <div className="bg-color-subtle rounded-xl border border-white/5 p-3.5">
        <p className="text-text-muted text-[10px] leading-relaxed sm:text-[11px]">{card.evidence}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {card.chips.map((c) => (
            <span
              key={c}
              className="border-color-glass rounded-lg border bg-white/[0.03] px-2 py-0.5 text-[9px] font-medium text-white/80"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export function MarketingMissionDeliverableStacksMockup() {
  return (
    <FeatureFloatingMockShell>
      <div className="relative min-h-[min(100vw,600px)] sm:min-h-[580px]">
        {LANE_CARDS.map((card, index) => (
          <DelegationLaneCard key={card.title} card={card} index={index} />
        ))}
      </div>
    </FeatureFloatingMockShell>
  )
}
