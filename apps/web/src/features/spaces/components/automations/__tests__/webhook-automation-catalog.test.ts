import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/flows/connected-app-flow-triggers', () => ({
  CONNECTED_APP_FLOW_TRIGGERS: [],
  connectedAppFlowProviderMatchesSlug: () => false,
  getConnectedAppFlowTriggerBySlug: () => undefined,
}))

describe('webhook automation catalog', () => {
  it('exposes first-party webhook triggers and mapped field template variables', async () => {
    const { defaultTriggerForType, triggerSectionsForObject, triggerTemplateVars } =
      await import('../automation-catalog')

    expect(triggerSectionsForObject('webhooks')).toEqual([
      {
        heading: 'Inbound',
        options: [{ value: 'webhook_received', label: 'Webhook received' }],
      },
    ])
    expect(defaultTriggerForType('webhook_received', 'webhooks')).toEqual({
      type: 'webhook_received',
      webhook_endpoint_id: '',
    })
    expect(
      triggerTemplateVars({ type: 'webhook_received', webhook_endpoint_id: 'endpoint-1' }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ token: 'trigger.payload', source: 'webhook' }),
        expect.objectContaining({
          token: 'trigger.fields.customer_email',
          source: 'webhook',
        }),
        expect.objectContaining({ token: 'trigger.webhook.event_id', source: 'webhook' }),
        expect.objectContaining({ token: 'trigger.webhook.received_at', source: 'webhook' }),
      ]),
    )
  })
})
