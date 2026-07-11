import { NextResponse } from 'next/server'
import type { FeatureUpdate } from '@/features/updates/types'
import { createClient } from '@/lib/supabase/server'

const FEATURE_UPDATES_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const guardedPromise = promise.catch(() => null)
  return Promise.race([
    guardedPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

export async function GET() {
  const supabase = await createClient()
  const sessionResult = await withTimeout(supabase.auth.getSession(), FEATURE_UPDATES_TIMEOUT_MS)
  const session = sessionResult?.data?.session ?? null

  if (!session?.access_token) {
    return NextResponse.json({ updates: [] })
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FEATURE_UPDATES_TIMEOUT_MS)
  let apiResponse: Response
  try {
    apiResponse = await fetch(new URL('/api/feature-updates', backendUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch {
    return NextResponse.json({ updates: [] })
  } finally {
    clearTimeout(timeout)
  }

  const payload = (await apiResponse
    .json()
    .catch(() => ({ error: 'Failed to parse feature updates response' }))) as {
    updates?: FeatureUpdate[]
    error?: string
  }

  if (!apiResponse.ok) {
    return NextResponse.json(
      { error: payload.error ?? 'Failed to load feature updates' },
      { status: apiResponse.status },
    )
  }

  return NextResponse.json({ updates: payload.updates ?? [] })
}
