'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Brain } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'
import { MARKETING_AGENT_LIBRARY_FALLBACK } from '@/lib/agent-library-fallback'

/* ─── Miniature Brain Graph Component ──────── */
const MEM_COLORS = {
  fact: 'var(--brain-mem-fact)',
  decision: 'var(--brain-mem-decision)',
  insight: 'var(--brain-mem-insight)',
  story: 'var(--brain-mem-story)',
  framework: 'var(--brain-mem-framework)',
  preference: 'var(--brain-mem-preference)',
  event: 'var(--brain-mem-event)',
  snapshot: 'var(--brain-mem-snapshot)',
}

interface MiniNode {
  x: number
  y: number
  r: number
  color: string
}

function MiniBrainGraph({ seed, color }: { seed: number; color: string }) {
  const nodes = useMemo(() => {
    const n: MiniNode[] = []
    const count = 14 + (seed % 6)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + seed * 0.1
      const dist = 12 + Math.sin(i * seed * 0.5) * 8 + (i % 2 === 0 ? 10 : 15)
      n.push({
        x: 40 + Math.cos(angle) * dist,
        y: 40 + Math.sin(angle) * dist,
        r: 1.2 + (i % 3) * 0.4,
        color: Object.values(MEM_COLORS)[(i + seed) % Object.values(MEM_COLORS).length],
      })
    }
    return n
  }, [seed])

  const centerColor =
    color === 'purple'
      ? 'rgb(var(--accent-secondary-rgb))'
      : color === 'blue'
        ? '#3B82F6'
        : 'rgb(var(--accent-emerald-rgb))'

  return (
    <svg
      viewBox="0 0 80 80"
      className="h-12 w-12 scale-110 opacity-90 transition-opacity duration-500 group-hover:opacity-100"
    >
      <defs>
        <radialGradient id={`glow-${seed}`}>
          <stop offset="0%" stopColor={centerColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor={centerColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Central Hub Glow */}
      <circle cx="40" cy="40" r="25" fill={`url(#glow-${seed})`} />

      {/* Connections */}
      <g opacity="0.15">
        {nodes.map((node, i) => (
          <React.Fragment key={i}>
            <line x1="40" y1="40" x2={node.x} y2={node.y} stroke="white" strokeWidth="0.3" />
            {i > 0 && (
              <line
                x1={nodes[i - 1].x}
                y1={nodes[i - 1].y}
                x2={node.x}
                y2={node.y}
                stroke="white"
                strokeWidth="0.2"
              />
            )}
          </React.Fragment>
        ))}
      </g>

      {/* Nodes */}
      {nodes.map((node, i) => (
        <motion.circle
          key={i}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={node.color}
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 3 + (i % 4), repeat: Infinity, delay: i * 0.1 }}
          style={{ filter: `drop-shadow(0 0 3px ${node.color})` }}
        />
      ))}

      {/* Center Core Dot */}
      <circle cx="40" cy="40" r="3" fill="white" style={{ filter: 'drop-shadow(0 0 5px white)' }} />
    </svg>
  )
}

const BRAIN_NODES = [
  { id: 'personal', label: 'User Brain', color: 'purple', kicker: 'USER', seed: 42 },
  { id: 'agent', label: 'Agent Brain', color: 'blue', kicker: 'EXPERT', seed: 123 },
  { id: 'company', label: 'Company Brain', color: 'emerald', kicker: 'COMPANY', seed: 999 },
  { id: 'customer', label: 'Customer Brain', color: 'purple', kicker: 'CUSTOMER', seed: 77 },
]

// Select 6 specific agents for the inner core
const AGENT_KEYS = [
  'pm_marketing',
  'copywriter',
  'designer',
  'automation_integrations_engineer',
  'developer',
  'analyst',
]

