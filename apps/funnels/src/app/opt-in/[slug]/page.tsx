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
  const result = await resolveFunnelPage(slug, 'opt-in', userId, funnelId)

  if (!result) return {}

  return {
    title: (result.page.seo as any)?.title || result.funnel.title || result.funnel.name,
    description:
      (result.page.seo as any)?.description || `${result.funnel.name} — Powered by ROAS`,
  }
}

export default async function OptInPage({ params }: Props) {
  const { slug } = await params
  const { userId, funnelId } = await resolveDomain()
  const result = await resolveFunnelPage(slug, 'opt-in', userId, funnelId)

  if (!result) return notFound()

  trackPageView(result.funnel.id, result.page.id, 'opt-in')
  const funnelMeta = {
    metadata: (result.funnel as any).metadata,
    funnel_type: (result.funnel as any).funnel_type,
  }
  const pixelIds = resolveMetaPixelIds(funnelMeta)
  const eventName = resolveMetaEventForPage(funnelMeta, 'opt-in')

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
