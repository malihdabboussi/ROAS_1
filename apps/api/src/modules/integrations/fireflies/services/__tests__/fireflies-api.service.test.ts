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
  }

  beforeEach(() => {
    vi.clearAllMocks()
    adminMock.existingRows.clear()
  })

  it('connects by validating the API key and storing Fireflies metadata', async () => {
    fireflies.getUser.mockResolvedValue({ email: 'person@example.com', name: 'Person' })
    repo.upsertConnection.mockResolvedValue(undefined)
    const service = new FirefliesApiService(fireflies as never, vault as never, repo as never)

    await expect(service.connect('user-1', 'ff-key')).resolves.toEqual({
      user: { email: 'person@example.com', name: 'Person' },
    })

    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user-1',
      'fireflies',
      'api_key',
      'ff-key',
      'api_key',
      { email: 'person@example.com', name: 'Person' },
    )
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
    })
  })
})
