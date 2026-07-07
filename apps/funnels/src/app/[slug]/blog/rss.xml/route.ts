import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

type Params = { params: Promise<{ slug: string }> }

function xmlEscape(value: string): string {
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
    .select('id, name, title, slug, status')
    .eq('slug', slug)
    .in('status', ['draft', 'published'])
    .maybeSingle()

  if (!funnel) return new NextResponse('Not found', { status: 404 })

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('title, slug, excerpt, content, published_at, created_at, updated_at')
    .eq('funnel_id', funnel.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(100)

  const basePath = `/${funnel.slug}`
  const items = (posts ?? [])
    .map((post) => {
      const link = `${basePath}/blog/${post.slug}`
      const pubDate = new Date(post.published_at ?? post.created_at).toUTCString()
      return `<item><title>${xmlEscape(post.title ?? post.slug)}</title><link>${xmlEscape(link)}</link><guid>${xmlEscape(link)}</guid><pubDate>${pubDate}</pubDate><description>${xmlEscape(post.excerpt ?? '')}</description></item>`
    })
    .join('')

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0"><channel><title>${xmlEscape(funnel.title || funnel.name || 'Blog')}</title><link>${xmlEscape(`${basePath}/blog`)}</link><description>${xmlEscape(`${funnel.name} blog feed`)}</description>${items}</channel></rss>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}
