import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { FunnelPageView } from '@/components/FunnelPageView'
import { MetaPixelScript } from '@/components/MetaPixelScript'
import { Watermark } from '@/components/Watermark'
import { extractFunnelBundleHeadMeta } from '@/lib/assemble-funnel-html'
import { resolveMetaEventForPage, resolveMetaPixelIds } from '@/lib/meta-pixel-config'
import {
  resolveBlogPostForFunnelBySlug,
  resolveBlogPostsForFunnel,
  resolveDomain,
  resolveFunnelPageForFunnelSlugAndPath,
  resolveFunnelTemplatePageByType,
} from '@/lib/resolve-domain'
import { resolveFunnelPageBundle } from '@/lib/resolve-funnel-bundle'
import { trackPageView } from '@/lib/track-page-view'

type Props = {
  params: Promise<{ slug: string; path: string[] }>
  searchParams?: Promise<{ page?: string; page_size?: string; tag?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug: funnelSlug, path } = await params
  const { userId, funnelId } = await resolveDomain()

  const pagePath = `/${path.join('/')}`
  let result = await resolveFunnelPageForFunnelSlugAndPath(funnelSlug, pagePath, userId, funnelId)
  let blogPost = null as Awaited<ReturnType<typeof resolveBlogPostForFunnelBySlug>>

  if (!result && path[0] === 'blog' && path.length > 1) {
    const template =
      (await resolveFunnelTemplatePageByType(funnelSlug, 'blog-post', userId, funnelId)) ||
      (await resolveFunnelTemplatePageByType(funnelSlug, 'blog-listing', userId, funnelId))
    if (template) {
      blogPost = await resolveBlogPostForFunnelBySlug(template.funnel.id, path[1] ?? '')
      if (blogPost) {
        result = {
          ...template,
          page: {
            ...(template.page as Record<string, unknown>),
            page_type: 'blog-post',
          },
        } as NonNullable<typeof result>
      }
    }
  }

  if (!result) return {}
  const favicon = (result.funnel as any)?.layout?.favicon_url as string | undefined

  if (blogPost) {
    const seo = (blogPost.seo ?? {}) as Record<string, unknown>
    const ogImage =
      (typeof seo.og_image === 'string' && seo.og_image.length > 0 ? seo.og_image : null) ??
      blogPost.cover_image
    return {
      title:
        (typeof seo.title === 'string' && seo.title.length > 0 ? seo.title : null) ??
        blogPost.title ??
        result.funnel.title ??
        result.funnel.name,
      description:
        (typeof seo.description === 'string' && seo.description.length > 0
          ? seo.description
          : null) ??
        blogPost.excerpt ??
        `${result.funnel.name} — Powered by Vibey`,
      openGraph: {
        title:
          (typeof seo.title === 'string' && seo.title.length > 0 ? seo.title : null) ??
          blogPost.title,
        description:
          (typeof seo.description === 'string' && seo.description.length > 0
            ? seo.description
            : null) ??
          blogPost.excerpt ??
          '',
        images: ogImage ? [ogImage] : [`/${funnelSlug}/og`],
        type: 'article',
      },
      icons: favicon ? { icon: favicon, apple: favicon } : undefined,
    }
  }

  let bundleHead: { title: string | null; description: string | null } = {
    title: null,
    description: null,
  }
  if ((result.page as any).source_mode === 'html_bundle') {
    const bundle = await resolveFunnelPageBundle(result.funnel.id, result.page.id)
    bundleHead = extractFunnelBundleHeadMeta(bundle)
  }
  const pageTitle =
    (result.page.seo as any)?.title || bundleHead.title || result.funnel.title || result.funnel.name
  const pageDescription =
    (result.page.seo as any)?.description ||
    bundleHead.description ||
    `${result.funnel.name} — Powered by Vibey`

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      images: (result.page.seo as any)?.og_image
        ? [(result.page.seo as any).og_image]
        : [`/${funnelSlug}/og`],
      type: 'website',
    },
    icons: favicon ? { icon: favicon, apple: favicon } : undefined,
  }
}

