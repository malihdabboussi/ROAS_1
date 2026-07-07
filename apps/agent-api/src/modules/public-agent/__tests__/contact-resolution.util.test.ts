import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveContactViaInternalApi } from '../contact-resolution.util'

const INPUT = {
  userId: 'user-1',
  orgId: 'org-1',
  email: 'visitor@x.com',
  firstName: 'Vis',
  lastName: 'Itor',
  campaignId: 'campaign-1',
  agentKey: 'zara',
}

describe('resolveContactViaInternalApi', () => {
  beforeEach(() => {
    process.env.MAIN_API_URL = 'http://main-api.test'
    process.env.INTERNAL_API_TOKEN = 'internal-token'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('returns the contact id on success and sends the internal auth header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ contact_id: 'contact-1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const contactId = await resolveContactViaInternalApi(INPUT)

    expect(contactId).toBe('contact-1')
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://main-api.test/api/internal/contacts/resolve')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer internal-token')
    expect(JSON.parse(init.body as string)).toMatchObject({
      user_id: 'user-1',
      org_id: 'org-1',
      email: 'visitor@x.com',
      channel: 'widget',
      campaign_id: 'campaign-1',
      agent_key: 'zara',
    })
  })

  it('returns null on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(resolveContactViaInternalApi(INPUT)).resolves.toBeNull()
  })

  it('returns null on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))
    await expect(resolveContactViaInternalApi(INPUT)).resolves.toBeNull()
  })

  it('returns null when the internal token is not configured', async () => {
    process.env.INTERNAL_API_TOKEN = ''
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(resolveContactViaInternalApi(INPUT)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aborts and returns null after the 5s timeout', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(
      (_url: unknown, init: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const pending = resolveContactViaInternalApi(INPUT)
    await vi.advanceTimersByTimeAsync(5_100)
    await expect(pending).resolves.toBeNull()
  })
})
