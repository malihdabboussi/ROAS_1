INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_11$references/type6-components/FeatureMockups.md$body_fp_11$, $body_c_11$# StudioMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FeatureMockups.tsx`
- Website source: `apps/website/src/components/feature-pages/FeatureMockups.tsx`
- Import alias: `@/components/feature-pages/FeatureMockups`

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

- `animate-pulse`
- `chip-glass-neutral`
- `duration-500`
- `glass-card`
- `grayscale`
- `shrink-0`
- `sm:flex`
- `sm:inset-x-6`
- `sm:text-[11px]`
- `sm:text-[12px]`
- `sm:text-[15px]`
- `transition-all`
- `truncate`

## Source

```tsx
'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Bot,
  Briefcase,
  FileText,
  Globe,
  Layers,
  LayoutTemplate,
  MessageSquare,
  Mic,
  MousePointerClick,
  Paperclip,
  Search,
  Share2,
  Users,
} from 'lucide-react'
import { AutopilotDepthIllustration } from '@/components/marketing/AutopilotDepthIllustration'
import { CapabilitiesCarouselMockup } from '@/components/marketing/CapabilitiesCarouselMockup'
import { IntegrationKnowledgeIndexerMockup } from '@/components/marketing/IntegrationKnowledgeIndexerMockup'
import { IntegrationPermissionScoperMockup } from '@/components/marketing/IntegrationPermissionScoperMockup'
import { IntegrationToolDispatcherMockup } from '@/components/marketing/IntegrationToolDispatcherMockup'
import { MarketingAtlasVoiceMockup } from '@/components/marketing/MarketingAtlasVoiceMockup'
import { MarketingBrainGraphMockup } from '@/components/marketing/MarketingBrainGraphMockup'
import {
  MarketingCapabilitiesGtmMockup,
  MarketingCapabilitiesMediaMockup,
  MarketingCapabilitiesOpsMockup,
} from '@/components/marketing/MarketingCapabilitiesShowcaseMockups'
import { MarketingDailyDigestMockup } from '@/components/marketing/MarketingDailyDigestMockup'
import {
  MarketingMissionDelegateStepBriefMockup,
  MarketingMissionDelegateStepDeliverableMockup,
  MarketingMissionDelegateStepPlanMockup,
} from '@/components/marketing/MarketingDelegateStepsMockups'
import { MarketingDynamicRouterMockup } from '@/components/marketing/MarketingDynamicRouterMockup'
import { MarketingMemoryStackMockup } from '@/components/marketing/MarketingMemoryStackMockup'
import { MarketingMissionActivityScoreMockup } from '@/components/marketing/MarketingMissionActivityScoreMockup'
import { MarketingMissionActivityTimelineMockup } from '@/components/marketing/MarketingMissionActivityTimelineMockup'
import { MarketingMissionDeliverableStacksMockup } from '@/components/marketing/MarketingMissionDeliverableStacksMockup'
import { MarketingMissionDetailModalMockup } from '@/components/marketing/MarketingMissionDetailModalMockup'
import { MarketingMissionExecutionMockup } from '@/components/marketing/MarketingMissionExecutionMockup'
import { MarketingNorthstarGuardrailMockup } from '@/components/marketing/MarketingNorthstarGuardrailMockup'
import { MarketingOrgChartMockup } from '@/components/marketing/MarketingOrgChartMockup'
import { MarketingRawToSignalMockup } from '@/components/marketing/MarketingRawToSignalMockup'
import { MarketingSkillBuilderMockup } from '@/components/marketing/MarketingSkillBuilderMockup'
import { MarketingSkillLibraryMockup } from '@/components/marketing/MarketingSkillLibraryMockup'
import { MarketingSkillsHeroMockup } from '@/components/marketing/MarketingSkillsHeroMockup'
import { MarketingSkillStackMockup } from '@/components/marketing/MarketingSkillStackMockup'
import { MarketingInfrastructureRadarMockup } from '@/components/MarketingInfrastructureRadar'
import { BackgroundPaths } from '@/components/ui/background-paths'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { FeatureFloatingMockShell } from './FeatureFloatingMockShell'
import { IntegrationsHeroMockup } from './IntegrationsHeroMockup'

function AnimatedNumber({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState('0')
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return
        hasAnimated.current = true
        observer.disconnect()

        const stripped = value.replace(/[^0-9.]/g, '')
        const target = parseFloat(stripped)
        if (Number.isNaN(target)) {
          setDisplay(value)
          return
        }
        const prefix = value.match(/^[^0-9]*/)?.[0] ?? ''
        const suffix = value.match(/[^0-9.]*$/)?.[0] ?? ''
        const hasDecimal = stripped.includes('.')
        const duration = 1200
        const start = performance.now()

        function tick(now: number) {
          const t = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - t, 3)
          const current = eased * target
          const formatted = hasDecimal ? current.toFixed(1) : Math.round(current).toLocaleString()
          setDisplay(`${prefix}${formatted}${suffix}`)
          if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.3 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}

export function StudioMockup() {
  return (
    <div className="mockup-frame flex h-full min-h-[340px] w-full flex-col">
      <div className="mockup-chrome">
        <div className="mockup-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="mockup-url">app.vibey.im/studio</div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="border-color-glass flex flex-1 flex-col border-r">
          <div className="flex-1 space-y-3 overflow-hidden px-4 pt-5">
            <div className="mockup-card-elevated px-4 py-3">
              <p className="text-[13px] leading-relaxed text-white">
                Build me a lead gen funnel for my SaaS targeting startup founders.
              </p>
            </div>
            <div className="text-color-secondary space-y-2 text-[13px] leading-relaxed">
              <p>
                <strong className="text-white">Done.</strong> Here&apos;s your complete system:
              </p>
              <div className="space-y-1.5 pl-1">
                {[
                  { n: '1', label: 'Landing Page', desc: 'Conversion-optimized' },
                  { n: '2', label: 'Presentation', desc: 'PDF playbook' },
                  { n: '3', label: 'Email Sequence', desc: '5-part nurture' },
                ].map((item) => (
                  <p key={item.n} className="text-[12px]">
                    <span className="text-white">
                      {item.n}. {item.label}
                    </span>
                    <span className="text-color-dim">: {item.desc}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="border-color-glass border-t px-4 py-3">
            <div className="mockup-input px-3 py-2">
              <Paperclip size={14} className="text-color-dimmer" />
              <span className="text-color-dimmer flex-1 text-[12px]">Message Vibe...</span>
              <Mic size={14} className="text-color-dimmer" />
            </div>
          </div>
        </div>

        <div className="bg-color-deep-dark hidden w-[180px] flex-col sm:flex">
          <div className="border-color-glass border-b px-3 py-2.5">
            <span className="text-color-muted text-[11px] font-semibold">Artifacts</span>
            <span className="text-color-dimmer ml-1.5 text-[11px]">3</span>
          </div>
          <div className="flex-1 space-y-1 p-2">
            {[
              { icon: LayoutTemplate, label: 'Landing Page', colorClass: 'text-color-emerald' },
              { icon: Briefcase, label: 'Presentation', colorClass: 'text-secondary-light' },
              { icon: FileText, label: 'Email Sequence', colorClass: 'text-color-blue' },
            ].map((a) => (
              <div key={a.label} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                <a.icon size={13} className={a.colorClass} />
                <span className="text-color-muted text-[11px]">{a.label}</span>
                <div className="mockup-dot-active ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const AGENT_LINES = [
  { text: 'Analyzing your brief...', type: 'tool' as const, icon: 'search', delay: 800 },
  { text: 'Researching ICP & competitors', type: 'tool' as const, icon: 'globe', delay: 600 },
  { text: 'Building buyer persona', type: 'tool' as const, icon: 'users', delay: 500 },
  { text: "Here's your complete system:", type: 'text' as const, delay: 400 },
  { text: '1. Landing Page: Conversion-optimized', type: 'artifact' as const, delay: 300 },
  { text: '2. Presentation: PDF playbook', type: 'artifact' as const, delay: 300 },
  { text: '3. Email Sequence: 5-part nurture', type: 'artifact' as const, delay: 300 },
]
const TOTAL_CYCLE = AGENT_LINES.reduce((s, l) => s + l.delay, 0) + 4000

function ToolIcon({ name }: { name: string }) {
  if (name === 'search') return <Search size={10} />
  if (name === 'globe') return <Globe size={10} />
  return <Users size={10} />
}

export function StudioMockupCompact() {
  const [visibleLines, setVisibleLines] = useState(0)
  const [userVisible, setUserVisible] = useState(false)
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    function runCycle() {
      if (cancelled) return
      setUserVisible(false)
      setVisibleLines(0)
      setCharCount(0)

      setTimeout(() => {
        if (cancelled) return
        setUserVisible(true)

        let cumDelay = 600
        AGENT_LINES.forEach((line, i) => {
          cumDelay += line.delay
          const d = cumDelay
          setTimeout(() => {
            if (cancelled) return
            setVisibleLines(i + 1)
            const fullLen = line.text.length
            let c = 0
            const tick = () => {
              if (cancelled) return
              c += 2
              setCharCount(c)
              if (c < fullLen) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }, d)
        })

        setTimeout(() => {
          if (!cancelled) runCycle()
        }, TOTAL_CYCLE)
      }, 300)
    }
    runCycle()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mockup-frame flex h-full min-h-[240px] w-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-2.5 overflow-hidden px-4 pt-4">
          <div
            className="mockup-card-elevated px-3 py-2.5 transition-all duration-500"
            style={{
              opacity: userVisible ? 1 : 0,
              transform: userVisible ? 'translateY(0)' : 'translateY(8px)',
            }}
          >
            <p className="text-[11px] leading-relaxed text-white sm:text-[12px]">
              Build me a lead gen funnel for my SaaS targeting startup founders.
            </p>
          </div>

          {userVisible && (
            <div className="space-y-1.5">
              {AGENT_LINES.slice(0, visibleLines).map((line, i) => {
                const isLatest = i === visibleLines - 1
                const displayText = isLatest ? line.text.slice(0, charCount) : line.text

                if (line.type === 'tool') {
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] sm:text-[11px]">
                      <span
                        className="text-color-emerald flex items-center gap-1 rounded px-1.5 py-0.5"
                        style={{ background: 'rgb(var(--accent-emerald-rgb) / 0.1)' }}
                      >
                        <ToolIcon name={line.icon!} />
                      </span>
                      <span className="text-color-muted">
                        {displayText}
                        {isLatest && charCount < line.text.length && (
                          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-white/60" />
                        )}
                      </span>
                    </div>
                  )
                }

                if (line.type === 'artifact') {
                  const parts = displayText.split(': ')
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 pl-1 text-[10px] sm:text-[11px]"
                    >
                      <span className="mockup-dot-active" />
                      <span className="text-white">{parts[0]}</span>
                      {parts[1] && <span className="text-color-dim">: {parts[1]}</span>}
                      {isLatest && charCount < line.text.length && (
                        <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-white/60" />
                      )}
                    </div>
                  )
                }

                return (
                  <p key={i} className="text-[10px] text-white sm:text-[11px]">
                    <strong>{displayText}</strong>
                    {isLatest && charCount < line.text.length && (
                      <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-white/60" />
                    )}
                  </p>
                )
              })}
            </div>
          )}
        </div>

        <div className="border-color-glass border-t px-4 py-2.5">
          <div className="mockup-input px-3 py-2">
            <Paperclip size={12} className="text-color-dimmer" />
            <span className="text-color-dimmer flex-1 text-[10px] sm:text-[11px]">
              Message Vibe...
            </span>
            <Mic size={12} className="text-color-dimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}

function FunnelMockupCompact() {
  return (
    <div className="mockup-frame flex h-full min-h-[240px] w-full flex-col">
      <div className="bg-color-deep-darker min-h-0 flex-1 overflow-hidden">
        <div className="mockup-preview-gradient px-6 pb-6 pt-8 text-center">
          <div className="mockup-pill-emerald mb-3 px-3 py-0.5">For SaaS Founders</div>
          <h4 className="h4 mb-2 leading-tight text-white">
            Stop Losing Leads.
            <br />
            Start Automating Sales.
          </h4>
          <p className="text-color-muted mx-auto mb-4 max-w-[200px] text-[11px] leading-relaxed">
            The playbook that helped 200+ founders build a self-running pipeline.
          </p>
          <div className="mockup-btn-emerald px-5 py-2 text-[11px]">Get the Free Playbook</div>
        </div>
        <div className="border-color-glass-dim border-t px-6 py-4 text-center">
          <p className="text-color-dimmer mb-3 text-[9px] font-medium uppercase tracking-widest">
            Trusted by founders at
          </p>
          <div className="flex items-center justify-center gap-6 opacity-40 grayscale">
            {['YC', 'Techstars', '500'].map((name) => (
              <span key={name} className="text-[11px] font-bold tracking-tight text-white">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FunnelMockup() {
  return (
    <div className="mockup-frame flex h-full min-h-[340px] w-full flex-col">
      <div className="mockup-chrome">
        <div className="mockup-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="mockup-url">your-funnel.govibey.com</div>
      </div>

      <div className="mockup-toolbar">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={14} className="text-color-muted" />
          <span className="text-[12px] font-medium text-white">Lead Gen Funnel</span>
          <span className="mockup-badge-emerald px-2 py-0.5">
            <span className="mockup-dot-active" />
            <span className="text-color-emerald text-[10px]">Live</span>
          </span>
        </div>
        <div className="mockup-btn-publish px-3 py-1">
          <Globe size={12} className="text-color-emerald" />
          <span className="text-color-emerald text-[11px] font-medium">Publish</span>
        </div>
      </div>

      <div className="bg-color-deep-darker min-h-0 flex-1 overflow-hidden">
        <div className="mockup-preview-gradient px-6 pb-6 pt-8 text-center">
          <div className="mockup-pill-emerald mb-3 px-3 py-0.5">For SaaS Founders</div>
          <h4 className="h4 mb-2 leading-tight text-white">
            Stop Losing Leads.
            <br />
            Start Automating Sales.
          </h4>
          <p className="text-color-muted mx-auto mb-4 max-w-[200px] text-[11px] leading-relaxed">
            The playbook that helped 200+ founders build a self-running pipeline.
          </p>
          <div className="mockup-btn-emerald px-5 py-2 text-[11px]">Get the Free Playbook</div>
        </div>
        <div className="border-color-glass-dim border-t px-6 py-4 text-center">
          <p className="text-color-dimmer mb-3 text-[9px] font-medium uppercase tracking-widest">
            Trusted by founders at
          </p>
          <div className="flex items-center justify-center gap-6 opacity-40 grayscale">
            {['YC', 'Techstars', '500'].map((name) => (
              <span key={name} className="text-[11px] font-bold tracking-tight text-white">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BrainMockup() {
  return <MarketingBrainGraphMockup />
}

export function TeamAgentsMockup() {
  const agents = [
    { icon: MessageSquare, label: 'Strategist', tone: 'text-color-emerald' },
    { icon: LayoutTemplate, label: 'Funnel', tone: 'text-secondary-light' },
    { icon: FileText, label: 'Copy', tone: 'text-color-blue' },
    { icon: Share2, label: 'Ads', tone: 'text-color-emerald' },
  ]
  return (
    <div className="mockup-frame flex h-full min-h-[340px] w-full flex-col">
      <div className="mockup-header">
        <Users size={14} className="text-secondary-light" />
        <span className="text-[12px] font-semibold text-white">Agent Team</span>
        <span className="text-color-dimmer ml-auto text-[10px]">4 active</span>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 p-3">
        {agents.map((a) => (
          <div key={a.label} className="mockup-card flex flex-col gap-2 p-3">
            <a.icon size={16} className={a.tone} />
            <span className="text-[11px] font-medium text-white">{a.label}</span>
            <span className="text-color-dimmer text-[10px]">Listening in Studio</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdsMockup() {
  return (
    <div className="mockup-frame flex h-full min-h-[340px] w-full flex-col">
      <div className="mockup-chrome">
        <div className="mockup-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="mockup-url">Ads Manager · Preview</div>
      </div>
      <div className="border-color-glass bg-color-deep-darker flex flex-1 flex-col border-t p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="mockup-badge-emerald px-2 py-0.5">
            <span className="text-color-emerald text-[10px] font-medium">Draft</span>
          </span>
          <span className="text-color-dimmer text-[10px]">Campaign: SaaS founders</span>
        </div>
        <div className="mockup-card flex flex-1 flex-col gap-2 p-4">
          <p className="text-[11px] font-semibold text-white">
            Stop bleeding leads on cold traffic.
          </p>
          <p className="text-color-secondary text-[11px] leading-relaxed">
            Book a 15-min pipeline audit: we&apos;ll map the exact funnel gaps costing you revenue.
          </p>
          <div className="mockup-btn-emerald mt-auto w-fit px-4 py-1.5 text-[10px]">Learn more</div>
        </div>
      </div>
    </div>
  )
}

export function IntegrationsMockup() {
  return <IntegrationsHeroMockup />
}

export function EnterpriseHqMockup() {
  return (
    <div className="mockup-frame flex h-full min-h-[340px] w-full flex-col">
      <div className="mockup-header">
        <Layers size={14} className="text-secondary-light" />
        <span className="text-[12px] font-semibold text-white">HQ · Acme Org</span>
        <span className="text-color-dimmer ml-auto text-[10px]">3 workspaces</span>
      </div>
      <div className="flex min-h-0 flex-1 gap-2 p-3">
        <div className="border-color-glass bg-color-deep-dark flex w-[38%] flex-col rounded-lg border p-2">
          <span className="text-color-dimmer mb-2 text-[9px] font-semibold uppercase">
            Workspaces
          </span>
          {['Growth', 'Product', 'Partners'].map((w) => (
            <div
              key={w}
              className="text-color-muted mb-1 rounded px-2 py-1 text-[10px] hover:bg-white/5"
            >
              {w}
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="mockup-toolbar py-2">
            <Bot size={12} className="text-color-muted" />
            <span className="text-[11px] text-white">Campaigns</span>
          </div>
          {['Q1 Launch', 'Webinar Series', 'Partner Co-marketing'].map((c) => (
            <div key={c} className="mockup-card flex items-center justify-between px-3 py-2">
              <span className="text-[11px] text-white">{c}</span>
              <span className="text-color-emerald text-[9px]">Live</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export type FeatureMockupKind =
  | 'app-studio'
  | 'studio'
  | 'prompt-preview'
  | 'funnels'
  | 'infrastructure-radar'
  | 'brain'
  | 'team'
  | 'marketing-org'
  | 'ads'
  | 'analytics'
  | 'leads'
  | 'integrations'
  | 'enterprise-hq'
  | 'mission-activity-score'
  | 'autopilot-depth'
  | 'northstar-guardrail'
  | 'dynamic-router'
  | 'daily-digest'
  | 'integration-indexer'
  | 'integration-dispatcher'
  | 'integration-scoper'
  | 'mission-execution'
  | 'mission-detail-modal'
  | 'memory-stack'
  | 'mission-deliverable-stacks'
  | 'mission-activity-timeline'
  | 'mission-delegate-step-brief'
  | 'mission-delegate-step-plan'
  | 'mission-delegate-step-deliverable'
  | 'raw-to-signal'
  | 'atlas-voice'
  | 'skills-hero'
  | 'skill-stack'
  | 'skill-builder'
  | 'skill-library'
  | 'capabilities-carousel'
  | 'capabilities-showcase-gtm'
  | 'capabilities-showcase-media'
  | 'capabilities-showcase-ops'

export function FeatureMockupByKind({
  kind,
  compact,
  missionDetailLibraryAgents,
  missionDetailVibeyPortraitUrl,
}: {
  kind: FeatureMockupKind
  compact?: boolean
  missionDetailLibraryAgents?: PublicAgentLibraryRow[]
  missionDetailVibeyPortraitUrl?: string
}) {
  switch (kind) {
    case 'app-studio':
      return <AppStudioMockup />
    case 'studio':
      return compact ? <StudioMockupCompact /> : <StudioMockup />
    case 'prompt-preview':
      return <PromptPreviewMockup />
    case 'funnels':
      return compact ? <FunnelMockupCompact /> : <FunnelMockup />
    case 'infrastructure-radar':
      return <MarketingInfrastructureRadarMockup />
    case 'brain':
      return <BrainMockup />
    case 'team':
      return <TeamAgentsMockup />
    case 'marketing-org':
      return <MarketingOrgChartMockup />
    case 'ads':
      return <AdsMockup />
    case 'analytics':
      return <AnalyticsMockup />
    case 'leads':
      return <LeadsMockup />
    case 'integrations':
      return <IntegrationsMockup />
    case 'enterprise-hq':
      return <EnterpriseHqMockup />
    case 'mission-activity-score':
      return <MarketingMissionActivityScoreMockup />
    case 'autopilot-depth':
      return <AutopilotDepthIllustration />
    case 'northstar-guardrail':
      return <MarketingNorthstarGuardrailMockup />
    case 'dynamic-router':
      return <MarketingDynamicRouterMockup />
    case 'daily-digest':
      return <MarketingDailyDigestMockup />
    case 'integration-indexer':
      return <IntegrationKnowledgeIndexerMockup />
    case 'integration-dispatcher':
      return <IntegrationToolDispatcherMockup />
    case 'integration-scoper':
      return <IntegrationPermissionScoperMockup />
    case 'mission-execution':
      return <MarketingMissionExecutionMockup />
    case 'mission-deliverable-stacks':
      return <MarketingMissionDeliverableStacksMockup />
    case 'mission-activity-timeline':
      return (
        <MarketingMissionActivityTimelineMockup
          libraryAgents={missionDetailLibraryAgents}
          vibeyPortraitUrl={missionDetailVibeyPortraitUrl}
        />
      )
    case 'mission-delegate-step-brief':
      return <MarketingMissionDelegateStepBriefMockup />
    case 'mission-delegate-step-plan':
      return <MarketingMissionDelegateStepPlanMockup />
    case 'mission-delegate-step-deliverable':
      return <MarketingMissionDelegateStepDeliverableMockup />
    case 'memory-stack':
      return <MarketingMemoryStackMockup />
    case 'raw-to-signal':
      return <MarketingRawToSignalMockup />
    case 'atlas-voice':
      return <MarketingAtlasVoiceMockup />
    case 'mission-detail-modal':
      return (
        <MarketingMissionDetailModalMockup
          libraryAgents={missionDetailLibraryAgents}
          vibeyPortraitUrl={missionDetailVibeyPortraitUrl}
        />
      )
    case 'atlas-voice':
      return <MarketingAtlasVoiceMockup />
    case 'skills-hero':
      return <MarketingSkillsHeroMockup />
    case 'skill-stack':
      return <MarketingSkillStackMockup />
    case 'skill-builder':
      return <MarketingSkillBuilderMockup />
    case 'skill-library':
      return <MarketingSkillLibraryMockup />
    case 'capabilities-carousel':
      return <CapabilitiesCarouselMockup />
    case 'capabilities-showcase-gtm':
      return <MarketingCapabilitiesGtmMockup />
    case 'capabilities-showcase-media':
      return <MarketingCapabilitiesMediaMockup />
    case 'capabilities-showcase-ops':
      return <MarketingCapabilitiesOpsMockup />
    default:
      return null
  }
}

function PromptPreviewMockup() {
  return (
    <FeatureFloatingMockShell>
      {/* Live pill: top right, above everything */}
      <div className="chip-glass-neutral absolute right-4 top-4 z-30 flex items-center gap-2 rounded-full px-4 py-2">
        <span className="mockup-dot-active" />
        <span className="text-color-primary text-[13px] font-bold">Live</span>
      </div>

      {/* Landing page card: BackgroundPaths component as the page */}
      <div className="border-color-glass absolute inset-x-4 bottom-[110px] top-4 z-10 overflow-hidden rounded-2xl border sm:inset-x-6">
        <BackgroundPaths
          variant="embed"
          title="Innovation Meets Simplicity"
          ctaLabel="Discover Excellence"
        />
      </div>

      {/* Prompt card: overlaps the bottom of the landing page */}
      <div className="glass-card absolute inset-x-4 bottom-4 z-20 p-5 sm:inset-x-6">
        <p className="text-color-muted mb-1 text-[11px] font-medium">Prompt</p>
        <p className="text-color-primary text-[14px] font-semibold leading-snug sm:text-[15px]">
          Build a lead gen funnel for my SaaS targeting startup founders. Include a landing page,
          social proof stats, and a strong CTA.
        </p>
      </div>
    </FeatureFloatingMockShell>
  )
}

function AnalyticsMockup() {
  const chartGradId = React.useId().replace(/:/g, '')
  const chartPoints = [20, 35, 28, 45, 38, 52, 48, 65, 58, 72, 68, 80]
  const maxY = 100
  const polyline = chartPoints
    .map((y, i) => `${(i / (chartPoints.length - 1)) * 100},${100 - (y / maxY) * 100}`)
    .join(' ')
  const areaPath = `0,100 ${polyline} 100,100`

  return (
    <FeatureFloatingMockShell>
      <div className="relative min-h-[420px]">
        {/* Emails: back card, top-right */}
        <div
          className="glass-card absolute right-6 top-6 z-10 w-[230px] p-5"
          style={{ transform: 'rotate(2deg)' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Share2 size={12} className="text-secondary-light" />
            <p className="text-color-primary text-[13px] font-bold">Emails</p>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Sent', value: '4,210' },
              { label: 'Open rate', value: '68%' },
              { label: 'Click rate', value: '12.4%' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-color-muted text-[11px]">{row.label}</span>
                <AnimatedNumber
                  value={row.value}
                  className="text-color-emerald text-[12px] font-bold"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Ads: middle card, overlaps below-left */}
        <div
          className="glass-card absolute left-4 top-[120px] z-20 w-[240px] p-5"
          style={{ transform: 'rotate(-3deg)' }}
        >
          <div className="mb-3 flex items-center gap-2">
            <MousePointerClick size={12} className="text-color-emerald" />
            <p className="text-color-primary text-[13px] font-bold">Ad Performance</p>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Impressions', value: '23.1k' },
              { label: 'Clicks', value: '1,847' },
              { label: 'Cost / lead', value: '$2.40' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-color-muted text-[11px]">{row.label}</span>
                <AnimatedNumber
                  value={row.value}
                  className="text-secondary-light text-[12px] font-bold"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Funnels: front card, overlaps bottom-right */}
        <div
          className="glass-card absolute bottom-4 right-4 z-30 w-[280px] p-5"
          style={{ transform: 'rotate(1deg)' }}
        >
          <div className="mb-2 flex items-center gap-2">
            <LayoutTemplate size={12} className="text-color-emerald" />
            <p className="text-color-primary text-[12px] font-bold">Funnels</p>
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {[
              { label: 'PAGE VIEWS', value: '982', change: '↑129%' },
              { label: 'VISITS', value: '201', change: '↑108%' },
              { label: 'CONVERSIONS', value: '143', change: '↑92%' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-color-muted text-[7px] font-semibold uppercase tracking-wider">
                  {s.label}
                </p>
                <AnimatedNumber
                  value={s.value}
                  className="text-color-primary mt-0.5 block text-[18px] font-bold leading-none"
                />
                <p className="text-color-emerald mt-0.5 text-[10px] font-semibold">{s.change}</p>
              </div>
            ))}
          </div>
          <div className="relative h-[60px] w-full">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--accent-secondary-rgb) / 0.2)" />
                  <stop offset="100%" stopColor="rgb(var(--accent-secondary-rgb) / 0)" />
                </linearGradient>
              </defs>
              <polygon points={areaPath} fill={`url(#${chartGradId})`} />
              <polyline
                points={polyline}
                fill="none"
                stroke="var(--accent-secondary)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}

function LeadsMockup() {
  const leads = [
    {
      name: 'Alex Chen',
      email: 'alex@startup.io',
      source: 'Funnel',
      time: '2m ago',
      avatarClass: 'bg-color-emerald',
    },
    {
      name: 'Sarah Kim',
      email: 'sarah@agency.co',
      source: 'Presentation',
      time: '14m ago',
      avatarClass: 'bg-accent-secondary',
    },
    {
      name: 'Mike Ross',
      email: 'mike@saas.dev',
      source: 'Funnel',
      time: '1h ago',
      avatarClass: 'bg-color-emerald',
    },
    {
      name: 'Lena Park',
      email: 'lena@brand.com',
      source: 'Email',
      time: '3h ago',
      avatarClass: 'bg-color-surface',
    },
  ]

  return (
    <FeatureFloatingMockShell>
      <div className="relative min-h-[420px]">
        {/* New lead notification: back layer, top-right */}
        <div
          className="chip-glass-neutral absolute right-6 top-6 z-10 flex items-center gap-2 rounded-full px-4 py-2"
          style={{ transform: 'rotate(2deg)' }}
        >
          <span className="mockup-dot-active" />
          <span className="text-color-primary text-[12px] font-semibold">New lead from funnel</span>
          <span className="text-color-muted text-[10px]">just now</span>
        </div>

        {/* Summary card: middle layer, overlaps below-left */}
        <div
          className="glass-card absolute left-4 top-[60px] z-20 w-[210px] p-5"
          style={{ transform: 'rotate(-3deg)' }}
        >
          <p className="text-color-muted text-[11px] font-semibold uppercase tracking-wider">
            This week
          </p>
          <AnimatedNumber
            value="24"
            className="text-color-primary mt-1 block text-[36px] font-extrabold leading-none"
          />
          <p className="text-color-subtle mt-1 text-[13px]">new leads captured</p>
          <div className="mt-4 flex gap-3">
            {[
              { label: 'Funnel', n: '16', valueClass: 'text-color-emerald' },
              { label: 'Email', n: '5', valueClass: 'text-secondary-light' },
              { label: 'Presentation', n: '3', valueClass: 'text-secondary' },
            ].map((s) => (
              <div key={s.label}>
                <AnimatedNumber value={s.n} className={`text-[18px] font-bold ${s.valueClass}`} />
                <p className="text-color-muted text-[9px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lead list card: front layer, bottom-right, overlaps both */}
        <div
          className="glass-card absolute bottom-4 right-4 z-30 w-[280px] overflow-hidden"
          style={{ transform: 'rotate(1deg)' }}
        >
          <div className="border-color-glass flex items-center justify-between border-b px-5 py-3">
            <p className="text-color-primary text-[13px] font-bold">Recent Leads</p>
            <span className="mockup-badge-emerald text-color-emerald px-2.5 py-0.5 text-[10px] font-semibold">
              Live
            </span>
          </div>
          <div>
            {leads.map((lead, i) => (
              <div
                key={lead.email}
                className={`flex items-center gap-3 px-5 py-2.5 ${i < leads.length - 1 ? 'border-color-glass border-b' : ''}`}
              >
                <div
                  className={`text-color-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${lead.avatarClass}`}
                >
                  {lead.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-color-primary truncate text-[12px] font-semibold">
                    {lead.name}
                  </p>
                  <p className="text-color-muted truncate text-[10px]">{lead.email}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-color-subtle text-[9px] font-medium">{lead.source}</span>
                  <span className="text-color-muted text-[9px]">{lead.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FeatureFloatingMockShell>
  )
}

const LazyAppMockup = React.lazy(() =>
  import('@/components/AppMockup').then((m) => ({ default: m.AppMockup })),
)

function AppStudioMockup() {
  return (
    <React.Suspense fallback={<div className="min-h-[340px]" />}>
      <LazyAppMockup />
    </React.Suspense>
  )
}

```
$body_c_11$, $body_ct_11$text/markdown$body_ct_11$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_12$references/type6-components/FeaturePageLayout.md$body_fp_12$, $body_c_12$# FeaturePageLayout

> Product component; reuse verbatim in the slide TSX for 1:1 website fidelity.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FeaturePageLayout.tsx`
- Website source: `apps/website/src/components/feature-pages/FeaturePageLayout.tsx`
- Import alias: `@/components/feature-pages/FeaturePageLayout`

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


## Source

```tsx
import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'

export function FeaturePageLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="relative min-h-screen pt-24">
        <div className="hero-dot-grid pointer-events-none fixed inset-0 z-0" />
        <div className="relative z-[1]">{children}</div>
      </main>
      <Footer />
    </>
  )
}

```
$body_c_12$, $body_ct_12$text/markdown$body_ct_12$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_13$references/type6-components/FeatureShowcase.md$body_fp_13$, $body_c_13$# FeatureShowcaseBlockMockup

> Product UI mockup block; use when a slide needs to look like the real app.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FeatureShowcase.tsx`
- Website source: `apps/website/src/components/feature-pages/FeatureShowcase.tsx`
- Import alias: `@/components/feature-pages/FeatureShowcase`

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

- `body-2`
- `body-3`
- `chip-glass-emerald`
- `object-cover`
- `section-padding`
- `site-container`

## Source

```tsx
import { ArrowRight } from 'lucide-react'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import type { FeatureMockupKind } from '@/components/feature-pages/FeatureMockups'
import { FeatureMockupByKind } from '@/components/feature-pages/FeatureMockups'
import { MarketingDailyDigestMockup } from '@/components/marketing/MarketingDailyDigestMockup'
import { MarketingDynamicRouterMockup } from '@/components/marketing/MarketingDynamicRouterMockup'
import { MarketingHrLibraryMockup } from '@/components/marketing/MarketingHrLibraryMockup'
import { MarketingMissionActivityScoreMockup } from '@/components/marketing/MarketingMissionActivityScoreMockup'
import { MarketingMissionActivityTimelineMockup } from '@/components/marketing/MarketingMissionActivityTimelineMockup'
import { MarketingMissionDeliverableStacksMockup } from '@/components/marketing/MarketingMissionDeliverableStacksMockup'
import { MarketingMissionExecutionMockup } from '@/components/marketing/MarketingMissionExecutionMockup'
import { MarketingNorthstarGuardrailMockup } from '@/components/marketing/MarketingNorthstarGuardrailMockup'
import { MarketingOrgChartMockup } from '@/components/marketing/MarketingOrgChartMockup'
import { WaitlistAwareLink } from '@/components/WaitlistAwareLink'
import type { MarketingHrShowcasePayload } from '@/lib/marketing-hr-showcase-data'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { cn } from '@/lib/utils'

export type ShowcaseBlock = {
  mockupKind: FeatureMockupKind
  title: string
  features: { title: string; description: string; link?: { href: string; label: string } }[]
  videoSrc?: string
  hrShowcaseData?: MarketingHrShowcasePayload
  /** Hero / `getAgentLibraryForMarketing()`: org chart specialist portraits match carousel. */
  agentLibraryAgents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}

export function FeatureShowcaseBlockMockup({ block }: { block: ShowcaseBlock }) {
  return block.hrShowcaseData ? (
    <MarketingHrLibraryMockup data={block.hrShowcaseData} />
  ) : block.mockupKind === 'northstar-guardrail' ? (
    <MarketingNorthstarGuardrailMockup />
  ) : block.mockupKind === 'daily-digest' ? (
    <MarketingDailyDigestMockup vibeyPortraitUrl={block.vibeyPortraitUrl} />
  ) : block.mockupKind === 'dynamic-router' ? (
    <MarketingDynamicRouterMockup
      libraryAgents={block.agentLibraryAgents}
      vibeyPortraitUrl={block.vibeyPortraitUrl}
    />
  ) : block.mockupKind === 'marketing-org' ? (
    <MarketingOrgChartMockup
      libraryAgents={block.agentLibraryAgents}
      vibeyPortraitUrl={block.vibeyPortraitUrl}
    />
  ) : block.mockupKind === 'mission-activity-score' ? (
    <MarketingMissionActivityScoreMockup vibeyPortraitUrl={block.vibeyPortraitUrl} />
  ) : block.mockupKind === 'mission-execution' ? (
    <MarketingMissionExecutionMockup
      libraryAgents={block.agentLibraryAgents}
      vibeyPortraitUrl={block.vibeyPortraitUrl}
    />
  ) : block.mockupKind === 'mission-activity-timeline' ? (
    <MarketingMissionActivityTimelineMockup
      libraryAgents={block.agentLibraryAgents}
      vibeyPortraitUrl={block.vibeyPortraitUrl}
    />
  ) : block.mockupKind === 'mission-deliverable-stacks' ? (
    <MarketingMissionDeliverableStacksMockup />
  ) : block.videoSrc ? (
    <video
      src={block.videoSrc}
      autoPlay
      loop
      muted
      playsInline
      className="h-full w-full object-cover"
    />
  ) : (
    <FeatureMockupByKind kind={block.mockupKind} />
  )
}

export function FeatureShowcase(props: {
  title: string
  subtitle?: string
  blocks: ShowcaseBlock[]
  ctaHref?: string
  ctaLabel?: string
}) {
  return (
    <section className="section-padding relative">
      <div className="site-container">
        <div>
          <AnimateOnScroll>
            <h2 className="h2 mb-2 tracking-tight text-white">{props.title}</h2>
            {props.subtitle && (
              <p className="text-text-muted body-2 mb-12 max-w-2xl leading-relaxed">
                {props.subtitle}
              </p>
            )}
          </AnimateOnScroll>
        </div>

        <div className="space-y-20 md:space-y-24">
          {props.blocks.map((block, i) => {
            const textOrder = i % 2 === 0 ? 'order-1 lg:order-1' : 'order-1 lg:order-2'
            const mediaOrder = i % 2 === 0 ? 'order-2 lg:order-2' : 'order-2 lg:order-1'
            const missionExecutionStretch = block.mockupKind === 'mission-execution'
            return (
              <AnimateOnScroll key={block.title}>
                <div
                  className={cn(
                    'grid min-w-0 gap-10 lg:grid-cols-2 lg:gap-14',
                    missionExecutionStretch ? 'lg:items-stretch' : 'items-center',
                  )}
                >
                  <div className={cn(textOrder, 'min-w-0')}>
                    <h3 className="h3 mb-6 text-white">{block.title}</h3>
                    <div className="space-y-4">
                      {block.features.map((f) => (
                        <div key={f.title}>
                          <p className="body-2 leading-relaxed">
                            <strong className="font-semibold text-white">{f.title}</strong>
                            <span className="text-text-muted">: {f.description}</span>
                            {f.link && (
                              <WaitlistAwareLink
                                href={f.link.href}
                                className="text-emerald-accent body-3 ml-1 inline-flex items-center gap-1 font-medium"
                              >
                                {f.link.label}
                                <ArrowRight size={12} />
                              </WaitlistAwareLink>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div
                    className={cn(
                      mediaOrder,
                      'min-w-0',
                      missionExecutionStretch && 'flex min-h-0 flex-col lg:h-full',
                    )}
                  >
                    <div
                      className={cn(
                        'glass-card border-section min-w-0 max-w-full overflow-hidden rounded-2xl border',
                        missionExecutionStretch && 'flex h-full min-h-[480px] flex-1 flex-col',
                      )}
                    >
                      <FeatureShowcaseBlockMockup block={block} />
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            )
          })}
        </div>

        <div>
          {props.ctaHref && props.ctaLabel && (
            <AnimateOnScroll>
              <div className="mt-14 text-center md:mt-16">
                <WaitlistAwareLink
                  href={props.ctaHref}
                  className="chip-glass-emerald body-3 inline-flex items-center gap-2 rounded-xl px-8 py-3 font-semibold"
                >
                  {props.ctaLabel}
                  <ArrowRight size={16} />
                </WaitlistAwareLink>
              </div>
            </AnimateOnScroll>
          )}
        </div>
      </div>
    </section>
  )
}

```
$body_c_13$, $body_ct_13$text/markdown$body_ct_13$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_14$references/type6-components/ForceGraph.md$body_fp_14$, $body_c_14$# ForceGraph

> Force graph / relationship viz; good for brain/memory slides.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/brain-app/ForceGraph.tsx`
- Website source: `apps/website/src/components/marketing/brain-app/ForceGraph.tsx`
- Import alias: `@/components/marketing/brain-app/ForceGraph`

## Props

```ts
interface ForceGraphProps {
  nodes: BrainMemory[]
  connections: BrainConnection[]
  selectedNodeId: string | null
  searchQuery: string
  onNodeClick: (node: BrainMemory | null) => void
  className?: string
  animateEntrance?: boolean
  /** Delay before first entrance batch (ms). Only used when animateEntrance is true. */
  entranceStartDelayMs?: number
  /** Delay between each entrance batch (ms). Only used when animateEntrance is true. */
  entranceBatchDelayMs?: number
  /** Fired once after the last node batch is revealed. */
  onEntranceComplete?: () => void
}
```

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


## Source

```tsx
'use client'

/**
 * 1:1 port of apps/web/src/features/brain/components/ForceGraph.tsx — marketing uses fixed localStorage key.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { BrainConnection, BrainMemory } from './types'
import {
  ENTRY_TYPE_COLORS,
  MEMORY_TYPE_COLORS,
  RELATIONSHIP_COLORS,
  SNAPSHOT_TYPE_COLORS,
} from './types'

const STORAGE_KEY = 'vibey-website-brain-mock-positions-v5'

const MIN_ZOOM = 0.15
const MAX_ZOOM = 4

interface SimNode {
  id: string
  x: number
  y: number
  radius: number
  color: string
  colorRgb: string
  label: string
  nodeType: 'memory' | 'experience' | 'snapshot' | 'sk_entry' | 'sk_source'
  memoryType: string
  mediaType?: BrainMemory['media_type']
  snapshotType?: string
  significance: number
  createdAt: string
  memory: BrainMemory
  highlighted: boolean
  isNew: boolean
  entranceOpacity: number // Added for staggered entrance
}

interface SimEdge {
  source: string
  target: string
  color: string
  colorRgb: string
  strength: number
  type: string
}

function resolveRgb(varName: string): string {
  if (typeof document === 'undefined') return '100, 116, 139'
  const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return val || '100, 116, 139'
}

function getNodeColor(memory: BrainMemory): string {
  if (memory.node_type === 'snapshot' && memory.snapshot_type) {
    return SNAPSHOT_TYPE_COLORS[memory.snapshot_type] ?? '--brain-snapshot-rgb'
  }
  if (memory.node_type === 'sk_entry' && memory.entry_type) {
    return ENTRY_TYPE_COLORS[memory.entry_type] ?? '--brain-fact-rgb'
  }
  if (memory.node_type === 'sk_source') {
    return '--brain-document-rgb'
  }
  return MEMORY_TYPE_COLORS[memory.memory_type] ?? '--brain-conn-related-to-rgb'
}

function getNodeRadius(significance: number): number {
  return 3 + significance * 4
}

function getAgeOpacity(createdAt: string): number {
  const age = Date.now() - new Date(createdAt).getTime()
  const days = age / (1000 * 60 * 60 * 24)
  if (days < 1) return 1.0
  if (days < 7) return 0.9
  if (days < 30) return 0.7
  if (days < 90) return 0.5
  return 0.4
}

function truncateLabel(text: string, maxLen = 24): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 1) + '…'
}

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const px = x + r * Math.cos(angle)
    const py = y + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const w = r * 2
  const h = r * 2
  const rx = 4
  const left = x - w / 2
  const top = y - h / 2
  ctx.beginPath()
  ctx.moveTo(left + rx, top)
  ctx.lineTo(left + w - rx, top)
  ctx.quadraticCurveTo(left + w, top, left + w, top + rx)
  ctx.lineTo(left + w, top + h - rx)
  ctx.quadraticCurveTo(left + w, top + h, left + w - rx, top + h)
  ctx.lineTo(left + rx, top + h)
  ctx.quadraticCurveTo(left, top + h, left, top + h - rx)
  ctx.lineTo(left, top + rx)
  ctx.quadraticCurveTo(left, top, left + rx, top)
  ctx.closePath()
}

export interface ForceGraphHandle {
  fit: () => void
  center: () => void
  organize: () => void
}

interface ForceGraphProps {
  nodes: BrainMemory[]
  connections: BrainConnection[]
  selectedNodeId: string | null
  searchQuery: string
  onNodeClick: (node: BrainMemory | null) => void
  className?: string
  animateEntrance?: boolean
  /** Delay before first entrance batch (ms). Only used when animateEntrance is true. */
  entranceStartDelayMs?: number
  /** Delay between each entrance batch (ms). Only used when animateEntrance is true. */
  entranceBatchDelayMs?: number
  /** Fired once after the last node batch is revealed. */
  onEntranceComplete?: () => void
}

const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(function ForceGraph(
  {
    nodes,
    connections,
    selectedNodeId,
    searchQuery,
    onNodeClick,
    className,
    animateEntrance = false,
    entranceStartDelayMs = 300,
    entranceBatchDelayMs = 30,
    onEntranceComplete,
  },
  ref,
) {
  const onEntranceCompleteRef = useRef(onEntranceComplete)
  onEntranceCompleteRef.current = onEntranceComplete

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const edgesRef = useRef<SimEdge[]>([])
  const panRef = useRef({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const dragRef = useRef<{
    active: boolean
    node: SimNode | null
    startX: number
    startY: number
  }>({ active: false, node: null, startX: 0, startY: 0 })
  const hoveredRef = useRef<SimNode | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const didInitialOrganizeRef = useRef(false)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const simNodes = nodesRef.current
    const simEdges = edgesRef.current
    const { w, h } = sizeRef.current
    if (w === 0 || h === 0) return

    const cx = w / 2
    const cy = h / 2
    const zoom = zoomRef.current
    const pan = panRef.current

    // Clear with solid background for performance
    ctx.fillStyle = '#161616'
    ctx.fillRect(0, 0, w, h)

    const dotSpacing = 30
    const dotRadius = 0.8
    const step = dotSpacing * zoom
    const offsetX = ((pan.x % step) + step) % step
    const offsetY = ((pan.y % step) + step) % step
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let gx = offsetX; gx < w; gx += step) {
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, h)
    }
    for (let gy = offsetY; gy < h; gy += step) {
      ctx.moveTo(0, gy)
      ctx.lineTo(w, gy)
    }
    ctx.stroke()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    for (let gx = offsetX; gx < w; gx += step) {
      for (let gy = offsetY; gy < h; gy += step) {
        ctx.beginPath()
        ctx.arc(gx, gy, dotRadius * zoom, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.save()
    ctx.translate(cx + pan.x, cy + pan.y)
    ctx.scale(zoom, zoom)

    // Optimization: Path2D or batching if possible, but for static mock this is okay
    for (const edge of simEdges) {
      const a = simNodes.find((n) => n.id === edge.source)
      const b = simNodes.find((n) => n.id === edge.target)
      if (!a || !b) continue

      const edgeOpacity = Math.min(a.entranceOpacity, b.entranceOpacity)
      if (edgeOpacity <= 0) continue

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = `rgba(${edge.colorRgb}, ${0.35 * edge.strength * edgeOpacity})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    for (const n of simNodes) {
      if (n.entranceOpacity <= 0) continue
      const ageAlpha = getAgeOpacity(n.createdAt)
      const isSelected = n.id === selectedNodeId
      const isHighlighted = n.highlighted

      const rgb = n.colorRgb
      const fillAlpha = (isHighlighted ? 0.75 : 0.45 * ageAlpha) * n.entranceOpacity
      const glowAlpha = (isHighlighted ? 0.9 : n.isNew ? 0.7 : 0.5) * n.entranceOpacity
      const strokeAlpha = 0.35 * n.entranceOpacity
      const borderAlpha = 0.6 * n.entranceOpacity

      const drawShape = () => {
        if (n.nodeType === 'snapshot') drawDiamond(ctx, n.x, n.y, n.radius)
        else if (n.nodeType === 'experience' || n.nodeType === 'sk_source')
          drawHexagon(ctx, n.x, n.y, n.radius)
        else drawRoundedRect(ctx, n.x, n.y, n.radius)
      }

      if (isSelected || isHighlighted) {
        ctx.save()
        ctx.shadowColor = `rgba(${rgb}, ${glowAlpha})`
        ctx.shadowBlur = isSelected ? 22 : 18
        ctx.globalAlpha = fillAlpha
        ctx.fillStyle = `rgba(${rgb}, 1)`
        drawShape()
        ctx.fill()
        ctx.restore()
      }

      ctx.save()
      ctx.globalAlpha = fillAlpha
      ctx.fillStyle = `rgba(${rgb}, 0.55)`
      drawShape()
      ctx.fill()
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = strokeAlpha
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1.2
      drawShape()
      ctx.stroke()
      ctx.restore()

      ctx.save()
      ctx.globalAlpha = borderAlpha
      ctx.strokeStyle = `rgba(${rgb}, 0.7)`
      ctx.lineWidth = 0.8
      drawShape()
      ctx.stroke()
      ctx.restore()

      if (n.mediaType && n.mediaType !== 'text') {
        const badge =
          n.mediaType === 'image'
            ? 'I'
            : n.mediaType === 'audio'
              ? 'A'
              : n.mediaType === 'video'
                ? 'V'
                : n.mediaType === 'pdf'
                  ? 'P'
                  : 'M'
        ctx.save()
        ctx.globalAlpha = 0.95 * n.entranceOpacity
        ctx.fillStyle = 'rgba(15,15,20,0.9)'
        ctx.beginPath()
        ctx.arc(n.x + n.radius * 0.85, n.y - n.radius * 0.85, 4.8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 0.8
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = 'bold 6px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(badge, n.x + n.radius * 0.85, n.y - n.radius * 0.85 + 0.2)
        ctx.restore()
      }
    }

    ctx.restore()
  }, [selectedNodeId])

  const savePositions = useCallback(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    for (const n of nodesRef.current) positions[n.id] = { x: n.x, y: n.y }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ positions, zoom: zoomRef.current, pan: panRef.current }),
      )
    } catch {}
  }, [])

  const applyOrganizedLayout = useCallback(() => {
    const simNodes = nodesRef.current
    if (simNodes.length === 0) return

    const typeGroups: Record<string, SimNode[]> = {}
    for (const n of simNodes) {
      const key =
        n.nodeType === 'snapshot'
          ? `snap_${n.snapshotType ?? 'snapshot'}`
          : n.nodeType === 'experience' || n.nodeType === 'sk_source'
            ? 'experience'
            : n.nodeType === 'sk_entry'
              ? `sk_${(n.memory as BrainMemory).entry_type ?? 'concept'}`
              : n.memoryType
      if (!typeGroups[key]) typeGroups[key] = []
      typeGroups[key]!.push(n)
    }

    const groupKeys = Object.keys(typeGroups)
    const count = groupKeys.length
    const totalNodes = simNodes.length
    const orbitRadius = Math.max(300, Math.sqrt(totalNodes) * 30)

    groupKeys.forEach((key, gi) => {
      const angle = (2 * Math.PI * gi) / count - Math.PI / 2
      const cx = orbitRadius * Math.cos(angle)
      const cy = orbitRadius * Math.sin(angle)
      const members = typeGroups[key] ?? []
      const spiralSpacing = 22
      members.forEach((n, mi) => {
        const r = spiralSpacing * Math.sqrt(mi)
        const a = mi * 2.4
        n.x = cx + r * Math.cos(a)
        n.y = cy + r * Math.sin(a)
      })
    })

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    for (const n of simNodes) {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y)
    }
    const bw = maxX - minX || 1
    const bh = maxY - minY || 1
    const { w, h } = sizeRef.current
    const scale = Math.min((w - 100) / bw, (h - 100) / bh, MAX_ZOOM)
    zoomRef.current = Math.max(MIN_ZOOM, scale)
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    panRef.current = { x: -midX * zoomRef.current, y: -midY * zoomRef.current }
    draw()
  }, [draw])

  const tryInitialOrganize = useCallback(() => {
    if (didInitialOrganizeRef.current) return
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!parent) return
    const r = parent.getBoundingClientRect()
    if (r.width < 10 || r.height < 10) return
    if (nodesRef.current.length === 0) return
    didInitialOrganizeRef.current = true
    sizeRef.current = { w: r.width, h: r.height }
    applyOrganizedLayout()
    savePositions()
  }, [applyOrganizedLayout, savePositions])

  useEffect(() => {
    const nodeMap = new Map<string, SimNode>()
    const simNodes: SimNode[] = nodes.map((m) => {
      const existing = nodesRef.current.find((n) => n.id === m.id)
      const color = getNodeColor(m)
      const node: SimNode = {
        id: m.id,
        x: existing?.x ?? (Math.random() - 0.5) * 400,
        y: existing?.y ?? (Math.random() - 0.5) * 400,
        radius: getNodeRadius(m.significance),
        color,
        colorRgb: resolveRgb(color),
        label: truncateLabel(m.content || m.name || 'Untitled'),
        nodeType: m.node_type ?? 'memory',
        memoryType: m.memory_type,
        mediaType: m.media_type,
        snapshotType: m.snapshot_type,
        significance: m.significance,
        createdAt: m.created_at,
        memory: m,
        highlighted: false,
        isNew: Date.now() - new Date(m.created_at).getTime() < 86400000,
        entranceOpacity: animateEntrance ? 0 : 1,
      }
      nodeMap.set(m.id, node)
      return node
    })

    const simEdges: SimEdge[] = connections
      .filter((c) => nodeMap.has(c.source_memory_id) && nodeMap.has(c.target_memory_id))
      .map((c) => {
        const color = RELATIONSHIP_COLORS[c.relationship_type] ?? '#64748B'
        return {
          source: c.source_memory_id,
          target: c.target_memory_id,
          color,
          colorRgb: color.startsWith('--') ? resolveRgb(color) : '100, 116, 139',
          strength: c.strength,
          type: c.relationship_type,
        }
      })

    nodesRef.current = simNodes
    edgesRef.current = simEdges
    tryInitialOrganize()
    draw()

    // Staggered entrance logic
    if (animateEntrance) {
      let cancelled = false
      const batchSize = 20
      const totalNodes = simNodes.length

      const animateBatch = (startIndex: number) => {
        if (cancelled || startIndex >= totalNodes) return

        const endIndex = Math.min(startIndex + batchSize, totalNodes)
        for (let i = startIndex; i < endIndex; i++) {
          simNodes[i].entranceOpacity = 1
        }

        draw()
        if (endIndex >= totalNodes) {
          onEntranceCompleteRef.current?.()
          return
        }
        setTimeout(() => animateBatch(endIndex), entranceBatchDelayMs)
      }

      setTimeout(() => animateBatch(0), entranceStartDelayMs)
      return () => {
        cancelled = true
      }
    }
  }, [
    nodes,
    connections,
    tryInitialOrganize,
    draw,
    animateEntrance,
    entranceStartDelayMs,
    entranceBatchDelayMs,
  ])

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim()
    nodesRef.current.forEach((n) => {
      n.highlighted = q.length > 0 && n.label.toLowerCase().includes(q)
    })
    draw()
  }, [searchQuery, draw])

  const screenToWorld = useCallback((sx: number, sy: number): [number, number] => {
    const cx = sizeRef.current.w / 2
    const cy = sizeRef.current.h / 2
    const wx = (sx - cx - panRef.current.x) / zoomRef.current
    const wy = (sy - cy - panRef.current.y) / zoomRef.current
    return [wx, wy]
  }, [])

  const findNodeAt = useCallback(
    (sx: number, sy: number): SimNode | null => {
      const [wx, wy] = screenToWorld(sx, sy)
      for (let i = nodesRef.current.length - 1; i >= 0; i--) {
        const n = nodesRef.current[i]
        if (!n) continue
        const dx = wx - n.x
        const dy = wy - n.y
        if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n
      }
      return null
    },
    [screenToWorld],
  )

  const tick = useCallback(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect()
      if (!rect) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      sizeRef.current = { w: rect.width, h: rect.height }
      draw()
    }

    resize()
    tryInitialOrganize()
    const ro = new ResizeObserver(() => {
      resize()
      tryInitialOrganize()
    })
    ro.observe(canvas.parentElement!)

    draw()
    return () => {
      ro.disconnect()
    }
  }, [draw, tryInitialOrganize])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      dragRef.current = {
        active: true,
        node: findNodeAt(sx, sy),
        startX: sx,
        startY: sy,
      }
    },
    [findNodeAt],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (!dragRef.current.active) {
        const node = findNodeAt(sx, sy)
        hoveredRef.current = node
        if (canvasRef.current) {
          canvasRef.current.style.cursor = node ? 'pointer' : 'default'
        }
      }
    },
    [findNodeAt],
  )

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      if (drag.active) {
        const dx = sx - drag.startX
        const dy = sy - drag.startY
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
          if (drag.node) onNodeClick(drag.node.memory)
          else onNodeClick(null)
          draw()
        }
      }

      dragRef.current = { active: false, node: null, startX: 0, startY: 0 }
    },
    [onNodeClick],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    draw()
  }, [draw])

  useImperativeHandle(
    ref,
    () => ({
      fit: () => {
        const nodes = nodesRef.current
        if (nodes.length === 0) return
        let minX = Infinity,
          maxX = -Infinity,
          minY = Infinity,
          maxY = -Infinity
        for (const n of nodes) {
          minX = Math.min(minX, n.x - n.radius)
          maxX = Math.max(maxX, n.x + n.radius)
          minY = Math.min(minY, n.y - n.radius)
          maxY = Math.max(maxY, n.y + n.radius)
        }
        const bw = maxX - minX || 1
        const bh = maxY - minY || 1
        const { w, h } = sizeRef.current
        const padding = 80
        const scale = Math.min((w - padding) / bw, (h - padding) / bh, MAX_ZOOM)
        zoomRef.current = Math.max(MIN_ZOOM, scale)
        const cx = (minX + maxX) / 2
        const cy = (minY + maxY) / 2
        panRef.current = { x: -cx * zoomRef.current, y: -cy * zoomRef.current }
      },
      center: () => {
        panRef.current = { x: 0, y: 0 }
        draw()
      },
      organize: () => {
        applyOrganizedLayout()
        savePositions()
      },
    }),
    [applyOrganizedLayout, savePositions],
  )

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        hoveredRef.current = null
        dragRef.current = { active: false, node: null, startX: 0, startY: 0 }
      }}
    />
  )
})

