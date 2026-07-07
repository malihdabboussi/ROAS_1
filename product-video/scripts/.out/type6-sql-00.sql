INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_0$references/type6-product-ui.md$body_fp_0$, $body_c_0$# Type 6: Product UI Showcase — Component Index

> The real Vibey website components, one reference file per component. Use these verbatim inside a carousel slide when a visual needs to be **1:1 with the live product surface** (feature pages, hero mockups, showcase blocks).

## Rules

1. Read the component reference before using it. Do not guess markup.
2. Paste JSX verbatim (minus Next.js-specific bits like `"use client"`) and keep class names as-is.
3. Strip runtime-only behavior (`useState`/`useEffect` animations) if the target carousel is static.
4. If a class listed in "Non-Tailwind classes referenced" is not defined in the slide's own CSS, replace it with an inline style before rendering.
5. Assets (portraits, `/Logos/...`) must be replaced with an explicit URL or data-URI; the marketing site ships these from `public/`.

## Components

| Component | Reference file |
|---|---|
| AgentLibraryCarousel | `references/type6-components/AgentLibraryCarousel.md` |
| AutopilotDepthIllustration | `references/type6-components/AutopilotDepthIllustration.md` |
| CapabilitiesCarouselMockup | `references/type6-components/CapabilitiesCarouselMockup.md` |
| CapabilitiesCarouselPreviews | `references/type6-components/CapabilitiesCarouselPreviews.md` |
| CapabilityGrid | `references/type6-components/CapabilityGrid.md` |
| ComparisonTable | `references/type6-components/ComparisonTable.md` |
| CompetitorReportPreview | `references/type6-components/CompetitorReportPreview.md` |
| FAQAccordion | `references/type6-components/FAQAccordion.md` |
| FeatureFloatingMockShell | `references/type6-components/FeatureFloatingMockShell.md` |
| FeatureHero | `references/type6-components/FeatureHero.md` |
| FeatureMockups | `references/type6-components/FeatureMockups.md` |
| FeaturePageLayout | `references/type6-components/FeaturePageLayout.md` |
| FeatureShowcase | `references/type6-components/FeatureShowcase.md` |
| ForceGraph | `references/type6-components/ForceGraph.md` |
| FunnelHeroPageOneWebGpu | `references/type6-components/FunnelHeroPageOneWebGpu.md` |
| FunnelHeroPageThreeCanvas | `references/type6-components/FunnelHeroPageThreeCanvas.md` |
| FunnelHeroPageTwoWebGl | `references/type6-components/FunnelHeroPageTwoWebGl.md` |
| FunnelHeroStack | `references/type6-components/FunnelHeroStack.md` |
| FunnelRegisterPagePreview | `references/type6-components/FunnelRegisterPagePreview.md` |
| FunnelStackBrowserCard | `references/type6-components/FunnelStackBrowserCard.md` |
| IntegrationKnowledgeIndexerMockup | `references/type6-components/IntegrationKnowledgeIndexerMockup.md` |
| IntegrationPermissionScoperMockup | `references/type6-components/IntegrationPermissionScoperMockup.md` |
| IntegrationsHeroMockup | `references/type6-components/IntegrationsHeroMockup.md` |
| IntegrationStrip | `references/type6-components/IntegrationStrip.md` |
| IntegrationToolDispatcherMockup | `references/type6-components/IntegrationToolDispatcherMockup.md` |
| LegendPanel | `references/type6-components/LegendPanel.md` |
| LibraryAgentProfileCard | `references/type6-components/LibraryAgentProfileCard.md` |
| MarketingAtlasVoiceMockup | `references/type6-components/MarketingAtlasVoiceMockup.md` |
| MarketingBrainGraphBlogBanner | `references/type6-components/MarketingBrainGraphBlogBanner.md` |
| MarketingBrainGraphMockup | `references/type6-components/MarketingBrainGraphMockup.md` |
| MarketingCapabilitiesShowcaseMockups | `references/type6-components/MarketingCapabilitiesShowcaseMockups.md` |
| MarketingDailyDigestMockup | `references/type6-components/MarketingDailyDigestMockup.md` |
| MarketingDelegateStepsMockups | `references/type6-components/MarketingDelegateStepsMockups.md` |
| MarketingDynamicRouterMockup | `references/type6-components/MarketingDynamicRouterMockup.md` |
| MarketingHrLibraryMockup | `references/type6-components/MarketingHrLibraryMockup.md` |
| MarketingMemoryInsightMockup | `references/type6-components/MarketingMemoryInsightMockup.md` |
| MarketingMemoryStackMockup | `references/type6-components/MarketingMemoryStackMockup.md` |
| MarketingMissionActivityScoreMockup | `references/type6-components/MarketingMissionActivityScoreMockup.md` |
| MarketingMissionActivityTimelineMockup | `references/type6-components/MarketingMissionActivityTimelineMockup.md` |
| MarketingMissionDeliverableStacksMockup | `references/type6-components/MarketingMissionDeliverableStacksMockup.md` |
| MarketingMissionDetailModalMockup | `references/type6-components/MarketingMissionDetailModalMockup.md` |
| MarketingMissionExecutionMockup | `references/type6-components/MarketingMissionExecutionMockup.md` |
| MarketingNorthstarGuardrailMockup | `references/type6-components/MarketingNorthstarGuardrailMockup.md` |
| MarketingOrgChartMockup | `references/type6-components/MarketingOrgChartMockup.md` |
| MarketingRawToSignalMockup | `references/type6-components/MarketingRawToSignalMockup.md` |
| MarketingRoleEmblem | `references/type6-components/MarketingRoleEmblem.md` |
| MarketingSkillBuilderMockup | `references/type6-components/MarketingSkillBuilderMockup.md` |
| MarketingSkillLibraryMockup | `references/type6-components/MarketingSkillLibraryMockup.md` |
| MarketingSkillsHeroMockup | `references/type6-components/MarketingSkillsHeroMockup.md` |
| MarketingSkillStackMockup | `references/type6-components/MarketingSkillStackMockup.md` |
| MetaAdsInstagramFeedPreview | `references/type6-components/MetaAdsInstagramFeedPreview.md` |
| NavControls | `references/type6-components/NavControls.md` |
| PresentationDeckPreview | `references/type6-components/PresentationDeckPreview.md` |
| ProofCarousel | `references/type6-components/ProofCarousel.md` |
| SequenceEmailPreview | `references/type6-components/SequenceEmailPreview.md` |
| SocialPostPreview | `references/type6-components/SocialPostPreview.md` |
| StandaloneVideoShowcase | `references/type6-components/StandaloneVideoShowcase.md` |
| StudioSkillChatPreview | `references/type6-components/StudioSkillChatPreview.md` |
| ThreeSteps | `references/type6-components/ThreeSteps.md` |
| ValuePropGrid | `references/type6-components/ValuePropGrid.md` |
$body_c_0$, $body_ct_0$text/markdown$body_ct_0$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_1$references/type6-components/AgentLibraryCarousel.md$body_fp_1$, $body_c_1$# AgentLibraryCarousel

