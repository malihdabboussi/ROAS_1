INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_37$references/type6-components/MarketingMemoryStackMockup.md$body_fp_37$, $body_c_37$# MarketingMemoryStackMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingMemoryStackMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingMemoryStackMockup.tsx`
- Import alias: `@/components/marketing/MarketingMemoryStackMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `!min-h-[380px]`
- `-bottom-14`
- `-ml-7`
- `-mt-1.5`
- `-mt-7`
- `-top-12`
- `-translate-x-1/2`
- `-translate-y-1/2`
- `animate-glow-pulse`
- `blur-[100px]`
- `duration-300`
- `duration-500`
- `grayscale-[0.2]`
- `group`
- `group-hover:border-white/40`
- `group-hover:grayscale-0`
- `group-hover:opacity-0`
- `group-hover:opacity-100`
- `group-hover:scale-100`
- `group-hover:scale-110`
- `italic`
- `object-cover`
- `origin-bottom`
- `origin-center`
- `shrink-0`
- `sm:!min-h-[550px]`
- `sm:scale-90`
- `transition-all`
- `transition-opacity`
- `transition-transform`

## Source

```tsx
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
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
  { id: 'personal', label: 'Your Brain', color: 'purple', kicker: 'PERSONAL', seed: 42 },
  { id: 'agent', label: 'Agent Brain', color: 'blue', kicker: 'EXPERT', seed: 123 },
  { id: 'campaign', label: 'Campaign Knowledge', color: 'emerald', kicker: 'PROJECT', seed: 999 },
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
      <div className="pointer-events-none z-50 w-full shrink-0 px-4 pt-5 text-center md:absolute md:left-0 md:right-0 md:top-8 md:pt-0">
        <p className="ml-[0.4em] whitespace-nowrap text-center text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
          Unified Intelligence
        </p>
      </div>

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

            {/* Central Vibey Mark */}
            <motion.div
              className="relative z-40 h-20 w-20 overflow-hidden rounded-full border border-emerald-500/20 bg-black shadow-2xl"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src="/images/autopilot/Title.png"
                alt="Vibey"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-emerald-500/5" />
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

```
$body_c_37$, $body_ct_37$text/markdown$body_ct_37$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_38$references/type6-components/MarketingMissionActivityScoreMockup.md$body_fp_38$, $body_c_38$# MarketingMissionActivityScoreMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingMissionActivityScoreMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingMissionActivityScoreMockup.tsx`
- Import alias: `@/components/marketing/MarketingMissionActivityScoreMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `!min-h-[420px]`
- `-translate-x-1/2`
- `badge-glass`
- `badge-glass-green`
- `badge-glass-orange`
- `body-3`
- `body-4`
- `compare-hero-card-shell--auto-height`
- `indicator-dot-glass`
- `indicator-dot-glass-green`
- `object-cover`
- `shrink-0`
- `typo-caption`

## Source

```tsx
'use client'

import { VIBEY_MARKETING_PORTRAIT_FALLBACK } from '@/lib/agent-library-fallback'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

type QualityEvalDemo = {
  qualityScore: number
  dimensionScores: Record<string, number>
  strengths: string[]
  weaknesses: string[]
}

const DIMENSION_LABELS: Record<string, string> = {
  intent_alignment: 'Intent',
  craft: 'Craft',
  originality: 'Original',
  brand_coherence: 'Brand',
  completeness: 'Complete',
}

const DEMO_QUALITY_EVAL: QualityEvalDemo = {
  qualityScore: 8.2,
  dimensionScores: {
    intent_alignment: 8,
    craft: 9,
    originality: 7,
    brand_coherence: 8,
    completeness: 8,
  },
  strengths: ['Clear CTA hierarchy', 'On-brand voice'],
  weaknesses: ['Could tighten hero headline'],
}

function scoreColorClass(score: number): string {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 6) return 'text-emerald-500'
  if (score >= 4) return 'text-amber-400'
  return 'text-red-400'
}

