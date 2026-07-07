/**
 * API Proxy Route
 *
 * Proxies all requests from the Next.js frontend to the correct NestJS backend.
 * This avoids mixed-content (HTTPS→HTTP) issues and CORS complexity.
 *
 * Dual-backend routing:
 *   Agent paths (chat/apps/project-files) → User's Fly.io machine (per-user) or fallback AGENT_BACKEND_URL
 *   All other paths                       → BACKEND_URL (Platform on Vercel)
 *
 * Frontend calls: /api/proxy/chat → User's Fly.io machine: /api/chat (with SSE streaming)
 * Frontend calls: /api/proxy/billing/status → Platform Backend: /api/billing/status
 */

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { reportProxyRouteEvent } from '@/lib/observability/request-trace-event.server'
import {
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
} from '@/lib/runtime/machine-profile-env'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001'
const AGENT_BACKEND_URL = process.env.AGENT_BACKEND_URL ?? 'http://localhost:3003'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Path prefixes routed to Agent Backend (user's Fly.io machine) */
const AGENT_PATHS = ['chat', 'apps', 'project-files']

/** Specific sub-paths under other prefixes that route to Agent Backend */
const AGENT_SUBPATHS = ['brain/live-session']

type AgentRuntimeSource = 'fly' | 'shared-railway' | 'fallback-agent'

type AgentRouteTarget = {
  url: string
  machineId: string | null
  source: AgentRuntimeSource
}

/** Cache user runtime info to avoid DB lookup on every request (TTL: 60s) */
const machineCache = new Map<
  string,
  { url: string; machineId: string | null; source: AgentRuntimeSource; expires: number }
>()
const CACHE_TTL_MS = 60_000
const WAKE_TIMEOUT_MS = 285_000
const CHAT_WARMUP_STATUS_INTERVAL_MS = 8_000
const CHAT_WARMUP_STATUS_MESSAGES = [
  'Turning on your agents...',
  'Waking up your workspace...',
  'Getting your agent ready...',
  'Connecting now...',
]
const PROFILE_LOOKUP_MAX_WAIT_MS = 10_000
const PROFILE_LOOKUP_BACKOFF_MS = [250, 500, 1000, 2000, 3000, 3000]
const MACHINE_COLUMNS = resolveMachineProfileColumns(process.env)
const CORRELATION_HEADER_NAMES = [
  'x-vibey-trace-id',
  'x-vibey-message-id',
  'x-vibey-run-id',
  'x-vibey-conversation-id',
]

type AgentRouteProfile = ReturnType<typeof resolveMachineProfileRow>
type MachineWakeRuntimeRequirement = 'chat' | 'work'

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

function decodeJwtSub(token: string): string | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const payloadPart = parts[1]
  if (!payloadPart) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
      sub?: string
    }
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null
  } catch {
    return null
  }
}

function decodeAuthUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  return decodeJwtSub(authHeader.slice(7))
}

