/**
 * Backend API client — all frontend requests go through here.
 *
 * Routes through Next.js API proxy (/api/proxy/...) to avoid
 * mixed-content issues (HTTPS frontend → HTTP backend).
 * The proxy forwards to the NestJS backend server-side.
 *
 * /api/proxy/conversations → NestJS /api/conversations
 * /api/proxy/chat → NestJS /api/chat
 */

import { reportBackendFetchDebug } from '@/lib/debug/freeze-diagnostics'
import { getImpersonatedUserIdFromStorage } from '@/lib/utils/impersonation-storage'
import { getActiveOrgIdFromStorage } from '@/lib/utils/org-storage'

const AUTH_RETRY_HEADER = 'x-retry'
const AGENT_ROUTE_PREFIXES = ['/api/chat', '/api/apps', '/api/project-files']
const AGENT_ROUTE_EXACT = new Set(['/api/brain/live-session'])
const BACKEND_FETCH_RETRY_DELAYS_MS = [0, 300, 900]
/**
 * Opt-in (`resilient: true`) longer backoff for idempotent, transient-tolerant
 * calls (research search/enrich). Covers a backend cold start / redeploy / reset
 * (~10s) instead of giving up after ~1.2s and surfacing a hard error. Pairs with
 * server-side result caching so the retries don't re-do (or re-charge) work that
 * already landed.
 */
const RESILIENT_FETCH_RETRY_DELAYS_MS = [0, 1500, 3500, 6000]
const BACKEND_FETCH_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowMs(): number { return typeof performance !== 'undefined' ? performance.now() : Date.now() }

function createObservabilityId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function isTokenNearExpiry(token: string, thresholdSeconds = 120): boolean {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return true
    let base64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    if (pad) base64 += '='.repeat(4 - pad)
    const payload = JSON.parse(
      typeof globalThis.atob === 'function'
        ? globalThis.atob(base64)
        : Buffer['from'](base64, 'base64').toString('utf8'),
    ) as { exp?: unknown }
    return (
      typeof payload.exp !== 'number' ||
      payload.exp <= Math.floor(Date.now() / 1000) + thresholdSeconds
    )
  } catch {
    return true
  }
}

function hasAuthRetryHeader(headers: HeadersInit | undefined): boolean {
  if (!headers) return false
  if (headers instanceof Headers) return headers.get(AUTH_RETRY_HEADER) === '1'
  if (Array.isArray(headers)) {
    return headers.some(([k, v]) => k.toLowerCase() === AUTH_RETRY_HEADER && v === '1')
  }
  const o = headers as Record<string, string>
  return o[AUTH_RETRY_HEADER] === '1'
}

function mergeInitHeaders(init?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {}
  if (!init) return out
  if (init instanceof Headers) {
    init.forEach((v, k) => {
      out[k] = v
    })
    return out
  }
  if (Array.isArray(init)) {
    for (const [k, v] of init) out[k] = v
    return out
  }
  return { ...(init as Record<string, string>) }
}

function readInitHeader(init: HeadersInit | undefined, name: string): string | null {
  const lower = name.toLowerCase()
  if (!init) return null
  if (init instanceof Headers) return init.get(name)
  if (Array.isArray(init)) {
    const found = init.find(([key]) => key.toLowerCase() === lower)
    return found?.[1] ?? null
  }
  const record = init as Record<string, string>
  return record[name] ?? record[lower] ?? null
}

function normalizeObservabilityId(value: string | null | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim().slice(0, 256) : null
}

function normalizeApiPath(path: string): string {
  const [basePath] = path.split('?')
  if (!basePath) return path
  return basePath
}

function isAgentBoundPath(path: string): boolean {
  const normalizedPath = normalizeApiPath(path)
  if (AGENT_ROUTE_EXACT.has(normalizedPath)) return true
  return AGENT_ROUTE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))
}

/**
 * Superadmin impersonation header — sent on every route except the
 * impersonation control endpoints, which must authenticate as the
 * superadmin's real identity. Agent routes carry it too: the proxy resolves
 * the impersonated user's machine and the agent backend swaps identity.
 */
