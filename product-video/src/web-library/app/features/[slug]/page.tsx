import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { ComparisonTable } from '@/components/feature-pages/ComparisonTable'
import { FAQAccordion } from '@/components/feature-pages/FAQAccordion'
import { FeatureHero } from '@/components/feature-pages/FeatureHero'
import { FeaturePageLayout } from '@/components/feature-pages/FeaturePageLayout'
import { FeatureShowcase } from '@/components/feature-pages/FeatureShowcase'
import { ProofCarousel } from '@/components/feature-pages/ProofCarousel'
import { StandaloneVideoShowcase } from '@/components/feature-pages/StandaloneVideoShowcase'
import { ThreeSteps } from '@/components/feature-pages/ThreeSteps'
import { ValuePropGrid } from '@/components/feature-pages/ValuePropGrid'
import { WaitlistAwareLink } from '@/components/WaitlistAwareLink'
import { FEATURE_PAGES, FEATURE_SLUGS, type FeatureSlug } from '@/lib/feature-pages-content'
import {
  getAgentLibraryForMarketing,
  getMarketingVibeyPortraitUrl,
} from '@/lib/get-agent-library-for-marketing'
import { getMarketingHrShowcaseData } from '@/lib/marketing-hr-showcase-data'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return FEATURE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = FEATURE_PAGES[slug as FeatureSlug]
  if (!page) return { title: 'Not found | Vibey' }
  const url = `https://vibey.im/features/${slug}`
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      siteName: 'Vibey',
      type: 'website',
      images: [
        { url: '/Logos/logov2/icon-text-white.png', width: 1200, height: 630, alt: page.metaTitle },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@usevibey',
      title: page.metaTitle,
      description: page.metaDescription,
    },
    alternates: { canonical: url },
  }
}

export default async function FeatureDetailPage({ params }: Props) {
  const { slug } = await params
  const page = FEATURE_PAGES[slug as FeatureSlug]
  if (!page) notFound()

  const loadMarketingAgentShowcase =
    slug === 'your-team' || slug === 'missions' || slug === 'autopilot'
  const marketingAgentLibrary = loadMarketingAgentShowcase
    ? await getAgentLibraryForMarketing()
    : undefined
  const marketingVibeyPortrait = loadMarketingAgentShowcase
    ? await getMarketingVibeyPortraitUrl()
    : undefined

  const agentLibraryAgents = slug === 'your-team' ? marketingAgentLibrary : undefined
  const vibeyPortraitUrl = slug === 'your-team' ? marketingVibeyPortrait : undefined
  const missionDetailLibraryAgents = slug === 'missions' ? marketingAgentLibrary : undefined
  const missionDetailVibeyPortraitUrl = slug === 'missions' ? marketingVibeyPortrait : undefined
  const hrShowcaseData =
    slug === 'your-team' ? await getMarketingHrShowcaseData(agentLibraryAgents ?? []) : undefined
  const showcaseBlocks = page.showcase.blocks.map((b) => {
    let block = b
    if (
      slug === 'your-team' &&
      (b.mockupKind === 'marketing-org' || b.mockupKind === 'mission-activity-score')
    ) {
      block = {
        ...block,
        agentLibraryAgents: marketingAgentLibrary ?? [],
        vibeyPortraitUrl: marketingVibeyPortrait,
      }
    }
    if (
      slug === 'missions' &&
      (b.mockupKind === 'mission-execution' || b.mockupKind === 'mission-activity-timeline')
    ) {
      block = {
        ...block,
        agentLibraryAgents: marketingAgentLibrary ?? [],
        vibeyPortraitUrl: marketingVibeyPortrait,
      }
    }
    if (
      slug === 'autopilot' &&
      (b.mockupKind === 'dynamic-router' || b.mockupKind === 'daily-digest')
    ) {
      block = {
        ...block,
        agentLibraryAgents: marketingAgentLibrary ?? [],
        vibeyPortraitUrl: marketingVibeyPortrait,
      }
    }
    if (hrShowcaseData != null && b.title === 'Hire, train, trust') {
      block = { ...block, hrShowcaseData }
    }
    return block
  })

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <FeaturePageLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* 1. Hero + badges */}
      <FeatureHero
        kicker={page.hero.kicker}
        title={page.hero.title}
        subtitle={page.hero.subtitle}
        primaryCta={page.hero.primaryCta}
        secondaryCta={page.hero.secondaryCta}
        mockupKind={page.mockupKind}
        heroVisual={slug === 'your-team' ? 'agent-library' : undefined}
        agentLibraryAgents={agentLibraryAgents}
        missionDetailLibraryAgents={missionDetailLibraryAgents}
        missionDetailVibeyPortraitUrl={missionDetailVibeyPortraitUrl}
      />

      {page.mockupKind === 'funnels' ? (
        <div className="feature-funnel-pre-comparison-gap" aria-hidden />
      ) : null}

      {/* 2. Comparison table */}
      {page.comparison && (
        <ComparisonTable
          title={page.comparison.title}
          subtitle={page.comparison.subtitle}
          columns={page.comparison.columns}
          rows={page.comparison.rows}
        />
      )}

      {/* 3. Deep feature showcase (the "Everything you need" section) */}
      <FeatureShowcase
        title={page.showcase.title}
        subtitle={page.showcase.subtitle}
        blocks={showcaseBlocks}
        ctaHref={page.showcase.ctaHref}
        ctaLabel={page.showcase.ctaLabel}
      />

      {/* 4. Value prop grid ("Your freedom & control") */}
      {page.valuePropGrid && (
        <ValuePropGrid
          title={page.valuePropGrid.title}
          subtitle={page.valuePropGrid.subtitle}
          items={page.valuePropGrid.items}
        />
      )}

      {/* Standalone Video Showcase */}
      {page.standaloneVideo && (
        <StandaloneVideoShowcase
          title={page.standaloneVideo.title}
          subtitle={page.standaloneVideo.subtitle}
          videoSrc={page.standaloneVideo.videoSrc}
        />
      )}

      {/* 5. Three steps */}
      {page.steps && <ThreeSteps title={page.steps.title} steps={page.steps.items} />}

      {/* 6. Social proof */}
      {page.proof && <ProofCarousel title={page.proof.title} quotes={page.proof.quotes} />}

      {/* 7. FAQ */}
      <FAQAccordion title={page.faq.title} items={page.faq.items} />

      {/* 8. Final CTA */}
      <section className="section-padding relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgb(var(--accent-secondary-rgb) / 0.1), transparent 70%)',
          }}
        />
        <AnimateOnScroll>
          <div className="site-container relative">
            <div className="relative mx-auto max-w-3xl text-center">
              <h2 className="h2 mb-4 tracking-tight text-white">{page.finalCta.title}</h2>
              <p className="text-text-muted body-2 mb-8 leading-relaxed">
                {page.finalCta.subtitle}
              </p>
              <WaitlistAwareLink
                href={page.finalCta.ctaHref}
                className="glow-emerald animate-glow-pulse bg-emerald-accent text-on-emerald body-2 group inline-flex items-center gap-2 rounded-xl px-10 py-4 font-bold transition-all hover:brightness-110"
              >
                {page.finalCta.ctaLabel}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </WaitlistAwareLink>
            </div>
          </div>
        </AnimateOnScroll>
      </section>
    </FeaturePageLayout>
  )
}