// Custom DataPacket component for premium movement along lines
function DataPacket({
  x1,
  y1,
  x2,
  y2,
  color,
  delay,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  delay: number
}) {
  return (
    <motion.circle
      r="1.5"
      fill="currentColor"
      className={color}
      initial={{ opacity: 0, x: x1, y: y1 }}
      animate={{
        opacity: [0, 1, 0],
        x: [x1, x2],
        y: [y1, y2],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  )
}

export function MarketingMemoryStackMockup() {
  const [rotation, setRotation] = useState(0)

  // Filter the agents from the library
  const agents = useMemo(() => {
    return AGENT_KEYS.map((key) =>
      MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === key),
    ).filter(Boolean) as any[]
  }, [])

  useEffect(() => {
    let frameId: number
    const animate = () => {
      setRotation((prev) => (prev + 0.1) % 360) // Slowed down for premium feel
      frameId = requestAnimationFrame(animate)
    }
    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [])

  return (
    <FeatureFloatingMockShell className="flex !min-h-[380px] flex-col overflow-hidden sm:!min-h-[550px]">
      {/* Mobile: title is its own section above; md+: overlays top center */}

      {/* Orbital hub: one centered box so rings + brains + core stay aligned on mobile */}
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center px-2 pb-4 md:pb-0">
        <div className="relative aspect-square w-[min(100%,440px)] max-w-[440px] origin-center scale-[0.58] sm:scale-90 md:-translate-y-7 md:scale-100">
          {/* Outer Orbital Ring Path (Multiple layers for depth) */}
          <div className="absolute left-1/2 top-1/2 h-[440px] max-h-full w-[440px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.02]" />
          <div className="absolute left-1/2 top-1/2 h-[380px] max-h-[86%] w-[380px] max-w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05] bg-white/[0.01]" />
          <div className="absolute left-1/2 top-1/2 h-[300px] max-h-[68%] w-[300px] max-w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.03]" />

          {/* 3 Brain Nodes (Rotating) */}
          {BRAIN_NODES.map((node, idx) => {
            const angle = (idx * (360 / BRAIN_NODES.length) + rotation) % 360
            const radian = (angle * Math.PI) / 180
            const radius = 200
            const x = radius * Math.cos(radian)
            const y = radius * Math.sin(radian)
            const colorClass =
              node.color === 'purple'
                ? 'text-brandSecondary'
                : node.color === 'blue'
                  ? 'text-blue'
                  : 'text-primary'
            const glowClass =
              node.color === 'purple'
                ? 'bg-brandSecondary'
                : node.color === 'blue'
                  ? 'bg-blue'
                  : 'bg-primary'

            return (
              <div
                key={node.id}
                className="absolute left-1/2 top-1/2 z-30"
                style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
              >
                <div className="group relative cursor-pointer">
                  {/* Dynamic Glow Layer */}
                  <div
                    className={`absolute -inset-10 rounded-full ${glowClass}/20 opacity-40 blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-100`}
                  />

                  {/* Main Node Circle containing MiniBrainGraph */}
                  <motion.div
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/60 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all duration-500 group-hover:border-white/40 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`}
                    whileHover={{ scale: 1.15 }}
                  >
                    <MiniBrainGraph seed={node.seed} color={node.color} />

                    {/* Label (Floating) */}
                    <div className="pointer-events-none absolute -bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                      <span className="mb-0.5 block text-[8px] font-black uppercase tracking-[0.35em] text-white/30">
                        {node.kicker}
                      </span>
                      <span className="block text-[12px] font-bold tracking-tight text-white/90">
                        {node.label}
                      </span>
                    </div>

                    {/* Pulsing Outer Ring for Node */}
                    <div
                      className={`absolute -inset-1 animate-ping rounded-full border border-white/10 opacity-10`}
                    />
                  </motion.div>

                  {/* SVG Connections & Packets */}
                  <svg
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible"
                    width="1"
                    height="1"
                  >
                    {agents.map((_, aIdx) => {
                      const agentAngle = aIdx * (360 / agents.length)
                      const agentRadian = (agentAngle * Math.PI) / 180
                      const agentRadius = 85
                      const ax = agentRadius * Math.cos(agentRadian) - x
                      const ay = agentRadius * Math.sin(agentRadian) - y

                      return (
                        <React.Fragment key={aIdx}>
                          {/* Static Beam */}
                          <line
                            x1="0"
                            y1="0"
                            x2={ax}
                            y2={ay}
                            stroke="currentColor"
                            className={`${colorClass} opacity-[0.06]`}
                            strokeWidth="0.5"
                          />
                          {/* Moving Packets */}
                          <DataPacket
                            x1={0}
                            y1={0}
                            x2={ax}
                            y2={ay}
                            color={colorClass}
                            delay={aIdx * 0.4}
                          />
                        </React.Fragment>
                      )
                    })}
                  </svg>
                </div>
              </div>
            )
          })}

          {/* Inner Core: 6 Agents with Portraits */}
          <div className="absolute left-1/2 top-1/2 flex h-44 w-48 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            {/* Central Atmospheric Glow */}
            <div className="animate-glow-pulse absolute inset-0 rounded-full bg-emerald-500/10 blur-[100px]" />

            {/* Agent Nodes Cluster */}
            {agents.map((agent, idx) => {
              if (!agent) return null
              const angle = idx * (360 / agents.length)
              const radian = (angle * Math.PI) / 180
              const radius = 85
              const x = radius * Math.cos(radian)
              const y = radius * Math.sin(radian)

              return (
                <motion.div
                  key={agent.role_key}
                  className="absolute left-1/2 top-1/2 z-20 -ml-7 -mt-7"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    x,
                    y,
                  }}
                  transition={{
                    delay: idx * 0.1 + 0.5,
                    type: 'spring',
                    stiffness: 100,
                    damping: 15,
                  }}
                >
                  <motion.div
                    className="group relative cursor-help"
                    animate={{
                      y: [0, -6, 0],
                      rotate: [0, idx % 2 === 0 ? 3 : -3, 0],
                    }}
                    transition={{
                      duration: 5 + idx,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: idx * 0.8,
                    }}
                  >
                    {/* Portrait Container */}
                    <div className="relative h-14 w-14 rounded-full border border-white/10 bg-white/5 p-0.5 shadow-2xl backdrop-blur-md transition-all duration-500 group-hover:scale-110 group-hover:border-white/40">
                      <div className="relative h-full w-full overflow-hidden rounded-full border border-white/5">
                        <img
                          src={agent.image_url}
                          alt={agent.default_name}
                          className="h-full w-full object-cover grayscale-[0.2] transition-all duration-500 group-hover:grayscale-0"
                        />
                        {/* Inner overlay */}
                        <div className="absolute inset-0 bg-emerald-500/10 opacity-40 transition-opacity group-hover:opacity-0" />
                      </div>
                    </div>

                    {/* Enhanced Tooltip */}
                    <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 transition-all duration-300 group-hover:opacity-100">
                      <div className="min-w-max origin-bottom scale-90 rounded-lg border border-white/10 bg-black/95 px-3 py-1.5 shadow-2xl backdrop-blur-2xl transition-transform group-hover:scale-100">
                        <p className="mb-0.5 text-[10px] font-black uppercase leading-none tracking-widest text-white">
                          {agent.default_name}
                        </p>
                        <p className="text-[8px] font-medium uppercase italic tracking-tighter text-white/40">
                          {agent.tagline}
                        </p>
                      </div>
                      <div className="mx-auto -mt-1.5 h-2.5 w-2.5 rotate-45 border-b border-r border-white/10 bg-black shadow-xl" />
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}

            {/* Central ROAS Mark */}
            <motion.div
              className="relative z-40 h-20 w-20 overflow-hidden rounded-full border border-emerald-500/20 bg-black shadow-2xl"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-purple-500/20" />
              <div className="relative flex h-full w-full items-center justify-center">
                <Brain size={34} className="text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.45)]" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-spin-slow {
          animation: spin 10s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </FeatureFloatingMockShell>
  )
}
