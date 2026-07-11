import { NextRequest, NextResponse } from 'next/server'
import { reportFunnelsServerError } from '@/lib/observability/server-error-reporter'
import { ROAS_API_URL } from '@/lib/platform-urls'

const BACKEND_URL = process.env.BACKEND_URL || ROAS_API_URL

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Missing token' },
      { status: 400, headers: corsHeaders() },
    )
  }

  try {
    const body = await req.json()
    const res = await fetch(`${BACKEND_URL}/api/public/forms/${encodeURIComponent(token)}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': req.headers.get('x-forwarded-for') ?? '',
        'user-agent': req.headers.get('user-agent') ?? '',
      },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({ ok: false }))
    if (res.status >= 500) {
      reportFunnelsServerError({
        request: req,
        route: '/api/form-submit',
        feature: 'funnels_form_submit',
        error_code: 'FUNNELS_FORM_SUBMIT_BACKEND_FAILED',
        message: `Form submit backend failed with ${res.status}`,
        statusCode: res.status,
        context: { upstream_status: res.status, token_present: true },
      })
    }
    return NextResponse.json(json, { status: res.status, headers: corsHeaders() })
  } catch (err) {
    reportFunnelsServerError({
      request: req,
      route: '/api/form-submit',
      feature: 'funnels_form_submit',
      error_code: 'FUNNELS_FORM_SUBMIT_ROUTE_EXCEPTION',
      error: err,
      statusCode: 500,
      context: { token_present: true },
    })
    return NextResponse.json(
      { ok: false, error: 'Internal error' },
      { status: 500, headers: corsHeaders() },
    )
  }
}
