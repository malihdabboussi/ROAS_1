import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FunnelPageView } from '@/components/FunnelPageView'
import { MetaPixelScript } from '@/components/MetaPixelScript'
import { Watermark } from '@/components/Watermark'
import { resolveMetaEventForPage, resolveMetaPixelIds } from '@/lib/meta-pixel-config'
import { resolveDomain, resolveFunnelPageForFunnelSlug } from '@/lib/resolve-domain'
import { trackPageView } from '@/lib/track-page-view'

type Props = {
  params: Promise<{ funnelSlug: string; pageType: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { funnelSlug, pageType, slug } = await params
  const { userId, funnelId } = await resolveDomain()

  const resolvedPageType = pageType === 'thank-you' ? 'thank-you' : pageType

  const result =
    resolvedPageType === 'thank-you'
      ? (await resolveFunnelPageForFunnelSlug(
          funnelSlug,
          'confirmation',
          slug,
          userId,
          funnelId,
        )) ||
        (await resolveFunnelPageForFunnelSlug(funnelSlug, 'thank-you', slug, userId, funnelId))
      : await resolveFunnelPageForFunnelSlug(funnelSlug, resolvedPageType, slug, userId, funnelId)

  if (!result) return {}

  if (resolvedPageType === 'thank-you') {
    return { title: `Thank You — ${result.funnel.title || result.funnel.name}` }
  }

  return {
    title: (result.page.seo as any)?.title || result.funnel.title || result.funnel.name,
    description:
      (result.page.seo as any)?.description || `${result.funnel.name} — Powered by ROAS`,
  }
}

/**
 * Domain-safe funnel routing:
 * /f/{funnelSlug}/{pageType}/{pageSlug}
 *
 * This is required for custom domains that can serve multiple funnels, because
 * page slugs are not globally unique across funnels.
 */
export default async function FunnelRoutedPage({ params }: Props) {
  const { funnelSlug, pageType, slug } = await params
  const { userId, funnelId } = await resolveDomain()

  const resolvedPageType = pageType === 'thank-you' ? 'thank-you' : pageType

  const result =
    resolvedPageType === 'thank-you'
      ? (await resolveFunnelPageForFunnelSlug(
          funnelSlug,
          'confirmation',
          slug,
          userId,
          funnelId,
        )) ||
        (await resolveFunnelPageForFunnelSlug(funnelSlug, 'thank-you', slug, userId, funnelId))
      : await resolveFunnelPageForFunnelSlug(funnelSlug, resolvedPageType, slug, userId, funnelId)

  if (!result) return notFound()

  trackPageView(result.funnel.id, result.page.id, resolvedPageType)
  const funnelMeta = {
    metadata: (result.funnel as any).metadata,
    funnel_type: (result.funnel as any).funnel_type,
  }
  const pixelIds = resolveMetaPixelIds(funnelMeta)
  const eventName = resolveMetaEventForPage(funnelMeta, resolvedPageType)

  return (
    <>
      {pixelIds.length > 0 ? <MetaPixelScript pixelIds={pixelIds} eventName={eventName} /> : null}
      <FunnelPageView
        page={result.page as any}
        funnel={result.funnel as any}
        funnelSlug={result.funnel.slug ?? funnelSlug}
        pageMap={result.pageMap}
      />
      {!result.funnel.hide_branding && <Watermark />}
    </>
  )
}
