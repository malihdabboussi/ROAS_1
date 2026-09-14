import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FirefliesApiService } from '../fireflies-api.service'

const adminMock = vi.hoisted(() => {
  const existingRows = new Map<string, unknown>()
  const makeChain = (table: string) => {
    const chain: Record<string, any> = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({
        data: existingRows.get(table) ?? null,
        error: null,
      }),
      update: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
    }
    return chain
  }
  return { existingRows, makeChain }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => adminMock.makeChain(table),
  }),
}))

const WEBHOOK_KEY = 'k'.repeat(24)
const WEBHOOK_URL = expect.stringMatching(
  new RegExp(`/api/integrations/meetings/webhooks/fireflies/${WEBHOOK_KEY}$`),
)

describe('FirefliesApiService', () => {
  const vault = {
    storeSecret: vi.fn(),
    deleteSecret: vi.fn(),
    hasSecret: vi.fn(),
    getSecret: vi.fn(),
  }
  const fireflies = {
    getUser: vi.fn(),
    listTranscripts: vi.fn(),
    getTranscript: vi.fn(),
  }
  const repo = {
    upsertConnection: vi.fn(),
    markDisconnected: vi.fn(),
    getStatus: vi.fn(),
    hasMemorySession: vi.fn(),
    ensureWebhookKey: vi.fn().mockResolvedValue(WEBHOOK_KEY),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repo.ensureWebhookKey.mockResolvedValue(WEBHOOK_KEY)
    adminMock.existingRows.clear()
  })

  it('connects by validating the API key, storing secrets, and returning the webhook address', async () => {
    fireflies.getUser.mockResolvedValue({ email: 'person@example.com', name: 'Person' })
    repo.upsertConnection.mockResolvedValue(undefined)
    const service = new FirefliesApiService(fireflies as never, vault as never, repo as never)

    await expect(service.connect('user-1', 'ff-key', 'a-signing-secret-1234')).resolves.toEqual({
      user: { email: 'person@example.com', name: 'Person' },
      webhookUrl: WEBHOOK_URL,
    })

    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user-1',
      'fireflies',
      'api_key',
      'ff-key',
      'api_key',
      { email: 'person@example.com', name: 'Person' },
    )
    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user-1',
      'fireflies',
      'webhook_secret',
      'a-signing-secret-1234',
      'custom',
      {},
    )
    expect(repo.ensureWebhookKey).toHaveBeenCalledWith('user-1')
  })

  it('connects without a webhook secret and stores only the API key', async () => {
    fireflies.getUser.mockResolvedValue({ email: 'person@example.com', name: 'Person' })
    const service = new FirefliesApiService(fireflies as never, vault as never, repo as never)

    await service.connect('user-1', 'ff-key')

    expect(vault.storeSecret).toHaveBeenCalledTimes(1)
  })

  it('returns disconnected status when no Fireflies secret exists', async () => {
    vault.hasSecret.mockResolvedValue(false)
    repo.getStatus.mockResolvedValue(null)
    const service = new FirefliesApiService(fireflies as never, vault as never, repo as never)

    await expect(service.getStatus('user-1')).resolves.toEqual({
      connected: false,
      status: null,
      email: null,
      name: null,
      connectedAt: null,
      webhookUrl: null,
      webhookConfigured: false,
    })
  })

  it('returns the webhook address and whether its secret is set when connected', async () => {
    vault.hasSecret.mockImplementation(async (_u: string, _p: string, label: string) =>
      label === 'api_key' ? true : label === 'webhook_secret',
    )
    repo.getStatus.mockResolvedValue({
      connected: true,
      status: 'connected',
      email: 'person@example.com',
      name: 'Person',
      connectedAt: '2026-09-14T00:00:00.000Z',
      webhookKey: WEBHOOK_KEY,
    })
    const service = new FirefliesApiService(fireflies as never, vault as never, repo as never)

    await expect(service.getStatus('user-1')).resolves.toMatchObject({
      connected: true,
      webhookUrl: WEBHOOK_URL,
      webhookConfigured: true,
    })
  })

  it('refuses to store a webhook secret before the API key is connected', async () => {
    vault.hasSecret.mockResolvedValue(false)
    const service = new FirefliesApiService(fireflies as never, vault as never, repo as never)
    await expect(service.updateWebhookSecret('user-1', 'a-signing-secret-1234')).rejects.toThrow(
      /not connected/,
    )
  })

  it('removes both secrets on disconnect', async () => {
    const service = new FirefliesApiService(fireflies as never, vault as never, repo as never)
    await service.disconnect('user-1')
    expect(vault.deleteSecret).toHaveBeenCalledWith('user-1', 'fireflies', 'api_key')
    expect(vault.deleteSecret).toHaveBeenCalledWith('user-1', 'fireflies', 'webhook_secret')
    expect(repo.markDisconnected).toHaveBeenCalledWith('user-1')
  })
})
