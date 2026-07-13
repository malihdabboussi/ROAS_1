import { headers } from 'next/headers'
import { resolveFunnelsBaseDomain } from './platform-urls'
import { getServiceClient } from './supabase'

const BASE_DOMAIN = resolveFunnelsBaseDomain()

type DomainCacheEntry = {
  userId: string | null
  funnelId: string | null
  subdomain: string | null
  expiresAt: number
}

const domainCache = new Map<string, DomainCacheEntry>()
const CACHE_HIT_TTL_MS = 10 * 60 * 1000
const CACHE_MISS_TTL_MS = 5 * 60 * 1000

/**
 * Resolve the current request's host to a user ID.
 *
 * Supports:
 * 1. Custom domain: mydomain.com → lookup domains table
 * 2. Subdomain: user-xxx.sites.roas.io → lookup domains table
 *
 * Returns the user_id and optional funnel_id constraint.
 * Results are cached in-memory (10 min for hits, 5 min for misses).
 */
export async function resolveDomain(): Promise<{
  userId: string | null
  funnelId: string | null
  subdomain: string | null
}> {
  const headersList = await headers()
  const host = headersList.get('host') || headersList.get('x-forwarded-host') || ''
  const hostname = host.split(':')[0]

  const cached = domainCache.get(hostname)
  if (cached && Date.now() < cached.expiresAt) {
    return { userId: cached.userId, funnelId: cached.funnelId, subdomain: cached.subdomain }
  }

  const supabase = getServiceClient()
  const candidateHosts = hostname.startsWith('www.') ? [hostname, hostname.slice(4)] : [hostname]

  for (const candidate of candidateHosts) {
    const { data } = await supabase
      .from('domains')
      .select('user_id, funnel_id')
      .eq('domain_name', candidate)
      .eq('status', 'verified')
      .single()

    if (data) {
      const result = { userId: data.user_id, funnelId: data.funnel_id || null, subdomain: null }
      domainCache.set(hostname, { ...result, expiresAt: Date.now() + CACHE_HIT_TTL_MS })
      return result
    }
  }

  if (
    hostname !== BASE_DOMAIN &&
    hostname !== `www.${BASE_DOMAIN}` &&
    hostname.endsWith(`.${BASE_DOMAIN}`)
  ) {
    const subdomain = hostname.replace(`.${BASE_DOMAIN}`, '')

    const { data } = await supabase
      .from('domains')
      .select('user_id, funnel_id')
      .eq('domain_name', hostname)
      .eq('status', 'verified')
      .single()

    if (data) {
      const result = { userId: data.user_id, funnelId: data.funnel_id || null, subdomain }
      domainCache.set(hostname, { ...result, expiresAt: Date.now() + CACHE_HIT_TTL_MS })
      return result
    }
  }

  const miss = { userId: null, funnelId: null, subdomain: null }
  domainCache.set(hostname, { ...miss, expiresAt: Date.now() + CACHE_MISS_TTL_MS })
  return miss
}

/**
 * Resolve a funnel page by slug + page type.
 * If userId is set (from subdomain), constrains to that user's funnels.
 * If not, looks up globally (for sites.roas.io/{slug} direct access).
 */
