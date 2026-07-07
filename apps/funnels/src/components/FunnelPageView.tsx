import { notFound } from 'next/navigation'
import { assembleFunnelHtml } from '@/lib/assemble-funnel-html'
import { resolveFunnelPageBundle } from '@/lib/resolve-funnel-bundle'
import type { FunnelPageMapEntry } from './FunnelBehaviorBridge'
import { FunnelBundleRenderer } from './FunnelBundleRenderer'
import { FunnelRenderer } from './FunnelRenderer'

interface FunnelPageViewProps {
  page: {
    id: string
    generated_html?: string | null
    generated_css?: string | null
    source_mode?: string | null
  }
  funnel: {
    id: string
    funnel_type?: string | null
    layout?: unknown
  }
  funnelSlug?: string
  pageMap?: FunnelPageMapEntry[]
  blogPosts?: unknown[]
  blogPost?: unknown | null
  blogPagination?: unknown | null
  relatedBlogPosts?: unknown[]
}

/**
 * Server-side branch between the HTML bundle runtime (SSR fragments, no
 * compile step) and the legacy TSX runtime (client esbuild). Shared by every
 * public funnel route.
 */
export async function FunnelPageView({
  page,
  funnel,
  funnelSlug,
  pageMap,
  blogPosts,
  blogPost,
  blogPagination,
  relatedBlogPosts,
}: FunnelPageViewProps) {
  if (page.source_mode === 'html_bundle') {
    const bundle = await resolveFunnelPageBundle(funnel.id, page.id)
    const assembled = assembleFunnelHtml(bundle)
    if (!assembled) return notFound()
    return (
      <FunnelBundleRenderer
        assembled={assembled}
        funnelId={funnel.id}
        pageId={page.id}
        funnelSlug={funnelSlug}
        pageMap={pageMap}
        funnelType={funnel.funnel_type ?? null}
        layout={(funnel.layout as never) ?? null}
      />
    )
  }

  if (!page.generated_html) return notFound()
  return (
    <FunnelRenderer
      code={page.generated_html}
      css={page.generated_css}
      funnelId={funnel.id}
      pageId={page.id}
      funnelSlug={funnelSlug}
      pageMap={pageMap}
      funnelType={funnel.funnel_type ?? null}
      layout={(funnel.layout as never) ?? null}
      blogPosts={blogPosts}
      blogPost={blogPost}
      blogPagination={blogPagination}
      relatedBlogPosts={relatedBlogPosts}
    />
  )
}
