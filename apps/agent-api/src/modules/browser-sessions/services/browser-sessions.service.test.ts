import { afterEach, describe, expect, it, vi } from 'vitest'
import { BrowserSessionsRepository } from '../repositories/browser-sessions.repository'
import { BrowserSessionsService, type BrowserCookie } from './browser-sessions.service'

function makeQuery(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const query: Record<string, any> = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.is = vi.fn(() => query)
  query.limit = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.update = vi.fn(() => query)
  query.delete = vi.fn(() => query)
  query.maybeSingle = vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }))
  query.upsert = vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null }))
  query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(
      resolve,
      reject,
    )
  return query
}

function makeSupabase(queries: Record<string, Array<Record<string, any>>>) {
  return {
    from: vi.fn((table: string) => {
      const query = queries[table]?.shift()
      if (!query) throw new Error(`Unexpected table query: ${table}`)
      return query
    }),
  }
}

describe('BrowserSessionsService', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('requires browser session consent before syncing cookies', async () => {
    const profilesQuery = makeQuery({ data: { browser_session_consent_at: null } })
    const browserQuery = makeQuery()
    const supabase = makeSupabase({
      profiles: [profilesQuery],
      browser_sessions: [browserQuery],
    })
    const service = new BrowserSessionsService(
      new BrowserSessionsRepository({ client: supabase } as never),
    )

    const result = await service.syncCookies(
      'user-1',
      'org-1',
      'Example.com',
      [{ name: 'sid', value: 'secret', domain: '.example.com' }],
    )

    expect(result).toEqual({ ok: false, error: 'browser_session_consent_required' })
    expect(browserQuery.upsert).not.toHaveBeenCalled()
  })

  it('upserts encrypted cookies with domain scope and preserves first sync time', async () => {
    vi.stubEnv('BROWSER_SESSION_ENCRYPTION_KEY', 'test-key')
    const cookies: BrowserCookie[] = [
      {
        name: 'sid',
        value: 'secret',
        domain: '.example.com',
        path: '/',
        expires: 1_800_000_000,
        secure: true,
      },
    ]
    const profilesQuery = makeQuery({
      data: { browser_session_consent_at: '2026-01-01T00:00:00.000Z' },
    })
    const existingQuery = makeQuery({
      data: {
        first_synced_at: '2026-01-02T00:00:00.000Z',
        disabled_at: null,
      },
    })
    const upsertQuery = makeQuery()
    const supabase = makeSupabase({
      profiles: [profilesQuery],
      browser_sessions: [existingQuery, upsertQuery],
    })
    const service = new BrowserSessionsService(
      new BrowserSessionsRepository({ client: supabase } as never),
    )

    const result = await service.syncCookies(
      'user-1',
      'org-1',
      'Example.com',
      cookies,
    )

    expect(result).toEqual({ ok: true })
    expect(upsertQuery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        domain: 'example.com',
        cookie_count: 1,
        first_synced_at: '2026-01-02T00:00:00.000Z',
        min_expires_at: '2027-01-15T08:00:00.000Z',
        disabled_at: null,
      }),
      { onConflict: 'user_id,org_id,domain' },
    )
    const [row] = upsertQuery.upsert.mock.calls[0]
    expect(row.encrypted_cookies).not.toContain('secret')

    const loadQuery = makeQuery({
      data: {
        encrypted_cookies: row.encrypted_cookies,
        disabled_at: null,
      },
    })
    const loadSupabase = makeSupabase({ browser_sessions: [loadQuery] })
    const loadService = new BrowserSessionsService(
      new BrowserSessionsRepository({ client: loadSupabase } as never),
    )
    await expect(
      loadService.loadCookies('user-1', 'org-1', 'Example.com'),
    ).resolves.toEqual(cookies)
  })

  it('reuses existing consent timestamps without updating the profile row', async () => {
    const profilesQuery = makeQuery({
      data: { browser_session_consent_at: '2026-01-03T00:00:00.000Z' },
    })
    const supabase = makeSupabase({ profiles: [profilesQuery] })
    const service = new BrowserSessionsService(
      new BrowserSessionsRepository({ client: supabase } as never),
    )

    await expect(service.recordUserConsent('user-1')).resolves.toEqual({
      consent_at: '2026-01-03T00:00:00.000Z',
    })
    expect(profilesQuery.update).not.toHaveBeenCalled()
  })
})
