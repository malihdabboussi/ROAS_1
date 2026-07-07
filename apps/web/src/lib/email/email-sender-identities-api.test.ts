import { beforeEach, describe, expect, it, vi } from 'vitest'
import { backendGet } from '@/lib/api/backend-client'
import { senderIdentitiesApi } from './email-sender-identities-api'

vi.mock('@/lib/api/backend-client', () => ({
  backendGet: vi.fn(),
}))

const backendGetMock = vi.mocked(backendGet)

describe('email sender identities API', () => {
  beforeEach(() => {
    backendGetMock.mockReset()
  })

  it('lists sender identities through the shared backend route', async () => {
    backendGetMock.mockResolvedValue({
      success: true,
      senderIdentities: [{ id: 'identity-1', is_verified: true }],
    })

    await expect(senderIdentitiesApi.list()).resolves.toEqual({
      success: true,
      senderIdentities: [{ id: 'identity-1', is_verified: true }],
    })
    expect(backendGetMock).toHaveBeenCalledWith('/api/email/sender-identities')
  })
})
