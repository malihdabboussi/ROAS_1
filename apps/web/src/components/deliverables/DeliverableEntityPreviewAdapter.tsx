'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { StandaloneEmailDeliverablePreview } from '@/components/deliverables/StandaloneEmailDeliverablePreview'
import { AdPreview } from '@/features/studio/components/preview/AdPreview'
import { AvatarPreview } from '@/features/studio/components/preview/AvatarPreview'
import { BlogPostPreview } from '@/features/studio/components/preview/BlogPostPreview'
import { FunnelHtmlPreview } from '@/features/studio/components/preview/FunnelHtmlPreview'
import { OfferPreview } from '@/features/studio/components/preview/OfferPreview'
import { PresentationPreview } from '@/features/studio/components/preview/PresentationPreview'
import { SandpackPreview } from '@/features/studio/components/preview/SandpackPreview'
import { SequencePreview } from '@/features/studio/components/preview/SequencePreview'
import SocialPostPreview from '@/features/studio/components/preview/SocialPostPreview'
import { fetchFunnelPageBundle, fetchFunnelWithPages, type FunnelPageBundle } from '@/lib/artifacts'

type FunnelPreviewPage = {
  id: string
  name: string
  sourceMode: string
  code: string | null
  css: string | null
  order: number
}

export function FunnelFullPreview({ funnelId }: { funnelId: string }) {
  const [pages, setPages] = useState<FunnelPreviewPage[]>([])
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null)
  const [bundle, setBundle] = useState<FunnelPageBundle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchFunnelWithPages(funnelId)
      .then((funnel) => {
        if (cancelled) return
        const funnelPages = Array.isArray(funnel.pages)
          ? (funnel.pages as Array<{
              id: string
              name?: string
              generated_html: string | null
              generated_css: string | null
              order_index?: number
              sort_order?: number
              source_mode?: string
            }>)
          : []
        const sorted = funnelPages
          .map((page) => ({
            id: page.id,
            name: page.name ?? 'Page',
            sourceMode: page.source_mode ?? 'tsx',
            code: page.generated_html,
            css: page.generated_css,
            order: page.order_index ?? page.sort_order ?? 0,
          }))
          .sort((a, b) => a.order - b.order)
        setPages(sorted)
        setSelectedPageId((current) =>
          current && sorted.some((page) => page.id === current) ? current : (sorted[0]?.id ?? null),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setPages([])
          setSelectedPageId(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [funnelId])

  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null

  useEffect(() => {
    let cancelled = false
    setBundle(null)
    if (!selectedPage || selectedPage.sourceMode !== 'html_bundle') return
    setLoading(true)
    fetchFunnelPageBundle(funnelId, selectedPage.id)
      .then((nextBundle) => {
        if (!cancelled) setBundle(nextBundle)
      })
      .catch(() => {
        if (!cancelled) setBundle(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [funnelId, selectedPage?.id, selectedPage?.sourceMode])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="icon-md text-muted-foreground animate-spin" />
      </div>
    )
  }

  if (!selectedPage) {
    return (
      <div className="body-2 text-muted-foreground py-spacing-6 text-center">
        No page content available
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {pages.length > 1 ? (
        <div className="gap-spacing-2 border-border px-spacing-3 py-spacing-2 flex shrink-0 flex-wrap border-b">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedPageId(page.id)}
              aria-pressed={page.id === selectedPage.id}
              className={
                page.id === selectedPage.id
                  ? 'button-glass-accent body-3 px-spacing-3 py-spacing-1'
                  : 'button-glass-neutral body-3 px-spacing-3 py-spacing-1'
              }
            >
              {page.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        {selectedPage.sourceMode === 'html_bundle' && bundle ? (
          <FunnelHtmlPreview bundle={bundle} title={selectedPage.name} bridgeEnabled={false} />
        ) : selectedPage.code ? (
          <SandpackPreview
            code={selectedPage.code}
            css={selectedPage.css ?? undefined}
            fileName={selectedPage.name}
            hideDownload
          />
        ) : (
          <div className="body-2 text-muted-foreground py-spacing-6 text-center">
            No page content available
          </div>
        )}
      </div>
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
        <div className="flex min-h-0 flex-1 flex-col">
          <AdPreview adId={entityId} />
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
