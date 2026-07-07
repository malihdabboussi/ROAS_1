import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export async function GET(req: NextRequest) {
  try {
    const funnelId = req.nextUrl.searchParams.get('funnel_id') ?? ''
    const slug = req.nextUrl.searchParams.get('slug')
    const limitRaw = req.nextUrl.searchParams.get('limit')
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 100

    if (!funnelId || !isValidUuid(funnelId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or missing funnel_id' },
        { status: 400, headers: corsHeaders() },
      )
    }

    const supabase = getServiceClient()

    if (slug) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(
          'id, funnel_id, title, slug, content, excerpt, cover_image, author, tags, seo, published_at, created_at, updated_at',
        )
        .eq('funnel_id', funnelId)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500, headers: corsHeaders() },
        )
      }

      return NextResponse.json({ ok: true, post: data ?? null }, { headers: corsHeaders() })
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'id, funnel_id, title, slug, content, excerpt, cover_image, author, tags, seo, published_at, created_at, updated_at',
      )
      .eq('funnel_id', funnelId)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? Math.min(limit, 250) : 100)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500, headers: corsHeaders() },
      )
    }

    return NextResponse.json({ ok: true, posts: data ?? [] }, { headers: corsHeaders() })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500, headers: corsHeaders() },
    )
  }
}
