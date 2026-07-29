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
  /** Passed into `mission-detail-modal` mockup for team portraits + ROAS. */
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
            props.mockupKind === 'skills-hero' ||
            props.mockupKind === 'documents'
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
