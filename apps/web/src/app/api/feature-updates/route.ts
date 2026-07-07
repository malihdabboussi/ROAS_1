import { NextResponse } from 'next/server'
import type { FeatureUpdate } from '@/features/updates/types'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001'
  const apiResponse = await fetch(new URL('/api/feature-updates', backendUrl), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

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