function logRuntimeEvent(event: string, fields: Record<string, unknown>): void {
  console.log(`[PROXY] ${event} ${JSON.stringify(fields)}`)
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

async function resolveProfileWithRetry(
  supabase: SupabaseClient,
  userId: string,
): Promise<AgentRouteProfile> {
  const startedAt = Date.now()
  let attempt = 0
  let lastError: unknown = null

  while (Date.now() - startedAt < PROFILE_LOOKUP_MAX_WAIT_MS) {
    attempt += 1
    try {
      // eslint-disable-next-line no-restricted-syntax -- server-side API route, direct Supabase is correct
      const { data, error } = await supabase
        .from('profiles')
        .select(
          [
            MACHINE_COLUMNS.machineId,
            MACHINE_COLUMNS.machineUrl,
            MACHINE_COLUMNS.runtimeApp,
            MACHINE_COLUMNS.runtimeType,
            MACHINE_COLUMNS.runtimeUrl,
          ].join(', '),
        )
        .eq('id', userId)
        .single()

      if (!error && data) {
        return resolveMachineProfileRow(
          data as unknown as Record<string, unknown> | null,
          MACHINE_COLUMNS,
        )
      }

      if (!error && !data) {
        throw new Error('Profile lookup returned empty result')
      }

      if (!isRetryableProfileLookupError(error)) {
        throw new Error(`[PROXY] Agent profile lookup failed: ${extractErrorMessage(error)}`)
      }

      lastError = error
    } catch (error) {
      if (!isRetryableProfileLookupError(error)) {
        const message = extractErrorMessage(error)
        throw new Error(`[PROXY] Agent profile lookup failed: ${message}`)
      }
      lastError = error
    }

    const delayMs =
      PROFILE_LOOKUP_BACKOFF_MS[Math.min(attempt - 1, PROFILE_LOOKUP_BACKOFF_MS.length - 1)] ?? 250
    const elapsed = Date.now() - startedAt
    if (elapsed + delayMs >= PROFILE_LOOKUP_MAX_WAIT_MS) break
    await delay(delayMs)
  }

  throw new Error(
    `[PROXY] Agent profile lookup failed after retries: ${extractErrorMessage(lastError)}`,
  )
}

async function wakeUserMachine(
  authHeader: string,
  requestUrl: string,
  requiredRuntime?: MachineWakeRuntimeRequirement,
  impersonateUserId?: string | null,
): Promise<{ ok: boolean; status: number | null; message: string }> {
  try {
    const res = await fetch(new URL('/api/proxy/machines/ensure-running', requestUrl).toString(), {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        ...(impersonateUserId ? { 'x-impersonate-user-id': impersonateUserId } : {}),
      },
      body: requiredRuntime ? JSON.stringify({ required_runtime: requiredRuntime }) : undefined,
      signal: AbortSignal.timeout(WAKE_TIMEOUT_MS),
    })
    if (res.ok) return { ok: true, status: res.status, message: '' }
    const body = await res.text().catch(() => '')
    return {
      ok: false,
      status: res.status,
      message: body.slice(0, 500) || `Machine wake failed with ${res.status}`,
    }
  } catch (err) {
    console.error('[PROXY] Machine wake failed:', err)
    return {
      ok: false,
      status: null,
      message: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Resolves which agent-api machine to route this request to.
 *
 * Rule: once a user has a `fly_machine_id`, we ALWAYS pin traffic to that specific
 * machine via `fly-force-instance-id`. Never fall back to the app-level URL with
 * no pin — Fly would then pick any running machine (pool machine with no files,
 * or worse, another user's machine → cross-tenant data leak).
 *
 * The wake attempt (`wakeUserMachine` → `/api/proxy/machines/ensure-running`)
 * is the backend's job to get the machine ready. Chat blocks on this inside
 * an SSE warm-up stream; other agent routes still pin to the user's own
 * machine and let their retry loop handle transient failures.
 *
 * Only users with no `fly_machine_id` at all (brand-new, unprovisioned)
 * fall back to AGENT_BACKEND_URL without a pin. That path is used exclusively
 * for the provisioning flow.
 *
 * Status columns (`fly_machine_status`, `fly_runtime_status`) are NOT read
 * here. They are informational-only mirrors that drift from reality; the
 * authoritative check lives in the backend's `ensureRunning` (which calls
 * Fly's API and /api/ready directly).
 */
/**
 * Resolves the impersonation target's machine profile via the platform
 * backend (superadmin-only endpoint, allowlist enforced server-side). The
 * proxy itself only has the anon key, and profiles RLS hides other users'
 * machine rows from the superadmin's JWT.
 */
async function resolveImpersonatedProfile(
  authHeader: string,
  impersonateUserId: string,
): Promise<AgentRouteProfile> {
  const url = new URL(`/api/admin/impersonation/machine-target/${impersonateUserId}`, BACKEND_URL)
  const res = await fetch(url.toString(), {
    headers: { Authorization: authHeader },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `[PROXY] Impersonation machine lookup failed (${res.status}): ${body.slice(0, 300)}`,
    )
  }
  return (await res.json()) as AgentRouteProfile
}

async function resolveAgentInfo(
  authHeader: string | null,
  forceRefresh = false,
  requestUrl?: string,
  requiredRuntime?: MachineWakeRuntimeRequirement,
  impersonateUserId: string | null = null,
): Promise<AgentRouteTarget> {
  if (AGENT_BACKEND_URL.includes('localhost') || AGENT_BACKEND_URL.includes('127.0.0.1')) {
    return { url: AGENT_BACKEND_URL, machineId: null, source: 'fallback-agent' }
  }

  if (!SUPABASE_ANON_KEY || !authHeader?.startsWith('Bearer ')) {
    return { url: AGENT_BACKEND_URL, machineId: null, source: 'fallback-agent' }
  }

  const token = authHeader.slice(7)
  const cacheKey = impersonateUserId ? `${token}:${impersonateUserId}` : token

  const cached = machineCache.get(cacheKey)
  if (!forceRefresh && cached && cached.expires > Date.now()) {
    return { url: cached.url, machineId: cached.machineId, source: cached.source }
  }
  if (forceRefresh && cached) {
    machineCache.delete(cacheKey)
  }

  const realUserId = decodeJwtSub(token)
  if (!realUserId) {
    return { url: AGENT_BACKEND_URL, machineId: null, source: 'fallback-agent' }
  }
  const userId = impersonateUserId ?? realUserId

  let profile: AgentRouteProfile
  if (impersonateUserId) {
    profile = await resolveImpersonatedProfile(authHeader, impersonateUserId)
  } else {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    profile = await resolveProfileWithRetry(supabase, userId)
  }

  if (profile?.runtimeType === 'shared_railway') {
    if (profile.runtimeUrl) {
      machineCache.set(cacheKey, {
        url: profile.runtimeUrl,
        machineId: null,
        source: 'shared-railway',
        expires: Date.now() + CACHE_TTL_MS,
      })
      logRuntimeEvent('runtime_target_selected', {
        userId,
        source: 'shared-railway',
        machineId: null,
      })
      return { url: profile.runtimeUrl, machineId: null, source: 'shared-railway' }
    }
    console.warn(
      '[PROXY] shared_railway runtime selected without agent_runtime_url; falling back to Fly',
    )
  }

  const machineId = profile?.machineId ?? null
  if (!machineId) {
    // No machine assigned yet — provisioning path. Fallback URL is fine here
    // because the request will trigger provision which creates a dedicated machine.
    logRuntimeEvent('runtime_target_selected', {
      userId,
      source: 'fallback-agent',
      machineId: null,
    })
    return { url: AGENT_BACKEND_URL, machineId: null, source: 'fallback-agent' }
  }

  const runtimeApp = profile?.runtimeApp ?? 'vibey-runtimes'
  const machineUrl = profile?.machineUrl ?? `https://${runtimeApp}.fly.dev`

  // Wake asks backend to check Fly state + poll /api/ready. If wake fails,
  // do not forward user work to the pinned runtime; it is not usable yet.
  if (requestUrl) {
    const wake = await wakeUserMachine(authHeader, requestUrl, requiredRuntime, impersonateUserId)
    if (!wake.ok) {
      const detail = wake.status ? `status=${wake.status} ${wake.message}` : wake.message
      throw new Error(`[PROXY] Machine wake failed for ${machineId}: ${detail}`)
    }
  }

  const source: AgentRuntimeSource = 'fly'
  machineCache.set(cacheKey, {
    url: machineUrl,
    machineId,
    source,
    expires: Date.now() + CACHE_TTL_MS,
  })
  logRuntimeEvent('runtime_target_selected', { userId, source, machineId })
  return { url: machineUrl, machineId, source }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes — chat SSE streams can take time (rate limit retries)

const COLD_START_RETRY_DELAYS_MS = [0, 1000, 2000, 4000, 8000, 16000]

function isRetryableAgentStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

function isLocalHostUrl(url: URL): boolean {
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
}

function isConnectionRefusedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as Record<string, unknown>
  const cause = record.cause
  if (cause && typeof cause === 'object') {
    const causeRecord = cause as Record<string, unknown>
    if (causeRecord.code === 'ECONNREFUSED') return true
  }
  const message = String(record.message ?? '')
  return message.includes('ECONNREFUSED')
}

function createSseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  }
}

function readRequestHeader(request: NextRequest, name: string): string | null {
  const value = request.headers.get(name)
  return value && value.trim().length > 0 ? value.trim() : null
}

function applyCorrelationHeaders(
  request: NextRequest,
  headers: Headers,
  requestId: string,
  proxySpanId: string,
): void {
  for (const name of CORRELATION_HEADER_NAMES) {
    const value = readRequestHeader(request, name)
    if (value) headers.set(name, value)
  }
  headers.set('x-vibey-request-id', requestId)
  headers.set('x-vibey-parent-span-id', proxySpanId)
  headers.delete('x-vibey-span-id')
}

function withProxyResponseHeaders(
  headers: Record<string, string>,
  requestId: string,
  proxySpanId: string,
): Record<string, string> {
  return {
    ...headers,
    'x-vibey-request-id': requestId,
    'x-vibey-span-id': proxySpanId,
  }
}

function encodeSseEvent(encoder: TextEncoder, event: Record<string, unknown>): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

function appendSearchParams(target: URL, source: NextRequest): void {
  source.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value)
  })
}

