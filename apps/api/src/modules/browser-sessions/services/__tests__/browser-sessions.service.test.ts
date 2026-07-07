import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { BrowserSessionsRepository } from '../../repositories/browser-sessions.repository'
import { BrowserSessionsService } from '../browser-sessions.service'

function createQuery(result: Record<string, unknown>) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    update: vi.fn(() => query),
    insert: vi.fn(() => Promise.resolve(result)),
    delete: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: Record<string, unknown>) => unknown) =>
      Promise.resolve(resolve(result)),
  }
  return query
}

describe('BrowserSessionsService', () => {
  it('requires consent before syncing cookies', async () => {
    const consentQuery = createQuery({ data: { browser_session_consent_at: null }, error: null })
    const supabase = { from: vi.fn(() => consentQuery) }
    const service = new BrowserSessionsService(
      { encrypt: vi.fn() } as never,
      new BrowserSessionsRepository(),
    )

    await expect(
      service.syncSession(supabase as never, 'user-1', null, {
        domain: 'example.com',
        cookies: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('inserts a new browser session with encrypted cookies after consent', async () => {
    const consentQuery = createQuery({
      data: { browser_session_consent_at: '2026-06-10T00:00:00.000Z' },
      error: null,
    })
    const domainsQuery = createQuery({ data: [{ domain: 'example.com' }], error: null })
    const existingQuery = createQuery({ data: null, error: null })
    const insertQuery = createQuery({ error: null })
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(consentQuery)
        .mockReturnValueOnce(domainsQuery)
        .mockReturnValueOnce(existingQuery)
        .mockReturnValueOnce(insertQuery),
    }
    const service = new BrowserSessionsService(
      { encrypt: vi.fn(() => 'encrypted') } as never,
      new BrowserSessionsRepository(),
    )

    await service.syncSession(supabase as never, 'user-1', 'org-1', {
      domain: 'example.com',
      cookies: [{ name: 'sid', value: 'abc', domain: 'example.com', expires: 1_800_000_000 }],
    })

    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        org_id: 'org-1',
        domain: 'example.com',
        encrypted_cookies: 'encrypted',
        cookie_count: 1,
        min_expires_at: new Date(1_800_000_000 * 1000).toISOString(),
        disabled_at: null,
      }),
    )
  })

  it('throws not found when disabling a missing session', async () => {
    const query = createQuery({ data: [], error: null })
    const supabase = { from: vi.fn(() => query) }
    const service = new BrowserSessionsService(
      { encrypt: vi.fn() } as never,
      new BrowserSessionsRepository(),
    )

    await expect(
      service.setDisabled(supabase as never, 'user-1', null, 'example.com', true),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
