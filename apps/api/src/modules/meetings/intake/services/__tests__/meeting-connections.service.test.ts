import { BadRequestException, NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NoteTakerDefinition } from '../../../custom/note-taker-definition.schema'
import { MeetingConnectionsService } from '../meeting-connections.service'

const KEY = 'k'.repeat(24)

function definition(overrides: Partial<NoteTakerDefinition> = {}): NoteTakerDefinition {
  return {
    id: 'def_1',
    slug: 'nt_otter',
    displayName: 'Otter',
    signature: { scheme: 'hmac_sha256', header: 'X-Sig', encoding: 'hex', keyEncoding: 'utf8' },
    event: {},
    fieldMap: { externalId: 'id', transcript: { path: 'turns[]', text: 'text' } },
    isActive: true,
    createdBy: 'admin_1',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('MeetingConnectionsService', () => {
  let connections: Record<string, ReturnType<typeof vi.fn>>
  let definitions: { findBySlug: ReturnType<typeof vi.fn> }
  let vault: Record<string, ReturnType<typeof vi.fn>>
  let registry: { resolve: ReturnType<typeof vi.fn> }
  let service: MeetingConnectionsService

  beforeEach(() => {
    connections = {
      ensurePendingWebhookConnection: vi.fn().mockResolvedValue(undefined),
      upsertPastedWebhookConnection: vi.fn().mockResolvedValue(undefined),
      ensureWebhookKey: vi.fn().mockResolvedValue(KEY),
      markPastedWebhookDisconnected: vi.fn().mockResolvedValue(undefined),
      findAnyConnectionForUser: vi.fn().mockResolvedValue(null),
    }
    definitions = { findBySlug: vi.fn().mockResolvedValue(definition()) }
    vault = {
      storeSecret: vi.fn().mockResolvedValue(undefined),
      deleteSecret: vi.fn().mockResolvedValue(undefined),
      hasSecret: vi.fn().mockResolvedValue(true),
    }
    registry = {
      resolve: vi.fn(async (id: string) =>
        id === 'read_ai'
          ? {
              identity: {
                id: 'read_ai',
                auth: 'signing_key',
                manifest: { displayName: 'Read AI', personalOnly: true, logoKey: 'read_ai' },
              },
              push: {},
            }
          : id === 'fathom'
            ? {
                identity: { id: 'fathom', auth: 'oauth2', manifest: { displayName: 'Fathom' } },
                push: {},
              }
            : null,
      ),
    }
    service = new MeetingConnectionsService(
      connections as never,
      definitions as never,
      vault as never,
      registry as never,
      {
        get: (key: string) => (key === 'PUBLIC_API_URL' ? 'https://api.roas.io/' : undefined),
      } as never,
    )
  })

  it('hands out the address before connecting by preparing a pending row', async () => {
    await expect(service.webhookAddress('nt_otter', 'user_1')).resolves.toEqual({
      webhookUrl: `https://api.roas.io/api/integrations/meetings/webhooks/nt_otter/${KEY}`,
    })
    expect(connections.ensurePendingWebhookConnection).toHaveBeenCalledWith('nt_otter', 'user_1', {
      connectionLabel: 'Otter',
    })
    expect(connections.upsertPastedWebhookConnection).not.toHaveBeenCalled()
  })

  it('hands out the address for built-in pasted-webhook tools, but not OAuth ones', async () => {
    await expect(service.webhookAddress('read_ai', 'user_1')).resolves.toEqual({
      webhookUrl: `https://api.roas.io/api/integrations/meetings/webhooks/read_ai/${KEY}`,
    })
    expect(connections.ensurePendingWebhookConnection).toHaveBeenCalledWith('read_ai', 'user_1', {
      connectionLabel: 'Read AI',
    })
    expect(definitions.findBySlug).not.toHaveBeenCalled()
    await expect(service.webhookAddress('fathom', 'user_1')).rejects.toBeInstanceOf(
      NotFoundException,
    )
    await expect(service.webhookAddress('slack', 'user_1')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('connects with a secret stored under the slug and returns the same address', async () => {
    await expect(service.connect('nt_otter', 'user_1', '  top-secret-value ')).resolves.toEqual({
      webhookUrl: `https://api.roas.io/api/integrations/meetings/webhooks/nt_otter/${KEY}`,
    })
    expect(vault.storeSecret).toHaveBeenCalledWith(
      'user_1',
      'nt_otter',
      'signing_key',
      'top-secret-value',
      'custom',
      {},
    )
    expect(connections.upsertPastedWebhookConnection).toHaveBeenCalledWith('nt_otter', 'user_1', {
      connectionLabel: 'Otter',
    })
  })

  it('requires a secret only when the definition signs deliveries', async () => {
    await expect(service.connect('nt_otter', 'user_1', 'short')).rejects.toBeInstanceOf(
      BadRequestException,
    )
    definitions.findBySlug.mockResolvedValue(definition({ signature: { scheme: 'none' } }))
    await service.connect('nt_otter', 'user_1', undefined)
    expect(vault.storeSecret).not.toHaveBeenCalled()
  })

  it('404s ids that are not defined note takers, including built-ins', async () => {
    await expect(service.connect('fireflies', 'user_1', 'x'.repeat(20))).rejects.toBeInstanceOf(
      NotFoundException,
    )
    definitions.findBySlug.mockResolvedValue(null)
    await expect(service.status('nt_gone', 'user_1')).rejects.toBeInstanceOf(NotFoundException)
    expect(definitions.findBySlug).toHaveBeenCalledWith('nt_gone', { activeOnly: true })
  })

  it('disconnect deletes the secret and keeps the key for a later reconnect', async () => {
    await service.disconnect('nt_otter', 'user_1')
    expect(vault.deleteSecret).toHaveBeenCalledWith('user_1', 'nt_otter', 'signing_key')
    expect(connections.markPastedWebhookDisconnected).toHaveBeenCalledWith('nt_otter', 'user_1')
  })

  it('reports status from the row, the vault and the definition', async () => {
    await expect(service.status('nt_otter', 'user_1')).resolves.toEqual({
      connected: false,
      status: null,
      connectedAt: null,
      webhookUrl: null,
      requiresSecret: true,
      secretConfigured: true,
    })
    connections.findAnyConnectionForUser.mockResolvedValue({
      id: 'c1',
      userId: 'user_1',
      orgId: null,
      provider: 'nt_otter',
      status: 'pending',
      metadata: { webhook_key: KEY },
    })
    await expect(service.status('nt_otter', 'user_1')).resolves.toMatchObject({
      connected: false,
      status: 'pending',
      webhookUrl: `https://api.roas.io/api/integrations/meetings/webhooks/nt_otter/${KEY}`,
    })
    connections.findAnyConnectionForUser.mockResolvedValue({
      id: 'c1',
      userId: 'user_1',
      orgId: null,
      provider: 'nt_otter',
      status: 'connected',
      metadata: { webhook_key: KEY, connected_at: '2026-09-14T10:00:00Z' },
    })
    await expect(service.status('nt_otter', 'user_1')).resolves.toMatchObject({
      connected: true,
      connectedAt: '2026-09-14T10:00:00Z',
    })
    vault.hasSecret.mockResolvedValue(false)
    await expect(service.status('nt_otter', 'user_1')).resolves.toMatchObject({
      connected: false,
      secretConfigured: false,
    })
  })
})
