import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadAiApiService } from '../read-ai-api.service'

const KEY = 'GHx4YT/StkcArjYPypjFG48FbZvgzBuDBOz5pCecbro='
const WEBHOOK_KEY = 'k'.repeat(24)

describe('ReadAiApiService', () => {
  let vault: Record<string, ReturnType<typeof vi.fn>>
  let connections: Record<string, ReturnType<typeof vi.fn>>
  let service: ReadAiApiService

  beforeEach(() => {
    vault = {
      storeSecret: vi.fn().mockResolvedValue(undefined),
      deleteSecret: vi.fn().mockResolvedValue(undefined),
      hasSecret: vi.fn().mockResolvedValue(true),
    }
    connections = {
      upsertPastedWebhookConnection: vi.fn().mockResolvedValue(undefined),
      ensureWebhookKey: vi.fn().mockResolvedValue(WEBHOOK_KEY),
      markPastedWebhookDisconnected: vi.fn().mockResolvedValue(undefined),
      findConnectionForUser: vi.fn().mockResolvedValue({
        id: 'conn_1',
        userId: 'user_1',
        orgId: null,
        provider: 'read_ai',
        status: 'connected',
        metadata: { webhook_key: WEBHOOK_KEY },
      }),
    }
    service = new ReadAiApiService(vault as never, connections as never)
  })

  it('stores the signing key, creates the connection, and returns the address to paste into Read AI', async () => {
    const result = await service.connect('user_1', ` ${KEY} `)
    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user_1',
      'read_ai',
      'signing_key',
      KEY,
      'custom',
      {},
    )
    expect(connections.upsertPastedWebhookConnection).toHaveBeenCalledWith('read_ai', 'user_1', {
      connectionLabel: 'Read AI',
    })
    expect(result.webhookUrl).toMatch(
      new RegExp(`/api/integrations/meetings/webhooks/read_ai/${WEBHOOK_KEY}$`),
    )
  })

  it('rejects a value that is not a signing key before touching the vault', async () => {
    await expect(service.connect('user_1', 'short')).rejects.toThrow(/signing key/)
    expect(vault.storeSecret).not.toHaveBeenCalled()
  })

  it('reports connected with the webhook address, and disconnected without a connection row', async () => {
    await expect(service.getStatus('user_1')).resolves.toMatchObject({
      connected: true,
      webhookConfigured: true,
      webhookUrl: expect.stringMatching(new RegExp(`/read_ai/${WEBHOOK_KEY}$`)),
    })
    connections.findConnectionForUser.mockResolvedValue(null)
    vault.hasSecret.mockResolvedValue(false)
    await expect(service.getStatus('user_1')).resolves.toEqual({
      connected: false,
      status: null,
      connectedAt: null,
      webhookUrl: null,
      webhookConfigured: false,
    })
  })

  it('removes the key and marks the row disconnected while keeping its webhook key', async () => {
    await service.disconnect('user_1')
    expect(vault.deleteSecret).toHaveBeenCalledWith('user_1', 'read_ai', 'signing_key')
    expect(connections.markPastedWebhookDisconnected).toHaveBeenCalledWith('read_ai', 'user_1')
  })
})
