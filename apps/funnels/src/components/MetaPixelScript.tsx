import Script from 'next/script'

/** Meta standard event names for fbq('track', eventName) */
const META_STANDARD_EVENTS = [
  'PageView',
  'ViewContent',
  'Lead',
  'CompleteRegistration',
  'Schedule',
  'Contact',
  'AddToCart',
  'InitiateCheckout',
  'Purchase',
  'Search',
  'Subscribe',
  'StartTrial',
] as const

function isValidEventName(name: string): boolean {
  return (META_STANDARD_EVENTS as readonly string[]).includes(name)
}

export type MetaPixelScriptProps =
  | { pixelId: string; pixelIds?: never; eventName?: string }
  | { pixelIds: string[]; pixelId?: never; eventName?: string }

function normalizePixelId(pixelId: string): string | null {
  const trimmed = String(pixelId).trim()
  if (!/^\d{5,20}$/.test(trimmed)) return null
  return trimmed
}

function normalizePixelIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of ids) {
    const n = normalizePixelId(id)
    if (n && !seen.has(n)) {
      seen.add(n)
      out.push(n)
    }
  }
  return out
}

export function MetaPixelScript({
  pixelId,
  pixelIds,
  eventName,
}: MetaPixelScriptProps) {
  const ids = pixelIds
    ? normalizePixelIds(pixelIds)
    : normalizePixelId(pixelId ?? '')
      ? [normalizePixelId(pixelId!)!]
      : []
  if (ids.length === 0) return null

  const trimmedEvent = typeof eventName === 'string' ? eventName.trim() : ''
  const eventsEnabled = trimmedEvent.length > 0
  const event = eventsEnabled && isValidEventName(trimmedEvent) ? trimmedEvent : ''

  const initScript = ids.map((id) => `fbq('init', ${JSON.stringify(id)});`).join('\n')
  const trackScript = event ? `fbq('track', ${JSON.stringify(event)});` : ''
  const noscriptUrls = event
    ? ids.map(
        (id) => `https://www.facebook.com/tr?id=${id}&ev=${encodeURIComponent(event)}&noscript=1`,
      )
    : []

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          ${initScript}
          ${trackScript}
        `}
      </Script>
      {noscriptUrls.length > 0 ? (
        <noscript>
          {noscriptUrls.map((src) => (
            <img key={src} height="1" width="1" style={{ display: 'none' }} src={src} alt="" />
          ))}
        </noscript>
      ) : null}
    </>
  )
}
