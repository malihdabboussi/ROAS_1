import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 5000
const MAX_CONTEXT_FIELDS = 48
const MAX_KEY_LENGTH = 64
const MAX_STRING_LENGTH = 500

function sanitizeValue(value: unknown): string | number | boolean | null | undefined {
  if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH)
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'boolean') return value
  if (value === null) return null
  return undefined
}

function sanitizePayload(input: unknown): Record<string, string | number | boolean | null> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const out: Record<string, string | number | boolean | null> = {}
  let count = 0
  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (count >= MAX_CONTEXT_FIELDS) break
    const key = rawKey.slice(0, MAX_KEY_LENGTH)
    const value = sanitizeValue(rawValue)
    if (value === undefined) continue
    out[key] = value
    count += 1
  }
  return out
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const payload = sanitizePayload(body)
  console.log(
    `[freeze_debug] ${JSON.stringify({
      user_id: user.id,
      ...payload,
      received_at: Date.now(),
    })}`,
  )

  return new NextResponse(null, { status: 204 })
}