function getImpersonationHeaderForPath(path: string): string | null {
  const normalizedPath = normalizeApiPath(path)
  if (normalizedPath.startsWith('/api/admin/impersonation')) return null
  return getImpersonatedUserIdFromStorage()
}

let tokenCache: {
  accessToken: string | null
  refreshToken: string | null
  expiresAt: number
} | null = null
const TOKEN_CACHE_TTL_MS = 30_000
let tokenFetchInFlight: Promise<{
  accessToken: string | null
  refreshToken: string | null
}> | null = null

async function getAuthSessionTokens(): Promise<{
  accessToken: string | null
  refreshToken: string | null
}> {
  if (
    tokenCache &&
    tokenCache.expiresAt > Date.now() &&
    tokenCache.accessToken &&
    !isTokenNearExpiry(tokenCache.accessToken, 120)
  ) {
    return { accessToken: tokenCache.accessToken, refreshToken: tokenCache.refreshToken }
  }

  if (tokenFetchInFlight) return tokenFetchInFlight

  tokenFetchInFlight = (async () => {
    try {
      const { createBrowserClient } = await import('@supabase/ssr')
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      let {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.access_token && isTokenNearExpiry(session.access_token, 120)) {
        const { data } = await supabase.auth.refreshSession()
        if (data.session) session = data.session
      }

      const result = {
        accessToken: session?.access_token ?? null,
        refreshToken: session?.refresh_token ?? null,
      }
      tokenCache = { ...result, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS }
      return result
    } finally {
      tokenFetchInFlight = null
    }
  })()

  return tokenFetchInFlight
}

async function refreshAuthSessionTokens(): Promise<{
  accessToken: string | null
  refreshToken: string | null
}> {
  const { createBrowserClient } = await import('@supabase/ssr')
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data } = await supabase.auth.refreshSession()
  const result = {
    accessToken: data.session?.access_token ?? null,
    refreshToken: data.session?.refresh_token ?? null,
  }
  tokenCache = { ...result, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS }
  return result
}

/**
 * Convert backend API path to proxy path.
 * /api/conversations → /api/proxy/conversations
 * /api/chat → /api/proxy/chat
 */
function toProxyPath(path: string): string {
  if (path.startsWith('/api/')) {
    return `/api/proxy/${path.slice(5)}`
  }
  return `/api/proxy${path}`
}

const activeControllers = new Set<AbortController>()
export type BackendFetchOptions = RequestInit & {
  orgId?: string | null
  skipClientErrorLog?: boolean
  requestId?: string | null
  parentSpanId?: string | null
  /** Use the longer self-heal backoff (RESILIENT_FETCH_RETRY_DELAYS_MS) for transient blips. */
  resilient?: boolean
}

function scheduleReportBackendFetchFailure(
  path: string,
  response: Response,
  bodyPreview: string | undefined,
  skipClientErrorLog: boolean | undefined,
  requestId: string,
  parentSpanId: string | null,
): void {
  if (skipClientErrorLog) return
  if (response.ok) return
  if (response.status === 402) return
  const normalized = normalizeApiPath(path)
  if (normalized === '/api/log/client-error') return

  void (async () => {
    let snippet: string
    if (bodyPreview !== undefined) {
      snippet = bodyPreview.slice(0, 500)
    } else {
      try {
        const text = await response.clone().text()
        snippet = text.slice(0, 500)
      } catch {
        snippet = ''
      }
    }
    const { reportClientError } = await import('@/lib/log-client-error')
    void reportClientError({
      feature: 'backend_fetch',
      error_code: `HTTP_${response.status}`,
      message: `Backend request failed: ${response.status} ${response.statusText}`.trim(),
      request_id: requestId,
      context: {
        path: normalized,
        status: response.status,
        body_preview: snippet,
        request_id: requestId,
        parent_span_id: parentSpanId,
      },
    })
  })()
}

