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
    <FeatureMockupByKind
      kind={block.mockupKind}
      missionDetailLibraryAgents={block.agentLibraryAgents}
      missionDetailVibeyPortraitUrl={block.vibeyPortraitUrl}
    />
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
