import { NextRequest, NextResponse } from 'next/server'
import { reportWebServerError } from '@/lib/observability/server-error-reporter.server'
import { createClient } from '@/lib/supabase/server'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'
const AGENT_BACKEND_URL = process.env.AGENT_BACKEND_URL ?? 'http://localhost:3003'
const PROFILE_LOOKUP_MAX_WAIT_MS = 10_000
const PROFILE_LOOKUP_BACKOFF_MS = [250, 500, 1000, 2000, 3000, 3000]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function extractErrorMessage(error: unknown): string {
  if (!error) return 'Unknown profile lookup failure'
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (typeof error === 'object') {
    const record = error as Record<string, unknown>
    const message =
      (typeof record.message === 'string' && record.message) ||
      (typeof record.error === 'string' && record.error) ||
      (typeof record.details === 'string' && record.details) ||
      (typeof record.detail === 'string' && record.detail) ||
      null
    if (message) return message
  }
  return String(error)
}

function extractErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const record = error as Record<string, unknown>
  const status = record.status
  if (typeof status === 'number' && Number.isFinite(status)) return status
  if (typeof status === 'string') {
    const parsed = Number(status)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function isRetryableProfileLookupError(error: unknown): boolean {
  const status = extractErrorStatus(error)
  if (status !== null) {
    return status === 408 || status === 429 || status >= 500
  }

  const message = extractErrorMessage(error).toLowerCase()
  if (!message) return false
  return (
    message.includes('fetch failed') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('connection') ||
    message.includes('temporarily unavailable')
  )
}

async function fetchFlyMachineIdWithRetry(accessToken: string): Promise<string | null> {
  const profileUrl = new URL('/api/profile', BACKEND_URL).toString()
  const startedAt = Date.now()
  let attempt = 0
  let lastError: unknown = null

  while (Date.now() - startedAt < PROFILE_LOOKUP_MAX_WAIT_MS) {
    attempt += 1
    try {
      const res = await fetch(profileUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
      })

      if (res.ok) {
        const json = (await res.json()) as { fly_machine_id?: string | null }
        const machineIdRaw =
          typeof json.fly_machine_id === 'string' ? json.fly_machine_id.trim() : ''
        return machineIdRaw.length > 0 ? machineIdRaw : null
      }

      const err = { status: res.status, message: await res.text().catch(() => '') }
      if (!isRetryableProfileLookupError(err)) {
        throw new Error(`Machine profile lookup failed: ${extractErrorMessage(err)}`)
      }
      lastError = err
    } catch (error) {
      if (!isRetryableProfileLookupError(error)) {
        throw new Error(`Machine profile lookup failed: ${extractErrorMessage(error)}`)
      }
      lastError = error
    }

    const delayMs =
      PROFILE_LOOKUP_BACKOFF_MS[Math.min(attempt - 1, PROFILE_LOOKUP_BACKOFF_MS.length - 1)] ?? 250
    const elapsed = Date.now() - startedAt
    if (elapsed + delayMs >= PROFILE_LOOKUP_MAX_WAIT_MS) break
    await delay(delayMs)
  }

  throw new Error(`Machine profile lookup failed after retries: ${extractErrorMessage(lastError)}`)
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let machineId: string | null = null
  try {
    machineId = await fetchFlyMachineIdWithRetry(session.access_token)
  } catch (err) {
    reportWebServerError({
      request,
      route: '/api/chat/browser-media/[filename]',
      feature: 'browser_media',
      error_code: 'BROWSER_MEDIA_PROFILE_LOOKUP_FAILED',
      error: err,
      statusCode: 503,
      context: { filename },
    })
    console.error('[browser-media] Failed to resolve user machine id:', err)
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 })
  }
  if (!machineId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const agentUrl = `${AGENT_BACKEND_URL}/api/chat/browser-media/${encodeURIComponent(filename)}`

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.access_token}`,
      'fly-force-instance-id': machineId,
    }
    const orgId = request.headers.get('x-org-id')
    if (orgId) headers['x-org-id'] = orgId

    const res = await fetch(agentUrl, {
      headers,
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      return new NextResponse(null, { status: res.status })
    }

    const contentType = res.headers.get('content-type') ?? 'image/png'
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err) {
    reportWebServerError({
      request,
      route: '/api/chat/browser-media/[filename]',
      feature: 'browser_media',
      error_code: 'BROWSER_MEDIA_AGENT_FETCH_FAILED',
      error: err,
      statusCode: 502,
      context: { filename, agent_url: agentUrl },
    })
    return NextResponse.json({ error: 'Backend unavailable' }, { status: 502 })
  }
}