function QualityEvalScorecardMarketing({ data }: { data: QualityEvalDemo }) {
  const overall = data.qualityScore
  const dims = data.dimensionScores
  const strengths = data.strengths
  const weaknesses = data.weaknesses

  return (
    <div className="rounded-spacing-2 mt-spacing-2 space-y-2 border border-solid border-section bg-color-subtle p-spacing-3">
      <div className="flex items-center gap-3">
        <div className={`text-2xl font-bold leading-none ${scoreColorClass(overall)}`}>
          {overall.toFixed(1)}
        </div>
        <div className="min-w-0">
          <p className="typo-caption font-medium uppercase text-emerald-accent">Quality evaluation</p>
          <p className="typo-caption text-text-muted opacity-50">Independent eval</p>
        </div>
      </div>

      {Object.keys(dims).length > 0 && (
        <div className="space-y-1">
          {Object.entries(dims).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="body-4 text-text-muted w-14 shrink-0">
                {DIMENSION_LABELS[key] ?? key}
              </span>
              <div className="progress-bar-track flex-1">
                <div className="progress-bar-fill" style={{ width: `${(val / 10) * 100}%` }} />
              </div>
              <span className="body-4 text-text-muted w-5 text-right">{val}</span>
            </div>
          ))}
        </div>
      )}

      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {strengths.map((s, i) => (
            <span key={`s-${i}`} className="badge-glass badge-glass-green typo-caption font-medium">
              {s.length > 60 ? `${s.slice(0, 57)}...` : s}
            </span>
          ))}
          {weaknesses.map((w, i) => (
            <span key={`w-${i}`} className="badge-glass badge-glass-orange typo-caption font-medium">
              {w.length > 60 ? `${w.slice(0, 57)}...` : w}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function MarketingMissionActivityScoreMockup(props?: { vibeyPortraitUrl?: string }) {
  const vibeySrc =
    props?.vibeyPortraitUrl != null && String(props.vibeyPortraitUrl).trim() !== ''
      ? String(props.vibeyPortraitUrl).trim()
      : VIBEY_MARKETING_PORTRAIT_FALLBACK

  return (
    <FeatureFloatingMockShell className="compare-hero-card-shell--auto-height !min-h-[420px]">
      <div className="relative flex min-h-[420px] w-full flex-col">
        <div className="min-h-0 flex-1 px-5 pb-5 pt-4">
          <div className="relative">
            <div
              className="absolute bottom-2 left-[5px] top-[10.5px] w-px -translate-x-1/2"
              style={{ background: 'var(--divider-line)' }}
            />
            <div className="space-y-5">
              <div className="relative flex pl-6 opacity-40">
                <div className="indicator-dot-glass absolute left-[5px] top-1.5 z-10 h-[9px] w-[9px] shrink-0 -translate-x-1/2 bg-white/20" />
                <div className="min-w-0 flex-1">
                  <span className="body-3 font-medium text-white/60">Mission initialized</span>
                  <span className="body-4 mt-0.5 block text-text-muted opacity-50">12 minutes ago</span>
                </div>
              </div>

              <div className="relative flex pl-6 opacity-60">
                <div className="indicator-dot-glass absolute left-[5px] top-1.5 z-10 h-[9px] w-[9px] shrink-0 -translate-x-1/2 bg-white/20" />
                <div className="min-w-0 flex-1">
                  <span className="body-3 font-medium text-white/80">Researching audience segments</span>
                  <span className="body-4 mt-0.5 block text-text-muted opacity-50">8 minutes ago</span>
                </div>
              </div>

              <div className="relative flex pl-6">
                <div className="indicator-dot-glass indicator-dot-glass-green absolute left-[5px] top-1.5 z-10 h-[11px] w-[11px] shrink-0 -translate-x-1/2" />
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="body-3 font-medium text-white">Execution completed</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="border-color-glass h-8 w-8 shrink-0 overflow-hidden rounded-full border">
                        <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
                      </div>
                      <span className="body-3 text-text-muted">Vibey</span>
                    </div>
                  </div>
                  <span className="body-4 mt-0.5 block text-text-muted opacity-50">Just now</span>
                  <QualityEvalScorecardMarketing data={DEMO_QUALITY_EVAL} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}

```
$body_c_38$, $body_ct_38$text/markdown$body_ct_38$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_39$references/type6-components/MarketingMissionActivityTimelineMockup.md$body_fp_39$, $body_c_39$# MarketingMissionActivityTimelineMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingMissionActivityTimelineMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingMissionActivityTimelineMockup.tsx`
- Import alias: `@/components/marketing/MarketingMissionActivityTimelineMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `-translate-x-1/2`
- `card-glass`
- `italic`
- `object-cover`
- `scrollbar-hide`
- `shrink-0`
- `sm:pb-10`
- `sm:px-8`

## Source

```tsx
'use client'

import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

function buildAgentByRole(libraryAgents: PublicAgentLibraryRow[] | undefined) {
  const byRole = new Map<string, PublicAgentLibraryRow>()
  for (const r of MARKETING_AGENT_LIBRARY_FALLBACK) {
    byRole.set(r.role_key, r)
  }
  if (libraryAgents) {
    for (const r of libraryAgents) {
      byRole.set(r.role_key, r)
    }
  }
  return byRole
}

function resolveVibeyPortrait(vibeyPortraitUrl: string | undefined) {
  const t = vibeyPortraitUrl?.trim()
  return t && t.length > 0 ? t : VIBEY_MARKETING_PORTRAIT_FALLBACK
}

function ActivityFace(props: { src: string; name: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <span
        className="mission-mock-activity-wrap overflow-hidden rounded-full"
        style={{ width: 14, height: 14, flexShrink: 0 }}
      >
        <img
          src={props.src}
          alt=""
          className="block h-full w-full object-cover"
          decoding="async"
        />
      </span>
      <span className="text-app-muted" style={{ fontSize: 10 }}>
        {props.name}
      </span>
    </div>
  )
}

const STAGGER_BETWEEN_ROWS = 0.42
const ROW_DURATION = 0.4
const ROW_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const activityListVariants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.08,
      staggerChildren: STAGGER_BETWEEN_ROWS,
    },
  },
}

const activityRowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: ROW_DURATION, ease: ROW_EASE },
  },
}

