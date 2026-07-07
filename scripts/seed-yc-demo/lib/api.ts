/**
 * Thin HTTP client for hitting apps/api endpoints from the seeder.
 *
 * Some seeding operations (createOrg, hireReadyEmployee) MUST go through
 * apps/api so all side effects fire (agent sync, brain bootstrap, etc.).
 * Other operations write directly via service-role Supabase. This client
 * covers the HTTP path.
 *
 * Auth model — matches packages/api-shared/src/guards/auth.guard.ts:
 *   - `x-internal-token: <INTERNAL_API_TOKEN>` is required on every call
 *   - `x-user-id: <userId>` is required for endpoints behind AuthGuard so
 *     the request impersonates that user (request.user.id = <userId>)
 *   - For endpoints that also need org context (OrgContextGuard +
 *     @RequireOrgRole), pass `orgId` so we send `x-org-id`.
 *
 * Endpoints behind `@UseGuards(InternalAuthGuard)` (e.g. /internal/...)
 * read the same `x-internal-token` header and do NOT need x-user-id.
 */
import type { SeederEnv } from './env'

export interface ApiCallOpts {
  /** Impersonate this user on AuthGuard-protected routes. */
  userId?: string
  /** Set x-org-id for OrgContextGuard-protected routes. */
  orgId?: string
}

export interface ApiClient {
  post<TBody, TResp>(path: string, body: TBody, opts?: ApiCallOpts): Promise<TResp>
  get<TResp>(path: string, opts?: ApiCallOpts): Promise<TResp>
  delete<TResp>(path: string, opts?: ApiCallOpts): Promise<TResp>
  patch<TBody, TResp>(path: string, body: TBody, opts?: ApiCallOpts): Promise<TResp>
}

export function createApiClient(env: SeederEnv): ApiClient {
  const baseUrl = env.apiBaseUrl.replace(/\/$/, '')

  function buildHeaders(opts?: ApiCallOpts): Record<string, string> {
    const h: Record<string, string> = {
      'content-type': 'application/json',
      // AuthGuard (e.g. /org) reads x-internal-token + x-user-id (impersonation)
      'x-internal-token': env.internalApiToken,
      // InternalAuthGuard (e.g. /internal/agents/hire-ready) reads Authorization: Bearer <token>
      authorization: `Bearer ${env.internalApiToken}`,
    }
    if (opts?.userId) h['x-user-id'] = opts.userId
    if (opts?.orgId) h['x-org-id'] = opts.orgId
    return h
  }

  async function request(
    method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
    path: string,
    body?: unknown,
    opts?: ApiCallOpts,
  ): Promise<unknown> {
    const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    const res = await fetch(url, {
      method,
      headers: buildHeaders(opts),
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${method} ${path} → ${res.status} ${res.statusText}: ${text}`)
    }
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) return res.json()
    return res.text()
  }

  return {
    async post<TBody, TResp>(path: string, body: TBody, opts?: ApiCallOpts): Promise<TResp> {
      return (await request('POST', path, body, opts)) as TResp
    },
    async get<TResp>(path: string, opts?: ApiCallOpts): Promise<TResp> {
      return (await request('GET', path, undefined, opts)) as TResp
    },
    async delete<TResp>(path: string, opts?: ApiCallOpts): Promise<TResp> {
      return (await request('DELETE', path, undefined, opts)) as TResp
    },
    async patch<TBody, TResp>(path: string, body: TBody, opts?: ApiCallOpts): Promise<TResp> {
      return (await request('PATCH', path, body, opts)) as TResp
    },
  }
}
