import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MetaPixelScript } from '@/components/MetaPixelScript'
import { PresentationRenderer } from '@/components/PresentationRenderer'
import { Watermark } from '@/components/Watermark'
import { resolveMetaEventForPage, resolveMetaPixelIds } from '@/lib/meta-pixel-config'
import { resolveDomain } from '@/lib/resolve-domain'
import { resolvePresentationBySlug } from '@/lib/resolve-presentation'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { userId } = await resolveDomain()
  const presentation = await resolvePresentationBySlug(slug, userId)

  if (!presentation) return {}

  return {
    title: presentation.name ?? 'Presentation',
    description: `${presentation.name} — Powered by ROAS`,
  }
}

/**
 * Public presentation view: {user-subdomain}.sites.roas.io/p/{slug}
 * No auth required. Only serves published presentations.
 */
export default async function PresentationPublicPage({ params }: Props) {
  const { slug } = await params
  const { userId } = await resolveDomain()
  const presentation = await resolvePresentationBySlug(slug, userId)

  if (!presentation) return notFound()
  const meta =
    presentation.metadata && typeof presentation.metadata === 'object' ? presentation.metadata : {}
  const funnelLike = { metadata: meta, funnel_type: 'lead-magnet' as const }
  const pixelIds = resolveMetaPixelIds(funnelLike)
  const eventName = resolveMetaEventForPage(funnelLike, 'opt-in')

  return (
    <>
      {pixelIds.length > 0 ? <MetaPixelScript pixelIds={pixelIds} eventName={eventName} /> : null}
      <PresentationRenderer presentation={presentation} />
      {!presentation.hide_branding && <Watermark />}
    </>
  )
}
