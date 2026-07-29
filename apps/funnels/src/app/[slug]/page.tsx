import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FunnelPageView } from '@/components/FunnelPageView'
import { MetaPixelScript } from '@/components/MetaPixelScript'
import { Watermark } from '@/components/Watermark'
import { extractFunnelBundleHeadMeta } from '@/lib/assemble-funnel-html'
import { resolveMetaEventForPage, resolveMetaPixelIds } from '@/lib/meta-pixel-config'
import { resolveDomain, resolveFunnelEntryBySlug } from '@/lib/resolve-domain'
import { resolveFunnelPageBundle } from '@/lib/resolve-funnel-bundle'
import { trackPageView } from '@/lib/track-page-view'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Direct access route: sites.roas.io/{funnel-slug}
 * Resolves by funnel.slug (not page slug), shows the opt-in page.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { userId, funnelId } = await resolveDomain()
  const result = await resolveFunnelEntryBySlug(slug, userId, funnelId)

  if (!result) return {}
  const favicon = (result.funnel as any)?.layout?.favicon_url as string | undefined

  let bundleHead: { title: string | null; description: string | null } = {
    title: null,
    description: null,
  }
  if ((result.page as any).source_mode === 'html_bundle') {
    const bundle = await resolveFunnelPageBundle(result.funnel.id, result.page.id)
    bundleHead = extractFunnelBundleHeadMeta(bundle)
  }
  const title = bundleHead.title || result.funnel.title || result.funnel.name
  const description = bundleHead.description || `${result.funnel.name} — Powered by ROAS`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: (result.page.seo as any)?.og_image
        ? [(result.page.seo as any).og_image]
        : [`/${slug}/og`],
      type: 'website',
    },
    icons: favicon ? { icon: favicon, apple: favicon } : undefined,
  }
}

export default async function FunnelDirectPage({ params }: Props) {
  const { slug } = await params
  const { userId, funnelId } = await resolveDomain()
  const result = await resolveFunnelEntryBySlug(slug, userId, funnelId)

  if (!result) return notFound()

  const pageType = (result.page as any).page_type ?? 'opt-in'
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
