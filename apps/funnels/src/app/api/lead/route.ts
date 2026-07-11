import { NextRequest, NextResponse } from 'next/server'
import { reportFunnelsServerError } from '@/lib/observability/server-error-reporter'
import { ROAS_API_URL } from '@/lib/platform-urls'

const BACKEND_URL = process.env.BACKEND_URL || ROAS_API_URL

// ─── Validation helpers ───

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 320 && EMAIL_RE.test(v)
}

function isValidUuid(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  )
}

/** Strip HTML tags + trim + limit length */
function sanitize(v: unknown, maxLen = 500): string | null {
  if (typeof v !== 'string' || !v.trim()) return null
  return v
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLen)
}

// ─── CORS headers (public endpoint, called from public funnel pages) ───

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

// ─── OPTIONS (CORS preflight) ───

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

// ─── POST (lead capture) ───

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // --- Validate email (mandatory, format check) ---
    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or missing email' },
        { status: 400, headers: corsHeaders() },
      )
    }

    // --- Validate funnelId (mandatory, UUID format) ---
    if (!isValidUuid(body.funnelId)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid or missing funnelId' },
        { status: 400, headers: corsHeaders() },
      )
    }

    const normalizedEmail = body.email.trim().toLowerCase()

    // --- Sanitize optional fields ---
    const name = sanitize(body.name, 200)
    const phone = sanitize(body.phone, 30)
    const pageId = sanitize(body.pageId, 100)

    // Extract visitor info
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const userAgent = req.headers.get('user-agent')
    const host = req.headers.get('host')

    const utm =
      body.utm && typeof body.utm === 'object' && !Array.isArray(body.utm)
        ? (body.utm as Record<string, unknown>)
        : null

    const res = await fetch(`${BACKEND_URL}/api/leads/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: normalizedEmail,
        name,
        phone,
        funnelId: body.funnelId,
        pageSlug: pageId,
        sourceDomain: host || null,
        ...(utm ? { utm } : {}),
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      if (res.status >= 500) {
        reportFunnelsServerError({
          request: req,
          route: '/api/lead',
          feature: 'funnels_lead_capture',
          error_code: 'FUNNELS_LEAD_BACKEND_FAILED',
          message: `Lead ingest failed with ${res.status}`,
          statusCode: 500,
          context: {
            upstream_status: res.status,
            upstream_body: text.slice(0, 500),
            funnel_id: body.funnelId,
            page_id: pageId,
            source_domain: host || null,
          },
        })
      }
      console.error('[Lead Capture] Backend error:', res.status, text)
      return NextResponse.json(
        { ok: false, error: 'Capture failed' },
        { status: 500, headers: corsHeaders() },
      )
    }

    return NextResponse.json({ ok: true }, { headers: corsHeaders() })
  } catch (err) {
    reportFunnelsServerError({
      request: req,
      route: '/api/lead',
      feature: 'funnels_lead_capture',
      error_code: 'FUNNELS_LEAD_ROUTE_EXCEPTION',
      error: err,
      statusCode: 500,
    })
    console.error('[Lead Capture] Error:', err)
    return NextResponse.json(
      { ok: false, error: 'Internal error' },
      { status: 500, headers: corsHeaders() },
    )
  }
}
