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
