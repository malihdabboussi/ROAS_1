import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FunnelPageView } from '@/components/FunnelPageView'
import { MetaPixelScript } from '@/components/MetaPixelScript'
import { Watermark } from '@/components/Watermark'
import { resolveMetaEventForPage, resolveMetaPixelIds } from '@/lib/meta-pixel-config'
import { resolveDomain, resolveFunnelPage } from '@/lib/resolve-domain'
import { trackPageView } from '@/lib/track-page-view'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { userId, funnelId } = await resolveDomain()

  // Try 'confirmation' first, then 'thank-you'
  const result =
    (await resolveFunnelPage(slug, 'confirmation', userId, funnelId)) ||
    (await resolveFunnelPage(slug, 'thank-you', userId, funnelId))

  if (!result) return {}

  return {
    title: `Thank You — ${result.funnel.title || result.funnel.name}`,
  }
}

export default async function ThankYouPage({ params }: Props) {
  const { slug } = await params
  const { userId, funnelId } = await resolveDomain()

  const result =
    (await resolveFunnelPage(slug, 'confirmation', userId, funnelId)) ||
    (await resolveFunnelPage(slug, 'thank-you', userId, funnelId))

  if (!result) return notFound()

  trackPageView(result.funnel.id, result.page.id, 'thank-you')
  const funnelMeta = {
    metadata: (result.funnel as any).metadata,
    funnel_type: (result.funnel as any).funnel_type,
  }
  const pixelIds = resolveMetaPixelIds(funnelMeta)
  const eventName = resolveMetaEventForPage(funnelMeta, 'thank-you')

  return (
    <>
      {pixelIds.length > 0 ? <MetaPixelScript pixelIds={pixelIds} eventName={eventName} /> : null}
      <FunnelPageView
        page={result.page as any}
        funnel={result.funnel as any}
        funnelSlug={result.funnel.slug ?? slug}
        pageMap={result.pageMap}
      />
      {!result.funnel.hide_branding && <Watermark />}
    </>
  )
}
