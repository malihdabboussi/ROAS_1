interface Env {
  SLUG_CACHE: KVNamespace
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  BACKEND_URL?: string
  INTERNAL_API_TOKEN?: string
  APPS_WEB_VERCEL_URL?: string
  WORKER_SECRET?: string
  FLY_RUNTIME_URL?: string
  APPS_DOMAIN_SUFFIX?: string
  PUBLIC_AGENT_HOST_SUFFIX?: string
}

interface CachedRoute {
  projectId: string
  userId: string
  vercelDeploymentUrl: string | null
  flyMachineUrl: string
  flyMachineId: string
}

interface CachedAgentRoute {
  userId: string
  orgId: string | null
  runtimeSource: 'fly_machine' | 'shared_railway'
  runtimeUrl: string
  flyMachineId: string | null
}

interface CachedAgentInfo {
  agentToken: string
  widgetAllowedOrigins: string[]
}

const CACHE_TTL = 60
const ROAS_FLY_RUNTIME_URL = 'https://roas-runtimes.fly.dev'
const ROAS_APPS_DOMAIN_SUFFIX = '-app.roas.io'
const ROAS_PUBLIC_AGENT_HOST_SUFFIX = 'agents.roas.io'
const ENSURE_RUNNING_TIMEOUT_MS = 120_000
const RETRY_DELAY_MS = 2_000
const SENSITIVE_PROXY_HEADER_NAMES = [
  'authorization',
  'cookie',
  'x-vibey-worker-secret',
  'x-vibey-session-key',
]

function resolveFlyRuntimeUrl(env: Env): string {
  return (env.FLY_RUNTIME_URL?.trim() || ROAS_FLY_RUNTIME_URL).replace(/\/$/, '')
}

function resolveAppsDomainSuffix(env: Env): string {
  return env.APPS_DOMAIN_SUFFIX?.trim() || ROAS_APPS_DOMAIN_SUFFIX
}

function resolvePublicAgentHostSuffix(env: Env): string {
  return env.PUBLIC_AGENT_HOST_SUFFIX?.trim() || ROAS_PUBLIC_AGENT_HOST_SUFFIX
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchAppSlug(host: string, env: Env): string | null {
  const suffix = resolveAppsDomainSuffix(env)
  const match = host.match(new RegExp(`^(.+)${escapeRegExp(suffix)}$`))
  return match?.[1] ?? null
}

function matchAgentSlug(host: string, env: Env): string | null {
  const suffix = resolvePublicAgentHostSuffix(env)
  const match = host.match(new RegExp(`^([a-z0-9][a-z0-9-]*[a-z0-9])\\.${escapeRegExp(suffix)}$`))
  return match?.[1] ?? null
}

function isRetryableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

function isTrustedVercelDeploymentUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.hostname !== 'vercel.app' &&
      url.hostname.endsWith('.vercel.app')
    )
  } catch {
    return false
  }
}

function isTrustedRailwayRuntimeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.hostname.endsWith('.up.railway.app')
    )
  } catch {
    return false
  }
}

function isTrustedSharedRuntimeUrl(value: string, flyRuntimeUrl: string): boolean {
  if (isTrustedRailwayRuntimeUrl(value)) return true
  try {
    const url = new URL(value)
    const trusted = new URL(flyRuntimeUrl)
    return (
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.origin === trusted.origin
    )
  } catch {
    return false
  }
}

function stripSensitiveProxyHeaders(headers: Headers): Headers {
  for (const name of SENSITIVE_PROXY_HEADER_NAMES) {
    headers.delete(name)
  }
  return headers
}

async function ensureMachineRunning(env: Env, userId: string): Promise<boolean> {
  const base = env.BACKEND_URL?.trim()
  const token = env.INTERNAL_API_TOKEN?.trim()
  if (!base || !token) return false

  const url = `${base.replace(/\/$/, '')}/api/internal/machines/ensure-running`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId }),
    signal: AbortSignal.timeout(ENSURE_RUNNING_TIMEOUT_MS),
  })
  return res.ok
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const host = url.hostname

    const appSlug = matchAppSlug(host, env)
    if (appSlug) {
      return handleAppRoute(request, appSlug, url, env)
    }

    const agentSlug = matchAgentSlug(host, env)
    if (agentSlug) {
      return handleAgentPageRoute(request, agentSlug, url, env)
    }

    return new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

