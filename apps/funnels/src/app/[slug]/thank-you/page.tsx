import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FunnelPageView } from '@/components/FunnelPageView'
import { MetaPixelScript } from '@/components/MetaPixelScript'
import { Watermark } from '@/components/Watermark'
import { resolveMetaEventForPage, resolveMetaPixelIds } from '@/lib/meta-pixel-config'
import { resolveDomain, resolveFunnelBySlug } from '@/lib/resolve-domain'
import { trackPageView } from '@/lib/track-page-view'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Direct access thank-you: sites.roas.io/{funnel-slug}/thank-you
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { userId, funnelId } = await resolveDomain()
  const result =
    (await resolveFunnelBySlug(slug, 'confirmation', userId, funnelId)) ||
    (await resolveFunnelBySlug(slug, 'thank-you', userId, funnelId))

  if (!result) return {}

  return {
    title: `Thank You — ${result.funnel.title || result.funnel.name}`,
  }
}

export default async function ThankYouDirectPage({ params }: Props) {
  const { slug } = await params
  const { userId, funnelId } = await resolveDomain()
  const result =
    (await resolveFunnelBySlug(slug, 'confirmation', userId, funnelId)) ||
    (await resolveFunnelBySlug(slug, 'thank-you', userId, funnelId))

  if (!result) return notFound()

  const pageType = (result.page as any).page_type ?? 'thank-you'
  trackPageView(result.funnel.id, result.page.id, pageType)
  const funnelMeta = {
    metadata: (result.funnel as any).metadata,
    funnel_type: (result.funnel as any).funnel_type,
  }
  const pixelIds = resolveMetaPixelIds(funnelMeta)
  const eventName = resolveMetaEventForPage(funnelMeta, pageType)

  return (
    <>
      {pixelIds.length > 0 ? <MetaPixelScript pixelIds={pixelIds} eventName={eventName} /> : null}
      <FunnelPageView
        page={result.page as any}
        funnel={result.funnel as any}
        funnelSlug={slug}
        pageMap={result.pageMap}
      />
      {!result.funnel.hide_branding && <Watermark />}
    </>
  )
}
