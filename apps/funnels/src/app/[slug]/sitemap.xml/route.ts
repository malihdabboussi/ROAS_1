import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

type Params = { params: Promise<{ slug: string }> }

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params
  const supabase = getServiceClient()

  const { data: funnel } = await supabase
    .from('funnels')
    .select('id, slug, status')
    .eq('slug', slug)
    .in('status', ['draft', 'published'])
    .maybeSingle()

  if (!funnel) {
    return new NextResponse('Not found', { status: 404 })
  }

  const basePath = `/${funnel.slug}`
  const { data: pages } = await supabase
    .from('funnel_pages')
    .select('path, updated_at')
    .eq('funnel_id', funnel.id)
    .order('order_index', { ascending: true })

  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('funnel_id', funnel.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const pageUrls = (pages ?? []).map((page) => ({
    loc: page.path === '/' || !page.path ? basePath : `${basePath}${page.path}`,
    lastmod: page.updated_at ?? null,
  }))
  const blogUrls = (blogPosts ?? []).map((post) => ({
    loc: `${basePath}/blog/${post.slug}`,
    lastmod: post.updated_at ?? null,
  }))

  const allUrls = [...pageUrls, ...blogUrls]
    .filter((entry) => Boolean(entry.loc))
    .map(
      (entry) =>
        `<url><loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `<lastmod>${new Date(entry.lastmod).toISOString()}</lastmod>` : ''}</url>`,
    )
    .join('')

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${allUrls}</urlset>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