> Horizontal scroller of product imagery or cards; use for a capability sweep.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/AgentLibraryCarousel.tsx`
- Website source: `apps/website/src/components/marketing/AgentLibraryCarousel.tsx`
- Import alias: `@/components/marketing/AgentLibraryCarousel`

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

- `[perspective:1200px]`
- `chip-glass-neutral`
- `duration-500`
- `ease-in-out`
- `sm:left-8`
- `sm:right-8`
- `transition-all`

## Source

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { LibraryAgentProfileCard } from './LibraryAgentProfileCard'

export function AgentLibraryCarousel({ agents }: { agents: PublicAgentLibraryRow[] }) {
  const [currentIndex, setCurrentIndex] = useState(Math.floor(agents.length / 2))

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % agents.length)
  }, [agents.length])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + agents.length) % agents.length)
  }, [agents.length])

  useEffect(() => {
    const timer = setInterval(handleNext, 4000)
    return () => clearInterval(timer)
  }, [handleNext])

  if (agents.length === 0) return null

  const total = agents.length

  return (
    <div className="relative w-full">
      {/* Stage ≥ card height (LibraryAgentProfileCard is 580px) so hero overflow-hidden does not clip top/bottom */}
      <div className="relative flex h-[620px] w-full items-center justify-center overflow-visible [perspective:1200px] md:h-[640px]">
        {agents.map((row, index) => {
          const offset = index - currentIndex
          let pos = ((offset % total) + total) % total
          if (pos > Math.floor(total / 2)) pos = pos - total

          const isCenter = pos === 0
          const isAdjacent = Math.abs(pos) === 1

          return (
            <div
              key={row.role_key}
              className="absolute flex items-center justify-center transition-all duration-500 ease-in-out"
              style={{
                width: 'min(90%, 380px)',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translateX(${pos * 55}%) scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7}) rotateY(${pos * -10}deg)`,
                zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                pointerEvents: isCenter ? 'auto' : 'none',
              }}
            >
              <LibraryAgentProfileCard
                row={row}
                fixedTab={(['info', 'skills', 'comms', 'context'] as const)[index % 4]}
              />
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={handlePrev}
        className="chip-glass-neutral absolute left-2 top-1/2 z-20 hidden h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm sm:left-8 md:flex"
        style={{ transform: 'translateY(-50%)' }}
        aria-label="Previous agent"
      >
        <ChevronLeft className="h-5 w-5 text-white" />
      </button>
      <button
        type="button"
        onClick={handleNext}
        className="chip-glass-neutral absolute right-2 top-1/2 z-20 hidden h-10 w-10 items-center justify-center rounded-full backdrop-blur-sm sm:right-8 md:flex"
        style={{ transform: 'translateY(-50%)' }}
        aria-label="Next agent"
      >
        <ChevronRight className="h-5 w-5 text-white" />
      </button>
    </div>
  )
}

```
$body_c_1$, $body_ct_1$text/markdown$body_ct_1$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_2$references/type6-components/AutopilotDepthIllustration.md$body_fp_2$, $body_c_2$# AutopilotDepthIllustration

> Product component; reuse verbatim in the slide TSX for 1:1 website fidelity.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/AutopilotDepthIllustration.tsx`
- Website source: `apps/website/src/components/marketing/AutopilotDepthIllustration.tsx`
- Import alias: `@/components/marketing/AutopilotDepthIllustration`

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

- `-bottom-0.5`
- `-mb-10`
- `-right-0.5`
- `-space-x-1.5`
- `-translate-x-1/2`
- `-z-10`
- `animate-pulse`
- `blur-[100px]`
- `drop-shadow-[0_-10px_20px_rgba(168,85,247,0.3)]`
- `drop-shadow-[0_-20px_40px_rgba(168,85,247,0.3)]`
- `from-black/80`
- `glass-card`
- `invert`
- `italic`
- `lg:h-[600px]`
- `lg:scale-100`
- `object-bottom`
- `object-contain`
- `object-cover`
- `shrink-0`
- `sm:-mb-20`
- `to-black/20`
- `transition-colors`
- `truncate`
- `via-transparent`

## Source

```tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  Brain,
  DollarSign,
  Flame,
  Minus,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import { MARKETING_AGENT_LIBRARY_FALLBACK } from '@/lib/agent-library-fallback'

const PRIORITY_ICON = {
  urgent: { className: 'text-red-400', Icon: Flame },
  high: { className: 'text-orange-400', Icon: Zap },
  medium: { className: 'text-yellow-400', Icon: Minus },
  low: { className: 'text-zinc-500', Icon: ArrowDown },
}

const STATUS_STYLE: Record<string, string> = {
  in_progress: 'bg-amber-500/15 text-amber-400',
  done: 'bg-emerald-500/15 text-emerald-400',
  blocked: 'bg-yellow-500/15 text-yellow-400',
  pending_approval: 'bg-orange-500/15 text-orange-300',
  failed: 'bg-red-700/20 text-red-300',
}

const MISSION_DATA = [
  {
    title: 'Q2 Growth Strategy',
    campaign: 'SaaS Launch',
    agent: 'pm_marketing',
    status: 'in_progress',
    priority: 'high',
    updated: '2m ago',
  },
  {
    title: 'Ad Creative Batch',
    campaign: 'Cold Traffic',
    agent: 'designer',
    status: 'done',
    priority: 'medium',
    updated: '14m ago',
  },
  {
    title: 'Competitor Intel',
    campaign: 'General',
    agent: 'analyst',
    status: 'blocked',
    priority: 'urgent',
    updated: '1h ago',
  },
  {
    title: 'Lead Gen Funnel',
    campaign: 'SaaS Launch',
    agent: 'copywriter',
    status: 'in_progress',
    priority: 'high',
    updated: '3h ago',
  },
  {
    title: 'Email Nurture Flow',
    campaign: 'Webinar',
    agent: 'copywriter',
    status: 'done',
    priority: 'medium',
    updated: '5h ago',
  },
  {
    title: 'API Integration Fix',
    campaign: 'General',
    agent: 'automation_integrations_engineer',
    status: 'done',
    priority: 'low',
    updated: '1d ago',
  },
  {
    title: 'Social Content Plan',
    campaign: 'Instagram',
    agent: 'pm_marketing',
    status: 'pending_approval',
    priority: 'medium',
    updated: '45m ago',
  },
  {
    title: 'Market Trends Report',
    campaign: 'General',
    agent: 'pm_operations',
    status: 'done',
    priority: 'medium',
    updated: '2d ago',
  },
]

export function AutopilotDepthIllustration() {
  const allAgents = MARKETING_AGENT_LIBRARY_FALLBACK
  const activeAgents = MARKETING_AGENT_LIBRARY_FALLBACK.slice(0, 4)

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-2xl bg-[#030303] md:h-[500px] lg:h-[600px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_70%)]" />

      {/* ── Mobile layout ── spread dashboard vertically, scroll inside card */}
      <div className="absolute inset-0 flex flex-col overflow-hidden md:hidden">
        <div className="flex-none space-y-2 p-2.5 pb-0">
          {/* Mission Control header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-purple-400" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-white">
                Mission Control
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-[9px] font-medium uppercase tracking-wider text-emerald-400/80">
                Live
              </span>
            </div>
          </div>

          {/* Mission rows — show 3 to fit */}
          <div className="space-y-1">
            {MISSION_DATA.slice(0, 3).map((m, i) => {
              const P = PRIORITY_ICON[m.priority as keyof typeof PRIORITY_ICON]
              const agent = allAgents.find((a) => a.role_key === m.agent)
              const progress =
                m.status === 'done'
                  ? 100
                  : m.status === 'in_progress'
                    ? 65
                    : m.status === 'pending_approval'
                      ? 85
                      : 0
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5"
                >
                  <P.Icon size={9} className={P.className} />
                  <span className="min-w-0 flex-1 truncate text-[9px] font-medium text-white">
                    {m.title}
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-tighter ${STATUS_STYLE[m.status]}`}
                  >
                    {m.status.replace('_', ' ')}
                  </span>
                  <span className="shrink-0 text-[7px] text-white/20">{m.updated}</span>
                </div>
              )
            })}
          </div>

          {/* Active Team - avatar strip */}
          <div className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <Users size={10} className="shrink-0 text-blue-400" />
            <span className="shrink-0 text-[8px] font-bold uppercase tracking-widest text-white/60">
              Team
            </span>
            <div className="flex -space-x-1.5">
              {activeAgents.map((agent, i) => (
                <img
                  key={i}
                  src={agent.image_url}
                  alt=""
                  className="h-5 w-5 rounded-full border border-white/10 object-cover"
                />
              ))}
            </div>
            <span className="ml-auto text-[7px] font-bold text-emerald-400">4 Active</span>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="glass-card border-white/5 bg-white/[0.02] px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1">
                <Wallet size={10} className="text-emerald-400" />
                <span className="text-[7px] font-bold uppercase tracking-widest text-white/40">
                  Revenue
                </span>
                <span className="ml-auto text-[7px] font-bold text-emerald-400">+14.2%</span>
              </div>
              <div className="text-base font-black leading-none text-white">$14,240</div>
              <div className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-white/20">
                Total (30d)
              </div>
            </div>
            <div className="glass-card border-white/5 bg-white/[0.02] px-2.5 py-2">
              <div className="mb-1 flex items-center gap-1">
                <Activity size={10} className="text-blue-400" />
                <span className="text-[7px] font-bold uppercase tracking-widest text-white/40">
                  Ops
                </span>
                <span className="ml-auto text-[7px] font-bold text-blue-400">91%</span>
              </div>
              <div className="text-base font-black leading-none text-white">420h</div>
              <div className="mt-0.5 text-[7px] font-bold uppercase tracking-widest text-white/20">
                Time Saved
              </div>
            </div>
          </div>

          {/* Alerts - single compact row */}
          <div className="flex items-center gap-2 rounded-md border border-red-500/10 bg-red-500/[0.03] px-2 py-1.5">
            <ShieldAlert size={10} className="shrink-0 text-red-400" />
            <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-red-400/80">
              Alerts
            </span>
            <span className="min-w-0 truncate text-[8px] text-red-200/70">
              Credits critical · SEO Analysis failed
            </span>
            <div className="ml-auto h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-400" />
          </div>
        </div>

        {/* Overlays */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]" />

        {/* Vibey at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-center">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-[4/3] w-[200px]"
          >
            <img
              src="/images/autopilot/Title.png"
              alt="Vibey CEO"
              className="h-full w-full object-contain object-bottom drop-shadow-[0_-10px_20px_rgba(168,85,247,0.3)]"
            />
          </motion.div>
        </div>
      </div>

      {/* ── Desktop layout (original, untouched) ── */}
      <div className="absolute inset-0 hidden items-center justify-center md:flex">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-full w-full overflow-hidden bg-black/20 backdrop-blur-3xl"
        >
          {/* Screen Content: Dashboard Port */}
          <div className="absolute inset-0 grid grid-cols-12 gap-6 overflow-hidden p-8 md:scale-[0.85] lg:scale-100">
            {/* 1. Mission Control (Top Left) */}
            <div className="col-span-7 flex flex-col gap-5 overflow-hidden">
              <div className="flex min-h-0 flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={18} className="text-purple-400" />
                    <h2 className="text-[13px] font-bold uppercase tracking-widest text-white">
                      Mission Control
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400/80">
                        Live
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inbox List Header - Ported 1:1 from MissionList.tsx */}
                <div className="grid grid-cols-[2.5fr_1fr_1.2fr_1fr_0.8fr_0.6fr] border-b border-white/5 px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-white/30">
                  <span>Title</span>
                  <span>Campaign</span>
                  <span>Assigned</span>
                  <span>Status</span>
                  <span>Progress</span>
                  <span className="text-right">Updated</span>
                </div>

                {/* Inbox Rows */}
                <div className="space-y-1 overflow-y-auto pr-1">
                  {MISSION_DATA.map((m, i) => {
                    const P = PRIORITY_ICON[m.priority as keyof typeof PRIORITY_ICON]
                    const agent = allAgents.find((a) => a.role_key === m.agent)
                    const progress =
                      m.status === 'done'
                        ? 100
                        : m.status === 'in_progress'
                          ? 65
                          : m.status === 'pending_approval'
                            ? 85
                            : 0
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[2.5fr_1fr_1.2fr_1fr_0.8fr_0.6fr] items-center rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 transition-colors hover:bg-white/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <P.Icon size={12} className={P.className} />
                          <span className="truncate text-[11px] font-medium text-white">
                            {m.title}
                          </span>
                        </div>
                        <span className="truncate text-[10px] text-white/40">{m.campaign}</span>
                        <div className="flex min-w-0 items-center gap-2">
                          <img
                            src={agent?.image_url}
                            alt=""
                            className="h-4 w-4 rounded-full border border-white/10 object-cover"
                          />
                          <span className="truncate text-[10px] text-white/60">
                            {agent?.default_name}
                          </span>
                        </div>
                        <div>
                          <span
                            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter ${STATUS_STYLE[m.status]}`}
                          >
                            {m.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="pr-4">
                          <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                            <div
                              className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-400' : 'bg-blue-400'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <span className="whitespace-nowrap text-right text-[9px] text-white/20">
                          {m.updated}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 2. Financial Dashboard (Charts & Numbers) - Ported 1:1 from DashboardMetricsCards.tsx */}
              <div className="mt-auto grid grid-cols-2 gap-5">
                <div className="glass-card flex flex-col gap-4 border-white/5 bg-white/[0.02] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-emerald-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Revenue
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400">+14.2%</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black text-white">$14,240.50</div>
                      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
                        Total (30d)
                      </div>
                    </div>
                    <div className="flex h-10 flex-1 items-end gap-0.5">
                      {[30, 45, 25, 60, 55, 80, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-emerald-400/20"
                          style={{ height: `${h}%` }}
                        >
                          <div className="h-1/3 w-full rounded-t-sm bg-emerald-400/40" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass-card flex flex-col gap-4 border-white/5 bg-white/[0.02] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity size={16} className="text-blue-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                        Operations
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-400">91% Eff.</span>
                  </div>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black text-white">420h</div>
                      <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/20">
                        Time Saved
                      </div>
                    </div>
                    <div className="flex h-10 flex-1 items-center justify-center">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '91%' }}
                          transition={{ duration: 1.5, delay: 0.8 }}
                          className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Agents & Alerts */}
            <div className="col-span-5 flex flex-col gap-5 overflow-hidden">
              {/* 3. Active Agents (Ported List) */}
              <div className="glass-card flex flex-1 flex-col gap-4 overflow-hidden border-white/5 bg-white/[0.02] p-5">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-blue-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                    Active Team
                  </h3>
                </div>
                <div className="space-y-3 overflow-y-auto">
                  {activeAgents.map((agent, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.01] p-2"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={agent.image_url}
                          alt=""
                          className="h-9 w-9 rounded-full border border-white/10 object-cover"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0a] bg-emerald-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-bold text-white">
                          {agent.default_name}
                        </div>
                        <div className="truncate text-[9px] italic text-white/40">
                          {i === 0
                            ? 'Designing Q2 Funnel'
                            : i === 1
                              ? 'Analyzing Lead Data'
                              : i === 2
                                ? 'Writing Ad Copies'
                                : 'Routing Missions'}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <div className="text-[8px] font-bold uppercase text-emerald-400">
                          Working
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-white/20">
                          {i === 0 ? '94%' : i === 1 ? '68%' : i === 2 ? '42%' : '81%'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Critical Alerts (Ported Style) */}
              <div className="glass-card flex flex-col gap-4 border-red-500/10 bg-red-500/[0.03] p-5">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-400" />
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-red-400/80">
                    Critical System Alerts
                  </h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Credits critical (2%)', dot: 'bg-red-400' },
                    { label: 'Mission failed: SEO Analysis', dot: 'bg-orange-400' },
                  ].map((alert, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-red-400/10 bg-red-400/5 p-3 transition-colors hover:bg-red-400/10"
                    >
                      <AlertTriangle size={14} className="shrink-0 text-red-400" />
                      <span className="truncate text-[10px] font-medium text-red-200/80">
                        {alert.label}
                      </span>
                      <div
                        className={`ml-auto h-1.5 w-1.5 rounded-full ${alert.dot} animate-pulse`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Screen Overlays */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
          <div className="pointer-events-none absolute inset-0 bg-[url()] opacity-[0.02] invert" />
        </motion.div>
      </div>

      {/* Foreground: Vibey Sitting — desktop only (mobile has its own smaller version) */}
      <div className="pointer-events-none absolute inset-0 hidden items-end justify-center md:flex">
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative -mb-10 aspect-[4/3] w-full max-w-[600px] sm:-mb-20"
        >
          <img
            src="/images/autopilot/Title.png"
            alt="Vibey CEO Watching Screen"
            className="h-full w-full object-contain object-bottom drop-shadow-[0_-20px_40px_rgba(168,85,247,0.3)]"
          />
          <div className="absolute bottom-[20%] left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-500/20 blur-[100px]" />
        </motion.div>
      </div>

      {/* Scanline/Grid Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-[0.05]" />
    </div>
  )
}

```
$body_c_2$, $body_ct_2$text/markdown$body_ct_2$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_3$references/type6-components/CapabilitiesCarouselMockup.md$body_fp_3$, $body_c_3$# CapabilitiesCarouselMockup

> Horizontal scroller of product imagery or cards; use for a capability sweep.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/CapabilitiesCarouselMockup.tsx`
- Website source: `apps/website/src/components/marketing/CapabilitiesCarouselMockup.tsx`
- Import alias: `@/components/marketing/CapabilitiesCarouselMockup`

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
- `-translate-y-1/2`
- `[perspective:1200px]`
- `active:cursor-grabbing`
- `duration-500`
- `ease-in-out`
- `glass-card`
- `touch-pan-y`
- `transition-all`

## Source

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CAPABILITIES_CAROUSEL_META_CREATIVE_SRC,
  CompetitorReportPreview,
  FunnelRegisterPagePreview,
  MetaAdsInstagramFeedPreview,
  PresentationDeckPreview,
  SequenceEmailPreview,
  SocialPostPreview,
  StudioSkillChatPreview,
} from './CapabilitiesCarouselPreviews'

/**
 * Video Generated Preview - specific for capabilities mockup.
 * Embedded here since it requires custom assets.
 */
function VideoGeneratedPreview() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#000' }}>
      <img
        src={CAPABILITIES_CAROUSEL_META_CREATIVE_SRC}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        decoding="async"
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

const CAPABILITIES = [
  {
    id: 'funnel',
    label: 'Published Funnel',
    preview: <FunnelRegisterPagePreview />,
  },
  {
    id: 'social',
    label: 'Social Carousel',
    preview: <SocialPostPreview />,
  },
  {
    id: 'meta-ads',
    label: 'Meta Ads',
    preview: <MetaAdsInstagramFeedPreview />,
  },
  {
    id: 'email',
    label: 'Email Sequence',
    preview: <SequenceEmailPreview />,
  },
  {
    id: 'financial',
    label: 'Strategy PDF',
    preview: <CompetitorReportPreview />,
  },
  {
    id: 'presentation',
    label: 'Slide Deck',
    preview: <PresentationDeckPreview />,
  },
  {
    id: 'video',
    label: 'Video Creation',
    preview: <VideoGeneratedPreview />,
  },
  {
    id: 'skill',
    label: 'Agent Skill',
    preview: <StudioSkillChatPreview />,
  },
]

const SWIPE_THRESHOLD_PX = 48

export function CapabilitiesCarouselMockup() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const total = CAPABILITIES.length
  const dragStartXRef = useRef<number | null>(null)

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total)
  }, [total])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total)
  }, [total])

  useEffect(() => {
    const timer = setInterval(goNext, 5000)
    return () => clearInterval(timer)
  }, [goNext])

  const onPointerDownCapture = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragStartXRef.current = e.clientX
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const startX = dragStartXRef.current
      dragStartXRef.current = null
      if (startX === null) return
      const dx = e.clientX - startX
      if (dx > SWIPE_THRESHOLD_PX) {
        goPrev()
      } else if (dx < -SWIPE_THRESHOLD_PX) {
        goNext()
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId)
      }
    },
    [goNext, goPrev],
  )

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStartXRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

  return (
    <div className="relative w-full overflow-visible">
      <div
        className="relative z-0 flex h-[400px] w-full cursor-grab touch-pan-y select-none items-center justify-center overflow-visible [perspective:1200px] active:cursor-grabbing md:h-[600px]"
        onPointerDownCapture={onPointerDownCapture}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {CAPABILITIES.map((cap, index) => {
          const offset = index - currentIndex
          let pos = ((offset % total) + total) % total
          if (pos > Math.floor(total / 2)) pos = pos - total

          const isCenter = pos === 0
          const isAdjacent = Math.abs(pos) === 1

          return (
            <div
              key={cap.id}
              className="absolute flex items-center justify-center transition-all duration-500 ease-in-out"
              style={{
                width: 'min(90%, 400px)',
                transform: `translateX(${pos * 60}%) scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7}) rotateY(${pos * -10}deg)`,
                zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                opacity: isCenter ? 1 : isAdjacent ? 0.4 : 0,
                filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                pointerEvents: isCenter ? 'auto' : 'none',
              }}
            >
              <div className="glass-card relative flex w-full flex-col overflow-visible rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
                <div className="relative h-[370px] w-full overflow-hidden rounded-2xl md:h-[580px]">
                  {cap.preview}
                </div>
                <div
                  className="pointer-events-none absolute left-1/2 top-0 z-[60] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 backdrop-blur-md md:left-auto md:right-0 md:top-0 md:translate-x-1/2"
                  style={{
                    rotate: '3deg',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-white">
                    {cap.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

```
$body_c_3$, $body_ct_3$text/markdown$body_ct_3$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_4$references/type6-components/CapabilitiesCarouselPreviews.md$body_fp_4$, $body_c_4$# CapabilitiesCarouselPreviews

> Horizontal scroller of product imagery or cards; use for a capability sweep.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/CapabilitiesCarouselPreviews.tsx`
- Website source: `apps/website/src/components/marketing/CapabilitiesCarouselPreviews.tsx`
- Import alias: `@/components/marketing/CapabilitiesCarouselPreviews`

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
'use client'

/**
 * Visual previews for `/features/capabilities` hero carousel only.
 * Orchestrator re-exports — implementation lives in `./capabilities-carousel-previews/*`.
 */
export {
  CAPABILITIES_CAROUSEL_META_CREATIVE_SRC,
  CAPABILITIES_META_AD_CREATIVE_SRC,
  CompetitorReportPreview,
  FunnelRegisterPagePreview,
  MetaAdsInstagramFeedPreview,
  PresentationDeckPreview,
  SequenceEmailPreview,
  SocialPostPreview,
  StudioSkillChatPreview,
} from './capabilities-carousel-previews'

```
$body_c_4$, $body_ct_4$text/markdown$body_ct_4$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_5$references/type6-components/CapabilityGrid.md$body_fp_5$, $body_c_5$# CapabilityGrid

> Multi-cell grid (capabilities / value props); use for list slides.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/CapabilityGrid.tsx`
- Website source: `apps/website/src/components/feature-pages/CapabilityGrid.tsx`
- Import alias: `@/components/feature-pages/CapabilityGrid`

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
- `glass-card`
- `lg:grid-cols-3`
- `section-padding`
- `site-container`
- `sm:grid-cols-2`

## Source

```tsx
import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function CapabilityGrid(props: {
  title: string
  subtitle?: string
  items: { title: string; description: string }[]
}) {
  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <div className="mx-auto max-w-5xl">
            <h2 className="h2 mb-2 tracking-tight text-white">{props.title}</h2>
            {props.subtitle && (
              <p className="text-text-muted body-2 mb-8 max-w-2xl">{props.subtitle}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {props.items.map((item) => (
                <div key={item.title} className="glass-card border-section rounded-2xl border p-5">
                  <h3 className="h4 mb-2 text-white">{item.title}</h3>
                  <p className="text-text-muted body-3 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}

```
$body_c_5$, $body_ct_5$text/markdown$body_ct_5$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_6$references/type6-components/ComparisonTable.md$body_fp_6$, $body_c_6$# ComparisonTable

> Comparison/pricing table; use for “vs” slides.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/ComparisonTable.tsx`
- Website source: `apps/website/src/components/feature-pages/ComparisonTable.tsx`
- Import alias: `@/components/feature-pages/ComparisonTable`

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
- `glass-card`
- `last:border-0`
- `section-padding`
- `site-container`

## Source

```tsx
import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function ComparisonTable(props: {
  title: string
  subtitle?: string
  columns: string[]
  rows: { label: string; cells: string[] }[]
}) {
  return (
    <section className="section-padding relative">
      <AnimateOnScroll>
        <div className="site-container">
          <div>
            <h2 className="h2 mb-2 tracking-tight text-white">{props.title}</h2>
            {props.subtitle && (
              <p className="text-text-muted body-2 mb-8 max-w-2xl">{props.subtitle}</p>
            )}
            <div className="glass-card border-section overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-color-glass border-b">
                    <th className="text-color-muted body-3 p-4 font-medium">Capability</th>
                    {props.columns.map((c) => (
                      <th key={c} className="text-color-muted body-3 p-4 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.rows.map((row) => (
                    <tr key={row.label} className="border-color-glass border-b last:border-0">
                      <td className="body-3 p-4 font-medium text-white">{row.label}</td>
                      {row.cells.map((cell, i) => (
                        <td key={`${row.label}-${i}`} className="text-color-secondary body-3 p-4">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}

```
$body_c_6$, $body_ct_6$text/markdown$body_ct_6$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_7$references/type6-components/CompetitorReportPreview.md$body_fp_7$, $body_c_7$# CompetitorReportPreview

> Artifact preview (ad / funnel / email); use as slide body.

## Location

- Web-library path: `product-video/src/web-library/components/marketing/capabilities-carousel-previews/CompetitorReportPreview.tsx`
- Website source: `apps/website/src/components/marketing/capabilities-carousel-previews/CompetitorReportPreview.tsx`
- Import alias: `@/components/marketing/capabilities-carousel-previews/CompetitorReportPreview`

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
'use client'

import { useId } from 'react'

/** Area sparkline — same visual language as admin `DashboardMetricsCards` Revenue Trends (emerald fill, dashed grid). */
function StrategyBriefTrendChart() {
  const gid = useId().replace(/:/g, '')
  const values = [118, 124, 121, 132, 148, 156, 164]
  const w = 320
  const h = 88
  const padX = 8
  const padY = 10
  const minV = Math.min(...values) * 0.94
  const maxV = Math.max(...values) * 1.03
  const n = values.length
  const pts = values.map((v, i) => {
    const x = padX + (i / Math.max(1, n - 1)) * (w - 2 * padX)
    const y = padY + (1 - (v - minV) / (maxV - minV)) * (h - 2 * padY)
    return { x, y }
  })
  const lineD = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const baseY = (h - padY).toFixed(1)
  const areaD = `${lineD} L ${pts[n - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padY + t * (h - 2 * padY)
    return (
      <line
        key={t}
        x1={padX}
        x2={w - padX}
        y1={y}
        y2={y}
        stroke="#E5E7EB"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
    )
  })

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`pdfChartFill-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#10b981" stopOpacity={0.78} />
          <stop offset="95%" stopColor="#10b981" stopOpacity={0.08} />
        </linearGradient>
      </defs>
      {gridLines}
      <path d={areaD} fill={`url(#pdfChartFill-${gid})`} />
      <path
        d={lineD}
        fill="none"
        stroke="#10b981"
        strokeWidth={2.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Strategy Brief PDF — dense text, KPI strip, admin-style trend chart. */
export function CompetitorReportPreview() {
  const kpis = [
    { label: 'Pipeline (90d)', value: '$2.4M', delta: '+18.2%', up: true },
    { label: 'SQL → Close', value: '31.4%', delta: '+4.1 pts', up: true },
    { label: 'Blended CAC', value: '$2,180', delta: '−9.6%', up: true },
  ] as const

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#fff',
        fontFamily: '"Source Sans 3", system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          height: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          boxSizing: 'border-box',
          padding: '18px 20px 20px',
        }}
      >
        <div style={{ borderBottom: '3px solid #10B981', paddingBottom: 12, marginBottom: 14 }}>
          <h1
            style={{
              fontSize: 19,
              fontWeight: 900,
              color: '#111827',
              marginBottom: 4,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            STRATEGY BRIEF: Q2 GROWTH & CHANNEL EFFICIENCY
          </h1>
          <p style={{ fontSize: 10, color: '#6B7280', fontWeight: 600, letterSpacing: '0.04em' }}>
            CONFIDENTIAL · STRATEGY OPS · APR 2026 · VERSION 2.1
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                padding: '10px 10px 8px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 6,
                }}
              >
                {k.label}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 900,
                  color: '#111827',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {k.value}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: k.up ? '#059669' : '#DC2626' }}>
                {k.delta} vs prior quarter
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#F9FAFB',
            padding: '14px 16px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            1. Executive summary
          </h2>
          <p
            style={{
              fontSize: 11,
              lineHeight: 1.58,
              color: '#374151',
              margin: 0,
              marginBottom: 10,
            }}
          >
            Enterprise demand remains resilient: marketing-qualified volume grew{' '}
            <strong>14%</strong> quarter-over-quarter while sales-accepted leads held a{' '}
            <strong>92%</strong> acceptance rate. The constraint is not top-of-funnel awareness — it
            is speed-to-SQL and consistent nurture after the first human touch.
          </p>
          <p style={{ fontSize: 11, lineHeight: 1.58, color: '#374151', margin: 0 }}>
            We recommend doubling down on high-intent channels where CAC payback is under{' '}
            <strong>11 months</strong>, retiring two underperforming content series that drove{' '}
            <strong>22%</strong> of spend but only <strong>6%</strong> of sourced revenue, and
            tightening handoffs between outbound and product-led signups to protect pipeline
            hygiene.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.15fr',
            gap: 10,
            marginBottom: 12,
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              background: '#F9FAFB',
              padding: '14px 16px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              minWidth: 0,
            }}
          >
            <h2 style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
              2. Competitive pressure
            </h2>
            <p style={{ fontSize: 11, lineHeight: 1.55, color: '#4B5563', margin: '0 0 10px' }}>
              Two peers raised positioning spend in search and comparison keywords; impression share
              on non-brand terms slipped <strong>7 points</strong> in March. Win/loss interviews
              cite proof velocity (time-to-ROI narrative) more often than pricing.
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: 16,
                fontSize: 11,
                lineHeight: 1.5,
                color: '#374151',
              }}
            >
              <li style={{ marginBottom: 6 }}>
                Top rival shortened demo-to-trial from <strong>14.2 → 6.1</strong> days (rolling 90d
                median).
              </li>
              <li style={{ marginBottom: 6 }}>
                Our technical win rate when a security review starts within <strong>48h</strong> is{' '}
                <strong>64%</strong>; when delayed, it falls to <strong>38%</strong>.
              </li>
              <li>
                Referenceable customers in Fintech vertical: <strong>11</strong> active,{' '}
                <strong>4</strong> in late procurement.
              </li>
            </ul>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 6,
                gap: 8,
              }}
            >
              <h2 style={{ fontSize: 12, fontWeight: 800, color: '#111827', margin: 0 }}>
                3. Qualified pipeline trend
              </h2>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Trailing 7 weeks · $K
              </span>
            </div>
            <p style={{ fontSize: 10, lineHeight: 1.45, color: '#6B7280', margin: '0 0 8px' }}>
              Weekly qualified opportunity value in $ thousands; seven-week trailing window.
            </p>
            <StrategyBriefTrendChart />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: 9,
                fontWeight: 600,
                color: '#9CA3AF',
              }}
            >
              {['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'].map((lb) => (
                <span key={lb}>{lb}</span>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#F9FAFB',
            padding: '14px 16px',
            borderRadius: 10,
            border: '1px solid #E5E7EB',
          }}
        >
          <h2 style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            4. Channel allocation (next 60 days)
          </h2>
          <p style={{ fontSize: 11, lineHeight: 1.55, color: '#4B5563', margin: '0 0 10px' }}>
            Reallocate roughly <strong>$180K</strong> from broad awareness into intent capture:
            retargeting engaged accounts, partner co-marketing, and lifecycle email upgrades tied to
            product usage triggers. Expect blended CPL to rise slightly (<strong>+6–9%</strong>)
            while SQL quality improves.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                ch: 'Meta paid social',
                pct: '28%',
                note: 'Lookalike refresh + creative batch every 10 days',
              },
              {
                ch: 'LinkedIn ABM',
                pct: '22%',
                note: 'Tier-1 accounts only; 4-touch sequence cap',
              },
              {
                ch: 'Lifecycle & product-email',
                pct: '24%',
                note: 'Behavior triggers for PQL → sales-assist',
              },
              {
                ch: 'Content & SEO',
                pct: '18%',
                note: 'Prune low-converting clusters; three pillar pages',
              },
              {
                ch: 'Events & field',
                pct: '8%',
                note: 'Two flagship dinners; strict RSVP-to-SQL SLA',
              },
            ].map((row, i) => (
              <div
                key={row.ch}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 11,
                  color: '#374151',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    background: '#10B981',
                    color: '#fff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 800, color: '#111827' }}>{row.pct}</span>
                  {` · ${row.ch} — `}
                  <span style={{ color: '#4B5563' }}>{row.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

```
$body_c_7$, $body_ct_7$text/markdown$body_ct_7$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_8$references/type6-components/FAQAccordion.md$body_fp_8$, $body_c_8$# FAQAccordion

> FAQ-style expandable list; use for “what it answers” slides.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FAQAccordion.tsx`
- Website source: `apps/website/src/components/feature-pages/FAQAccordion.tsx`
- Import alias: `@/components/feature-pages/FAQAccordion`

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
- `glass-card`
- `section-padding`
- `shrink-0`
- `site-container`

## Source

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'

export function FAQAccordion(props: { title: string; items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="section-padding relative pb-20">
      <AnimateOnScroll>
        <div className="site-container">
          <div>
            <h2 className="h2 mb-8 tracking-tight text-white">{props.title}</h2>
            <div className="space-y-3">
              {props.items.map((item, i) => {
                const isOpen = open === i
                return (
                  <div key={item.q} className="glass-card border-section rounded-xl border">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span className="body-2 font-medium text-white">{item.q}</span>
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <ChevronDown size={20} className="text-color-muted shrink-0" />
                      </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-color-glass border-t px-5 pb-4 pt-0">
                            <p className="text-text-muted body-3 pt-3 leading-relaxed">{item.a}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </AnimateOnScroll>
    </section>
  )
}

```
$body_c_8$, $body_ct_8$text/markdown$body_ct_8$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_9$references/type6-components/FeatureFloatingMockShell.md$body_fp_9$, $body_c_9$# FeatureFloatingMockShell

> Product component; reuse verbatim in the slide TSX for 1:1 website fidelity.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FeatureFloatingMockShell.tsx`
- Website source: `apps/website/src/components/feature-pages/FeatureFloatingMockShell.tsx`
- Import alias: `@/components/feature-pages/FeatureFloatingMockShell`

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

- `compare-hero-brain-grid`

## Source

```tsx
'use client'

import React from 'react'

export function FeatureFloatingMockShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`compare-hero-card-shell border-color-glass bg-color-panel-mid relative aspect-auto min-h-[420px] w-full min-w-0 max-w-full overflow-hidden rounded-2xl border backdrop-blur-xl ${className ?? ''}`}
    >
      <div className="compare-hero-brain-grid pointer-events-none absolute inset-0" aria-hidden />
      {children}
    </div>
  )
}

```
$body_c_9$, $body_ct_9$text/markdown$body_ct_9$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
INSERT INTO skill_library_resources (skill_key, file_path, content, content_type, created_at) VALUES ('carousel-designer', $body_fp_10$references/type6-components/FeatureHero.md$body_fp_10$, $body_c_10$# FeatureHero

> Hero / above-the-fold block; use as a cover slide or section opener.

## Location

- Web-library path: `product-video/src/web-library/components/feature-pages/FeatureHero.tsx`
- Website source: `apps/website/src/components/feature-pages/FeatureHero.tsx`
- Import alias: `@/components/feature-pages/FeatureHero`

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

- `-mt-24`
- `body-1`
- `body-3`
- `chip-glass-emerald`
- `chip-glass-neutral`
- `feature-funnel-hero-section`
- `feature-hero-mockup-glow`
- `site-container`
- `sm:flex-row`
- `typo-caption`

## Source

```tsx
'use client'

import type { FeatureMockupKind } from '@/components/feature-pages/FeatureMockups'
import { FeatureMockupByKind } from '@/components/feature-pages/FeatureMockups'
import { FunnelHeroStack } from '@/components/feature-pages/FunnelHeroStack'
import { AgentLibraryCarousel } from '@/components/marketing/AgentLibraryCarousel'
import { WaitlistAwareLink } from '@/components/WaitlistAwareLink'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'

export function FeatureHero(props: {
  kicker: string
  title: string
  subtitle: string
  primaryCta: { href: string; label: string }
  secondaryCta?: { href: string; label: string }
  mockupKind: FeatureMockupKind
  /** When set, the hero visual area shows the live agent library carousel instead of the static mockup. */
  heroVisual?: 'default' | 'agent-library'
  /** Server-resolved agents (DB or seed fallback); required when `heroVisual` is `agent-library`. */
  agentLibraryAgents?: PublicAgentLibraryRow[]
  /** Passed into `mission-detail-modal` mockup for team portraits + Vibey. */
  missionDetailLibraryAgents?: PublicAgentLibraryRow[]
  missionDetailVibeyPortraitUrl?: string
}) {
  if (props.mockupKind === 'funnels') {
    return (
      <section className="feature-funnel-hero-section relative -mt-24">
        <FunnelHeroStack kicker={props.kicker} title={props.title} subtitle={props.subtitle} />
      </section>
    )
  }

  return (
    <section className="relative overflow-x-clip pt-10 md:pt-16">
      <div className="site-container relative z-10 mx-auto w-full max-w-6xl px-6 text-center">
        {props.kicker ? (
          <span className="typo-caption text-secondary mb-4 block font-semibold uppercase tracking-widest">
            {props.kicker}
          </span>
        ) : null}
        <h1 className="h1 mb-4 tracking-tight text-white">{props.title}</h1>
        <p className="text-text-muted body-1 mx-auto mb-8 max-w-2xl leading-relaxed">
          {props.subtitle}
        </p>
      </div>

      <div className="site-container relative mx-auto mt-10 w-full">
        <div className="feature-hero-mockup-glow" aria-hidden />
        <div
          className={`relative z-10 mx-auto min-h-0 w-full rounded-2xl ${
            props.mockupKind === 'capabilities-carousel' ? 'overflow-visible' : 'overflow-hidden'
          } ${
            props.mockupKind === 'autopilot-depth' ||
            props.mockupKind === 'integrations' ||
            props.mockupKind === 'mission-detail-modal' ||
            props.mockupKind === 'brain' ||
            props.mockupKind === 'capabilities-carousel' ||
            props.mockupKind === 'skills-hero'
              ? 'h-[400px] md:h-[500px] lg:h-[640px]'
              : ''
          }`}
        >
          {props.heroVisual === 'agent-library' ? (
            <AgentLibraryCarousel agents={props.agentLibraryAgents ?? []} />
          ) : (
            <FeatureMockupByKind
              kind={props.mockupKind}
              missionDetailLibraryAgents={props.missionDetailLibraryAgents}
              missionDetailVibeyPortraitUrl={props.missionDetailVibeyPortraitUrl}
            />
          )}
        </div>
      </div>

      <div className="site-container relative z-20 mx-auto w-full max-w-6xl px-6 pb-16 pt-8 text-center md:pb-20">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <WaitlistAwareLink
            href={props.primaryCta.href}
            className="chip-glass-emerald body-3 inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold"
          >
            {props.primaryCta.label}
          </WaitlistAwareLink>
          {props.secondaryCta && (
            <WaitlistAwareLink
              href={props.secondaryCta.href}
              className="chip-glass-neutral body-3 inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold"
            >
              {props.secondaryCta.label}
            </WaitlistAwareLink>
          )}
        </div>
      </div>
    </section>
  )
}

```
$body_c_10$, $body_ct_10$text/markdown$body_ct_10$, now()) ON CONFLICT (skill_key, file_path) DO UPDATE SET content = EXCLUDED.content, content_type = EXCLUDED.content_type;
