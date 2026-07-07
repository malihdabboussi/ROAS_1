import { headers } from 'next/headers'
import { reportFunnelsServerError } from './observability/server-error-reporter'
import { getServiceClient } from './supabase'

/**
 * Record a page view server-side.
 *
 * Called from Next.js route handlers BEFORE rendering.
 * Uses a hash of IP + user-agent as a visitor fingerprint.
 * Non-blocking — fires and forgets so it never slows page load.
 */
export function trackPageView(funnelId: string, pageId: string, pageType: string) {
  void recordView(funnelId, pageId, pageType)
}

async function recordView(funnelId: string, pageId: string, pageType: string) {
  try {
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    const userAgent = headersList.get('user-agent') ?? ''
    const referrer = headersList.get('referer') ?? ''
    const requestUrl = headersList.get('x-url') || headersList.get('x-invoke-path') || referrer

    let utmSource: string | null = null
    let utmMedium: string | null = null
    let utmCampaign: string | null = null
    let utmContent: string | null = null
    let utmAdset: string | null = null

    // Parse UTM from the page URL first (landing page has the UTM params from ad clicks)
    try {
      const pageUrl = new URL(requestUrl)
      utmSource = pageUrl.searchParams.get('utm_source')
      utmMedium = pageUrl.searchParams.get('utm_medium')
      utmCampaign = pageUrl.searchParams.get('utm_campaign')
      utmContent = pageUrl.searchParams.get('utm_content')
      utmAdset = pageUrl.searchParams.get('utm_adset')
    } catch {
      // not a valid URL
    }

    // Fallback: parse from referrer if page URL had no UTM
    if (!utmSource && referrer) {
      try {
        const refUrl = new URL(referrer)
        utmSource = refUrl.searchParams.get('utm_source')
        utmMedium = refUrl.searchParams.get('utm_medium')
        utmCampaign = refUrl.searchParams.get('utm_campaign')
        utmContent = refUrl.searchParams.get('utm_content')
        utmAdset = refUrl.searchParams.get('utm_adset')
      } catch {
        // referrer is not a valid URL
      }
    }

    const visitorHash = await hashString(`${ip}|${userAgent}`)

    const supabase = getServiceClient()
    await supabase.rpc('record_page_view_secure', {
      p_funnel_id: funnelId,
      p_funnel_page_id: pageId,
      p_page_type: pageType,
      p_visitor_hash: visitorHash,
      p_ip: ip.substring(0, 45),
      p_user_agent: userAgent.substring(0, 512),
      p_referrer: referrer.substring(0, 2048),
      p_utm_source: utmSource,
      p_utm_medium: utmMedium,
      p_utm_campaign: utmCampaign,
      p_utm_content: utmContent,
      p_utm_adset: utmAdset,
    })
  } catch (err) {
    reportFunnelsServerError({
      route: 'funnel_page_view',
      feature: 'funnels_page_tracking',
      error_code: 'FUNNELS_PAGE_VIEW_RECORD_FAILED',
      error: err,
      statusCode: 500,
      context: { funnel_id: funnelId, page_id: pageId, page_type: pageType },
    })
    console.error('[Tracking] Page view error:', err)
  }
}

async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