export default async function FunnelPathPage({ params, searchParams }: Props) {
  const { slug: funnelSlug, path } = await params
  const query = searchParams ? await searchParams : {}
  const { userId, funnelId } = await resolveDomain()

  const pagePath = `/${path.join('/')}`
  let result = await resolveFunnelPageForFunnelSlugAndPath(funnelSlug, pagePath, userId, funnelId)
  let blogPosts = [] as Awaited<ReturnType<typeof resolveBlogPostsForFunnel>>
  let blogPost = null as Awaited<ReturnType<typeof resolveBlogPostForFunnelBySlug>>
  let relatedBlogPosts = [] as Awaited<ReturnType<typeof resolveBlogPostsForFunnel>>
  let blogPagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    tag: string | null
    tags: string[]
  } | null = null

  if (!result && path[0] === 'blog' && path.length > 1) {
    const template =
      (await resolveFunnelTemplatePageByType(funnelSlug, 'blog-post', userId, funnelId)) ||
      (await resolveFunnelTemplatePageByType(funnelSlug, 'blog-listing', userId, funnelId))
    if (template) {
      blogPost = await resolveBlogPostForFunnelBySlug(template.funnel.id, path[1] ?? '')
      if (blogPost) {
        result = {
          ...template,
          page: {
            ...(template.page as Record<string, unknown>),
            page_type: 'blog-post',
          },
        } as NonNullable<typeof result>
      }
    }
  }

  if (!result) {
    result = await resolveFunnelPageForFunnelSlugAndPath(funnelSlug, '/404', userId, funnelId)
  }

  const hasRenderableSource =
    result && (result.page.generated_html || (result.page as any).source_mode === 'html_bundle')
  if (!result || !hasRenderableSource) return notFound()

  const pageType = String((result.page as any).page_type ?? pagePath)
  if (pageType === 'blog-listing') {
    const allPosts = await resolveBlogPostsForFunnel(result.funnel.id)
    const activeTag =
      typeof query.tag === 'string' && query.tag.trim().length > 0 ? query.tag.trim() : null
    const filteredPosts = activeTag
      ? allPosts.filter((post) => Array.isArray(post.tags) && post.tags.includes(activeTag))
      : allPosts
    const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1)
    const pageSize = Math.min(
      50,
      Math.max(1, Number.parseInt(String(query.page_size ?? '10'), 10) || 10),
    )
    const total = filteredPosts.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const end = start + pageSize
    blogPosts = filteredPosts.slice(start, end)
    const tagSet = new Set<string>()
    for (const post of allPosts) {
      for (const tag of post.tags ?? []) tagSet.add(tag)
    }
    blogPagination = {
      page,
      pageSize,
      total,
      totalPages,
      tag: activeTag,
      tags: Array.from(tagSet),
    }
  }
  if (pageType === 'blog-post' && !blogPost && path.length > 1) {
    blogPost = await resolveBlogPostForFunnelBySlug(result.funnel.id, path[path.length - 1] ?? '')
  }
  if (pageType === 'blog-post' && blogPost) {
    const allPosts = await resolveBlogPostsForFunnel(result.funnel.id)
    const sourceTags = new Set(blogPost.tags ?? [])
    relatedBlogPosts = allPosts
      .filter((post) => post.id !== blogPost!.id)
      .map((post) => {
        const shared = (post.tags ?? []).filter((tag) => sourceTags.has(tag)).length
        return { post, shared }
      })
      .sort(
        (a, b) =>
          b.shared - a.shared ||
          Number(new Date(b.post.created_at)) - Number(new Date(a.post.created_at)),
      )
      .slice(0, 3)
      .map((entry) => entry.post)
  }

  trackPageView(result.funnel.id, result.page.id, pageType)
  const funnelMeta = {
    metadata: (result.funnel as any).metadata,
    funnel_type: (result.funnel as any).funnel_type,
  }
  const pixelIds = resolveMetaPixelIds(funnelMeta)
  const eventName = resolveMetaEventForPage(funnelMeta, pageType)

  const blogJsonLd = blogPost
    ? {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: blogPost.title,
        description: blogPost.excerpt ?? '',
        author: {
          '@type': 'Person',
          name: blogPost.author ?? result.funnel.name,
        },
        datePublished: blogPost.published_at ?? blogPost.created_at,
        dateModified: blogPost.updated_at,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${result.funnel.slug ? `/${result.funnel.slug}` : ''}${pagePath}`,
        },
        image: blogPost.cover_image ?? undefined,
      }
    : null

  return (
    <>
      {pixelIds.length > 0 ? <MetaPixelScript pixelIds={pixelIds} eventName={eventName} /> : null}
      {blogJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
        />
      ) : null}
      <FunnelPageView
        page={result.page as any}
        funnel={result.funnel as any}
        funnelSlug={result.funnel.slug ?? funnelSlug}
        pageMap={result.pageMap}
        blogPosts={blogPosts}
        blogPost={blogPost}
        blogPagination={blogPagination}
        relatedBlogPosts={relatedBlogPosts}
      />
      {!result.funnel.hide_branding && <Watermark />}
    </>
  )
}
