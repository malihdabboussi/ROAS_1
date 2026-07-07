'use client'

import React, { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2, Zap } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'

const ACTION_CARDS = [
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

export function IntegrationToolDispatcherMockup() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [pulseKey, setPulseKey] = useState(0)
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseKey((prev) => prev + 1)
      setActiveIdx((prev) => (prev === null ? 0 : (prev + 1) % ACTION_CARDS.length))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <FeatureFloatingMockShell className="flex !min-h-[380px] items-center justify-center overflow-hidden sm:!min-h-[500px]">
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
        <div className="absolute h-[350px] w-[350px] rounded-full border border-white/[0.05] bg-white/[0.01]" />

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

          {/* Central Rex Portrait */}
          <motion.div
            className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-purple-500/30 bg-black shadow-[0_0_50px_rgba(168,85,247,0.2)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src={VIBEY_MARKETING_PORTRAIT_FALLBACK}
              alt="Rex"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-purple-500/10 mix-blend-overlay" />

            {/* Status Ping */}
            <div className="absolute bottom-2 right-2 h-4 w-4 animate-pulse rounded-full border-2 border-black bg-purple-500" />
          </motion.div>
        </div>

        {/* 4 Corners Action Cards */}
        {ACTION_CARDS.map((card, idx) => {
          const isActive = activeIdx === idx

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
                {/* Activation Progress Bar (Visible when active) */}
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

                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white p-2 shadow-lg transition-all duration-500 group-hover:border-white/40`}
                  >
                    <img
                      src={card.logo}
                      alt={card.name}
                      className="h-full w-full object-contain"
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
                      Integration
                    </span>
                  </div>
                </div>

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

      {/* Background Deep Glows */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-[140px]" />
      <div className="absolute bottom-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[120px]" />

      {/* Screen Polish Scanlines */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] opacity-[0.05]" />
    </FeatureFloatingMockShell>
  )
}