export async function resolveFunnelPage(
  slug: string,
  pageType: string,
  userId?: string | null,
  funnelIdConstraint?: string | null,
) {
  const supabase = getServiceClient()

  // Build query: find funnel page by slug and type
  let query = supabase
    .from('funnel_pages')
    .select(
      `
      id,
      generated_html,
      generated_css,
      seo,
      page_type,
      path,
      generation_mode,
      source_mode,
      funnels!inner(
        id,
        name,
        title,
        status,
        hide_branding,
        metadata,
        funnel_type,
        layout,
        slug,
        user_id
      )
    `,
    )
    .eq('slug', slug)
    .eq('page_type', pageType)

  const { data, error } = await query.single()

  if (error || !data) return null

  const funnel = (data as any).funnels

  // If userId constraint exists, verify ownership
  if (userId && funnel.user_id !== userId) return null
  if (funnelIdConstraint && funnel.id !== funnelIdConstraint) return null

  // Only show published or draft funnels
  if (funnel.status !== 'published' && funnel.status !== 'draft') return null

  // Get all sibling pages for the navigation map
  const { data: allPages } = await supabase
    .from('funnel_pages')
    .select('id, order_index, page_type, slug, name, path')
    .eq('funnel_id', funnel.id)
    .order('order_index', { ascending: true })

  return {
    page: {
      id: data.id,
      generated_html: data.generated_html,
      generated_css: data.generated_css,
      seo: data.seo,
      page_type: (data as any).page_type,
      path: (data as any).path,
      source_mode: (data as any).source_mode ?? 'tsx',
    },
    funnel: {
      id: funnel.id,
      name: funnel.name,
      title: funnel.title,
      hide_branding: funnel.hide_branding,
      metadata: funnel.metadata ?? null,
      funnel_type: funnel.funnel_type,
      layout: funnel.layout ?? null,
      slug: funnel.slug,
    },
    pageMap: (allPages ?? []).map(
      (p: {
        id: string
        order_index: number
        page_type: string | null
        slug: string | null
        name: string
        path: string | null
      }) => ({
        id: p.id,
        index: p.order_index,
        type: p.page_type,
        slug: p.slug,
        name: p.name,
        path: p.path,
      }),
    ),
  }
}

/**
 * Resolve a funnel page for a specific funnel slug (disambiguates multi-funnel domains).
 * Intended for routes like /f/{funnelSlug}/{pageType}/{pageSlug}.
 */
export async function resolveFunnelPageForFunnelSlug(
  funnelSlug: string,
  pageType: string,
  pageSlug: string,
  userId?: string | null,
  funnelIdConstraint?: string | null,
) {
  const supabase = getServiceClient()

  let funnelQuery = supabase
    .from('funnels')
    .select('id, name, title, status, hide_branding, metadata, slug, user_id, funnel_type, layout')
    .eq('slug', funnelSlug)

  if (userId) funnelQuery = funnelQuery.eq('user_id', userId)

  const { data: funnel, error: funnelError } = await funnelQuery.single()
  if (funnelError || !funnel) return null
  if (funnelIdConstraint && funnel.id !== funnelIdConstraint) return null

  if (funnel.status !== 'published' && funnel.status !== 'draft') return null

  const { data: page, error: pageError } = await supabase
    .from('funnel_pages')
    .select(
      'id, generated_html, generated_css, seo, page_type, generation_mode, slug, path, source_mode',
    )
    .eq('funnel_id', funnel.id)
    .eq('page_type', pageType)
    .eq('slug', pageSlug)
    .single()

  if (pageError || !page) return null

  // Get all sibling pages for the navigation map
  const { data: allPages } = await supabase
    .from('funnel_pages')
    .select('id, order_index, page_type, slug, name, path')
    .eq('funnel_id', funnel.id)
    .order('order_index', { ascending: true })

  return {
    page: {
      id: page.id as string,
      generated_html: page.generated_html,
      generated_css: page.generated_css,
      seo: page.seo,
      page_type: (page as any).page_type,
      path: (page as any).path,
      source_mode: (page as any).source_mode ?? 'tsx',
    },
    funnel: {
      id: funnel.id as string,
      name: funnel.name as string,
      title: funnel.title as string,
      hide_branding: funnel.hide_branding as boolean,
      metadata: (funnel as any).metadata ?? null,
      funnel_type: (funnel as any).funnel_type ?? null,
      layout: (funnel as any).layout ?? null,
      slug: funnel.slug as string,
    },
    pageMap: (allPages ?? []).map(
      (p: {
        id: string
        order_index: number
        page_type: string | null
        slug: string | null
        name: string
        path: string | null
      }) => ({
        id: p.id,
        index: p.order_index,
        type: p.page_type,
        slug: p.slug,
        name: p.name,
        path: p.path,
      }),
    ),
  }
}

