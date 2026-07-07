INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_43$references/type6-components/MarketingNorthstarGuardrailMockup.md$body_fp_43$, $body_c_43$# MarketingNorthstarGuardrailMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingNorthstarGuardrailMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingNorthstarGuardrailMockup.tsx`
- Import alias: `@/components/marketing/MarketingNorthstarGuardrailMockup`

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
- `animate-pulse`
- `duration-500`
- `from-transparent`
- `from-white/[0.08]`
- `lg:flex-row`
- `lg:gap-8`
- `lg:mt-0`
- `shrink-0`
- `to-transparent`
- `to-white/[0.03]`
- `transition-colors`
- `truncate`
- `via-purple-500/20`

## Source

```tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle2, 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  Target,
  Zap,
  Lock
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const GUARDRAILS = [
  { id: 'result', label: 'Primary Result', value: '100+ High-intent leads / mo', detail: 'Targeting SaaS founders specifically.' },
  { id: 'purpose', label: 'Core Purpose', value: 'Pipeline generation for Q2', detail: 'Educate on the value of AI automation.' },
  { id: 'offlimits', label: 'Off-Limits', value: 'No clickbait, no deceptive claims', detail: 'Keep brand voice authoritative.' },
]

const SENTINEL_FEED = [
  { mission: 'Drafting Q2 Landing Page', check: 'Matches Brand Voice', status: 'pass' },
  { mission: 'Researching Competitors', check: 'Alignment: Pipeline Goal', status: 'pass' },
  { mission: 'Generating Ad Headlines', check: 'Constraint Check: No Clickbait', status: 'pass' },
  { mission: 'Email Nurture Sequence', check: 'Serves Primary Result', status: 'pass' },
]

export function MarketingNorthstarGuardrailMockup() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    let isMounted = true
    let timeoutId: any

    const runStepAfterMove = () => {
      if (!isMounted) return
      setIsScanning(true)
      timeoutId = setTimeout(() => {
        if (!isMounted) return
        setIsScanning(false)
        timeoutId = setTimeout(() => {
          if (!isMounted) return
          setActiveIdx((prev) => (prev + 1) % SENTINEL_FEED.length)
          runStepAfterMove()
        }, 1500)
      }, 2500)
    }

    runStepAfterMove()

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <FeatureFloatingMockShell className="!min-h-[420px]">
      <div className="relative h-full w-full overflow-hidden p-6 lg:flex-row lg:gap-8">
        <div className="relative z-10 flex h-full w-full flex-col lg:flex-row lg:gap-8">
          {/* ── Left Column: Strategy Guardrails ── */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-white">The North Star</h2>
          </div>

          <div className="space-y-3">
            {GUARDRAILS.map((g) => (
              <div 
                key={g.id} 
                className="relative overflow-hidden p-4 rounded-xl transition-colors duration-500 bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 shadow-xl"
              >
                {/* Laser Scan Effect */}
                {isScanning && (
                  <motion.div 
                    initial={{ top: '-100%' }}
                    animate={{ top: '200%' }}
                    transition={{ duration: 1.5, ease: 'linear' }}
                    className="absolute inset-x-0 h-1/2 bg-gradient-to-b from-transparent via-purple-500/20 to-transparent pointer-events-none z-10"
                  />
                )}
                
                <div className="flex items-center gap-3 mb-1.5">
                  {g.id === 'result' ? <Target size={14} className="text-emerald-400" /> : 
                   g.id === 'purpose' ? <Zap size={14} className="text-purple-400" /> : 
                   <Lock size={14} className="text-red-400" />}
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{g.label}</span>
                </div>
                <p className="text-[12px] font-bold text-white mb-1">{g.value}</p>
                <p className="text-[10px] text-white/30">{g.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column: Strategy Validation ── */}
        <div className="flex flex-[1.2] flex-col gap-4 mt-8 lg:mt-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-white whitespace-nowrap">Strategy Validation</h2>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 relative">
            <AnimatePresence mode="popLayout">
              {SENTINEL_FEED.map((item, i) => {
                const isActive = i === activeIdx
                if (!isActive && i !== (activeIdx + 1) % SENTINEL_FEED.length && i !== (activeIdx - 1 + SENTINEL_FEED.length) % SENTINEL_FEED.length) return null

                const isAnalyzing = i === activeIdx && isScanning
                const isValidated = i === activeIdx ? !isScanning : i === (activeIdx - 1 + SENTINEL_FEED.length) % SENTINEL_FEED.length

                return (
                  <motion.div
                    key={`${item.mission}-${i}`}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ 
                      opacity: isActive ? 1 : 0.5, 
                      y: 0, 
                      scale: isActive ? 1 : 0.95,
                    }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className={`p-4 rounded-xl border transition-all duration-500 ${isActive ? 'bg-gradient-to-br from-white/[0.12] to-white/[0.05] border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.08)]' : 'bg-gradient-to-br from-white/[0.05] to-white/[0.02] border-white/5 opacity-60'}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white truncate mb-1">{item.mission}</p>
                        <div className="flex items-center gap-2">
                          <Search size={10} className="text-white/20" />
                          <span className="text-[10px] text-white/40">{item.check}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className={`flex items-center gap-1 ${isValidated ? 'text-emerald-400' : isAnalyzing ? 'text-purple-400' : 'text-white/20'}`}>
                        {isValidated ? (
                          <CheckCircle2 size={12} />
                        ) : isAnalyzing ? (
                          <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                          >
                            <Search size={12} />
                          </motion.div>
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-white/10" />
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-tighter">
                          {isValidated ? 'Validated' : isAnalyzing ? 'Analyzing...' : 'To Analyze'}
                        </span>
                      </div>
                        <span className="text-[8px] text-white/20 font-mono">
                          {isValidated ? 'POST-SCAN' : isAnalyzing ? 'SCANNING' : 'QUEUED'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Validation Terminal Output */}
            <div className="mt-auto pt-4 border-t border-white/5">
              <div className="bg-white/[0.05] rounded-lg p-3 font-mono text-[9px] space-y-1 border border-white/5 shadow-inner">
                <div className="text-white/20">AUTOPILOT_COMPLIANCE_LOG:</div>
                <div className="text-emerald-400/80">&gt;&gt; MISSION_INPUT: validated against NORTHSTAR_STRATEGY</div>
                <div className="text-emerald-400/80">&gt;&gt; BRAND_VOICE_CHECK: pass (ACCOUNTABILITY_ID: 402)</div>
                <div className="text-white/40 animate-pulse">&gt;&gt; MONITORING_LIVE_MISSIONS...</div>
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
$body_c_43$, $body_ct_43$text/markdown$body_ct_43$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_44$references/type6-components/MarketingOrgChartMockup.md$body_fp_44$, $body_c_44$# MarketingOrgChartMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingOrgChartMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingOrgChartMockup.tsx`
- Import alias: `@/components/marketing/MarketingOrgChartMockup`

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

- `!min-h-[360px]`
- `line-clamp-2`
- `object-cover`
- `shrink-0`
- `sm:h-10`
- `sm:h-12`
- `sm:px-1.5`
- `sm:px-3`
- `sm:py-2.5`
- `sm:text-[10px]`
- `sm:text-[11px]`
- `sm:text-[12px]`
- `sm:text-[9px]`
- `sm:w-10`
- `sm:w-12`
- `truncate`

## Source

```tsx
'use client'

import {
  MARKETING_AGENT_LIBRARY_FALLBACK,
  VIBEY_MARKETING_PORTRAIT_FALLBACK,
} from '@/lib/agent-library-fallback'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { useId } from 'react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const MARKETING_ORG_ROLE_KEYS = ['copywriter', 'designer', 'analyst', 'pm_marketing'] as const

function resolveMarketingOrgRows(libraryAgents?: PublicAgentLibraryRow[]): PublicAgentLibraryRow[] {
  return MARKETING_ORG_ROLE_KEYS.map((key) => {
    const fromHero = libraryAgents?.find((a) => a.role_key === key)
    if (fromHero) return fromHero
    const row = MARKETING_AGENT_LIBRARY_FALLBACK.find((a) => a.role_key === key)
    if (!row) throw new Error(`Marketing org mockup: missing agent ${key}`)
    return row
  })
}

/** Animated org-chart lines with purple currents from CEO to agents. */
function MarketingOrgConnectorLines() {
  const uid = useId()
  const g = (suffix: string) => `${uid.replace(/:/g, '')}-${suffix}`

  return (
    <svg
      className="text-color-dimmer pointer-events-none w-full shrink-0"
      viewBox="0 0 100 22"
      height="60"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <radialGradient id={g('purple-grad')} fx="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <mask id={g('mask-1')}>
          <path d="M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13" strokeWidth="1" stroke="white" fill="none" />
        </mask>
        <mask id={g('mask-2')}>
          <path d="M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13" strokeWidth="1" stroke="white" fill="none" />
        </mask>
        <mask id={g('mask-3')}>
          <path d="M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13" strokeWidth="1" stroke="white" fill="none" />
        </mask>
        <mask id={g('mask-4')}>
          <path d="M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13" strokeWidth="1" stroke="white" fill="none" />
        </mask>
      </defs>

      <g stroke="currentColor" fill="none" strokeWidth="0.4" strokeDasharray="100 100" pathLength="100">
        <path id={g('path-1')} d="M 50 0 v 5 q 0 2 -2 2 H 14.5 q -2 0 -2 2 v 13">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
        </path>
        <path id={g('path-2')} d="M 50 0 v 5 q 0 2 -2 2 H 39.5 q -2 0 -2 2 v 13">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
        </path>
        <path id={g('path-3')} d="M 50 0 v 5 q 0 2 2 2 H 60.5 q 2 0 2 2 v 13">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
        </path>
        <path id={g('path-4')} d="M 50 0 v 5 q 0 2 2 2 H 85.5 q 2 0 2 2 v 13">
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="1s" fill="freeze" />
        </path>
      </g>

      <g mask={`url(#${g('mask-1')})`}>
        <circle r="6" fill={`url(#${g('purple-grad')})`}>
          <animateMotion dur="2s" repeatCount="indefinite" begin="0s">
            <mpath href={`#${g('path-1')}`} />
          </animateMotion>
        </circle>
      </g>
      <g mask={`url(#${g('mask-2')})`}>
        <circle r="6" fill={`url(#${g('purple-grad')})`}>
          <animateMotion dur="2s" repeatCount="indefinite" begin="0.5s">
            <mpath href={`#${g('path-2')}`} />
          </animateMotion>
        </circle>
      </g>
      <g mask={`url(#${g('mask-3')})`}>
        <circle r="6" fill={`url(#${g('purple-grad')})`}>
          <animateMotion dur="2s" repeatCount="indefinite" begin="1s">
            <mpath href={`#${g('path-3')}`} />
          </animateMotion>
        </circle>
      </g>
      <g mask={`url(#${g('mask-4')})`}>
        <circle r="6" fill={`url(#${g('purple-grad')})`}>
          <animateMotion dur="2s" repeatCount="indefinite" begin="1.5s">
            <mpath href={`#${g('path-4')}`} />
          </animateMotion>
        </circle>
      </g>
    </svg>
  )
}

export function MarketingOrgChartMockup(props?: {
  /** Same list as hero `AgentLibraryCarousel` / `getAgentLibraryForMarketing()` - resolves portraits for the four roles. */
  libraryAgents?: PublicAgentLibraryRow[]
  /** From `getMarketingVibeyPortraitUrl()` or DB-backed CEO portrait. */
  vibeyPortraitUrl?: string
}) {
  const marketingAgents = resolveMarketingOrgRows(props?.libraryAgents)
  const vibeySrc =
    props?.vibeyPortraitUrl != null && String(props.vibeyPortraitUrl).trim() !== ''
      ? String(props.vibeyPortraitUrl).trim()
      : VIBEY_MARKETING_PORTRAIT_FALLBACK

  return (
    <FeatureFloatingMockShell className="!min-h-[360px]">
      <div className="relative flex min-h-[360px] w-full flex-col justify-center px-2 py-4 sm:px-3">
        <div className="flex justify-center">
          <div className="mockup-card flex min-w-0 max-w-[200px] flex-col items-center gap-1.5 px-5 py-3">
            <div className="border-color-glass h-11 w-11 shrink-0 overflow-hidden rounded-full border sm:h-12 sm:w-12">
              <img src={vibeySrc} alt="" className="h-full w-full object-cover" />
            </div>
            <p className="text-[11px] font-semibold text-white sm:text-[12px]">Vibey</p>
            <p className="text-[9px] text-[var(--text-muted)] sm:text-[10px]">CEO</p>
          </div>
        </div>

        <MarketingOrgConnectorLines />

        <div className="grid grid-cols-4 gap-0">
          {marketingAgents.map((agent) => (
            <div key={agent.role_key} className="px-1">
              <div className="mockup-card flex min-w-0 flex-col items-center gap-1 px-1 py-2 sm:px-1.5 sm:py-2.5">
                <img
                  src={agent.image_url}
                  alt=""
                  className="border-color-glass h-9 w-9 shrink-0 rounded-full border object-cover sm:h-10 sm:w-10"
                />
                <p className="w-full truncate text-center text-[10px] font-semibold text-white sm:text-[11px]">
                  {agent.default_name}
                </p>
                <p className="line-clamp-2 w-full text-center text-[8px] leading-tight text-[var(--text-muted)] sm:text-[9px]">
                  {agent.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}


```
$body_c_44$, $body_ct_44$text/markdown$body_ct_44$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_45$references/type6-components/MarketingRawToSignalMockup.md$body_fp_45$, $body_c_45$# MarketingRawToSignalMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingRawToSignalMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingRawToSignalMockup.tsx`
- Import alias: `@/components/marketing/MarketingRawToSignalMockup`

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

- `!min-h-[360px]`
- `-left-1`
- `-translate-y-1/2`
- `-z-10`
- `animate-pulse`
- `from-transparent`
- `sm:!min-h-[420px]`
- `sm:gap-3`
- `sm:px-3`
- `sm:px-8`
- `sm:w-[160px]`
- `to-transparent`
- `truncate`
- `via-emerald-400`

## Source

```tsx
'use client'

import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
// Target is missing from my imports, using a replacement from lucide-react or another one
import {
  CheckCircle2,
  Database,
  FileText,
  MessageSquare,
  Mic,
  Target,
  Type,
  User,
  Video,
  Zap,
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const RAW_INPUTS = [
  { id: 'pdf', icon: FileText, label: 'Strategy_v2.pdf', color: 'text-blue-400' },
  { id: 'zoom', icon: Video, label: 'Fathom: Weekly Sync', color: 'text-purple-400' },
  { id: 'notes', icon: Mic, label: 'Voice Note: ICP pain', color: 'text-emerald-400' },
  { id: 'slack', icon: MessageSquare, label: '#marketing-strategy', color: 'text-orange-400' },
]

const SIGNALS = [
  { id: 'voice', icon: User, label: 'Brand Voice', category: 'Identity', color: 'purple' },
  { id: 'icp', icon: Target, label: 'ICP Pain Points', category: 'Strategy', color: 'blue' },
  { id: 'framework', icon: Zap, label: 'PAS Framework', category: 'Expertise', color: 'emerald' },
  { id: 'data', icon: Database, label: 'Market Context', category: 'Knowledge', color: 'orange' },
]

export function MarketingRawToSignalMockup() {
  const [scanProgress, setScanProgress] = useState(0)
  const [activeSignalIndex, setActiveSignalIndex] = useState(-1)

  useEffect(() => {
    const interval = setInterval(() => {
      setScanProgress((prev) => (prev >= 100 ? 0 : prev + 0.5))
    }, 20)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Logic to "trigger" signal appearance based on scan progress
    if (scanProgress > 20 && scanProgress < 30) setActiveSignalIndex(0)
    else if (scanProgress > 45 && scanProgress < 55) setActiveSignalIndex(1)
    else if (scanProgress > 70 && scanProgress < 80) setActiveSignalIndex(2)
    else if (scanProgress > 90) setActiveSignalIndex(3)
    else if (scanProgress < 5) setActiveSignalIndex(-1)
  }, [scanProgress])

  return (
    <FeatureFloatingMockShell className="flex !min-h-[360px] items-center justify-center overflow-hidden sm:!min-h-[420px]">
      <div className="relative flex h-[300px] w-full max-w-[500px] items-center justify-between px-3 sm:px-8">
        {/* Left: Raw Pile */}
        <div className="z-10 flex flex-col gap-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
            Unstructured Raw
          </p>
          {RAW_INPUTS.map((input, idx) => (
            <motion.div
              key={input.id}
              animate={{
                x: scanProgress > idx * 15 + 10 ? 20 : 0,
                opacity: scanProgress > idx * 15 + 10 ? 0.2 : 1,
                filter: scanProgress > idx * 15 + 10 ? 'blur(2px)' : 'blur(0px)',
              }}
              className="flex w-[120px] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-2 sm:w-[160px] sm:gap-3 sm:px-3"
            >
              <input.icon size={14} className={input.color} />
              <span className="truncate text-[11px] font-medium text-white/60">{input.label}</span>
            </motion.div>
          ))}
        </div>

        {/* The Scanline */}
        <motion.div
          className="absolute bottom-0 top-0 z-20 w-[2px] bg-gradient-to-b from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,0.8)]"
          style={{ left: `${scanProgress}%` }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          </div>
        </motion.div>

        {/* Right: Crystallized Signals */}
        <div className="z-10 flex flex-col items-end gap-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/20">
            Crystallized Signals
          </p>
          <div className="space-y-3">
            {SIGNALS.map((signal, idx) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: activeSignalIndex >= idx ? 1 : 0.1,
                  x: activeSignalIndex >= idx ? 0 : 20,
                  scale: activeSignalIndex === idx ? 1.05 : 1,
                }}
                className={`flex w-[140px] items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-xl transition-colors duration-500 sm:w-[180px] sm:gap-3 sm:px-4 sm:py-2.5 ${
                  activeSignalIndex === idx
                    ? `border-${signal.color}-500/50 bg-${signal.color}-500/10 shadow-[0_0_20px_rgba(var(--accent-${signal.color}-rgb),0.15)]`
                    : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <div
                  className={`rounded-lg p-1.5 bg-${signal.color}-500/20 text-${signal.color}-400`}
                >
                  <signal.icon size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-none text-white/90">{signal.label}</p>
                  <p
                    className={`text-[9px] font-medium text-${signal.color}-400/60 mt-1 uppercase tracking-tighter`}
                  >
                    {signal.category}
                  </p>
                </div>
                {activeSignalIndex >= idx && (
                  <CheckCircle2 size={12} className="ml-auto text-emerald-400" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Connecting Lines (Background) */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-10"
          viewBox="0 0 500 300"
        >
          <path
            d="M180 80 Q 250 150 320 80"
            stroke="white"
            strokeWidth="1"
            fill="none"
            strokeDasharray="4 4"
          />
          <path
            d="M180 140 Q 250 150 320 140"
            stroke="white"
            strokeWidth="1"
            fill="none"
            strokeDasharray="4 4"
          />
          <path
            d="M180 200 Q 250 150 320 200"
            stroke="white"
            strokeWidth="1"
            fill="none"
            strokeDasharray="4 4"
          />
        </svg>
      </div>

      {/* Background Decorative Grid */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
    </FeatureFloatingMockShell>
  )
}

```
$body_c_45$, $body_ct_45$text/markdown$body_ct_45$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_46$references/type6-components/MarketingRoleEmblem.md$body_fp_46$, $body_c_46$# MarketingRoleEmblem

> Role/brand emblem; use as a slide decoration.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingRoleEmblem.tsx`
- Website source: `apps/website/src/components/marketing/MarketingRoleEmblem.tsx`
- Import alias: `@/components/marketing/MarketingRoleEmblem`

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

- `shrink-0`

## Source

```tsx
'use client'

const ROLE_SHAPES: Record<string, string> = {
  copywriter: 'M40 10 L50 35 L40 70 L30 35 Z',
  designer: 'M40 12 L64 40 L40 68 L16 40 Z',
  analyst:
    'M16 62 L16 44 L28 44 L28 62 Z M32 62 L32 30 L44 30 L44 62 Z M48 62 L48 18 L60 18 L60 62 Z',
  developer:
    'M22 40 L36 22 L40 27 L30 40 L40 53 L36 58 Z M58 40 L44 22 L40 27 L50 40 L40 53 L44 58 Z',
  widget_builder: 'M16 22 L64 22 L64 58 L16 58 Z M22 30 L58 30 M22 40 L50 40 M22 50 L44 50',
  pm_marketing: 'M40 12 L63 26 L63 54 L40 68 L17 54 L17 26 Z',
  pm_product: 'M20 16 L60 16 L60 64 L20 64 Z M30 28 L50 28 M30 40 L50 40 M30 52 L42 52',
  pm_operations: 'M40 10 A30 30 0 1 1 39.9 10 Z M28 40 L52 40 M40 28 L40 52',
  automation_integrations_engineer: 'M46 8 L26 42 L38 42 L34 72 L58 34 L46 34 Z',
  product_manager: 'M40 8 L48 30 L72 34 L54 52 L58 74 L40 62 L22 74 L26 52 L8 34 L32 30 Z',
  qa_engineer: 'M40 10 L64 24 L64 48 Q64 66 40 72 Q16 66 16 48 L16 24 Z',
  media_producer: 'M24 14 L64 40 L24 66 Z',
  brand_manager: 'M12 40 L28 16 L52 16 L68 40 L52 64 L28 64 Z M24 40 L56 40',
  cfo: 'M16 20 L64 20 L64 60 L16 60 Z M26 32 L54 32 M26 40 L54 40 M26 48 L44 48',
  coach: 'M40 10 A14 14 0 1 1 39.9 10 Z M20 64 Q40 40 60 64',
  ads_manager: 'M16 16 L64 16 L64 54 L16 54 Z M24 26 L56 26 M24 34 L48 34 M24 44 L40 44',
  customer_support:
    'M20 32 Q20 14 40 14 Q60 14 60 32 L60 44 Q60 56 48 56 L44 56 L40 66 L36 56 L32 56 Q20 56 20 44 Z',
  customer_success: 'M40 8 L48 28 L68 28 L52 42 L58 64 L40 52 L22 64 L28 42 L12 28 L32 28 Z',
  customer_coach: 'M40 10 A20 20 0 1 1 39.9 10 Z M26 54 Q40 44 54 54 L54 70 L26 70 Z',
  hr: 'M26 28 A8 8 0 1 0 26 12 A8 8 0 1 0 26 28 Z M14 56 C14 40 26 34 26 34 C26 34 38 40 38 56 Z M54 24 A8 8 0 1 0 54 8 A8 8 0 1 0 54 24 Z M42 52 C42 36 54 30 54 30 C54 30 66 36 66 52 Z',
  atlas: 'M40 8 A32 32 0 1 1 39.9 8 Z M14 40 L66 40 M40 8 Q28 40 40 72 M40 8 Q52 40 40 72',
  viktor: 'M16 16 L40 64 L64 16 M24 16 L40 52 L56 16',
}

export function MarketingRoleEmblem({ roleKey, size }: { roleKey: string; size: 'sm' | 'lg' }) {
  const path = ROLE_SHAPES[roleKey] ?? ROLE_SHAPES.developer
  const dim = size === 'sm' ? 40 : 80
  const svgDim = Math.round(dim * 0.6)
  const blur = size === 'sm' ? 2 : 3.5
  const uid = `hre-${roleKey}-${size}`

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full border border-white/10"
      style={{
        width: dim,
        height: dim,
        background:
          'radial-gradient(circle at 40% 35%, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0) 70%), rgba(255,255,255,0.025)',
        boxShadow: `0 0 ${size === 'sm' ? 10 : 20}px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      <svg viewBox="0 0 80 80" width={svgDim} height={svgDim} aria-hidden>
        <defs>
          <linearGradient id={`${uid}-g`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id={`${uid}-f`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation={String(blur)} result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={path} fill={`url(#${uid}-g)`} filter={`url(#${uid}-f)`} />
      </svg>
    </div>
  )
}

```
$body_c_46$, $body_ct_46$text/markdown$body_ct_46$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_47$references/type6-components/MarketingSkillBuilderMockup.md$body_fp_47$, $body_c_47$# MarketingSkillBuilderMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingSkillBuilderMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingSkillBuilderMockup.tsx`
- Import alias: `@/components/marketing/MarketingSkillBuilderMockup`

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

- `!h-[480px]`
- `body-2`
- `button-glass-neutral`
- `disabled:opacity-30`
- `focus:outline-none`
- `input-glass`
- `resize-none`
- `shrink-0`
- `truncate`
- `typo-caption`

## Source

```tsx
'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, FolderOpen, Mic, Paperclip, Save } from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

// ── VS Code syntax colors (matches skills hero) ───────────────────────────────
const C = {
  h1:     '#4fc1ff',
  h2:     '#4ec9b0',
  h3:     '#9cdcfe',
  bold:   '#dcdcaa',
  text:   '#d4d4d4',
  dim:    '#5a5a5a',
  green:  '#6a9955',
  orange: '#ce9178',
  lineNum:'#4d4d4d',
}

// ── Skill markdown — each line has raw text + syntax-highlighted node ────────
// null node = blank line (rendered as empty row)
type SkillLine = { raw: string; node: React.ReactNode | null }

const SKILL_LINES: SkillLine[] = [
  { raw: '# Cold Email Outreach',            node: <><span style={{color:C.dim}}># </span><span style={{color:C.h1,fontWeight:700}}>Cold Email Outreach</span></> },
  { raw: '',                                  node: null },
  { raw: '## Objective',                      node: <><span style={{color:C.dim}}>## </span><span style={{color:C.h2,fontWeight:600}}>Objective</span></> },
  { raw: 'Systematic outreach sequence that', node: <span style={{color:C.text}}>Systematic outreach sequence that</span> },
  { raw: 'books calls with B2B prospects.',   node: <span style={{color:C.text}}>books calls with B2B prospects.</span> },
  { raw: '',                                  node: null },
  { raw: '## Inputs',                         node: <><span style={{color:C.dim}}>## </span><span style={{color:C.h2,fontWeight:600}}>Inputs</span></> },
  { raw: '- **offer** — one-liner value prop',node: <><span style={{color:C.dim}}>- </span><span style={{color:C.bold}}>**offer**</span><span style={{color:C.text}}> — one-liner value prop</span></> },
  { raw: '- **audience** — ICP + company size',node:<><span style={{color:C.dim}}>- </span><span style={{color:C.bold}}>**audience**</span><span style={{color:C.text}}> — ICP + company size</span></> },
  { raw: '- **goal** — booked calls / week',  node: <><span style={{color:C.dim}}>- </span><span style={{color:C.bold}}>**goal**</span><span style={{color:C.text}}> — booked calls / week</span></> },
  { raw: '',                                  node: null },
  { raw: '## Artifact Blueprint',             node: <><span style={{color:C.dim}}>## </span><span style={{color:C.h2,fontWeight:600}}>Artifact Blueprint</span></> },
  { raw: '',                                  node: null },
  { raw: '### 1. Email Sequence (3 emails)',  node: <><span style={{color:C.dim}}>### </span><span style={{color:C.h3}}>1. Email Sequence (3 emails)</span></> },
  { raw: '  - Email 1 · Pattern interrupt',  node: <><span style={{color:C.dim}}>  - </span><span style={{color:C.text}}>Email 1 </span><span style={{color:C.dim}}>·</span><span style={{color:C.text}}> Pattern interrupt</span></> },
  { raw: '  - Email 2 · Case study proof',   node: <><span style={{color:C.dim}}>  - </span><span style={{color:C.text}}>Email 2 </span><span style={{color:C.dim}}>·</span><span style={{color:C.text}}> Case study proof</span></> },
  { raw: '  - Email 3 · Final ask + reply',  node: <><span style={{color:C.dim}}>  - </span><span style={{color:C.text}}>Email 3 </span><span style={{color:C.dim}}>·</span><span style={{color:C.text}}> Final ask + reply</span></> },
  { raw: '',                                  node: null },
  { raw: '## Brain Context',                  node: <><span style={{color:C.dim}}>## </span><span style={{color:C.h2,fontWeight:600}}>Brain Context</span></> },
  { raw: '',                                  node: null },
  { raw: 'Reads: icp_profile, brand_voice',  node: <><span style={{color:C.green}}>Reads: </span><span style={{color:C.orange}}>icp_profile</span><span style={{color:C.text}}>, </span><span style={{color:C.orange}}>brand_voice</span></> },
  { raw: 'Writes: outreach_learnings',        node: <><span style={{color:C.green}}>Writes: </span><span style={{color:C.orange}}>outreach_learnings</span></> },
]

const FULL_BRIEF = 'Create a skill for cold email outreach'
const BRIEF_CHAR_MS  = 38
const SKILL_CHAR_MS  = 22
const LINE_PAUSE_MS  = 55
const DONE_HOLD_MS   = 3200

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// ── Input chrome — matches MissionQuickCaptureChrome exactly ─────────────────
function SkillInput({ briefText, submitted }: { briefText: string; submitted: boolean }) {
  return (
    <div className="input-glass rounded-spacing-3 relative flex flex-col">
      <div className="flex-1 px-4 pt-3">
        <textarea
          value={briefText}
          readOnly
          tabIndex={-1}
          rows={1}
          placeholder="Tell Vibey what skill to create..."
          className="body-2 placeholder-muted max-h-[120px] min-h-[44px] w-full resize-none bg-transparent outline-none focus:outline-none"
          style={{ color: submitted ? 'rgba(255,255,255,0.45)' : '#fff' }}
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <button type="button" tabIndex={-1} className="button-glass-neutral flex h-8 w-8 cursor-default items-center justify-center rounded-full" aria-hidden>
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <button type="button" tabIndex={-1} className="button-glass-neutral flex h-8 cursor-default items-center gap-1.5 rounded-full px-2.5 text-white" aria-hidden>
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="typo-caption max-w-[100px] truncate font-medium">Skills Library</span>
          </button>
          <button type="button" tabIndex={-1} className="button-glass-neutral flex h-8 w-8 cursor-default items-center justify-center rounded-full" aria-hidden>
            <Flag className="h-3.5 w-3.5 text-amber-400" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" tabIndex={-1} className="button-glass-neutral flex h-8 w-8 cursor-default items-center justify-center rounded-full" aria-hidden>
            <Mic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={!briefText.trim() || submitted}
            className="button-glass-neutral flex h-8 w-8 cursor-default items-center justify-center rounded-full disabled:opacity-30"
            aria-hidden
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MarketingSkillBuilderMockup() {
  const [briefText, setBriefText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  // completedLines = lines fully typed; currentChars = chars typed on the current line
  const [completedLines, setCompletedLines] = useState(-1) // -1 = nothing shown yet
  const [currentChars, setCurrentChars] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function runCycle() {
      if (cancelled) return

      // Reset
      setBriefText('')
      setSubmitted(false)
      setCompletedLines(-1)
      setCurrentChars(0)
      setDone(false)

      await sleep(600)

      // Phase 1: type the brief
      for (let i = 0; i <= FULL_BRIEF.length; i++) {
        if (cancelled) return
        setBriefText(FULL_BRIEF.slice(0, i))
        await sleep(BRIEF_CHAR_MS)
      }

      await sleep(500)
      if (cancelled) return
      setSubmitted(true)

      await sleep(400)

      // Phase 2: type skill lines one by one
      for (let lineIdx = 0; lineIdx < SKILL_LINES.length; lineIdx++) {
        if (cancelled) return
        setCompletedLines(lineIdx - 1) // reveal up to lineIdx-1 as highlighted
        setCurrentChars(0)

        const line = SKILL_LINES[lineIdx]!

        if (line.raw === '') {
          // Blank line — reveal instantly as a completed line
          setCompletedLines(lineIdx)
          await sleep(LINE_PAUSE_MS)
          continue
        }

        // Type each character
        for (let c = 1; c <= line.raw.length; c++) {
          if (cancelled) return
          setCurrentChars(c)
          await sleep(SKILL_CHAR_MS)
        }

        // Mark this line complete (use highlighted node)
        setCompletedLines(lineIdx)
        setCurrentChars(0)
        await sleep(LINE_PAUSE_MS)
      }

      // Phase 3: done
      if (cancelled) return
      setDone(true)
      await sleep(DONE_HOLD_MS)
      if (!cancelled) runCycle()
    }

    runCycle()
    return () => { cancelled = true }
  }, [])

  // Lines to render:
  // - indices 0..completedLines → highlighted node
  // - index completedLines+1 → raw text being typed (with cursor)
  const totalRenderedLines = completedLines + 2 // +1 for the typing line
  const visibleLines = SKILL_LINES.slice(0, Math.max(0, totalRenderedLines))
  const typingLineIdx = completedLines + 1

  return (
    <FeatureFloatingMockShell className="!h-[480px] flex-col overflow-hidden">
      <div className="relative z-[1] flex h-full min-h-0 w-full flex-col">

        {/* ── Skill file area — scrollable, never pushes input up ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-5" style={{ scrollbarWidth: 'none' }}>
          <AnimatePresence>
            {submitted && completedLines >= -1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {/* Markdown lines with line numbers */}
                <div
                  className="relative overflow-hidden rounded-xl p-3"
                  style={{
                    background: 'rgba(30,30,30,0.7)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  }}
                >
                  {/* Saved badge — top-right corner inside the block */}
                  <AnimatePresence>
                    {done && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-3 top-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                        style={{ background: 'rgb(52 211 153 / 0.12)', border: '1px solid rgb(52 211 153 / 0.25)' }}
                      >
                        <Save size={9} style={{ color: 'rgb(52 211 153)' }} />
                        <span className="text-[8.5px] font-bold" style={{ color: 'rgb(52 211 153)' }}>Skill saved</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {visibleLines.map((line, i) => {
                    const isTyping = i === typingLineIdx && !done

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: 10,
                          height: 17,
                          lineHeight: '17px',
                          fontSize: 11,
                        }}
                      >
                        {/* Line number */}
                        <span
                          style={{
                            width: 20,
                            textAlign: 'right',
                            flexShrink: 0,
                            color: C.lineNum,
                            userSelect: 'none',
                            fontSize: 10,
                          }}
                        >
                          {i + 1}
                        </span>

                        {/* Content */}
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'visible' }}>
                          {isTyping ? (
                            // Currently being typed: show raw chars in dim color + blinking cursor
                            <>
                              <span style={{ color: C.text }}>{line.raw.slice(0, currentChars)}</span>
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 1.5,
                                  height: '0.85em',
                                  background: 'rgb(52 211 153)',
                                  marginLeft: 1,
                                  verticalAlign: 'text-bottom',
                                  animation: 'pulse 1s infinite',
                                }}
                              />
                            </>
                          ) : (
                            // Completed line: show highlighted node (or empty for blank lines)
                            line.node ?? <span style={{ color: 'transparent' }}>_</span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Input chrome ── */}
        <div className="shrink-0 px-5 pb-5 pt-2">
          <SkillInput briefText={briefText} submitted={submitted} />
        </div>

      </div>
    </FeatureFloatingMockShell>
  )
}

```
$body_c_47$, $body_ct_47$text/markdown$body_ct_47$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_48$references/type6-components/MarketingSkillLibraryMockup.md$body_fp_48$, $body_c_48$# MarketingSkillLibraryMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/MarketingSkillLibraryMockup.tsx`
- Website source: `apps/website/src/components/marketing/MarketingSkillLibraryMockup.tsx`
- Import alias: `@/components/marketing/MarketingSkillLibraryMockup`

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

- `!h-[480px]`
- `-translate-x-1/2`
- `[grid-template-rows:repeat(6,minmax(0,1fr))]`
- `active:scale-[0.98]`
- `blur-[0.5px]`
- `glass-card`
- `line-clamp-2`
- `saturate-50`
- `shrink-0`
- `transition-transform`

## Source

```tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  Globe2,
  History,
  Library,
  Linkedin,
  Play,
  RotateCcw,
  ScanSearch,
  Search,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { FeatureFloatingMockShell } from '@/components/feature-pages/FeatureFloatingMockShell'

const EASE = [0.16, 1, 0.3, 1] as const

// ── Shared Colors ───────────────────────────────────────────────────────────
const C = {
  emerald: 'rgb(52 211 153)',
  blue: 'rgb(96 165 250)',
  orange: 'rgb(251 146 60)',
  purple: 'rgb(192 132 252)',
  rose: 'rgb(251 113 133)',
  indigo: 'rgb(129 140 248)',
  cyan: 'rgb(34 211 238)',
  red: 'rgb(248 113 113)',
  lime: 'rgb(163 230 53)',
  linkedin: 'rgb(10 102 194)',
  border: 'rgba(255,255,255,0.08)',
}

type SharedSkill = { name: string; color: string; icon: LucideIcon; runs: number }

/** Same twelve plays as `MarketingSkillStackMockup` — fills the library shell */
const SHARED_SKILLS: SharedSkill[] = [
  { name: 'Lead Magnet Funnel', color: C.emerald, icon: Zap, runs: 42 },
  { name: 'Webinar Registration', color: C.orange, icon: Play, runs: 28 },
  { name: 'Product Launch', color: C.purple, icon: Library, runs: 12 },
  { name: 'CRM Pipeline Nurture', color: C.orange, icon: Users, runs: 85 },
  { name: 'Paid Media Push', color: C.blue, icon: TrendingUp, runs: 64 },
  { name: 'Checkout & Revenue', color: C.emerald, icon: CreditCard, runs: 51 },
  { name: 'Ops Command Digest', color: C.rose, icon: Sparkles, runs: 31 },
  { name: 'Executive Report Pack', color: C.indigo, icon: BarChart3, runs: 19 },
  { name: 'LinkedIn ABM Touches', color: C.linkedin, icon: Linkedin, runs: 37 },
  { name: 'Winback & Dunning', color: C.red, icon: RotateCcw, runs: 22 },
  { name: 'Competitive Brief', color: C.cyan, icon: ScanSearch, runs: 14 },
  { name: 'SEO Content Cluster', color: C.lime, icon: Globe2, runs: 33 },
]

const gridContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.06,
    },
  },
}

const gridCardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.94 },
  show: {
    opacity: 0.3,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: EASE },
  },
}

export function MarketingSkillLibraryMockup() {
  return (
    <FeatureFloatingMockShell className="!h-[480px] overflow-hidden">
      <div className="relative flex h-full min-h-0 w-full flex-col p-6">
        {/* ── Background: Library Grid — 2 cols × 6 rows, stretches to shell bottom ── */}
        <motion.div
          className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-2 [grid-template-rows:repeat(6,minmax(0,1fr))] saturate-50 blur-[0.5px]"
          variants={gridContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.22 }}
        >
          {SHARED_SKILLS.map((skill) => (
            <motion.div
              key={skill.name}
              variants={gridCardVariants}
              className="glass-card flex min-h-0 items-center gap-3 p-3"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${skill.color}15`, color: skill.color }}
              >
                <skill.icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[11px] font-bold leading-tight text-white">{skill.name}</p>
                <p className="text-[9px] text-white/40">{skill.runs} runs · 94%</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Search Overlay (Library Card Style) ── */}
        <motion.div
          className="absolute left-1/2 top-28 z-10 w-[240px] -translate-x-1/2 opacity-40"
          initial={{ opacity: 0, y: -12, scale: 0.96 }}
          whileInView={{ opacity: 0.4, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.38, duration: 0.5, ease: EASE }}
        >
          <div className="glass-card flex items-center gap-3 p-3" style={{ border: `1px solid ${C.border}` }}>
            <motion.div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/40"
              initial={{ scale: 0.85 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ delay: 0.55, duration: 0.35, ease: EASE }}
            >
              <Search size={16} />
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white/40">Search team library...</p>
              <p className="text-[9px] text-white/20">Find plays, templates, and sequences</p>
            </div>
          </div>
        </motion.div>

        {/* ── Foreground: Active Skill Selection (Left) ── */}
        <motion.div
          initial={{ opacity: 0, x: -28, y: 48, rotate: -5 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: -1.5 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.48, duration: 0.65, ease: EASE }}
          className="glass-card absolute bottom-12 left-8 z-20 w-[240px] p-4 shadow-2xl"
          style={{ border: `1px solid ${C.emerald}30` }}
        >
          <div className="mb-4 flex items-center gap-3">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ delay: 0.62, duration: 0.45, ease: EASE }}
            >
              <Zap size={20} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ delay: 0.72, duration: 0.4, ease: EASE }}
            >
              <h4 className="text-[12px] font-bold text-white">Lead Magnet Funnel</h4>
              <p className="text-[9px] font-medium text-emerald-400 uppercase tracking-widest">Shared Skill</p>
            </motion.div>
          </div>

          <motion.div
            className="space-y-2.5"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 0.82, duration: 0.35 }}
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">Author</span>
              <span className="font-medium text-white/80">Sefy Tofan</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/50">Last Run</span>
              <span className="font-medium text-white/80">2h ago · Growth Team</span>
            </div>
            <div className="h-px w-full bg-white/5" />
          </motion.div>

          <motion.button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-bold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 0.92, duration: 0.4, ease: EASE }}
          >
            Run Play
            <ArrowRight size={14} strokeWidth={3} />
          </motion.button>
        </motion.div>

        {/* ── Foreground: Feedback/Improvement (Right) ── */}
        <motion.div
          initial={{ opacity: 0, x: 28, y: -28, rotate: 5 }}
          whileInView={{ opacity: 1, x: 0, y: 0, rotate: 2 }}
          viewport={{ once: true, amount: 0.22 }}
          transition={{ delay: 0.58, duration: 0.65, ease: EASE }}
          className="glass-card absolute right-10 top-16 z-30 w-[190px] p-3 shadow-xl"
          style={{ border: `1px solid ${C.blue}30` }}
        >
          <motion.div
            className="mb-3 flex items-center gap-2"
            initial={{ opacity: 0, x: 6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.22 }}
            transition={{ delay: 0.75, duration: 0.35, ease: EASE }}
          >
            <History size={14} className="text-blue-400" />
            <span className="text-[10px] font-bold text-white uppercase tracking-tight">Loop Performance</span>
          </motion.div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-white/40">Engagement lift</span>
                <span className="text-emerald-400 font-bold">+24%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '82%' }}
                  viewport={{ once: true, amount: 0.22 }}
                  transition={{ delay: 0.95, duration: 0.9, ease: EASE }}
                  className="h-full bg-emerald-400"
                />
              </div>
            </div>

            <motion.div
              className="rounded-lg border border-blue-400/10 bg-blue-400/5 p-2"
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ delay: 1.05, duration: 0.45, ease: EASE }}
            >
              <p className="text-[9px] leading-relaxed text-blue-200/70">
                &ldquo;Funnel structure improved based on Q1 conversion data.&rdquo;
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </FeatureFloatingMockShell>
  )
}

```
$body_c_48$, $body_ct_48$text/markdown$body_ct_48$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
