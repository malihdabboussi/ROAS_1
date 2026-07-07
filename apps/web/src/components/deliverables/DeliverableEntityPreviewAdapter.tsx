'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { StandaloneEmailDeliverablePreview } from '@/components/deliverables/StandaloneEmailDeliverablePreview'
import { AdPreview } from '@/features/studio/components/preview/AdPreview'
import { AvatarPreview } from '@/features/studio/components/preview/AvatarPreview'
import { BlogPostPreview } from '@/features/studio/components/preview/BlogPostPreview'
import { OfferPreview } from '@/features/studio/components/preview/OfferPreview'
import { PresentationPreview } from '@/features/studio/components/preview/PresentationPreview'
import { SandpackPreview } from '@/features/studio/components/preview/SandpackPreview'
import { SequencePreview } from '@/features/studio/components/preview/SequencePreview'
import SocialPostPreview from '@/features/studio/components/preview/SocialPostPreview'
import { fetchFunnelWithPages } from '@/lib/artifacts'

export function FunnelFullPreview({ funnelId }: { funnelId: string }) {
  const [page, setPage] = useState<{ code: string; css?: string; name?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFunnelWithPages(funnelId)
      .then((funnel) => {
        if (cancelled) return
        const pages = Array.isArray(funnel.pages)
          ? (funnel.pages as Array<{
              id: string
              name?: string
              generated_html: string | null
              generated_css: string | null
              order_index?: number
            }>)
          : []
        const sorted = pages.slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        const first = sorted[0]
        if (first?.generated_html) {
          setPage({
            code: first.generated_html,
            css: first.generated_css ?? undefined,
            name: first.name ?? 'Page',
          })
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [funnelId])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="icon-md text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (!page) {
    return (
      <div className="body-2 text-muted-foreground py-spacing-6 text-center">
        No page content available
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ minHeight: '60vh' }}>
      <SandpackPreview code={page.code} css={page.css} fileName={page.name} hideDownload />
    </div>
  )
}

export function DeliverableEntityPreviewAdapter({
  deliverableType,
  entityId,
}: {
  deliverableType: string
  entityId: string
}) {
  switch (deliverableType) {
    case 'presentation':
      return (
        <div className="flex min-h-0 flex-1 flex-col" style={{ minHeight: '60vh' }}>
          <PresentationPreview presentationId={entityId} hideSandpackToolbar />
        </div>
      )
    case 'funnel':
    case 'website':
      return <FunnelFullPreview funnelId={entityId} />
    case 'social_post':
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <SocialPostPreview socialPostId={entityId} hideToolbar />
        </div>
      )
    case 'ad':
      return (
        <div className="flex min-h-0 flex-1 flex-col" style={{ minHeight: '60vh' }}>
          <AdPreview adId={entityId} hideToolbar />
        </div>
      )
    case 'offer':
      return <OfferPreview offerId={entityId} hideToolbar />
    case 'avatar':
      return <AvatarPreview avatarId={entityId} hideToolbar />
    case 'sequence':
      return <SequencePreview sequenceId={entityId} hideToolbar />
    case 'email':
      return <StandaloneEmailDeliverablePreview emailId={entityId} />
    case 'blog_post':
      return <BlogPostPreview blogPostId={entityId} />
    default:
      return (
        <div className="body-2 text-muted-foreground py-spacing-6 text-center">
          Preview not available for this type
        </div>
      )
  }
}
