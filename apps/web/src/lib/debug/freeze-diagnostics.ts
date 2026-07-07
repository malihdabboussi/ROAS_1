'use client'

type FreezeContext = Record<string, string | number | boolean | null | undefined>

const DEBUG_SESSION_KEY = 'vibey-freeze-debug'
const WATCHED_PATH_FRAGMENTS = [
  '/api/agents',
  '/api/agent-teams',
  '/api/brain/company/status',
  '/api/campaigns',
  '/api/conversations',
  '/api/home',
  '/api/missions',
  '/api/sidebar/team2-bootstrap',
  '/api/spaces',
  '/api/team-roster',
]
const MAX_EVENTS_PER_PAGE = 140
const DEDUPE_WINDOW_MS = 1200
const STALL_INTERVAL_MS = 1000
const STALL_THRESHOLD_MS = 2500

let installed = false
let eventCount = 0
let sequence = 0
let pageStartedAt = 0
let debugSessionId = ''
const lastEventAtByKey = new Map<string, number>()

function getDebugSessionId(): string {
  if (debugSessionId) return debugSessionId
  debugSessionId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return debugSessionId
}

function pathIsWatched(path: string): boolean {
  return WATCHED_PATH_FRAGMENTS.some((fragment) => path.includes(fragment))
}

function routeIsWatched(pathname: string): boolean {
  return pathname === '/home' || pathname === '/team' || pathname === '/spaces'
}

export function shouldEnableFreezeDiagnostics(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const explicit = params.get('freeze_debug')
  if (explicit === '0') {
    window.sessionStorage.removeItem(DEBUG_SESSION_KEY)
    return false
  }
  if (explicit === '1') {
    window.sessionStorage.setItem(DEBUG_SESSION_KEY, '1')
    return true
  }
  if (window.sessionStorage.getItem(DEBUG_SESSION_KEY) === '1') return true
  return process.env.NODE_ENV === 'production' && routeIsWatched(window.location.pathname)
}

function navigationMs(): number {
  return Math.round(performance.now() - pageStartedAt)
}

function memoryContext(): FreezeContext {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number }
  }
  const memory = perf.memory
  if (!memory) return {}
  return {
    heap_used_mb: memory.usedJSHeapSize ? memory.usedJSHeapSize / 1024 / 1024 : undefined,
    heap_total_mb: memory.totalJSHeapSize ? memory.totalJSHeapSize / 1024 / 1024 : undefined,
    heap_limit_mb: memory.jsHeapSizeLimit ? memory.jsHeapSizeLimit / 1024 / 1024 : undefined,
  }
}

function sanitizeContext(context: FreezeContext): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(context)) {
    if (value === undefined) continue
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue
      out[key] = Math.round(value)
      continue
    }
    out[key] = value
  }
  return out
}

export function reportFreezeEvent(event: string, context: FreezeContext = {}): void {
  if (!shouldEnableFreezeDiagnostics()) return
  if (eventCount >= MAX_EVENTS_PER_PAGE) return

  const now = Date.now()
  const dedupeKey = [
    event,
    context.component ?? '',
    context.path ?? context.route ?? '',
    context.phase ?? '',
    context.agent_key ?? '',
  ].join(':')
  const lastAt = lastEventAtByKey.get(dedupeKey) ?? 0
  if (now - lastAt < DEDUPE_WINDOW_MS) return
  lastEventAtByKey.set(dedupeKey, now)

  eventCount += 1
  sequence += 1
  const payload = sanitizeContext({
    event,
    seq: sequence,
    session: getDebugSessionId(),
    ms: navigationMs(),
    route: window.location.pathname,
    search: window.location.search.slice(0, 240),
    visibility: document.visibilityState,
    ...memoryContext(),
    ...context,
  })

  void fetch('/api/freeze-debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

export function reportBackendFetchDebug(
  path: string,
  phase: 'start' | 'end' | 'error',
  context: FreezeContext = {},
): void {
  if (!pathIsWatched(path)) return
  reportFreezeEvent('backend_fetch', {
    path: path.slice(0, 220),
    phase,
    ...context,
  })
}

export function installFreezeDiagnostics(): void {
  if (typeof window === 'undefined' || installed) return
  installed = true
  pageStartedAt = performance.now()

  reportFreezeEvent('page_boot', {
    user_agent: navigator.userAgent.slice(0, 220),
    viewport_w: window.innerWidth,
    viewport_h: window.innerHeight,
    device_pixel_ratio: window.devicePixelRatio,
  })

  window.addEventListener('error', (event) => {
    reportFreezeEvent('window_error', {
      message: event.message.slice(0, 500),
      source: event.filename?.slice(0, 160) ?? '',
      line: event.lineno,
      col: event.colno,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    reportFreezeEvent('unhandled_rejection', {
      message: reason instanceof Error ? reason.message.slice(0, 500) : String(reason).slice(0, 500),
    })
  })

  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          reportFreezeEvent('long_task', {
            duration_ms: entry.duration,
            entry_name: entry.name.slice(0, 120),
          })
        }
      })
      observer.observe({ type: 'longtask', buffered: true })
    } catch {
      /* longtask is not supported in every browser */
    }
  }

  let lastTick = performance.now()
  window.setInterval(() => {
    const now = performance.now()
    const delta = now - lastTick
    lastTick = now
    if (delta > STALL_THRESHOLD_MS) {
      reportFreezeEvent('main_thread_stall', {
        stall_ms: delta,
        expected_ms: STALL_INTERVAL_MS,
      })
    }
  }, STALL_INTERVAL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      reportFreezeEvent('page_hidden')
    }
  })
}
