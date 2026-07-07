'use client'

import React, { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Brain, CheckCircle2, Zap } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'

export type DispatcherActionCard = {
  id: string
  name: string
  logo: string
  color: string
  action: string
  result: string
  x: number
  y: number
  logoScale?: number
  /** White / light logos (e.g. SVG marks) stay visible on dark tile. Default: white circle. */
  logoOnDark?: boolean
}

/** Martech chain for pitch slide 5: disconnected tools marketers actually juggle */
export const DISPATCHER_MARTECH_SPRAWL_CARDS: DispatcherActionCard[] = [
  {
    id: 'canva',
    name: 'Canva',
    logo: '/Integrations/Canva.png',
    color: 'cyan',
    action: 'Designing layouts',
    result: 'Asset exported',
    x: -145,
    y: -130,
    logoScale: 1.1,
  },
  {
    id: 'claude',
    name: 'Claude',
    logo: '/compare/anthropic.svg',
    color: 'orange',
    action: 'Writing copy',
    result: 'Artifact ready',
    x: 145,
    y: -115,
    logoScale: 1,
    logoOnDark: true,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    logo: '/compare/openai.svg',
    color: 'emerald',
    action: 'Refining prompts',
    result: 'Reply ready',
    x: -145,
    y: 130,
    logoScale: 0.9,
    logoOnDark: true,
  },
  {
    id: 'hootsuite',
    name: 'Hootsuite',
    logo: '/Integrations/Hootsuite.svg',
    color: 'blue',
    action: 'Scheduling posts',
    result: 'Queue updated',
    x: 145,
    y: 120,
    logoOnDark: true,
  },
]

const ACTION_CARDS: DispatcherActionCard[] = [
  {
    id: 'meta',
    name: 'Meta Ads',
    logo: '/Integrations/Meta.png',
    color: 'blue',
    action: 'Publishing Creative',
    result: 'Live in Manager',
    x: -145,
    y: -130,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    logo: '/Integrations/Stripe.png',
    color: 'emerald',
    action: 'Processing Invoice',
    result: 'Payment Received',
    x: 145,
    y: -115,
    logoScale: 1.3,
  },
  {
    id: 'slack',
    name: 'Slack',
    logo: '/Integrations/Slack.png',
    color: 'purple',
    action: 'Alerting Team',
    result: 'Lead Notified',
    x: -145,
    y: 130,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    logo: '/Integrations/HubSpot.png',
    color: 'orange',
    action: 'Syncing CRM',
    result: 'Contact Updated',
    x: 145,
    y: 120,
  },
]

export type IntegrationToolDispatcherMockupProps = {
  /** No mock shell, grid, or vignette — sits flush on parent background (e.g. pitch deck). */
  embedTransparent?: boolean
  /** Override corner cards (defaults to Meta/Stripe/Slack/HubSpot). */
  actionCards?: DispatcherActionCard[]
  /** Small label under each tool name */
  stackRoleLabel?: string
  /** When true, all cards show as active simultaneously (no cycling). */
  allActive?: boolean
  /** When true, hides the Status box inside each card and shows card.action as the subtitle instead of stackRoleLabel. */
  hideStatus?: boolean
  /** Center node style (portrait default, brain for workforce narrative). */
  centerMode?: 'portrait' | 'brain'
}

