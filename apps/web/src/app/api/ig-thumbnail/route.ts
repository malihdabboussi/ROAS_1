import type { NextRequest } from 'next/server'
import { GET as socialThumbnailGet } from '../social-thumbnail/route'

export const runtime = 'nodejs'

/**
 * Backward-compat alias for the legacy Instagram-only thumbnail proxy.
 * New callers should hit `/api/social-thumbnail?platform=instagram|tiktok&url=...`.
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.clone()
  if (!next.searchParams.has('platform')) {
    next.searchParams.set('platform', 'instagram')
  }
  return socialThumbnailGet(new Request(next.toString(), request) as unknown as NextRequest)
}