/**
 * For direct sites.roas.io/{slug} access (no subdomain),
 * resolve by funnel slug instead of page slug.
 */
export async function resolveFunnelBySlug(
  funnelSlug: string,
  pageType: string,
  userId?: string | null,
  funnelIdConstraint?: string | null,
) {
  const supabase = getServiceClient()

  // Find the funnel by its slug
  let funnelQuery = supabase
    .from('funnels')
    .select(
      'id, name, title, status, hide_branding, metadata, slug, home_page_id, user_id, funnel_type, layout',
    )
    .eq('slug', funnelSlug)
  if (userId) funnelQuery = funnelQuery.eq('user_id', userId)

  const { data: funnel } = await funnelQuery.single()

  if (!funnel) return null
  if (funnelIdConstraint && funnel.id !== funnelIdConstraint) return null
  if (funnel.status !== 'published' && funnel.status !== 'draft') return null

  // Find the page of the given type
  const { data: page } = await supabase
    .from('funnel_pages')
    .select('id, generated_html, generated_css, seo, page_type, path, source_mode')
    .eq('funnel_id', funnel.id)
    .eq('page_type', pageType)
    .order('order_index', { ascending: true })
    .limit(1)
    .single()

  if (!page || (!page.generated_html && (page as any).source_mode !== 'html_bundle')) return null

  // Get all sibling pages for the navigation map
  const { data: allPages } = await supabase
    .from('funnel_pages')
    .select('id, order_index, page_type, slug, name, path')
    .eq('funnel_id', funnel.id)
    .order('order_index', { ascending: true })

  return {
    page,
    funnel: {
      ...funnel,
      metadata: (funnel as any).metadata ?? null,
      funnel_type: (funnel as any).funnel_type ?? null,
      layout: (funnel as any).layout ?? null,
    },
    pageMap: (allPages ?? []).map(
      (p: {
        id: string
        order_index: number
        page_type: string | null
        slug: string | null
        name: string
        path: string | null
      }) => ({
        id: p.id,
        index: p.order_index,
        type: p.page_type,
        slug: p.slug,
        name: p.name,
        path: p.path,
      }),
    ),
  }
}

/**
 * Resolve the default entry page for a funnel slug.
 * - If funnels.home_page_id is set, use it.
 * - Otherwise fall back to the first page by order_index.
 */
export async function resolveFunnelEntryBySlug(
  funnelSlug: string,
  userId?: string | null,
  funnelIdConstraint?: string | null,
) {
  const supabase = getServiceClient()

  let funnelQuery = supabase
    .from('funnels')
    .select(
      'id, name, title, status, hide_branding, metadata, slug, user_id, home_page_id, funnel_type, layout',
    )
    .eq('slug', funnelSlug)
    .eq('status', 'published')
  if (userId) funnelQuery = funnelQuery.eq('user_id', userId)
  const { data: funnel } = await funnelQuery.single()
  if (!funnel) return null
  if (funnelIdConstraint && funnel.id !== funnelIdConstraint) return null
  if (funnel.status !== 'published') return null

  const homePageId = (funnel as any).home_page_id as string | null

  const page = await (async () => {
    if (homePageId) {
      const { data } = await supabase
        .from('funnel_pages')
        .select('id, generated_html, generated_css, seo, page_type, path, source_mode')
        .eq('id', homePageId)
        .eq('funnel_id', funnel.id)
        .single()
      return data ?? null
    }

    const { data } = await supabase
      .from('funnel_pages')
      .select('id, generated_html, generated_css, seo, page_type, path, source_mode')
      .eq('funnel_id', funnel.id)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()
    return data ?? null
  })()

  if (!page || (!page.generated_html && (page as any).source_mode !== 'html_bundle')) return null

  const { data: allPages } = await supabase
    .from('funnel_pages')
    .select('id, order_index, page_type, slug, name, path')
    .eq('funnel_id', funnel.id)
    .order('order_index', { ascending: true })

  return {
    page,
    funnel: {
      id: funnel.id,
      name: funnel.name,
      title: funnel.title,
      hide_branding: funnel.hide_branding,
      metadata: (funnel as any).metadata ?? null,
      funnel_type: (funnel as any).funnel_type ?? null,
      layout: (funnel as any).layout ?? null,
      slug: funnel.slug,
    },
    pageMap: (allPages ?? []).map(
      (p: {
        id: string
        order_index: number
        page_type: string | null
        slug: string | null
        name: string
        path: string | null
      }) => ({
        id: p.id,
        index: p.order_index,
        type: p.page_type,
        slug: p.slug,
        name: p.name,
        path: p.path,
      }),
    ),
  }
}