function copyAgentHeaders(baseHeaders: Headers, machineId: string | null): Headers {
  const headers = new Headers(baseHeaders)
  if (machineId) headers.set('fly-force-instance-id', machineId)
  else headers.delete('fly-force-instance-id')
  return headers
}

function applyRuntimeHeader(
  headers: Record<string, string>,
  source: AgentRuntimeSource | null,
): Record<string, string> {
  if (source) headers['x-vibey-agent-runtime'] = source
  return headers
}

function requiredRuntimeForAgentPath(backendPath: string): MachineWakeRuntimeRequirement {
  return backendPath === '/api/chat' || backendPath.startsWith('/api/chat/') ? 'chat' : 'work'
}

function runtimeFetchEventPrefix(source: AgentRuntimeSource): string | null {
  if (source === 'shared-railway') return 'shared'
  return null
}

async function readUpstreamChatErrorMessage(response: Response): Promise<string | null> {
  try {
    const text = (await response.text()).trim()
    if (!text) return null
    try {
      const parsed = JSON.parse(text) as { error?: string; message?: string }
      return parsed.error ?? parsed.message ?? text.slice(0, 300)
    } catch {
      return text.slice(0, 300)
    }
  } catch {
    return null
  }
}

function resolveUpstreamChatErrorEvent(
  status: number,
  bodyMessage: string | null,
): { code: string; message: string; retryable: boolean } {
  if (status === 409) {
    return {
      code: 'busy',
      message:
        bodyMessage ?? 'A generation is already in progress. Please wait for it to complete.',
      retryable: true,
    }
  }
  if (status === 404) {
    return {
      code: 'generic',
      message: bodyMessage ?? 'Conversation not found',
      retryable: false,
    }
  }
  return {
    code: 'temporary_unavailable',
    message:
      bodyMessage ?? "I couldn't get your agent ready yet. Give it another shot in a moment.",
    retryable: status === 502 || status === 503 || status === 504,
  }
}

