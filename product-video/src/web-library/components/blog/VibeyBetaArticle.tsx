'use client'

import { ArrowRight } from 'lucide-react'
import {
  FeatureMockupByKind,
  type FeatureMockupKind,
} from '@/components/feature-pages/FeatureMockups'
import { AgentLibraryCarousel } from '@/components/marketing/AgentLibraryCarousel'
import { WaitlistAwareLink } from '@/components/WaitlistAwareLink'
import { FEATURE_PAGES, type FeatureSlug } from '@/lib/feature-pages-content'
import type { MarketingHrShowcasePayload } from '@/lib/marketing-hr-showcase-data'
import type { PublicAgentLibraryRow } from '@/lib/public-agent-library'
import { cn } from '@/lib/utils'

const BETA_ARTICLE_SECTION_SLUGS = [
  'your-team',
  'the-brain',
  'skills',
  'integrations',
  'missions',
  'studio',
  'autopilot',
  'capabilities',
] as const satisfies readonly FeatureSlug[]

const EXPLORE_FEATURE_LABEL: Record<(typeof BETA_ARTICLE_SECTION_SLUGS)[number], string> = {
  studio: 'Explore Studio',
  'your-team': 'Explore Your Team',
  'the-brain': 'Explore The Brain',
  missions: 'Explore Missions',
  autopilot: 'Explore Autopilot',
  capabilities: 'Explore Capabilities',
  skills: 'Explore Skills',
  integrations: 'Explore Integrations',
}

function BlogFeatureHeroVisual(props: {
  slug: FeatureSlug
  mockupKind: FeatureMockupKind
  agents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
}) {
  if (props.slug === 'your-team') {
    return <AgentLibraryCarousel agents={props.agents ?? []} />
  }
  return (
    <FeatureMockupByKind
      kind={props.mockupKind}
      missionDetailLibraryAgents={props.slug === 'missions' ? props.agents : undefined}
      missionDetailVibeyPortraitUrl={props.slug === 'missions' ? props.vibeyPortraitUrl : undefined}
    />
  )
}

function FeatureBentoSection(props: {
  slug: (typeof BETA_ARTICLE_SECTION_SLUGS)[number]
  agents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
  hrShowcaseData?: MarketingHrShowcasePayload
}) {
  const { slug } = props
  const page = FEATURE_PAGES[slug]
  const heroKind = page.mockupKind
  const needsFixedHeight =
    heroKind === 'integrations' ||
    heroKind === 'autopilot-depth' ||
    heroKind === 'brain' ||
    heroKind === 'capabilities-carousel' ||
    heroKind === 'skills-hero'

  return (
    <section className="flex flex-col gap-5">
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="h3 text-white">{page.hero.title}</h2>
        <p className="body-2 text-color-secondary leading-relaxed">{page.hero.subtitle}</p>
        <WaitlistAwareLink
          href={`/features/${slug}`}
          className="text-emerald-accent body-3 inline-flex items-center gap-1.5 font-medium transition-colors hover:underline"
        >
          {EXPLORE_FEATURE_LABEL[slug]}
          <ArrowRight size={14} />
        </WaitlistAwareLink>
      </div>

      <div
        className={cn(
          'glass-card border-section relative z-10 mx-auto min-h-0 w-full overflow-hidden rounded-2xl border',
          needsFixedHeight && 'h-[400px] md:h-[500px]',
        )}
      >
        <div
          className="feature-hero-mockup-glow pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className={cn('relative z-10', needsFixedHeight && 'h-full')}>
          <BlogFeatureHeroVisual
            slug={slug}
            mockupKind={heroKind}
            agents={props.agents}
            vibeyPortraitUrl={props.vibeyPortraitUrl}
          />
        </div>
      </div>
    </section>
  )
}

export function VibeyBetaArticle(props: {
  agents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
  hrShowcaseData?: MarketingHrShowcasePayload
}) {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <div className="flex flex-col gap-4">
        <p className="body-1 leading-relaxed text-white">
          Most AI tools give you a chatbot. Vibey gives you a system.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Eight pieces work together to give your agents real capability. No single piece is the
          magic. It&apos;s the combination: a team of specialist agents, each with their own memory,
          tools, and expertise, coordinated by a CEO agent that never sleeps. Today we&apos;re
          opening Vibey Beta. Here&apos;s everything inside.
        </p>
      </div>

      {BETA_ARTICLE_SECTION_SLUGS.map((slug, i) => (
        <div key={slug} className="flex flex-col gap-10 md:gap-12">
          {i > 0 && <div className="border-color-glass border-t" aria-hidden />}
          <FeatureBentoSection
            slug={slug}
            agents={props.agents}
            vibeyPortraitUrl={props.vibeyPortraitUrl}
            hrShowcaseData={props.hrShowcaseData}
          />
        </div>
      ))}

      <div className="border-color-glass bg-color-subtle flex flex-col items-center gap-4 rounded-xl border p-8 text-center">
        <h2 className="h3 text-white">YOUR TEAM IS READY</h2>
        <p className="body-2 text-color-secondary max-w-lg leading-relaxed">
          Join the beta. Build your first campaign, hire your first agent, and see what a
          coordinated AI team can do for your business.
        </p>
        <WaitlistAwareLink
          href="/waitlist"
          className="chip-glass-emerald body-3 inline-flex items-center gap-2 rounded-xl px-8 py-3 font-semibold"
        >
          Join Waitlist
          <ArrowRight size={14} />
        </WaitlistAwareLink>
      </div>
    </div>
  )
}
