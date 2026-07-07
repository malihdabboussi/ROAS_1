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

type BetaSlug = Extract<FeatureSlug, 'the-brain' | 'your-team' | 'spaces'>

const BETA_ARTICLE_SECTION_SLUGS = ['the-brain', 'your-team', 'spaces'] as const satisfies readonly BetaSlug[]

const EXPLORE_FEATURE_LABEL: Record<BetaSlug, string> = {
  'the-brain': 'Explore the Brain',
  'your-team': 'Explore Agents',
  spaces: 'Explore Spaces',
}

const SECTION_INTROS: Record<BetaSlug, { kicker: string; framing: string }> = {
  'the-brain': {
    kicker: '01 · The knowledge layer',
    framing:
      'The thing every AI tool gets wrong: it has no idea who you are, what you sell, or how you operate. The Brain fixes that first—because nothing else matters until your agents are working from the same context your team is.',
  },
  'your-team': {
    kicker: '02 · The workforce',
    framing:
      'You are not going to hire ten more people this quarter. You should not have to. Agents handle the execution layer—research, drafts, data, outreach, ops—so the people you already pay for their judgment can finally use it.',
  },
  spaces: {
    kicker: '03 · Where the work happens',
    framing:
      'A workforce with no workspace is just a Slack channel of promises. Spaces is the operating surface where humans and agents work on the same tasks, in the same docs, in the same channels—not in parallel tools that never sync.',
  },
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
      missionDetailLibraryAgents={
        props.slug === 'missions' || props.slug === 'spaces' ? props.agents : undefined
      }
      missionDetailVibeyPortraitUrl={
        props.slug === 'missions' || props.slug === 'spaces' ? props.vibeyPortraitUrl : undefined
      }
    />
  )
}

function FeatureBentoSection(props: {
  slug: BetaSlug
  agents?: PublicAgentLibraryRow[]
  vibeyPortraitUrl?: string
  hrShowcaseData?: MarketingHrShowcasePayload
}) {
  const { slug } = props
  const page = FEATURE_PAGES[slug]
  const heroKind = page.mockupKind
  const intro = SECTION_INTROS[slug]
  const needsFixedHeight =
    heroKind === 'integrations' ||
    heroKind === 'autopilot-depth' ||
    heroKind === 'brain' ||
    heroKind === 'capabilities-carousel' ||
    heroKind === 'skills-hero'

  return (
    <section className="flex flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-color-dim body-4 font-semibold uppercase tracking-widest">
          {intro.kicker}
        </p>
        <h2 className="h3 text-white">{page.hero.title}</h2>
        <p className="body-2 text-color-secondary leading-relaxed">{intro.framing}</p>
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
          You are not short on AI tools. You are short on a way to run a company with them.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Every founder we talk to is in the same loop: a chatbot in one tab, a workflow tool in
          another, three docs that contradict each other, and a team paying the tax of stitching it
          all together. AI was supposed to remove that. So far it has mostly added another tab.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Vibey Beta is the opposite move. Three pieces that fit together so your company can
          actually operate as a hybrid of humans and agents.{' '}
          <span className="text-white">The Brain</span> holds the knowledge.{' '}
          <span className="text-white">Agents</span> do the work.{' '}
          <span className="text-white">Spaces</span> is where it all happens. One workspace, one
          source of truth, one place your team and your agents share.
        </p>
        <p className="body-2 text-color-secondary leading-relaxed">
          Here is what is inside.
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
        <h2 className="h3 text-white">RUN THE COMPANY WITH HUMANS AND AGENTS.</h2>
        <p className="body-2 text-color-secondary max-w-xl leading-relaxed">
          The Beta is open. Connect your knowledge, hire your first agents, and put your team
          inside one workspace where the work actually moves.
        </p>
        <WaitlistAwareLink
          href="/waitlist"
          className="chip-glass-emerald body-3 inline-flex items-center gap-2 rounded-xl px-8 py-3 font-semibold"
        >
          Get Early Access
          <ArrowRight size={14} />
        </WaitlistAwareLink>
      </div>
    </div>
  )
}