export default ForceGraph

```
$body_c_14$, $body_ct_14$text/markdown$body_ct_14$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_15$references/type6-components/FunnelHeroPageOneWebGpu.md$body_fp_15$, $body_c_15$# FunnelHeroPageOneWebGpu

> Hero / above-the-fold block; use as a cover slide or section opener.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FunnelHeroPageOneWebGpu.tsx`
- Website source: `apps/website/src/components/feature-pages/FunnelHeroPageOneWebGpu.tsx`
- Import alias: `@/components/feature-pages/FunnelHeroPageOneWebGpu`

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

- `2xl:text-3xl`
- `2xl:text-7xl`
- `funnel-p1-arrow-svg`
- `funnel-p1-explore-arrow`
- `funnel-p1-explore-btn`
- `funnel-p1-hero-subtitle-text`
- `funnel-p1-hero-title-text`
- `funnel-p1-vignette`
- `lg:gap-x-6`
- `sm:gap-x-4`
- `sm:mb-4`
- `sm:px-10`
- `sm:text-4xl`
- `sm:text-lg`
- `typo-caption`
- `xl:text-2xl`
- `xl:text-6xl`

## Source

```tsx
'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useAspect, useTexture } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three/webgpu'
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js'
import { Mesh } from 'three'
import {
  abs,
  add,
  blendScreen,
  float,
  mix,
  mod,
  mx_cell_noise_float,
  oneMinus,
  pass,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl'

const VIBEY_ICON_SRC = '/Logos/logov2/icon-white.png'

const BRAND_EMERALD_RGB = { r: 52 / 255, g: 211 / 255, b: 153 / 255 } as const

function PostProcessing({
  strength = 1,
  threshold = 1,
  fullScreenEffect = true,
}: {
  strength?: number
  threshold?: number
  fullScreenEffect?: boolean
}) {
  const { gl, scene, camera } = useThree()
  const progressRef = useRef<{ value: number }>({ value: 0 })

  const render = useMemo(() => {
    const postProcessing = new THREE.PostProcessing(gl as unknown as THREE.WebGPURenderer)
    const scenePass = pass(scene, camera)
    const scenePassColor = scenePass.getTextureNode('output')
    const bloomPass = bloom(scenePassColor, strength, 0.5, threshold)

    const uScanProgress = uniform(0)
    progressRef.current = uScanProgress

    const scanPos = float(uScanProgress.value)
    const uvY = uv().y
    const scanWidth = float(0.05)
    const scanLine = smoothstep(0, scanWidth, abs(uvY.sub(scanPos)))
    const scanTint = vec3(
      float(BRAND_EMERALD_RGB.r),
      float(BRAND_EMERALD_RGB.g),
      float(BRAND_EMERALD_RGB.b),
    ).mul(oneMinus(scanLine)).mul(0.42)

    const withScanEffect = mix(
      scenePassColor,
      add(scenePassColor, scanTint),
      fullScreenEffect ? smoothstep(0.9, 1.0, oneMinus(scanLine)) : 1.0,
    )

    const final = withScanEffect.add(bloomPass)

    postProcessing.outputNode = final

    return postProcessing
  }, [camera, gl, scene, strength, threshold, fullScreenEffect])

  useFrame(({ clock }) => {
    progressRef.current.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5
    void render.renderAsync()
  }, 1)

  return null
}

const PLANE_W = 300
const PLANE_H = 300

function Scene() {
  const brandMap = useTexture(VIBEY_ICON_SRC)

  const meshRef = useRef<Mesh>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (brandMap) setVisible(true)
  }, [brandMap])

  const { material, uniforms } = useMemo(() => {
    const uPointer = uniform(new THREE.Vector2(0))
    const uProgress = uniform(0)

    const strength = 0.01

    const tDepthMap = texture(brandMap)

    const tMap = texture(brandMap, uv().add(tDepthMap.r.mul(uPointer).mul(strength)))

    const aspect = float(PLANE_W).div(PLANE_H)
    const tUv = vec2(uv().x.mul(aspect), uv().y)

    const tiling = vec2(120.0)
    const tiledUv = mod(tUv.mul(tiling), 2.0).sub(1.0)

    const brightness = mx_cell_noise_float(tUv.mul(tiling).div(2))

    const dist = float(tiledUv.length())
    const dot = float(smoothstep(0.5, 0.49, dist)).mul(brightness)

    const depth = tDepthMap

    const flow = oneMinus(smoothstep(0, 0.02, abs(depth.sub(uProgress))))

    const emeraldAccent = vec3(
      float(BRAND_EMERALD_RGB.r),
      float(BRAND_EMERALD_RGB.g),
      float(BRAND_EMERALD_RGB.b),
    ).mul(float(11))

    const mask = dot.mul(flow).mul(emeraldAccent)

    const final = blendScreen(tMap, mask)

    const mat = new THREE.MeshBasicNodeMaterial({
      colorNode: final,
      transparent: true,
      opacity: 0,
    })

    return {
      material: mat,
      uniforms: {
        uPointer,
        uProgress,
      },
    }
  }, [brandMap])

  const [w, h] = useAspect(PLANE_W, PLANE_H)

  useFrame(({ clock }) => {
    uniforms.uProgress.value = Math.sin(clock.getElapsedTime() * 0.5) * 0.5 + 0.5
    if (meshRef.current && meshRef.current.material) {
      const mat = meshRef.current.material as THREE.MeshBasicNodeMaterial & { opacity: number }
      if ('opacity' in mat) {
        mat.opacity = THREE.MathUtils.lerp(mat.opacity, visible ? 1 : 0, 0.07)
      }
    }
  })

  useFrame(({ pointer }) => {
    uniforms.uPointer.value = pointer
  })

  const scaleFactor = 0.4
  return (
    <mesh ref={meshRef} scale={[w * scaleFactor, h * scaleFactor, 1]} material={material}>
      <planeGeometry />
    </mesh>
  )
}

export function FunnelHeroPageOneWebGpu(props: {
  kicker: string
  title: string
  subtitle: string
  onScrollExplore?: () => void
}) {
  const titleWords = useMemo(() => props.title.trim().split(/\s+/).filter(Boolean), [props.title])
  const [visibleWords, setVisibleWords] = useState(0)
  const [subtitleVisible, setSubtitleVisible] = useState(false)
  const [delays, setDelays] = useState<number[]>([])
  const [subtitleDelay, setSubtitleDelay] = useState(0)

  useEffect(() => {
    setDelays(titleWords.map(() => Math.random() * 0.07))
    setSubtitleDelay(Math.random() * 0.1)
  }, [titleWords])

  useEffect(() => {
    if (visibleWords < titleWords.length) {
      const timeout = setTimeout(() => setVisibleWords((v) => v + 1), 600)
      return () => clearTimeout(timeout)
    }
    const timeout = setTimeout(() => setSubtitleVisible(true), 800)
    return () => clearTimeout(timeout)
  }, [visibleWords, titleWords.length])

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-black">
      {/* Vignette — darkens the center where text sits, no visible edges */}
      <div className="funnel-p1-vignette pointer-events-none absolute inset-0 z-[55]" aria-hidden />

      <div className="pointer-events-none absolute inset-0 z-[60] flex h-full w-full flex-col items-center justify-center px-6 uppercase sm:px-10">
        {props.kicker ? (
          <span className="typo-caption text-secondary mb-3 block text-center font-semibold tracking-widest sm:mb-4">
            {props.kicker}
          </span>
        ) : null}
        <div className="funnel-p1-hero-title-text text-2xl font-extrabold text-white sm:text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl">
          <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 overflow-hidden sm:gap-x-4 lg:gap-x-6">
            {titleWords.map((word, index) => (
              <div
                key={`${word}-${index}`}
                className={index < visibleWords ? 'funnel-p1-fade-in-word' : ''}
                style={{
                  animationDelay: `${index * 0.13 + (delays[index] ?? 0)}s`,
                  opacity: index < visibleWords ? undefined : 0,
                }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>
        <div className="funnel-p1-hero-subtitle-text mt-2 w-full max-w-5xl overflow-hidden text-center text-xs font-bold text-white sm:text-lg md:text-xl xl:text-2xl 2xl:text-3xl">
          <div
            className={subtitleVisible ? 'funnel-p1-fade-in-subtitle' : ''}
            style={{
              animationDelay: `${titleWords.length * 0.13 + 0.2 + subtitleDelay}s`,
              opacity: subtitleVisible ? undefined : 0,
            }}
          >
            {props.subtitle}
          </div>
        </div>
      </div>

      <button type="button" className="funnel-p1-explore-btn" onClick={() => props.onScrollExplore?.()}>
        Scroll to explore
        <span className="funnel-p1-explore-arrow">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="funnel-p1-arrow-svg"
          >
            <path d="M11 5V17" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 12L11 17L16 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <Canvas
        className="h-full min-h-0 w-full"
        flat
        gl={async (canvasProps) => {
          const renderer = new THREE.WebGPURenderer(canvasProps as ConstructorParameters<typeof THREE.WebGPURenderer>[0])
          await renderer.init()
          return renderer
        }}
      >
        <Suspense fallback={null}>
          <PostProcessing fullScreenEffect />
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}

```
$body_c_15$, $body_ct_15$text/markdown$body_ct_15$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