async function handleAppRoute(
  request: Request,
  slug: string,
  url: URL,
  env: Env,
): Promise<Response> {
  const route = await resolveRoute(slug, env)
  if (!route) {
    return new Response(notFoundHtml(slug, resolveAppsDomainSuffix(env)), {
      status: 404,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }
  if (route.vercelDeploymentUrl) {
    return proxyToVercel(request, route.vercelDeploymentUrl, url)
  }
  return proxyToFly(request, route, url, env)
}

interface AgentDetails {
  name: string
  role: string
  imageUrl: string | null
}

async function handleAgentPageRoute(
  request: Request,
  userSlug: string,
  url: URL,
  env: Env,
): Promise<Response> {
  if (url.pathname.startsWith('/_next/')) {
    return proxyAgentAssetToWeb(request, url, env)
  }

  const pathMatch = url.pathname.match(/^\/a\/([a-z0-9_-]+)(?:\/(.*))?$/)
  if (!pathMatch) {
    return new Response(agentNotFoundHtml(userSlug, resolvePublicAgentHostSuffix(env)), {
      status: 404,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }
  const agentKey = pathMatch[1]!
  const subPath = pathMatch[2] ?? ''

  const agentRoute = await resolveAgentRoute(userSlug, env)
  if (!agentRoute) {
    return new Response(agentNotFoundHtml(userSlug, resolvePublicAgentHostSuffix(env)), {
      status: 404,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }

  if (subPath.startsWith('api/')) {
    return handleAgentApiCall(request, agentRoute, agentKey, subPath, url, env)
  }

  const agentDetails = await resolveAgentDetails(agentRoute, agentKey, env)
  if (!agentDetails) {
    return new Response(agentNotFoundHtml(userSlug, resolvePublicAgentHostSuffix(env)), {
      status: 404,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }

  return handleAgentPageLoad(request, agentRoute, agentKey, userSlug, agentDetails, url, env)
}

async function proxyAgentAssetToWeb(
  request: Request,
  originalUrl: URL,
  env: Env,
): Promise<Response> {
  const webUrl = env.APPS_WEB_VERCEL_URL?.trim()
  if (!webUrl) {
    return new Response('Agent pages not configured', { status: 503 })
  }

  const target = new URL(originalUrl.pathname + originalUrl.search, webUrl)
  const headers = new Headers(request.headers)
  headers.delete('host')

  try {
    return await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    })
  } catch {
    return new Response(unavailableHtml(), {
      status: 503,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }
}

async function handleAgentPageLoad(
  request: Request,
  agentRoute: CachedAgentRoute,
  agentKey: string,
  userSlug: string,
  agentDetails: AgentDetails,
  originalUrl: URL,
  env: Env,
): Promise<Response> {
  const webUrl = env.APPS_WEB_VERCEL_URL?.trim()
  if (!webUrl) {
    return new Response('Agent pages not configured', { status: 503 })
  }

  const target = new URL(`/a/${agentKey}${originalUrl.search}`, webUrl)
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.set('x-vibey-user-id', agentRoute.userId)
  headers.set('x-vibey-user-slug', userSlug)
  headers.set('x-vibey-agent-name', agentDetails.name)
  headers.set('x-vibey-agent-role', agentDetails.role)
  if (agentDetails.imageUrl) headers.set('x-vibey-agent-image', agentDetails.imageUrl)
  if (env.WORKER_SECRET) headers.set('x-vibey-worker-secret', env.WORKER_SECRET)

  try {
    return await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    })
  } catch {
    return new Response(unavailableHtml(), {
      status: 503,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }
}

async function handleAgentApiCall(
  request: Request,
  agentRoute: CachedAgentRoute,
  agentKey: string,
  subPath: string,
  originalUrl: URL,
  env: Env,
): Promise<Response> {
  const agentInfo = await resolveAgentInfo(agentRoute, agentKey, env)
  const ownOrigin = `${originalUrl.protocol}//${originalUrl.host}`
  const requestOrigin = request.headers.get('origin') || ''
  const isCrossOrigin = !!requestOrigin && requestOrigin !== ownOrigin

  const withCors = (res: Response): Response => {
    if (!isCrossOrigin) return res
    const headers = new Headers(res.headers)
    headers.delete('access-control-allow-origin')
    headers.delete('access-control-allow-methods')
    headers.delete('access-control-allow-headers')
    headers.delete('access-control-max-age')
    headers.set('Access-Control-Allow-Origin', requestOrigin)
    headers.append('Vary', 'Origin')
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  }

  if (!agentInfo) {
    return withCors(
      new Response(JSON.stringify({ error: 'Agent not found or not public' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    )
  }

  const originAllowed =
    !requestOrigin || isOriginAllowed(requestOrigin, agentInfo.widgetAllowedOrigins, ownOrigin)

  if (request.method === 'OPTIONS') {
    if (isCrossOrigin && !originAllowed) {
      return new Response(null, { status: 403 })
    }
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(requestOrigin || ownOrigin),
    })
  }

  if (isCrossOrigin && !originAllowed) {
    return withCors(
      new Response(JSON.stringify({ error: 'origin_not_allowed' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    )
  }

  const apiPath = subPath.slice(4)
  const upstreamUrl = `${agentRoute.runtimeUrl}/api/public-${apiPath}${originalUrl.search}`
  const requestForRetry = request.clone()

  const buildHeaders = (source: Request): Headers => {
    const headers = new Headers(source.headers)
    headers.set('x-public-agent-token', agentInfo.agentToken)
    if (agentRoute.runtimeSource === 'fly_machine' && agentRoute.flyMachineId) {
      headers.set('fly-force-instance-id', agentRoute.flyMachineId)
    } else {
      headers.delete('fly-force-instance-id')
    }
    headers.delete('host')
    return headers
  }

  const doFetch = (source: Request): Promise<Response> =>
    fetch(upstreamUrl, {
      method: source.method,
      headers: buildHeaders(source),
      body: source.method === 'GET' || source.method === 'HEAD' ? undefined : source.body,
      redirect: 'manual',
    })

  try {
    let res = await doFetch(request)
    if (!res.ok && isRetryableStatus(res.status) && agentRoute.runtimeSource === 'fly_machine') {
      const warmed = await ensureMachineRunning(env, agentRoute.userId)
      if (warmed) {
        await delay(RETRY_DELAY_MS)
        res = await doFetch(requestForRetry)
      }
    } else if (!res.ok && isRetryableStatus(res.status)) {
      await delay(RETRY_DELAY_MS)
      res = await doFetch(requestForRetry)
    }
    return withCors(res)
  } catch {
    const warmed =
      agentRoute.runtimeSource === 'fly_machine'
        ? await ensureMachineRunning(env, agentRoute.userId)
        : false
    if (warmed || agentRoute.runtimeSource === 'shared_railway') {
      await delay(RETRY_DELAY_MS)
      try {
        return withCors(await doFetch(requestForRetry))
      } catch {
        return withCors(
          new Response(JSON.stringify({ error: 'Agent unavailable' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
    }
    return withCors(
      new Response(JSON.stringify({ error: 'Agent unavailable' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    )
  }
}

function buildCorsHeaders(origin: string): Headers {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Vary', 'Origin')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'content-type, x-public-agent-token')
  headers.set('Access-Control-Max-Age', '86400')
  return headers
}

function isOriginAllowed(origin: string, allowed: string[], ownOrigin: string): boolean {
  if (origin === ownOrigin) return true
  let originHost = ''
  try {
    originHost = new URL(origin).hostname
  } catch {
    return false
  }
  for (const raw of allowed) {
    const entry = String(raw || '')
      .trim()
      .replace(/\/$/, '')
    if (!entry) continue
    if (entry === origin) return true
    if (entry.startsWith('*.')) {
      const suffix = entry.slice(2)
      if (originHost === suffix || originHost.endsWith('.' + suffix)) return true
    }
  }
  return false
}

async function proxyToVercel(
  request: Request,
  vercelUrl: string,
  originalUrl: URL,
): Promise<Response> {
  if (!isTrustedVercelDeploymentUrl(vercelUrl)) {
    return new Response(unavailableHtml(), {
      status: 503,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }
  const target = new URL(originalUrl.pathname + originalUrl.search, vercelUrl)

  const headers = stripSensitiveProxyHeaders(new Headers(request.headers))
  headers.delete('host')

  try {
    return await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    })
  } catch {
    return new Response(unavailableHtml(), {
      status: 503,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }
}

async function proxyToFly(
  request: Request,
  route: CachedRoute,
  originalUrl: URL,
  env: Env,
): Promise<Response> {
  const path = originalUrl.pathname + originalUrl.search
  const upstreamBase = `${route.flyMachineUrl}/api/apps/${route.projectId}${path}`

  const requestForRetry = request.clone()

  const buildHeaders = (source: Request): Headers => {
    const headers = new Headers(source.headers)
    headers.set('fly-force-instance-id', route.flyMachineId)
    headers.delete('host')
    return headers
  }

  const doFetch = (source: Request): Promise<Response> =>
    fetch(upstreamBase, {
      method: source.method,
      headers: buildHeaders(source),
      body: source.method === 'GET' || source.method === 'HEAD' ? undefined : source.body,
      redirect: 'manual',
    })

  try {
    let res = await doFetch(request)
    if (!res.ok && isRetryableStatus(res.status)) {
      const warmed = await ensureMachineRunning(env, route.userId)
      if (warmed) {
        await delay(RETRY_DELAY_MS)
        res = await doFetch(requestForRetry)
      }
    }
    return res
  } catch {
    const warmed = await ensureMachineRunning(env, route.userId)
    if (warmed) {
      await delay(RETRY_DELAY_MS)
      try {
        return await doFetch(requestForRetry)
      } catch {
        return new Response(unavailableHtml(), {
          status: 503,
          headers: { 'content-type': 'text/html;charset=UTF-8' },
        })
      }
    }
    return new Response(unavailableHtml(), {
      status: 503,
      headers: { 'content-type': 'text/html;charset=UTF-8' },
    })
  }
}

function isCachedRoute(v: unknown, flyRuntimeUrl: string): v is CachedRoute {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const vercelDeploymentUrl =
    o.vercelDeploymentUrl === null || typeof o.vercelDeploymentUrl === 'string'
      ? o.vercelDeploymentUrl
      : null
  return (
    typeof o.projectId === 'string' &&
    typeof o.userId === 'string' &&
    typeof o.flyMachineUrl === 'string' &&
    typeof o.flyMachineId === 'string' &&
    (vercelDeploymentUrl
      ? o.flyMachineUrl === '' && isTrustedVercelDeploymentUrl(vercelDeploymentUrl)
      : o.flyMachineUrl === flyRuntimeUrl)
  )
}

async function resolveRoute(slug: string, env: Env): Promise<CachedRoute | null> {
  const flyRuntimeUrl = resolveFlyRuntimeUrl(env)
  const cached = await env.SLUG_CACHE.get(slug, 'json')
  if (isCachedRoute(cached, flyRuntimeUrl)) return cached

  const supaHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  }

  const projectRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/project_repos?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&select=id,user_id,vercel_deployment_url`,
    { headers: supaHeaders },
  )
  if (!projectRes.ok) return null
  const projects = (await projectRes.json()) as Array<{
    id: string
    user_id: string
    vercel_deployment_url: string | null
  }>
  if (!projects.length) return null

  const project = projects[0]!

  if (project.vercel_deployment_url) {
    if (!isTrustedVercelDeploymentUrl(project.vercel_deployment_url)) return null
    const route: CachedRoute = {
      projectId: project.id,
      userId: project.user_id,
      vercelDeploymentUrl: project.vercel_deployment_url,
      flyMachineUrl: '',
      flyMachineId: '',
    }
    await env.SLUG_CACHE.put(slug, JSON.stringify(route), { expirationTtl: CACHE_TTL })
    return route
  }

  const profileRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${project.user_id}&select=fly_machine_id`,
    { headers: supaHeaders },
  )
  if (!profileRes.ok) return null
  const profiles = (await profileRes.json()) as Array<{
    fly_machine_id: string | null
  }>
  if (!profiles.length || !profiles[0]!.fly_machine_id) return null

  const route: CachedRoute = {
    projectId: project.id,
    userId: project.user_id,
    vercelDeploymentUrl: null,
    flyMachineUrl: flyRuntimeUrl,
    flyMachineId: profiles[0]!.fly_machine_id,
  }

  await env.SLUG_CACHE.put(slug, JSON.stringify(route), { expirationTtl: CACHE_TTL })
  return route
}

function isCachedAgentRoute(v: unknown, flyRuntimeUrl: string): v is CachedAgentRoute {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  const runtimeSource = o.runtimeSource
  const runtimeUrl = typeof o.runtimeUrl === 'string' ? o.runtimeUrl : ''
  return (
    typeof o.userId === 'string' &&
    (o.orgId === null || typeof o.orgId === 'string') &&
    (runtimeSource === 'fly_machine' || runtimeSource === 'shared_railway') &&
    (runtimeSource === 'fly_machine'
      ? runtimeUrl === flyRuntimeUrl && typeof o.flyMachineId === 'string'
      : isTrustedSharedRuntimeUrl(runtimeUrl, flyRuntimeUrl) &&
        (o.flyMachineId === null || typeof o.flyMachineId === 'string'))
  )
}

function isCachedAgentInfo(v: unknown): v is CachedAgentInfo {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return typeof o.agentToken === 'string' && Array.isArray(o.widgetAllowedOrigins)
}

async function resolveAgentRoute(slug: string, env: Env): Promise<CachedAgentRoute | null> {
  const flyRuntimeUrl = resolveFlyRuntimeUrl(env)
  const cacheKey = `agent-route:${slug}`
  const cached = await env.SLUG_CACHE.get(cacheKey, 'json')
  if (isCachedAgentRoute(cached, flyRuntimeUrl)) return cached

  const supaHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  }

  // 1) Org slugs own the shared namespace. Resolve them before personal public slugs.
  const orgRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/organizations?slug=eq.${encodeURIComponent(slug)}&select=id,owner_id`,
    { headers: supaHeaders },
  )
  if (!orgRes.ok) return null
  const orgs = (await orgRes.json()) as Array<{ id: string; owner_id: string | null }>
  if (orgs.length) {
    const org = orgs[0]!
    const ownerId = org.owner_id
    if (!ownerId) return null

    const ownerRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${ownerId}&select=fly_machine_id,agent_runtime_type,agent_runtime_url`,
      { headers: supaHeaders },
    )
    if (!ownerRes.ok) return null
    const owners = (await ownerRes.json()) as Array<{
      fly_machine_id: string | null
      agent_runtime_type?: string | null
      agent_runtime_url?: string | null
    }>
    const ownerMachineId = owners[0]?.fly_machine_id
    if (!owners.length) return null
    const ownerRuntimeType = owners[0]?.agent_runtime_type
    const ownerRuntimeUrl = owners[0]?.agent_runtime_url
    const useSharedRuntime =
      ownerRuntimeType === 'shared_railway' &&
      typeof ownerRuntimeUrl === 'string' &&
      isTrustedSharedRuntimeUrl(ownerRuntimeUrl, flyRuntimeUrl)
    if (!useSharedRuntime && !ownerMachineId) return null

    const route: CachedAgentRoute = {
      userId: ownerId,
      orgId: org.id,
      runtimeSource: useSharedRuntime ? 'shared_railway' : 'fly_machine',
      runtimeUrl: useSharedRuntime ? ownerRuntimeUrl! : flyRuntimeUrl,
      flyMachineId: ownerMachineId ?? null,
    }
    await env.SLUG_CACHE.put(cacheKey, JSON.stringify(route), { expirationTtl: CACHE_TTL })
    return route
  }

  // 2) No org owns this slug, so try personal public slug.
  const profileRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?public_agent_slug=eq.${encodeURIComponent(slug)}&select=id,fly_machine_id,agent_runtime_type,agent_runtime_url`,
    { headers: supaHeaders },
  )
  if (!profileRes.ok) return null
  const profiles = (await profileRes.json()) as Array<{
    id: string
    fly_machine_id: string | null
    agent_runtime_type?: string | null
    agent_runtime_url?: string | null
  }>
  const profile = profiles[0]!
  const flyMachineId = profile?.fly_machine_id
  const useSharedRuntime =
    profile?.agent_runtime_type === 'shared_railway' &&
    typeof profile.agent_runtime_url === 'string' &&
    isTrustedSharedRuntimeUrl(profile.agent_runtime_url, flyRuntimeUrl)
  if (!profiles.length || (!useSharedRuntime && !flyMachineId)) return null
  const route: CachedAgentRoute = {
    userId: profile.id,
    orgId: null,
    runtimeSource: useSharedRuntime ? 'shared_railway' : 'fly_machine',
    runtimeUrl: useSharedRuntime ? profile.agent_runtime_url! : flyRuntimeUrl,
    flyMachineId: flyMachineId ?? null,
  }
  await env.SLUG_CACHE.put(cacheKey, JSON.stringify(route), { expirationTtl: CACHE_TTL })
  return route
}

function agentScopeFilter(route: CachedAgentRoute): string {
  return route.orgId
    ? `org_id=eq.${route.orgId}&user_id=is.null`
    : `user_id=eq.${route.userId}&org_id=is.null`
}

function agentScopeKey(route: CachedAgentRoute): string {
  return route.orgId ? `org:${route.orgId}` : `user:${route.userId}`
}

async function resolveAgentDetails(
  route: CachedAgentRoute,
  agentKey: string,
  env: Env,
): Promise<AgentDetails | null> {
  const cacheKey = `agent-details:${agentScopeKey(route)}:${agentKey}`
  const cached = await env.SLUG_CACHE.get(cacheKey, 'json')
  if (cached && typeof cached === 'object' && 'name' in (cached as Record<string, unknown>)) {
    return cached as AgentDetails
  }

  const supaHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/agents_registry?${agentScopeFilter(route)}&agent_key=eq.${encodeURIComponent(agentKey)}&or=(public_page_enabled.eq.true,widget_enabled.eq.true)&select=name,role,image_url`,
    { headers: supaHeaders },
  )
  if (!res.ok) return null
  const rows = (await res.json()) as Array<{ name: string; role: string; image_url: string | null }>
  if (!rows.length) return null

  const details: AgentDetails = {
    name: rows[0]!.name,
    role: rows[0]!.role ?? '',
    imageUrl: rows[0]!.image_url,
  }
  await env.SLUG_CACHE.put(cacheKey, JSON.stringify(details), { expirationTtl: CACHE_TTL })
  return details
}

async function resolveAgentInfo(
  route: CachedAgentRoute,
  agentKey: string,
  env: Env,
): Promise<CachedAgentInfo | null> {
  const supaHeaders = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  }

  const agentRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/agents_registry?${agentScopeFilter(route)}&agent_key=eq.${encodeURIComponent(agentKey)}&or=(public_page_enabled.eq.true,widget_enabled.eq.true)&select=public_page_token,widget_allowed_origins`,
    { headers: supaHeaders },
  )
  if (!agentRes.ok) return null
  const agents = (await agentRes.json()) as Array<{
    public_page_token: string
    widget_allowed_origins: string[] | null
  }>
  if (!agents.length) return null

  const info: CachedAgentInfo = {
    agentToken: agents[0]!.public_page_token,
    widgetAllowedOrigins: agents[0]!.widget_allowed_origins ?? [],
  }
  return info
}

function notFoundHtml(slug: string, appsDomainSuffix: string): string {
  return `<!DOCTYPE html>
<html><head><title>Not Found</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1116;color:#e5e7eb;font-family:system-ui,sans-serif}
.c{text-align:center;max-width:400px;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem}p{opacity:.7;margin:0}</style></head>
<body><div class="c"><h1>App not found</h1><p>No published app at <strong>${slug}${appsDomainSuffix}</strong></p></div></body></html>`
}

function agentNotFoundHtml(userSlug: string, publicAgentHostSuffix: string): string {
  return `<!DOCTYPE html>
<html><head><title>Not Found</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1116;color:#e5e7eb;font-family:system-ui,sans-serif}
.c{text-align:center;max-width:400px;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem}p{opacity:.7;margin:0}</style></head>
<body><div class="c"><h1>Agent not found</h1><p>No public agent at <strong>${userSlug}.${publicAgentHostSuffix}</strong></p></div></body></html>`
}

function unavailableHtml(): string {
  return `<!DOCTYPE html>
<html><head><title>Unavailable</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1116;color:#e5e7eb;font-family:system-ui,sans-serif}
.c{text-align:center;max-width:400px;padding:2rem}h1{font-size:1.5rem;margin:0 0 .5rem}p{opacity:.7;margin:0}</style></head>
<body><div class="c"><h1>App is starting</h1><p>Please try again in a moment.</p></div></body></html>`
}
