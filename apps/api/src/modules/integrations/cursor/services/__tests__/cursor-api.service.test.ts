import { describe, expect, it, vi } from 'vitest'
import { CursorIntegration } from '../../integrations/cursor.integration'
import { CursorApiService } from '../cursor-api.service'

function createRepo(overrides: Record<string, unknown> = {}) {
  return {
    findConnectionById: vi.fn(),
    findOrgDefault: vi.fn(),
    findLatestOrgShared: vi.fn(),
    findPersonalDefault: vi.fn(),
    findLatestPersonal: vi.fn(),
    listConnections: vi.fn(),
    disconnectConnections: vi.fn(),
    ...overrides,
  }
}

describe('CursorApiService.getActiveConnection', () => {
  it('returns explicit connection by id', async () => {
    const cursor = {
      validateApiKey: vi.fn(),
      createAgent: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    } as unknown as CursorIntegration
    const repo = createRepo({
      findConnectionById: vi.fn().mockResolvedValue({
        id: 'conn-1',
        user_id: 'user-1',
        org_id: null,
        access_token: 'key_abc',
        metadata: { webhook_secret: 'whsec' },
        scope_mode: 'personal',
        is_default: true,
        status: 'connected',
      }),
    })
    const service = new CursorApiService(cursor, repo as never)

    const result = await service.getActiveConnection({} as never, {
      userId: 'user-1',
      orgId: null,
      connectionId: 'conn-1',
    })

    expect(result.integrationRowId).toBe('conn-1')
    expect(result.apiKey).toBe('key_abc')
    expect(result.webhookSecret).toBe('whsec')
  })

  it('throws when no connection exists', async () => {
    const repo = createRepo()
    const service = new CursorApiService({} as CursorIntegration, repo as never)

    await expect(
      service.getActiveConnection({} as never, { userId: 'user-1', orgId: null }),
    ).rejects.toThrow('No active Cursor integration for this scope')
  })
})
