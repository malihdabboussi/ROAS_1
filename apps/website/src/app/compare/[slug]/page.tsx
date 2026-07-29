import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { CompareClosingCta } from '@/components/compare/CompareClosingCta'
import { CompareDifferentiation } from '@/components/compare/CompareDifferentiation'
import { CompareHeroSection } from '@/components/compare/CompareHeroSection'
import { CompareMatrix } from '@/components/compare/CompareMatrix'
import { ComparePageLayout } from '@/components/compare/ComparePageLayout'
import { CompareShowcaseZigzag } from '@/components/compare/CompareShowcaseZigzag'
import { CompareWhenToUse } from '@/components/compare/CompareWhenToUse'
import { COMPARE_PAGES, COMPARE_SLUGS, type CompareSlug } from '@/lib/compare-content'

type Props = { params: Promise<{ slug: string }> }

const THEM_LABELS: Record<CompareSlug, string> = {
  'vs-chatgpt': 'ChatGPT',
  'vs-manus': 'Manus',
  'vs-clickfunnels': 'ClickFunnels',
}

export function generateStaticParams() {
  return COMPARE_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = COMPARE_PAGES[slug as CompareSlug]
  if (!page) return { title: 'Not found | ROAS' }
  const url = `https://vibey.im/compare/${slug}`
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      siteName: 'ROAS',
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

export default async function ComparePage({ params }: Props) {
  const { slug } = await params
  const page = COMPARE_PAGES[slug as CompareSlug]
  if (!page) notFound()

  const themLabel = THEM_LABELS[page.slug]

  return (
    <ComparePageLayout>
      <CompareHeroSection
        slug={page.slug}
        kicker={page.kicker}
        title={page.title}
        subtitle={page.subtitle}
        bullets={page.bullets}
        themLabel={themLabel}
      />

      <CompareDifferentiation
        headlineCards={page.differentiation.headlineCards}
        subhead={page.differentiation.subhead}
        cards={page.differentiation.cards}
      />

      <CompareShowcaseZigzag
        sectionTitle={page.showcase.sectionTitle}
        sectionSubtitle={page.showcase.sectionSubtitle}
        rows={page.showcase.rows}
      />

      <CompareMatrix compareSlug={page.slug} themLabel={themLabel} rows={page.matrix.rows} />

      <CompareWhenToUse vibey={page.whenToUse.vibey} them={page.whenToUse.them} />

      <CompareClosingCta headline={page.closingCta.headline} subhead={page.closingCta.subhead} />

      <section className="pb-20">
        <AnimateOnScroll>
          <div className="site-container">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-text-muted body-2 mb-4">Explore more angles</p>
              <div className="flex flex-wrap justify-center gap-3">
                {COMPARE_SLUGS.filter((s) => s !== page.slug).map((s) => (
                  <Link
                    key={s}
                    href={`/compare/${s}`}
                    className="chip-glass-neutral body-4 rounded-lg px-4 py-2 font-medium"
                  >
                    {`vs. ${THEM_LABELS[s]}`}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </section>
    </ComparePageLayout>
  )
}
