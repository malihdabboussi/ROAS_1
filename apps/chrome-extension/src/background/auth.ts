import { getAppOrigin, getSupabaseAnonKey, getSupabaseUrl, supabaseCookiePrefix } from '../shared/config'

const STORAGE_ACCESS = 'vibey_access_token'
const STORAGE_REFRESH = 'vibey_refresh_token'
const STORAGE_EXPIRES = 'vibey_access_expires_at'

export type SessionPayload = {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

function parseChunkedAuthCookie(cookies: chrome.cookies.Cookie[]): { access_token: string; refresh_token: string; expires_at?: number } | null {
  const prefix = supabaseCookiePrefix()
  const relevant = cookies
    .filter((c) => c.name.startsWith(prefix) && c.name.includes('auth-token'))
    .sort((a, b) => a.name.localeCompare(b.name))
  if (relevant.length === 0) return null
  let raw = ''
  for (const c of relevant) {
    raw += c.value
  }

  if (raw.startsWith('base64-')) {
    let b64 = raw.slice(7).replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    if (pad === 2) b64 += '=='
    else if (pad === 3) b64 += '='
    try {
      const decoded = atob(b64)
      const json = JSON.parse(decoded) as { access_token?: string; refresh_token?: string; expires_at?: number }
      if (json.access_token && json.refresh_token) {
        return { access_token: json.access_token, refresh_token: json.refresh_token, expires_at: json.expires_at }
      }
    } catch { /* fall through to legacy parsers */ }
  }

  const tryParse = (s: string): { access_token: string; refresh_token: string; expires_at?: number } | null => {
    try {
      const json = JSON.parse(s) as {
        access_token?: string
        refresh_token?: string
        expires_at?: number
      }
      if (json.access_token && json.refresh_token) {
        return {
          access_token: json.access_token,
          refresh_token: json.refresh_token,
          expires_at: json.expires_at,
        }
      }
    } catch {
      /* next */
    }
    return null
  }

  return tryParse(raw) ?? tryParse(decodeURIComponent(raw))
}

function dedupeCookies(cookies: chrome.cookies.Cookie[]): chrome.cookies.Cookie[] {
  const seen = new Set<string>()
  const out: chrome.cookies.Cookie[] = []
  for (const c of cookies) {
    const key = `${c.domain}|${c.path}|${c.name}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
  }
  return out
}

async function safeGetAll(details: chrome.cookies.GetAllDetails): Promise<chrome.cookies.Cookie[]> {
  try {
    const cs = await chrome.cookies.getAll(details)
    return Array.isArray(cs) ? cs : []
  } catch (e) {
    console.warn('[vibey-auth] cookies.getAll failed', details, e)
    return []
  }
}

async function collectCandidateCookies(appOrigin: string): Promise<chrome.cookies.Cookie[]> {
  const prefix = supabaseCookiePrefix()
  let hostname = ''
  try {
    hostname = new URL(appOrigin).hostname
  } catch {
    hostname = ''
  }
  const rootDomain = hostname.split('.').slice(-2).join('.') // vibey.im
  const strategies: chrome.cookies.GetAllDetails[] = [
    { url: appOrigin },
    { url: appOrigin, partitionKey: {} } as chrome.cookies.GetAllDetails,
    { url: appOrigin, partitionKey: { topLevelSite: appOrigin } } as chrome.cookies.GetAllDetails,
    ...(hostname ? [{ domain: hostname } as chrome.cookies.GetAllDetails] : []),
    ...(rootDomain && rootDomain !== hostname
      ? [{ domain: rootDomain } as chrome.cookies.GetAllDetails]
      : []),
    { name: `${prefix}-auth-token` } as chrome.cookies.GetAllDetails,
  ]
  let all: chrome.cookies.Cookie[] = []
  for (const s of strategies) {
    const cs = await safeGetAll(s)
    if (cs.length > 0) {
      console.log(`[vibey-auth] strategy`, s, `→ ${cs.length} cookies`)
    }
    all = all.concat(cs)
  }
  // Broad sweep: getAll({}) and filter client-side by name prefix / domain
  const allCookies = await safeGetAll({})
  const filtered = allCookies.filter((c) => {
    const nameMatches = c.name.startsWith(prefix) && c.name.includes('auth-token')
    const domainMatches =
      (hostname && (c.domain === hostname || c.domain === `.${hostname}`)) ||
      (rootDomain && (c.domain === rootDomain || c.domain === `.${rootDomain}`))
    return nameMatches || domainMatches
  })
  if (filtered.length > 0) {
    console.log('[vibey-auth] broad sweep matched', filtered.length, 'cookies')
  }
  all = all.concat(filtered)
  return dedupeCookies(all)
}

export async function readSessionFromCookies(): Promise<SessionPayload | null> {
  const appOrigin = getAppOrigin()
  const prefix = supabaseCookiePrefix()
  console.log('[vibey-auth] reading cookies for', appOrigin, 'prefix=', prefix)

  const candidates = await collectCandidateCookies(appOrigin)
  console.log('[vibey-auth] candidate cookies', {
    count: candidates.length,
    names: candidates.map((c) => ({ name: c.name, domain: c.domain, path: c.path })),
  })

  const parsed = parseChunkedAuthCookie(candidates)
  if (!parsed) {
    console.warn('[vibey-auth] no matching auth-token cookies found')
    return null
  }
  const expiresAt = parsed.expires_at != null ? parsed.expires_at : Math.floor(Date.now() / 1000) + 3600
  console.log('[vibey-auth] parsed session, expires_at=', expiresAt)
  return { accessToken: parsed.access_token, refreshToken: parsed.refresh_token, expiresAt }
}

/**
 * Fetch the active session from the web app's /api/auth/session endpoint.
 *
 * Why: @supabase/ssr cookies on production are not reliably readable via
 * chrome.cookies.getAll (HttpOnly + SameSite=Lax + Secure + Chrome partitioning
 * edge cases). The SW's fetch carries those cookies automatically because the
 * extension holds host_permissions for the app origin, so this bypass always
 * works when the user is signed in at the app.
 */
export async function readSessionFromWebApp(): Promise<SessionPayload | null> {
  const appOrigin = getAppOrigin().replace(/\/$/, '')
  const url = `${appOrigin}/api/auth/session`
  console.log('[vibey-auth] fetching session via', url)
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) {
      console.warn('[vibey-auth] /api/auth/session HTTP', res.status)
      return null
    }
    const data = (await res.json()) as {
      access_token?: string
      refresh_token?: string
      expires_at?: number
    }
    if (!data.access_token || !data.refresh_token) {
      console.warn('[vibey-auth] /api/auth/session returned no tokens')
      return null
    }
    const expiresAt = data.expires_at ?? Math.floor(Date.now() / 1000) + 3600
    console.log('[vibey-auth] got session from web app, expires_at=', expiresAt)
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    }
  } catch (e) {
    console.warn('[vibey-auth] /api/auth/session fetch failed', e)
    return null
  }
}

async function storeSession(s: SessionPayload): Promise<void> {
  await chrome.storage.session.set({
    [STORAGE_ACCESS]: s.accessToken,
    [STORAGE_REFRESH]: s.refreshToken,
    [STORAGE_EXPIRES]: s.expiresAt,
  })
}

export async function clearSession(): Promise<void> {
  await chrome.storage.session.remove([STORAGE_ACCESS, STORAGE_REFRESH, STORAGE_EXPIRES])
}

export async function getCachedOrRefreshSession(): Promise<SessionPayload | null> {
  const store = await chrome.storage.session.get([STORAGE_ACCESS, STORAGE_REFRESH, STORAGE_EXPIRES])
  const now = Math.floor(Date.now() / 1000)
  const exp = store[STORAGE_EXPIRES] as number | undefined
  const access = store[STORAGE_ACCESS] as string | undefined
  const refresh = store[STORAGE_REFRESH] as string | undefined

  if (access && refresh && exp != null && exp > now + 120) {
    return { accessToken: access, refreshToken: refresh, expiresAt: exp }
  }

  const fromCookie = await readSessionFromCookies()
  if (fromCookie) {
    await storeSession(fromCookie)
    return fromCookie
  }

  const fromWebApp = await readSessionFromWebApp()
  if (fromWebApp) {
    await storeSession(fromWebApp)
    return fromWebApp
  }

  if (refresh) {
    const refreshed = await refreshWithSupabase(refresh)
    if (refreshed) {
      await storeSession(refreshed)
      return refreshed
    }
    await clearSession()
  }

  return null
}

async function refreshWithSupabase(refreshToken: string): Promise<SessionPayload | null> {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  if (!url || !key) return null
  const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in?: number
  }
  if (!data.access_token || !data.refresh_token) return null
  const expiresAt =
    Math.floor(Date.now() / 1000) + (typeof data.expires_in === 'number' ? data.expires_in : 3600)
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
  }
}

export async function getActiveOrgId(): Promise<string | null> {
  const { vibey_active_org_id: id } = await chrome.storage.local.get('vibey_active_org_id')
  return typeof id === 'string' && id.length > 0 ? id : null
}