function scheduleReportBackendNetworkFailure(
  path: string,
  method: string,
  error: unknown,
  skipClientErrorLog: boolean | undefined,
  requestId: string,
  parentSpanId: string | null,
): void {
  if (skipClientErrorLog || isAbortError(error)) return
  const normalized = normalizeApiPath(path)
  if (normalized === '/api/log/client-error') return
  void (async () => {
    const { reportClientError } = await import('@/lib/log-client-error')
    void reportClientError({
      feature: 'backend_fetch',
      error_code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : String(error),
      request_id: requestId,
      context: {
        path: normalized,
        method,
        request_id: requestId,
        parent_span_id: parentSpanId,
      },
      stack: error instanceof Error ? error.stack : undefined,
    })
  })()
}

function trackController(controller: AbortController): AbortController {
  activeControllers.add(controller)
  return controller
}

function untrackController(controller: AbortController): void {
  activeControllers.delete(controller)
}

function parseErrorMessage(value: unknown, fallback: string): string {
  if (!value) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (obj.message && typeof obj.message === 'object') {
      const inner = obj.message as Record<string, unknown>
      const innerMsg =
        (typeof inner.message === 'string' && inner.message) ||
        (typeof inner.error === 'string' && inner.error) ||
        null
      if (innerMsg) return innerMsg
    }
    const nested =
      (typeof obj.message === 'string' && obj.message) ||
      (typeof obj.error === 'string' && obj.error) ||
      (typeof obj.details === 'string' && obj.details) ||
      (typeof obj.detail === 'string' && obj.detail) ||
      null
    if (nested) return nested
  }
  return fallback
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException ||
      (typeof error === 'object' && error !== null && 'name' in error)) &&
    (error as { name?: unknown }).name === 'AbortError'
  )
}

async function fetchWithBackendRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  delays: number[] = BACKEND_FETCH_RETRY_DELAYS_MS,
): Promise<Response> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (attempt > 0) {
      await delay(delays[attempt] ?? 300)
    }

    try {
      const response = await fetch(input, init)
      if (attempt < delays.length - 1 && BACKEND_FETCH_RETRYABLE_STATUSES.has(response.status)) {
        void response.body?.cancel().catch(() => {})
        continue
      }
      return response
    } catch (error) {
      if (isAbortError(error) || init.signal?.aborted) throw error
      lastError = error
      if (attempt >= delays.length - 1) break
    }
  }

  throw lastError
}

export function cancelAllPendingBackendRequests(): void {
  for (const controller of activeControllers) {
    controller.abort('org-switch')
  }
  activeControllers.clear()
}