function proxyChatWithWarmup(params: {
  request: NextRequest
  backendPath: string
  authHeader: string | null
  baseHeaders: Headers
  baseFetchOptions: RequestInit
  impersonateUserId: string | null
  requestId: string
  proxySpanId: string
  parentSpanId: string | null
}): Response {
  const {
    request,
    backendPath,
    authHeader,
    baseHeaders,
    baseFetchOptions,
    impersonateUserId,
    requestId,
    proxySpanId,
    parentSpanId,
  } = params
  const encoder = new TextEncoder()
  const userId = decodeAuthUserId(authHeader)
  const streamStartedAt = Date.now()
  let upstreamReader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let statusInterval: ReturnType<typeof setInterval> | null = null
  let isClosed = false
  let upstreamStreamStarted = false
  let statusIndex = 0

  const enqueue = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: Record<string, unknown>,
  ) => {
    if (isClosed) return
    controller.enqueue(encodeSseEvent(encoder, event))
  }
  const enqueueStatus = (controller: ReadableStreamDefaultController<Uint8Array>) => {
    const message =
      CHAT_WARMUP_STATUS_MESSAGES[statusIndex % CHAT_WARMUP_STATUS_MESSAGES.length] ??
      'Turning on your agents...'
    enqueue(controller, { type: 'status', phase: 'thinking', message })
    statusIndex += 1
  }
  const clearStatusInterval = () => {
    if (statusInterval) clearInterval(statusInterval)
    statusInterval = null
  }
  const reportWarmupEvent = (
    event_type: string,
    stage: string,
    fields: Partial<Parameters<typeof reportProxyRouteEvent>[0]> = {},
  ) => {
    reportProxyRouteEvent({
      request_id: requestId,
      user_id: userId,
      surface: 'web',
      service: 'next-proxy',
      route: backendPath,
      method: request.method,
      event_type,
      stage,
      span_id: proxySpanId,
      parent_span_id: parentSpanId,
      ...fields,
    })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        enqueueStatus(controller)
        statusInterval = setInterval(
          () => enqueueStatus(controller),
          CHAT_WARMUP_STATUS_INTERVAL_MS,
        )

        const fetchChatUpstream = async (agentInfo: AgentRouteTarget): Promise<Response | null> => {
          if (isClosed || request.signal.aborted) return null
          const targetUrl = agentInfo.url
          const url = new URL(backendPath, targetUrl)
          appendSearchParams(url, request)
          const headers = copyAgentHeaders(baseHeaders, agentInfo.machineId)
          const eventPrefix = runtimeFetchEventPrefix(agentInfo.source)

          let backendRes: Response | null = null
          for (let attempt = 0; attempt < COLD_START_RETRY_DELAYS_MS.length; attempt++) {
            if (attempt > 0) {
              const delayMs = COLD_START_RETRY_DELAYS_MS[attempt] ?? 1000
              await delay(delayMs)
              enqueueStatus(controller)
            }
            const fetchStartedAt = Date.now()
            reportWarmupEvent('external_call', 'start', {
              status: 'attempting',
              observability: { attempt: attempt + 1, runtime_source: agentInfo.source },
            })
            if (eventPrefix) {
              logRuntimeEvent(`${eventPrefix}_fetch_start`, {
                userId,
                path: backendPath,
                attempt: attempt + 1,
              })
            }
            backendRes = await fetch(url.toString(), {
              ...baseFetchOptions,
              headers,
              signal: request.signal,
            }).catch((err) => {
              reportWarmupEvent('external_call', 'upstream_failure', {
                status: 'error',
                duration_ms: Date.now() - fetchStartedAt,
                error_code: 'PROXY_FETCH_FAILED',
                observability: {
                  attempt: attempt + 1,
                  runtime_source: agentInfo.source,
                  error: err instanceof Error ? err.message : String(err),
                },
              })
              if (eventPrefix) {
                logRuntimeEvent(`${eventPrefix}_fetch_failed`, {
                  userId,
                  path: backendPath,
                  attempt: attempt + 1,
                  durationMs: Date.now() - fetchStartedAt,
                  error: err instanceof Error ? err.message : String(err),
                })
              }
              console.warn(
                `Proxy warm-up fetch retry ${attempt + 1} failed for ${backendPath}:`,
                err,
              )
              return null
            })
            if (!backendRes) {
              if (agentInfo.source === 'shared-railway') break
              continue
            }
            if (eventPrefix) {
              logRuntimeEvent(`${eventPrefix}_response_headers`, {
                userId,
                path: backendPath,
                attempt: attempt + 1,
                status: backendRes.status,
                durationMs: Date.now() - fetchStartedAt,
              })
            }
            reportWarmupEvent('external_call', 'response_headers', {
              status: backendRes.ok ? 'ok' : 'warn',
              status_code: backendRes.status,
              duration_ms: Date.now() - fetchStartedAt,
              observability: { attempt: attempt + 1, runtime_source: agentInfo.source },
            })
            if (backendRes.status === 402) break
            const retryContentType = backendRes.headers.get('content-type') ?? ''
            if (backendRes.ok && retryContentType.includes('text/event-stream')) break
            if (
              agentInfo.source === 'shared-railway' &&
              isRetryableAgentStatus(backendRes.status)
            ) {
              break
            }
            if (!isRetryableAgentStatus(backendRes.status)) break
          }
          return backendRes
        }

        let agentInfo = await resolveAgentInfo(
          authHeader,
          true,
          request.url,
          'chat',
          impersonateUserId,
        )
        enqueue(controller, {
          type: 'status',
          phase: 'thinking',
          message: 'Agents are ready. Connecting now...',
        })

        let backendRes = await fetchChatUpstream(agentInfo)
        if (!backendRes) {
          enqueue(controller, {
            type: 'error',
            code: 'MACHINE_CHAT_UNAVAILABLE',
            phase: 'thinking',
            retryable: true,
            message: "I couldn't get your agent ready yet. Give it another shot in a moment.",
          })
          return
        }
        if (isClosed || request.signal.aborted) return
        clearStatusInterval()

        if (backendRes.status === 402) {
          enqueue(controller, { type: 'credits_exhausted' })
          return
        }

        const contentType = backendRes.headers.get('content-type') ?? ''
        if (!backendRes.ok || !contentType.includes('text/event-stream')) {
          const bodyMessage = await readUpstreamChatErrorMessage(backendRes)
          const resolved = resolveUpstreamChatErrorEvent(backendRes.status, bodyMessage)
          enqueue(controller, {
            type: 'error',
            code: resolved.code,
            phase: 'thinking',
            retryable: resolved.retryable,
            message: resolved.message,
          })
          return
        }

        if (!backendRes.body) {
          enqueue(controller, {
            type: 'error',
            code: 'MACHINE_CHAT_EMPTY_STREAM',
            phase: 'thinking',
            retryable: true,
            message: "I couldn't get your agent ready yet. Give it another shot in a moment.",
          })
          return
        }

        upstreamReader = backendRes.body.getReader()
        const streamEventPrefix = runtimeFetchEventPrefix(agentInfo.source)
        let firstChunkLogged = false
        for (;;) {
          const { done, value } = await upstreamReader.read()
          if (done) break
          if (value && !isClosed) {
            upstreamStreamStarted = true
            if (!firstChunkLogged) {
              reportWarmupEvent('stream_event', 'first_chunk', {
                status: 'ok',
                duration_ms: Date.now() - streamStartedAt,
                observability: { runtime_source: agentInfo.source },
              })
              if (streamEventPrefix) {
                logRuntimeEvent(`${streamEventPrefix}_first_upstream_chunk`, {
                  userId,
                  path: backendPath,
                  durationMs: Date.now() - streamStartedAt,
                })
              }
              firstChunkLogged = true
            }
            controller.enqueue(value)
          }
        }
        reportWarmupEvent('stream_event', 'complete', {
          status: 'ok',
          duration_ms: Date.now() - streamStartedAt,
          observability: { runtime_source: agentInfo.source },
        })
        if (streamEventPrefix) {
          logRuntimeEvent(`${streamEventPrefix}_stream_complete`, {
            userId,
            path: backendPath,
            durationMs: Date.now() - streamStartedAt,
          })
        }
      } catch (err) {
        if (!request.signal.aborted) {
          reportWarmupEvent('stream_event', 'interrupted', {
            status: 'error',
            duration_ms: Date.now() - streamStartedAt,
            error_code: upstreamStreamStarted ? 'STREAM_INTERRUPTED' : 'MACHINE_WARMUP_FAILED',
            observability: { error: err instanceof Error ? err.message : String(err) },
          })
          console.error(`Proxy warm-up error for ${backendPath}:`, err)
          if (upstreamStreamStarted) {
            enqueue(controller, {
              type: 'error',
              code: 'stream_interrupted',
              retryable: true,
              recoverable: true,
              message: 'The connection dropped. I am reconnecting now.',
            })
          } else {
            enqueue(controller, {
              type: 'error',
              code: 'MACHINE_WARMUP_FAILED',
              phase: 'thinking',
              retryable: true,
              message: "I couldn't get your agent ready yet. Give it another shot in a moment.",
            })
          }
        }
      } finally {
        clearStatusInterval()
        upstreamReader?.releaseLock()
        isClosed = true
        try {
          controller.close()
        } catch {
          // stream already closed
        }
      }
    },
    cancel() {
      isClosed = true
      clearStatusInterval()
      void upstreamReader?.cancel().catch(() => {})
    },
  })

  return new Response(stream, {
    status: 200,
    headers: withProxyResponseHeaders(createSseHeaders(), requestId, proxySpanId),
  })
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params
  const backendPath = `/api/${path.join('/')}`
  const requestId = readRequestHeader(request, 'x-vibey-request-id') ?? randomUUID()
  const parentSpanId =
    readRequestHeader(request, 'x-vibey-parent-span-id') ??
    readRequestHeader(request, 'x-vibey-span-id')
  const proxySpanId = randomUUID()

  // Route to Agent Backend if path starts with an agent prefix
  const firstSegment = path[0] ?? ''
  const subPath = path.slice(0, 2).join('/')
  const isAgentPath = AGENT_PATHS.includes(firstSegment) || AGENT_SUBPATHS.includes(subPath)

  const authHeader = request.headers.get('authorization')
  const runtimeLogUserId = decodeAuthUserId(authHeader)

  // Forward static headers (especially Authorization + org context)
  const baseHeaders = new Headers()
  if (authHeader) baseHeaders.set('Authorization', authHeader)
  applyCorrelationHeaders(request, baseHeaders, requestId, proxySpanId)
  const orgIdHeader = request.headers.get('x-org-id')
  if (orgIdHeader) baseHeaders.set('x-org-id', orgIdHeader)
  // Superadmin impersonation context — forwarded everywhere except the
  // impersonation control endpoints (those run as the superadmin's real
  // identity). Agent paths also resolve the machine of the impersonated user.
  const rawImpersonateHeader = request.headers.get('x-impersonate-user-id')
  const impersonateUserId =
    rawImpersonateHeader && !backendPath.startsWith('/api/admin/impersonation')
      ? rawImpersonateHeader
      : null
  if (impersonateUserId) {
    baseHeaders.set('x-impersonate-user-id', impersonateUserId)
  }
  // Forward refresh token for agent routes, Telegram connect, and Slack install/channel-map (used to persist user refresh token).
  const needsRefreshToken =
    isAgentPath ||
    backendPath === '/api/mcp/oauth/consent' ||
    backendPath === '/api/telegram/connect' ||
    backendPath === '/api/slack/install' ||
    backendPath === '/api/slack/channel-map'
  if (needsRefreshToken) {
    const refreshToken = request.headers.get('x-supabase-refresh-token')
    if (refreshToken) baseHeaders.set('x-supabase-refresh-token', refreshToken)
  }
  // SSE streams are commonly buffered by compression layers; disable compression for agent paths.
  // This ensures tool/status/content events arrive incrementally.
  if (isAgentPath && (firstSegment === 'chat' || firstSegment === 'apps')) {
    baseHeaders.set('Accept-Encoding', 'identity')
    if (firstSegment === 'chat') {
      baseHeaders.set('Accept', 'text/event-stream')
    }
  }
  baseHeaders.set('Content-Type', request.headers.get('content-type') ?? 'application/json')

  // Build fetch options
  const baseFetchOptions: RequestInit = {
    method: request.method,
    signal: request.signal,
    redirect: 'manual',
  }

  // Forward body for non-GET requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    baseFetchOptions.body = Buffer['from'](await request.arrayBuffer())
  }

  const isLongRunning =
    backendPath === '/api/integrations/capabilities/sync' ||
    /\/api\/sandboxes\/[^/]+\/ensure-running$/.test(backendPath)
  const shouldRetryColdStart = isAgentPath
  const maxAttempts = shouldRetryColdStart ? COLD_START_RETRY_DELAYS_MS.length : 1
  const shouldWarmChatBeforeProxying = backendPath === '/api/chat' && request.method === 'POST'

  if (shouldWarmChatBeforeProxying) {
    return proxyChatWithWarmup({
      request,
      backendPath,
      authHeader,
      baseHeaders,
      baseFetchOptions,
      impersonateUserId,
      requestId,
      proxySpanId,
      parentSpanId,
    })
  }

  const reportProxyEvent = (
    event_type: string,
    stage: string,
    fields: Partial<Parameters<typeof reportProxyRouteEvent>[0]> = {},
  ) => {
    reportProxyRouteEvent({
      request_id: requestId,
      user_id: runtimeLogUserId,
      surface: 'web',
      service: 'next-proxy',
      route: backendPath,
      method: request.method,
      event_type,
      stage,
      span_id: proxySpanId,
      parent_span_id: parentSpanId,
      ...fields,
    })
  }

  try {
    let backendRes: Response | null = null
    let url = new URL(backendPath, BACKEND_URL)
    let runtimeSource: AgentRuntimeSource | null = null
    let runtimeRequestStartedAt = Date.now()
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const agentInfo = isAgentPath
        ? await resolveAgentInfo(
            authHeader,
            attempt > 0,
            request.url,
            requiredRuntimeForAgentPath(backendPath),
            impersonateUserId,
          )
        : null
      runtimeSource = agentInfo?.source ?? null
      const targetUrl = agentInfo?.url ?? BACKEND_URL
      url = new URL(backendPath, targetUrl)
      appendSearchParams(url, request)

      const headers = copyAgentHeaders(baseHeaders, agentInfo?.machineId ?? null)
      const eventPrefix = agentInfo ? runtimeFetchEventPrefix(agentInfo.source) : null

      const fetchOptions: RequestInit = {
        ...baseFetchOptions,
        headers,
        signal: isLongRunning ? AbortSignal.timeout(10 * 60 * 1000) : request.signal,
      }

      console.log(
        `[PROXY] ${request.method} ${backendPath} → ${url.toString()} (target: ${runtimeSource ?? (targetUrl === AGENT_BACKEND_URL ? 'AGENT' : 'PLATFORM')}, attempt: ${attempt + 1}/${maxAttempts})`,
      )

      runtimeRequestStartedAt = Date.now()
      reportProxyEvent('external_call', 'start', {
        status: 'attempting',
        observability: { attempt: attempt + 1, runtime_source: runtimeSource },
      })
      if (eventPrefix) {
        logRuntimeEvent(`${eventPrefix}_fetch_start`, {
          userId: runtimeLogUserId,
          path: backendPath,
          attempt: attempt + 1,
        })
      }

      try {
        backendRes = await fetch(url.toString(), fetchOptions)
      } catch (err) {
        reportProxyEvent('external_call', 'upstream_failure', {
          status: 'error',
          duration_ms: Date.now() - runtimeRequestStartedAt,
          error_code: 'PROXY_FETCH_FAILED',
          observability: {
            attempt: attempt + 1,
            runtime_source: runtimeSource,
            error: err instanceof Error ? err.message : String(err),
          },
        })
        if (eventPrefix) {
          logRuntimeEvent(`${eventPrefix}_fetch_failed`, {
            userId: runtimeLogUserId,
            path: backendPath,
            attempt: attempt + 1,
            durationMs: Date.now() - runtimeRequestStartedAt,
            error: err instanceof Error ? err.message : String(err),
          })
        }
        const shouldFailFastLocalAgent =
          shouldRetryColdStart && isLocalHostUrl(url) && isConnectionRefusedError(err)
        if (shouldFailFastLocalAgent) {
          throw err
        }
        if (attempt < maxAttempts - 1) {
          const delayMs = COLD_START_RETRY_DELAYS_MS[attempt + 1] ?? 1000
          await delay(delayMs)
          continue
        }
        throw err
      }

      if (eventPrefix) {
        logRuntimeEvent(`${eventPrefix}_response_headers`, {
          userId: runtimeLogUserId,
          path: backendPath,
          attempt: attempt + 1,
          status: backendRes.status,
          durationMs: Date.now() - runtimeRequestStartedAt,
        })
      }
      reportProxyEvent('external_call', 'response_headers', {
        status: backendRes.ok ? 'ok' : 'warn',
        status_code: backendRes.status,
        duration_ms: Date.now() - runtimeRequestStartedAt,
        observability: { attempt: attempt + 1, runtime_source: runtimeSource },
      })

      if (
        backendRes &&
        shouldRetryColdStart &&
        isRetryableAgentStatus(backendRes.status) &&
        attempt < maxAttempts - 1
      ) {
        if (agentInfo?.source === 'shared-railway') {
          if (backendRes.body) await backendRes.body.cancel().catch(() => {})
        }
        const delayMs = COLD_START_RETRY_DELAYS_MS[attempt + 1] ?? 1000
        await delay(delayMs)
        continue
      }

      break
    }

    if (!backendRes) {
      throw new Error('Backend unavailable after retries')
    }

    console.log(`[PROXY] ${backendPath} → ${backendRes.status} ${backendRes.statusText}`)

    // Check if this is an SSE stream
    const contentType = backendRes.headers.get('content-type') ?? ''
    if (contentType.includes('text/event-stream')) {
      // Stream SSE responses through — forward credit warning headers
      const sseHeaders = createSseHeaders()
      const creditsLow = backendRes.headers.get('x-credits-low')
      const creditsRemaining = backendRes.headers.get('x-credits-remaining')
      if (creditsLow) sseHeaders['x-credits-low'] = creditsLow
      if (creditsRemaining) sseHeaders['x-credits-remaining'] = creditsRemaining

      const stream = backendRes.body
      if (!stream) {
        return new Response(null, {
          status: backendRes.status,
          headers: withProxyResponseHeaders(sseHeaders, requestId, proxySpanId),
        })
      }
      const reader = stream.getReader()
      const encoder = new TextEncoder()
      const streamEventPrefix = runtimeSource ? runtimeFetchEventPrefix(runtimeSource) : null
      let firstChunkLogged = false
      const relayed = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            for (;;) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) {
                if (!firstChunkLogged) {
                  reportProxyEvent('stream_event', 'first_chunk', {
                    status: 'ok',
                    duration_ms: Date.now() - runtimeRequestStartedAt,
                    observability: { runtime_source: runtimeSource },
                  })
                  if (streamEventPrefix) {
                    logRuntimeEvent(`${streamEventPrefix}_first_upstream_chunk`, {
                      userId: runtimeLogUserId,
                      path: backendPath,
                      durationMs: Date.now() - runtimeRequestStartedAt,
                    })
                  }
                  firstChunkLogged = true
                }
                controller.enqueue(value)
              }
            }
          } catch (err) {
            reportProxyEvent('stream_event', 'interrupted', {
              status: 'error',
              duration_ms: Date.now() - runtimeRequestStartedAt,
              error_code: 'STREAM_INTERRUPTED',
              observability: { error: err instanceof Error ? err.message : String(err) },
            })
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', code: 'stream_interrupted', retryable: true, recoverable: true, message: 'The connection dropped. I am reconnecting now.' })}\n\n`,
              ),
            )
          } finally {
            reportProxyEvent('stream_event', 'complete', {
              status: 'ok',
              duration_ms: Date.now() - runtimeRequestStartedAt,
              observability: { runtime_source: runtimeSource },
            })
            if (streamEventPrefix) {
              logRuntimeEvent(`${streamEventPrefix}_stream_complete`, {
                userId: runtimeLogUserId,
                path: backendPath,
                durationMs: Date.now() - runtimeRequestStartedAt,
              })
            }
            try {
              controller.close()
            } catch {
              // stream already closed
            }
            reader.releaseLock()
          }
        },
        cancel() {
          void reader.cancel().catch(() => {})
        },
      })

      return new Response(relayed, {
        status: backendRes.status,
        headers: withProxyResponseHeaders(sseHeaders, requestId, proxySpanId),
      })
    }

    // 204 No Content — pass through without body (NextResponse rejects body on 204)
    if (backendRes.status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: applyRuntimeHeader(
          withProxyResponseHeaders(
            { 'Cache-Control': 'no-store, max-age=0' },
            requestId,
            proxySpanId,
          ),
          runtimeSource,
        ),
      })
    }

    // Redirect responses (3xx) must preserve Location instead of auto-following.
    // This is required for callback bridges that redirect browser back to app routes.
    if (backendRes.status >= 300 && backendRes.status < 400) {
      const location = backendRes.headers.get('location')
      if (location) {
        return new NextResponse(null, {
          status: backendRes.status,
          headers: applyRuntimeHeader(
            withProxyResponseHeaders(
              {
                Location: location,
                'Cache-Control': 'no-store, max-age=0',
              },
              requestId,
              proxySpanId,
            ),
            runtimeSource,
          ),
        })
      }
    }

    // Binary/file responses — stream through without converting to text
    if (
      contentType.includes('application/pdf') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('image/') ||
      contentType.includes('video/') ||
      contentType.includes('audio/') ||
      contentType.includes('application/zip') ||
      contentType.includes('application/vnd.') ||
      contentType.includes('text/csv')
    ) {
      const resHeaders: Record<string, string> = { 'Content-Type': contentType }
      const disposition = backendRes.headers.get('content-disposition')
      if (disposition) resHeaders['Content-Disposition'] = disposition
      resHeaders['Cache-Control'] = 'no-store, max-age=0'
      Object.assign(resHeaders, withProxyResponseHeaders({}, requestId, proxySpanId))
      applyRuntimeHeader(resHeaders, runtimeSource)
      return new Response(backendRes.body, { status: backendRes.status, headers: resHeaders })
    }

    // App preview HTML (and related app endpoint responses) — stream through directly.
    // Avoid backendRes.text() here because terminated reads can turn a valid 200 into empty output.
    if (firstSegment === 'apps') {
      const resHeaders: Record<string, string> = {
        'Content-Type': contentType || 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
      }
      const disposition = backendRes.headers.get('content-disposition')
      if (disposition) resHeaders['Content-Disposition'] = disposition
      Object.assign(resHeaders, withProxyResponseHeaders({}, requestId, proxySpanId))
      applyRuntimeHeader(resHeaders, runtimeSource)
      return new Response(backendRes.body, { status: backendRes.status, headers: resHeaders })
    }

    // Regular JSON response
    let body = ''
    try {
      body = await backendRes.text()
    } catch (err) {
      return new NextResponse('', {
        status: backendRes.status,
        headers: applyRuntimeHeader(
          withProxyResponseHeaders(
            {
              'Content-Type': contentType || 'text/plain',
              'Cache-Control': 'no-store, max-age=0',
            },
            requestId,
            proxySpanId,
          ),
          runtimeSource,
        ),
      })
    }
    return new NextResponse(body, {
      status: backendRes.status,
      headers: applyRuntimeHeader(
        withProxyResponseHeaders(
          {
            'Content-Type': contentType || 'application/json',
            'Cache-Control': 'no-store, max-age=0',
          },
          requestId,
          proxySpanId,
        ),
        runtimeSource,
      ),
    })
  } catch (err) {
    reportProxyEvent('external_call', 'proxy_failure', {
      status: 'error',
      error_code: 'PROXY_REQUEST_FAILED',
      observability: { error: err instanceof Error ? err.message : String(err) },
    })
    console.error(`Proxy error for ${backendPath}:`, err)
    return NextResponse.json(
      { error: 'Backend unavailable', detail: String(err) },
      { status: 502, headers: withProxyResponseHeaders({}, requestId, proxySpanId) },
    )
  }
}

export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const PATCH = proxyRequest
export const DELETE = proxyRequest
