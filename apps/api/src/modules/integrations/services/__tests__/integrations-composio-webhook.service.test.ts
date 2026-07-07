import { createHmac } from 'crypto'
import { describe, expect, it, vi } from 'vitest'
import { IntegrationsComposioWebhookService } from '../integrations-composio-webhook.service'
import { IntegrationsComposioService } from '../integrations-composio.service'

function signedHeaders(payload: string, secret: string) {
  const webhookId = 'msg_test'
  const webhookTimestamp = Math.floor(Date.now() / 1000).toString()
  const digest = createHmac('sha256', secret)
    .update(`${webhookId}.${webhookTimestamp}.${payload}`)
    .digest('base64')
  return { webhookId, webhookTimestamp, webhookSignature: `v1,${digest}` }
}

describe('IntegrationsComposioService Composio webhook verification', () => {
  it('accepts a valid signed Composio webhook and delegates external event processing', async () => {
    const secret = 'test-secret'
    process.env.COMPOSIO_WEBHOOK_SECRET = secret
    const payload = JSON.stringify({
      id: 'evt_1',
      type: 'composio.trigger.message',
      metadata: {
        trigger_slug: 'GMAIL_NEW_GMAIL_MESSAGE',
        trigger_id: 'ti_1',
        connected_account_id: 'ca_1',
        auth_config_id: 'ac_1',
        user_id: 'user_1',
      },
      data: { sender: 'sender@example.com', subject: 'Hello' },
    })
    const processComposioExternalEvent = vi.fn().mockResolvedValue({ processed: true })
    const repository = { getServiceClient: vi.fn().mockReturnValue({}) } as never
    const webhooks = new IntegrationsComposioWebhookService(repository, {
      processComposioExternalEvent,
    } as never)
    const service = new IntegrationsComposioService(
      repository,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      webhooks,
    )

    const result = await service.handleComposioWebhook({
      rawBody: payload,
      ...signedHeaders(payload, secret),
    })

    expect(result.success).toBe(true)
    expect(processComposioExternalEvent).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ id: 'evt_1' }),
    )
  })

  it('rejects an invalid Composio webhook signature', async () => {
    process.env.COMPOSIO_WEBHOOK_SECRET = 'test-secret'
    const processComposioExternalEvent = vi.fn()
    const repository = { getServiceClient: vi.fn().mockReturnValue({}) } as never
    const webhooks = new IntegrationsComposioWebhookService(repository, {
      processComposioExternalEvent,
    } as never)
    const service = new IntegrationsComposioService(
      repository,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      webhooks,
    )

    const result = await service.handleComposioWebhook({
      rawBody: '{"id":"evt_1"}',
      webhookId: 'msg_test',
      webhookTimestamp: Math.floor(Date.now() / 1000).toString(),
      webhookSignature: 'v1,bad',
    })

    expect(result.success).toBe(false)
    expect(result.status).toBe(401)
    expect(processComposioExternalEvent).not.toHaveBeenCalled()
  })

  it('marks matching integration rows needs_reconnect on Composio expiry events', async () => {
    const secret = 'test-secret'
    process.env.COMPOSIO_WEBHOOK_SECRET = secret
    const payload = JSON.stringify({
      id: 'evt_expired',
      type: 'composio.connected_account.expired',
      data: {
        id: 'ca_expired',
        status: 'EXPIRED',
        status_reason: 'refresh token revoked',
        toolkit: { slug: 'gmail' },
      },
    })
    const updates: Array<Record<string, unknown>> = []
    const serviceClient = {
      from: vi.fn(() => {
        const query: Record<string, unknown> = {
          select: vi.fn(() => query),
          eq: vi.fn((column: string, value: string) => {
            if (column === 'metadata->>composio_connected_account_id') {
              expect(value).toBe('ca_expired')
              return Promise.resolve({
                data: [
                  {
                    id: 'ui_1',
                    status: 'connected',
                    metadata: { composio_connected_account_id: 'ca_expired' },
                  },
                ],
                error: null,
              })
            }
            return Promise.resolve({ error: null })
          }),
          update: vi.fn((payload: Record<string, unknown>) => {
            updates.push(payload)
            return query
          }),
        }
        return query
      }),
    }
    const processComposioExternalEvent = vi.fn()
    const repository = { getServiceClient: vi.fn().mockReturnValue(serviceClient) } as never
    const webhooks = new IntegrationsComposioWebhookService(repository, {
      processComposioExternalEvent,
    } as never)

    const result = await webhooks.handleComposioWebhook({
      rawBody: payload,
      ...signedHeaders(payload, secret),
    })

    expect(result.success).toBe(true)
    expect(result.expired).toMatchObject({ updated: 1, connected_account_id: 'ca_expired' })
    expect(updates[0]).toMatchObject({
      status: 'needs_reconnect',
      error_message: 'refresh token revoked',
      metadata: expect.objectContaining({
        composio_connected_account_id: 'ca_expired',
        composio_status: 'EXPIRED',
        composio_status_reason: 'refresh token revoked',
        composio_toolkit_slug: 'gmail',
      }),
    })
    expect(processComposioExternalEvent).not.toHaveBeenCalled()
  })
})