export async function backendFetch(
  path: string,
  options: BackendFetchOptions = {},
): Promise<Response> {
  const {
    orgId: optionsOrgId,
    skipClientErrorLog,
    resilient,
    requestId: optionsRequestId,
    parentSpanId: optionsParentSpanId,
    ...requestInit
  } = options
  const requestId =
    normalizeObservabilityId(optionsRequestId) ??
    normalizeObservabilityId(readInitHeader(requestInit.headers, 'x-vibey-request-id')) ??
    createObservabilityId('req')
  const parentSpanId =
    normalizeObservabilityId(optionsParentSpanId) ??
    normalizeObservabilityId(readInitHeader(requestInit.headers, 'x-vibey-parent-span-id')) ??
    createObservabilityId('span')
  const requiresAgentAuth = isAgentBoundPath(path)
  let { accessToken, refreshToken } = await getAuthSessionTokens()
  if (requiresAgentAuth && !accessToken) {
    const refreshed = await refreshAuthSessionTokens()
    accessToken = refreshed.accessToken
    refreshToken = refreshed.refreshToken
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required for agent routes. Please sign in again.',
          code: 'AUTH_SESSION_REQUIRED',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    }
  }
  const proxyPath = toProxyPath(path)

  const shouldSendRefreshToken =
    path.startsWith('/api/chat') ||
    path.startsWith('/api/telegram/connect') ||
    path.startsWith('/api/slack/install') ||
    path.startsWith('/api/slack/channel-map')

  const hasOrgOverride = Object.prototype.hasOwnProperty.call(options, 'orgId')
  const orgId = hasOrgOverride ? (optionsOrgId ?? null) : getActiveOrgIdFromStorage()
  const impersonateUserId = getImpersonationHeaderForPath(path)
  const debugStartedAt = nowMs()
  const method = requestInit.method?.toUpperCase() ?? 'GET'

  reportBackendFetchDebug(path, 'start', {
    method,
    has_org: Boolean(orgId),
    has_org_override: hasOrgOverride,
  })

  const controller = trackController(new AbortController())
  const userSignal = requestInit.signal
  if (userSignal) {
    if (userSignal.aborted) controller.abort(userSignal.reason)
    else {
      userSignal.addEventListener('abort', () => controller.abort(userSignal.reason), {
        once: true,
      })
    }
  }

  try {
    const response = await fetchWithBackendRetry(
      proxyPath,
      {
        ...requestInit,
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(shouldSendRefreshToken && refreshToken
            ? { 'x-supabase-refresh-token': refreshToken }
            : {}),
          ...(orgId ? { 'x-org-id': orgId } : {}),
          ...(impersonateUserId ? { 'x-impersonate-user-id': impersonateUserId } : {}),
          ...mergeInitHeaders(requestInit.headers),
          'x-vibey-request-id': requestId,
          'x-vibey-parent-span-id': parentSpanId,
        },
      },
      resilient ? RESILIENT_FETCH_RETRY_DELAYS_MS : BACKEND_FETCH_RETRY_DELAYS_MS,
    )
    reportBackendFetchDebug(path, 'end', {
      method,
      status: response.status,
      duration_ms: nowMs() - debugStartedAt,
    })

    if (response.status === 401 && !hasAuthRetryHeader(requestInit.headers)) {
      const bodyText = await response.text()
      const refreshed = await refreshAuthSessionTokens()
      if (refreshed.accessToken) {
        const retryHeaders: Record<string, string> = {
          ...mergeInitHeaders(requestInit.headers),
          [AUTH_RETRY_HEADER]: '1',
        }
        return backendFetch(path, { ...options, headers: retryHeaders, requestId, parentSpanId })
      }
      const failRes = new Response(bodyText, {
        status: 401,
        statusText: response.statusText,
        headers: response.headers,
      })
      scheduleReportBackendFetchFailure(
        path,
        failRes,
        bodyText,
        skipClientErrorLog,
        requestId,
        parentSpanId,
      )
      return failRes
    }

    scheduleReportBackendFetchFailure(
      path,
      response,
      undefined,
      skipClientErrorLog,
      requestId,
      parentSpanId,
    )
    return response
  } catch (error) {
    reportBackendFetchDebug(path, 'error', {
      method,
      duration_ms: nowMs() - debugStartedAt,
      message: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
    })
    scheduleReportBackendNetworkFailure(
      path,
      method,
      error,
      skipClientErrorLog,
      requestId,
      parentSpanId,
    )
    throw error
  } finally {
    untrackController(controller)
  }
}

export async function backendUpload<T>(path: string, formData: FormData): Promise<T> {
  const requestId = createObservabilityId('req')
  const parentSpanId = createObservabilityId('span')
  const requiresAgentAuth = isAgentBoundPath(path)
  let { accessToken, refreshToken } = await getAuthSessionTokens()
  if (requiresAgentAuth && !accessToken) {
    const refreshed = await refreshAuthSessionTokens()
    accessToken = refreshed.accessToken
    refreshToken = refreshed.refreshToken
    if (!accessToken) {
      throw new Error('Authentication required for agent routes. Please sign in again.')
    }
  }
  const proxyPath = toProxyPath(path)
  const shouldSendRefreshToken =
    path.startsWith('/api/chat') || path.startsWith('/api/telegram/connect')

  const orgId = getActiveOrgIdFromStorage()
  const impersonateUserId = getImpersonationHeaderForPath(path)
  const headers: Record<string, string> = {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(shouldSendRefreshToken && refreshToken ? { 'x-supabase-refresh-token': refreshToken } : {}),
    ...(orgId ? { 'x-org-id': orgId } : {}),
    ...(impersonateUserId ? { 'x-impersonate-user-id': impersonateUserId } : {}),
    'x-vibey-request-id': requestId,
    'x-vibey-parent-span-id': parentSpanId,
  }

  const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])
  const MAX_ATTEMPTS = 2
  const RETRY_DELAY_MS = 2000

  let lastRes: Response | null = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
    lastRes = await fetch(proxyPath, { method: 'POST', headers, body: formData })
    if (lastRes.ok || !RETRYABLE_STATUSES.has(lastRes.status)) break
  }

  if (!lastRes || !lastRes.ok) {
    if (lastRes) {
      scheduleReportBackendFetchFailure(path, lastRes, undefined, undefined, requestId, parentSpanId)
    }
    console.warn(`[backendUpload] ${path} failed with status ${lastRes?.status ?? 'unknown'}`)
    throw new Error("Couldn't upload that file. Try again.")
  }
  return lastRes.json() as Promise<T>
}

