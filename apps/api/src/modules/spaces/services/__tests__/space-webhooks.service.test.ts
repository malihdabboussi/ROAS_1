import { createHmac } from 'crypto'
import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { SpaceWebhooksService } from '../space-webhooks.service'

const endpoint = {
  id: 'endpoint-1',
  org_id: 'org-1',
  space_id: 'space-1',
  created_by: 'user-1',
  name: 'Inbound leads',
  public_token: 'public-token',
  vault_secret_label: 'space-webhook:secret',
  status: 'active' as const,
  field_mappings: [
    { key: 'customer_email', label: 'Customer email', source_path: '/customer/email' },
    { key: 'missing_field', label: 'Missing', source_path: '/missing' },
  ],
  sample_payload: null,
  last_received_at: null,
  created_at: '2026-06-25T08:00:00.000Z',
  updated_at: '2026-06-25T08:00:00.000Z',
}

function signature(rawBody: Buffer, secret: string) {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
}

function makeService(
  options: {
    insertEvent?: ReturnType<typeof vi.fn>
    processWebhookEvent?: ReturnType<typeof vi.fn>
  } = {},
) {
  const serviceClient = { from: vi.fn() }
  const repo = {
    findActiveEndpointByPublicToken: vi.fn(async () => endpoint),
    getServiceClient: vi.fn(() => serviceClient),
    insertEvent:
      options.insertEvent ??
      vi.fn(async () => ({
        data: {
          id: 'event-1',
          endpoint_id: endpoint.id,
          org_id: endpoint.org_id,
          space_id: endpoint.space_id,
          idempotency_key: 'evt-1',
          payload: {},
          fields: {},
          status: 'received',
          matched_automation_ids: [],
          error_message: null,
          created_at: '2026-06-25T08:00:00.000Z',
          processed_at: null,
        },
        error: null,
      })),
    updateEvent: vi.fn(async () => undefined),
    markEndpointReceived: vi.fn(async () => undefined),
  }
  const vault = {
    getSecret: vi.fn(async () => 'secret'),
  }
  const automationService = {
    processWebhookEvent:
      options.processWebhookEvent ??
      vi.fn(async () => ({
        matched_automation_ids: ['flow-1', 'flow-2'],
        queued: true,
      })),
  }
  const configService = { get: vi.fn(() => '') }
  const service = new SpaceWebhooksService(
    repo as never,
    vault as never,
    automationService as never,
    configService as never,
  )
  return { automationService, repo, service }
}

describe('SpaceWebhooksService incoming webhooks', () => {
  it('verifies HMAC, maps fields, records an event, and fans out to matching Flows', async () => {
    const { automationService, repo, service } = makeService()
    const rawBody = Buffer.from(
      JSON.stringify({ customer: { email: 'customer@example.com' }, total: 42 }),
    )

    const result = await service.handleIncomingWebhook({
      publicToken: 'public-token',
      rawBody,
      signature: signature(rawBody, 'secret'),
      idempotencyKey: 'evt-1',
      query: { source: 'test' },
      headers: { 'content-type': 'application/json' },
    })

    expect(result).toMatchObject({
      success: true,
      event_id: 'event-1',
      matched_automation_ids: ['flow-1', 'flow-2'],
    })
    expect(repo.insertEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        endpoint_id: 'endpoint-1',
        idempotency_key: 'evt-1',
        fields: {
          customer_email: 'customer@example.com',
          missing_field: null,
        },
      }),
    )
    expect(automationService.processWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        endpointId: 'endpoint-1',
        eventId: 'event-1',
        fields: {
          customer_email: 'customer@example.com',
          missing_field: null,
        },
      }),
    )
    expect(repo.updateEvent).toHaveBeenCalledWith(
      expect.anything(),
      'event-1',
      expect.objectContaining({
        status: 'queued',
        matched_automation_ids: ['flow-1', 'flow-2'],
      }),
    )
  })

  it('rejects invalid signatures before recording an event', async () => {
    const { repo, service } = makeService()
    const rawBody = Buffer.from('{"ok":true}')

    await expect(
      service.handleIncomingWebhook({
        publicToken: 'public-token',
        rawBody,
        signature: signature(rawBody, 'wrong-secret'),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException)
    expect(repo.insertEvent).not.toHaveBeenCalled()
  })

  it('treats duplicate idempotency rows as already accepted and skips fanout', async () => {
    const processWebhookEvent = vi.fn()
    const { automationService, service } = makeService({
      insertEvent: vi.fn(async () => ({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      })),
      processWebhookEvent,
    })
    const rawBody = Buffer.from('{"ok":true}')

    await expect(
      service.handleIncomingWebhook({
        publicToken: 'public-token',
        rawBody,
        signature: signature(rawBody, 'secret'),
        idempotencyKey: 'evt-1',
      }),
    ).resolves.toEqual({ success: true, duplicate: true })
    expect(automationService.processWebhookEvent).not.toHaveBeenCalled()
  })

  it('marks events ignored when no published Flows match the endpoint', async () => {
    const { repo, service } = makeService({
      processWebhookEvent: vi.fn(async () => ({
        matched_automation_ids: [],
        queued: false,
      })),
    })
    const rawBody = Buffer.from('{"ok":true}')

    await service.handleIncomingWebhook({
      publicToken: 'public-token',
      rawBody,
      signature: signature(rawBody, 'secret'),
    })

    expect(repo.updateEvent).toHaveBeenCalledWith(
      expect.anything(),
      'event-1',
      expect.objectContaining({ status: 'ignored', matched_automation_ids: [] }),
    )
  })
})