/** Activity feed: parity with hero `MarketingMissionDetailModalMockup` Activity timeline (no composer). */
export function MarketingMissionActivityTimelineMockup(props?: {
  libraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  const byRole = buildAgentByRole(props?.libraryAgents)
  const vibeyPortrait = resolveVibeyPortrait(props?.vibeyPortraitUrl)
  const pm = byRole.get('pm_marketing')
  const copywriter = byRole.get('copywriter')
  const designer = byRole.get('designer')

  return (
    <div className="flex h-full min-h-[480px] w-full flex-1 flex-col px-5 pb-7 pt-3 sm:px-8 sm:pb-10">
      <div className="card-glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 shadow-xl">
        <div className="flex-shrink-0 px-5 py-3">
          <h3
            className="text-color-primary font-semibold"
            style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Activity
          </h3>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto px-5 py-3">
            <div className="relative min-h-[140px]">
              <div className="bg-app-border absolute bottom-2 left-[5px] top-2 w-px" />
              <motion.div
                className="space-y-5"
                variants={activityListVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.12 }}
              >
                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-500/20" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-emerald-400">Plan approved</span>
                      <ActivityFace src={vibeyPortrait} name="Vibey" />
                    </div>
                    <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                      3h ago
                    </p>
                  </div>
                </motion.div>

                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-blue-500/40 bg-blue-500/20" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-color-secondary text-[10px] font-bold">Execution started</span>
                      {pm ? <ActivityFace src={pm.image_url} name={pm.default_name} /> : null}
                    </div>
                    <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                      2h ago
                    </p>
                  </div>
                </motion.div>

                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-amber-400/45 bg-amber-400/15" />
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <Clock className="mt-0.5 shrink-0 text-amber-400/90" size={11} />
                        <p className="text-app-muted leading-relaxed" style={{ fontSize: 10 }}>
                          <span className="text-app-foreground font-semibold">Waiting on dependency</span>
                          {' — '}
                          {designer?.default_name ?? 'Designer'} is blocked until{' '}
                          <strong className="text-app-foreground">Outline 3-email nurture arc + CTAs</strong>
                          {' '}
                          completes before starting visual blocks + hero variants.
                        </p>
                      </div>
                      {designer ? <ActivityFace src={designer.image_url} name={designer.default_name} /> : null}
                    </div>
                    <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                      1h 20m ago
                    </p>
                  </div>
                </motion.div>

                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-blue-500/40 bg-blue-500/20" />
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-app-muted leading-relaxed" style={{ fontSize: 10 }}>
                        Executing subtask{' '}
                        <strong className="text-app-foreground">Outline 3-email nurture arc + CTAs</strong>
                      </p>
                      {copywriter ? (
                        <ActivityFace src={copywriter.image_url} name={copywriter.default_name} />
                      ) : null}
                    </div>
                    <p className="text-app-muted-dim" style={{ fontSize: 9 }}>
                      1h ago
                    </p>
                  </div>
                </motion.div>

                <motion.div className="relative pl-6" variants={activityRowVariants}>
                  <div className="absolute left-[5px] top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border border-white/10 bg-white/5" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-color-secondary text-[10px] font-bold">User comment</span>
                      <span className="text-app-muted-dim" style={{ fontSize: 9 }}>
                        45m ago
                      </span>
                    </div>
                    <div className="card-glass mt-1 rounded-xl p-3">
                      <p className="text-color-secondary leading-snug italic" style={{ fontSize: 10 }}>
                        &quot;Lead with the ROI headline in email 1 — mirror the landing proof strip.&quot;
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

```
$body_c_39$, $body_ct_39$text/markdown$body_ct_39$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_40$references/type6-components/MarketingMissionDeliverableStacksMockup.md$body_fp_40$, $body_c_40$# MarketingMissionDeliverableStacksMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingMissionDeliverableStacksMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingMissionDeliverableStacksMockup.tsx`
- Import alias: `@/components/marketing/MarketingMissionDeliverableStacksMockup`

## Props

_No explicit Props interface — see the source signature below._

## Usage (slide body)

```tsx
// Inside a SocialCreative slide the component is embedded at the canvas scale.
// Keep the component's own sizing and wrap it in a container that matches the
// carousel canvas (1080 x 1350 for type 6).
export function SocialCreative({ width, height }) {
  return (
    <div style={{ width, height, background: '#161616', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: width * 0.92 }}>
        {/* Paste the component JSX here, 1:1 from the source below. */}
      </div>
    </div>
  );
}
```

## Non-Tailwind classes referenced

These must exist in the final stylesheet or be replaced with inline styles when rendering inside a carousel slide:

- `glass-card`
- `indicator-dot-glass`
- `indicator-dot-glass-green`
- `shrink-0`
- `sm:min-h-[580px]`
- `sm:text-[11px]`
- `sm:text-xs`
- `sm:w-[308px]`

## Source

```tsx
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

```
$body_c_40$, $body_ct_40$text/markdown$body_ct_40$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