export async function backendGet<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  const res = await backendFetch(path, options)
  if (!res.ok) {
    let body: unknown = null
    try {
      const text = await res.text()
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    } catch {
      /* ignore */
    }
    // #region agent log
    if (path.includes('usage-analytics') || path.includes('agent-spending')) {
      fetch('http://127.0.0.1:7681/ingest/94e24cc9-0e93-41a4-9d43-69640004018c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ea8738'},body:JSON.stringify({sessionId:'ea8738',location:'backend-client.ts:backendGet',message:'billing analytics HTTP error',data:{path,status:res.status,errorMessage:parseErrorMessage(body,`Backend error ${res.status}`),bodyPreview:typeof body==='string'?body.slice(0,200):body},timestamp:Date.now(),hypothesisId:'H1,H5'})}).catch(()=>{});
    }
    // #endregion
    throw new Error(parseErrorMessage(body, `Backend error ${res.status}`))
  }
  return res.json() as Promise<T>
}

export async function backendPost<T>(
  path: string,
  body: unknown,
  options: BackendFetchOptions = {},
): Promise<T> {
  const res = await backendFetch(path, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),
  })
  let json: T & { error?: string; message?: string }
  try {
    json = (await res.json()) as T & { error?: string; message?: string }
  } catch {
    if (!res.ok) throw new Error(`Backend error ${res.status}`)
    throw new Error('Invalid response')
  }
  if (!res.ok) {
    throw new Error(parseErrorMessage(json, `Backend error ${res.status}`))
  }
  return json as T
}

export async function backendDelete<T = void>(
  path: string,
  body?: unknown,
  options: BackendFetchOptions = {},
): Promise<T> {
  const init: RequestInit =
    body === undefined
      ? { method: 'DELETE' }
      : {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
  const res = await backendFetch(path, { ...options, ...init })
  if (!res.ok) {
    let message = `Backend error ${res.status}`
    try {
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const json = (await res.json()) as unknown
        message = parseErrorMessage(json, message)
      } else {
        const text = (await res.text()).trim()
        if (text) message = text
      }
    } catch {
      // Keep generic message when response body can't be parsed.
    }
    throw new Error(message)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return undefined as T
}

export async function backendPatch<T>(
  path: string,
  body: unknown,
  options: BackendFetchOptions = {},
): Promise<T> {
  const res = await backendFetch(path, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let message = `Backend error ${res.status}`
    try {
      const text = await res.text()
      if (text) {
        try {
          const json = JSON.parse(text) as unknown
          message = parseErrorMessage(json, message)
        } catch {
          message = text.slice(0, 200)
        }
      }
    } catch {
      /* keep default message */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export async function backendPut<T>(
  path: string,
  body: unknown,
  options: BackendFetchOptions = {},
): Promise<T> {
  const res = await backendFetch(path, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let payload: unknown = null
    try {
      payload = await res.json()
    } catch {
      // ignore parse failure
    }
    throw new Error(parseErrorMessage(payload, `Backend error ${res.status}`))
  }
  return res.json() as Promise<T>
}
