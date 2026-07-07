import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'twitter'

function isAllowedSocialCdnHost(platform: SocialPlatform, hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (platform === 'instagram') {
    return (
      h === 'instagram.com' ||
      h.endsWith('.instagram.com') ||
      h.endsWith('.cdninstagram.com') ||
      h.endsWith('.fbcdn.net')
    )
  }
  if (platform === 'youtube') {
    return (
      h === 'youtube.com' ||
      h.endsWith('.youtube.com') ||
      h === 'i.ytimg.com' ||
      h.endsWith('.ytimg.com') ||
      h === 'img.youtube.com' ||
      h === 'yt3.googleusercontent.com' ||
      h.endsWith('.googleusercontent.com') ||
      h.endsWith('.ggpht.com')
    )
  }
  if (platform === 'twitter') {
    return (
      h === 'twitter.com' ||
      h.endsWith('.twitter.com') ||
      h === 'x.com' ||
      h.endsWith('.x.com') ||
      h === 'pbs.twimg.com' ||
      h === 'video.twimg.com' ||
      h === 'abs.twimg.com' ||
      h === 'ton.twimg.com' ||
      h.endsWith('.twimg.com')
    )
  }
  return (
    h === 'tiktok.com' ||
    h.endsWith('.tiktok.com') ||
    h.endsWith('.tiktokcdn.com') ||
    h.endsWith('.tiktokcdn-us.com') ||
    h.endsWith('.tiktokcdn-eu.com') ||
    h.endsWith('.bytedance.com') ||
    h.endsWith('.bytedanceapi.com') ||
    h.endsWith('.byteoversea.com') ||
    h.endsWith('.muscdn.com')
  )
}

function platformReferer(platform: SocialPlatform): string {
  if (platform === 'instagram') return 'https://www.instagram.com/'
  if (platform === 'youtube') return 'https://www.youtube.com/'
  if (platform === 'twitter') return 'https://x.com/'
  return 'https://www.tiktok.com/'
}

function parsePlatformParam(raw: string | null): SocialPlatform {
  if (raw === 'tiktok') return 'tiktok'
  if (raw === 'youtube') return 'youtube'
  if (raw === 'twitter') return 'twitter'
  return 'instagram'
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  const platform = parsePlatformParam(request.nextUrl.searchParams.get('platform'))

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return NextResponse.json({ error: 'Invalid protocol' }, { status: 400 })
  }

  if (!isAllowedSocialCdnHost(platform, parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: platformReferer(platform),
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(25_000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 })
    }

    const body = res.body
    if (!body) {
      return NextResponse.json({ error: 'Empty body' }, { status: 502 })
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, s-maxage=86400, max-age=3600',
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Fetch failed' },
      { status: 502 },
    )
  }
}
