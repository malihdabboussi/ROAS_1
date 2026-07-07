import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FathomApiService } from '../fathom-api.service'

describe('FathomApiService', () => {
  let service: FathomApiService
  let repo: Record<string, ReturnType<typeof vi.fn>>

  beforeEach(() => {
    repo = {
      listConnectedWebhookRows: vi.fn(),
    }
    service = new FathomApiService({} as any, {} as any, repo as any)
  })

  it('resolves a unique webhook secret match', async () => {
    repo.listConnectedWebhookRows.mockResolvedValue([
      { user_id: 'user_a', metadata: { webhook_secret: 'whsec_a' } },
      { user_id: 'user_b', metadata: { webhook_secret: 'whsec_b' } },
    ])

    await expect(service.resolveUserByWebhookSecret('whsec_b')).resolves.toBe('user_b')
  })

  it('refuses to resolve duplicate webhook secret matches', async () => {
    repo.listConnectedWebhookRows.mockResolvedValue([
      { user_id: 'user_a', metadata: { webhook_secret: 'whsec_shared' } },
      { user_id: 'user_b', metadata: { webhook_secret: 'whsec_shared' } },
    ])

    await expect(service.resolveUserByWebhookSecret('whsec_shared')).resolves.toBeNull()
  })
})