export function IntegrationToolDispatcherMockup({
  embedTransparent = false,
  actionCards,
  stackRoleLabel = 'Integration',
  allActive = false,
  hideStatus = false,
  centerMode = 'portrait',
}: IntegrationToolDispatcherMockupProps) {
  const cards = actionCards ?? ACTION_CARDS

  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [pulseKey, setPulseKey] = useState(0)
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  useEffect(() => {
    if (allActive) return
    const interval = setInterval(() => {
      setPulseKey((prev) => prev + 1)
      setActiveIdx((prev) => (prev === null ? 0 : (prev + 1) % cards.length))
    }, 3000)
    return () => clearInterval(interval)
  }, [cards.length, allActive])

  const shellClassName = embedTransparent
    ? 'relative flex w-full min-h-[380px] items-center justify-center overflow-visible bg-transparent sm:min-h-[500px]'
    : undefined

  const diagram = (
    <>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <radialGradient id={g('electric-grad')}>
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>

      <div className="relative flex h-full w-full max-w-[600px] scale-[0.6] items-center justify-center sm:scale-[0.8] md:scale-100">
        {/* Background Grids & Orbits */}
        <div className="absolute h-[450px] w-[450px] rounded-full border border-white/[0.02]" />
        <div
          className={`absolute h-[350px] w-[350px] rounded-full border border-white/[0.05] ${embedTransparent ? '' : 'bg-white/[0.01]'}`}
        />

        {/* Central Command Pulse Node */}
        <div className="relative z-50">
          {/* Radiating Shockwaves */}
          <AnimatePresence mode="wait">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`${pulseKey}-${i}`}
                initial={{ scale: 0.8, opacity: 0.5, border: '1px solid rgba(168, 85, 247, 0.5)' }}
                animate={{ scale: 4, opacity: 0, border: '1px solid rgba(168, 85, 247, 0)' }}
                transition={{ duration: 2.5, ease: 'easeOut', delay: i * 0.4 }}
                className="pointer-events-none absolute inset-0 rounded-full"
              />
            ))}
          </AnimatePresence>

          {/* Central command node */}
          <motion.div
            className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-purple-500/30 bg-black shadow-[0_0_50px_rgba(168,85,247,0.2)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {centerMode === 'brain' ? (
              <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-950/60 via-black to-emerald-950/50">
                <div className="absolute inset-2 rounded-full border border-emerald-400/20" />
                <Brain size={34} className="text-emerald-300" />
              </div>
            ) : (
              <>
                <img
                  src={VIBEY_MARKETING_PORTRAIT_FALLBACK}
                  alt="Rex"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-purple-500/10 mix-blend-overlay" />
              </>
            )}

            {/* Status Ping */}
            <div className="absolute bottom-2 right-2 h-4 w-4 animate-pulse rounded-full border-2 border-black bg-purple-500" />
          </motion.div>
        </div>

        {/* 4 Corners Action Cards */}
        {cards.map((card, idx) => {
          const isActive = allActive || activeIdx === idx

          return (
            <div
              key={card.id}
              className="absolute z-40"
              style={{ transform: `translate(${card.x}px, ${card.y}px)` }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  opacity: isActive ? 1 : 0.6,
                  y: isActive ? (card.y > 0 ? 10 : -10) : 0,
                }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`glass-card relative w-[180px] !bg-black/40 border-${isActive ? 'white/30' : 'white/10'} group cursor-pointer overflow-hidden p-4 shadow-2xl backdrop-blur-2xl transition-colors hover:!border-white/40`}
              >
                {!hideStatus && (
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 2.5, ease: 'linear' }}
                      className="absolute left-0 top-0 h-[2px] bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,1)]"
                    />
                  )}
                </AnimatePresence>
                )}

                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 shadow-lg transition-all duration-500 group-hover:border-white/40 ${
                      card.logoOnDark ? 'bg-zinc-900' : 'bg-white p-2'
                    }`}
                  >
                    <img
                      src={card.logo}
                      alt={card.name}
                      className={`h-full w-full ${card.logoOnDark ? 'object-cover' : 'object-contain'}`}
                      style={{
                        transform: card.logoScale ? `scale(${card.logoScale})` : 'scale(1)',
                      }}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[11px] font-bold text-white/90">
                      {card.name}
                    </span>
                    <span className="mt-0.5 text-[8px] font-medium uppercase leading-none tracking-widest text-white/40">
                      {hideStatus ? card.action : stackRoleLabel}
                    </span>
                  </div>
                </div>

                {!hideStatus && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="mb-1 text-[7px] font-bold uppercase leading-none tracking-wider text-white/30">
                        Status
                      </span>
                      <span
                        className={`text-[9px] font-semibold ${isActive ? 'text-purple-400' : 'text-white/60'} truncate leading-tight`}
                      >
                        {isActive ? card.action : card.result}
                      </span>
                    </div>
                    {isActive ? (
                      <Zap size={10} className="shrink-0 animate-pulse text-purple-400" />
                    ) : (
                      <CheckCircle2 size={10} className="shrink-0 text-white/20" />
                    )}
                  </div>
                </div>
                )}

                {/* Subtle Action Arrow */}
                <ArrowUpRight
                  size={12}
                  className="absolute right-3 top-3 text-white/10 transition-opacity group-hover:text-white/40"
                />
              </motion.div>

              {/* Connecting Electric Pulse Line */}
              <svg
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible"
                width="1"
                height="1"
                style={{ zIndex: -1 }}
              >
                <path
                  id={g(`path-${card.id}`)}
                  d={`M ${-card.x} ${-card.y} L 0 0`}
                  fill="none"
                  stroke={isActive ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth={isActive ? '1.5' : '0.5'}
                  strokeDasharray={isActive ? 'none' : '4 4'}
                  className="transition-all duration-1000"
                />
                {isActive && (
                  <circle r="6" fill={`url(#${g('electric-grad')})`}>
                    <animateMotion dur="1.5s" repeatCount="indefinite">
                      <mpath href={`#${g(`path-${card.id}`)}`} />
                    </animateMotion>
                  </circle>
                )}
              </svg>
            </div>
          )
        })}
      </div>

      {!embedTransparent && (
        <>
          <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[140px]" />
          <div className="absolute bottom-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-[0.05]" />
        </>
      )}
    </>
  )

  if (embedTransparent) {
    return <div className={shellClassName}>{diagram}</div>
  }

  return (
    <FeatureFloatingMockShell className="flex !min-h-[380px] items-center justify-center overflow-hidden sm:!min-h-[500px]">
      {diagram}
    </FeatureFloatingMockShell>
  )
}