/**
 * Resolve a page in a funnel by path (website-style routing).
 *
 * Used by routes like:
 * - /{funnelSlug}/{...pathSegments}
 * where path is stored as funnel_pages.path (e.g. '/', '/pricing', '/contact').
 */
export async function resolveFunnelPageForFunnelSlugAndPath(
  funnelSlug: string,
  path: string,
  userId?: string | null,
  funnelIdConstraint?: string | null,
) {
  const supabase = getServiceClient()

  let funnelQuery = supabase
    .from('funnels')
    .select(
      'id, name, title, status, hide_branding, metadata, slug, user_id, home_page_id, funnel_type, layout',
    )
    .eq('slug', funnelSlug)
  if (userId) funnelQuery = funnelQuery.eq('user_id', userId)

  const { data: funnel, error: funnelError } = await funnelQuery.single()
  if (funnelError || !funnel) return null
  if (funnelIdConstraint && funnel.id !== funnelIdConstraint) return null
  if (funnel.status !== 'published' && funnel.status !== 'draft') return null

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const page =
    normalizedPath === '/' || normalizedPath === ''
      ? await (async () => {
          const homePageId = (funnel as any).home_page_id as string | null
          if (!homePageId) return null
          const { data } = await supabase
            .from('funnel_pages')
            .select('id, generated_html, generated_css, seo, page_type, path, source_mode')
            .eq('id', homePageId)
            .eq('funnel_id', funnel.id)
            .single()
          return data ?? null
        })()
      : await (async () => {
          const { data } = await supabase
            .from('funnel_pages')
            .select('id, generated_html, generated_css, seo, page_type, path, source_mode')
            .eq('funnel_id', funnel.id)
            .eq('path', normalizedPath)
            .single()
          if (data) return data

          const segment = normalizedPath.replace(/^\//, '')
          if (!segment) return null

          const { data: byType } = await supabase
            .from('funnel_pages')
            .select('id, generated_html, generated_css, seo, page_type, path, source_mode')
            .eq('funnel_id', funnel.id)
            .eq('page_type', segment)
            .is('path', null)
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle()
          if (byType) return byType

          const { data: bySlug } = await supabase
            .from('funnel_pages')
            .select('id, generated_html, generated_css, seo, page_type, path, source_mode')
            .eq('funnel_id', funnel.id)
            .eq('slug', segment)
            .is('path', null)
            .order('order_index', { ascending: true })
            .limit(1)
            .maybeSingle()
          return bySlug ?? null
        })()

  if (!page || (!page.generated_html && (page as any).source_mode !== 'html_bundle')) return null

  const { data: allPages } = await supabase
    .from('funnel_pages')
    .select('id, order_index, page_type, slug, name, path')
    .eq('funnel_id', funnel.id)
    .order('order_index', { ascending: true })

  return {
    page: {
      id: page.id as string,
      generated_html: (page as any).generated_html,
      generated_css: (page as any).generated_css,
      seo: (page as any).seo,
      page_type: (page as any).page_type,
      path: (page as any).path,
      source_mode: (page as any).source_mode ?? 'tsx',
    },
    funnel: {
      id: funnel.id as string,
      name: funnel.name as string,
      title: funnel.title as string,
      hide_branding: funnel.hide_branding as boolean,
      metadata: (funnel as any).metadata ?? null,
      funnel_type: (funnel as any).funnel_type ?? null,
      layout: (funnel as any).layout ?? null,
      slug: funnel.slug as string,
    },
    pageMap: (allPages ?? []).map(
      (p: {
        id: string
        order_index: number
        page_type: string | null
        slug: string | null
        name: string
        path: string | null
      }) => ({
        id: p.id,
        index: p.order_index,
        type: p.page_type,
        slug: p.slug,
        name: p.name,
        path: p.path,
      }),
    ),
  }
}

export type BlogPostRecord = {
  id: string
  funnel_id: string
  title: string
  slug: string
  content: unknown
  excerpt: string | null
  cover_image: string | null
  author: string | null
  tags: string[]
  seo: Record<string, unknown> | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export async function resolveBlogPostsForFunnel(
  funnelId: string,
  limit = 100,
): Promise<BlogPostRecord[]> {
  if (!funnelId) return []
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      'id, funnel_id, title, slug, content, excerpt, cover_image, author, tags, seo, published_at, created_at, updated_at',
    )
    .eq('funnel_id', funnelId)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data as BlogPostRecord[]
}

export async function resolveBlogPostForFunnelBySlug(
  funnelId: string,
  postSlug: string,
): Promise<BlogPostRecord | null> {
  if (!funnelId || !postSlug) return null
  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select(
      'id, funnel_id, title, slug, content, excerpt, cover_image, author, tags, seo, published_at, created_at, updated_at',
    )
    .eq('funnel_id', funnelId)
    .eq('slug', postSlug)
    .eq('status', 'published')
    .maybeSingle()

  if (error || !data) return null
  return data as BlogPostRecord
}

export async function resolveFunnelTemplatePageByType(
  funnelSlug: string,
  pageType: string,
  userId?: string | null,
  funnelIdConstraint?: string | null,
) {
  const supabase = getServiceClient()
  let funnelQuery = supabase
    .from('funnels')
    .select(
      'id, name, title, status, hide_branding, metadata, slug, user_id, home_page_id, funnel_type, layout',
    )
    .eq('slug', funnelSlug)
  if (userId) funnelQuery = funnelQuery.eq('user_id', userId)

  const { data: funnel, error: funnelError } = await funnelQuery.single()
  if (funnelError || !funnel) return null
  if (funnelIdConstraint && funnel.id !== funnelIdConstraint) return null
  if (funnel.status !== 'published' && funnel.status !== 'draft') return null

  const { data: page } = await supabase
    .from('funnel_pages')
    .select('id, generated_html, generated_css, seo, page_type, path, source_mode')
    .eq('funnel_id', funnel.id)
    .eq('page_type', pageType)
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!page || (!page.generated_html && (page as any).source_mode !== 'html_bundle')) return null

  const { data: allPages } = await supabase
    .from('funnel_pages')
    .select('id, order_index, page_type, slug, name, path')
    .eq('funnel_id', funnel.id)
    .order('order_index', { ascending: true })

  return {
    page,
    funnel: {
      id: funnel.id,
      name: funnel.name,
      title: funnel.title,
      hide_branding: funnel.hide_branding,
      metadata: (funnel as any).metadata ?? null,
      slug: funnel.slug,
      funnel_type: (funnel as any).funnel_type ?? null,
      layout: (funnel as any).layout ?? null,
    },
    pageMap: (allPages ?? []).map(
      (p: {
        id: string
        order_index: number
        page_type: string | null
        slug: string | null
        name: string
        path: string | null
      }) => ({
        id: p.id,
        index: p.order_index,
        type: p.page_type,
        slug: p.slug,
        name: p.name,
        path: p.path,
      }),
    ),
  }
}
