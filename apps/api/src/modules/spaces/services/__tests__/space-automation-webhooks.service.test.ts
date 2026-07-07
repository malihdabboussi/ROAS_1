import { describe, expect, it, vi } from 'vitest'
import { SpaceAutomationService } from '../space-automation.service'

function buildService(automations: Array<{ id: string }>) {
  const automationsRepo = {
    listPublishedWebhookAutomations: vi.fn(async () => automations),
  }
  const service = new SpaceAutomationService(
    {} as never,
    automationsRepo as never,
    { get: vi.fn() } as never,
    {} as never,
  )
  return { automationsRepo, service }
}

describe('SpaceAutomationService webhook events', () => {
  it('fans out one webhook event to every published Flow using the endpoint', async () => {
    const { automationsRepo, service } = buildService([{ id: 'flow-1' }, { id: 'flow-2' }])
    const enqueueSpy = vi
      .spyOn(service, 'enqueueAutomationRuntimeJob')
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    const fallbackSpy = vi
      .spyOn(service, 'executeQueuedItemlessAutomation')
      .mockResolvedValue(undefined)

    const result = await service.processWebhookEvent({} as never, {
      endpointId: 'endpoint-1',
      eventId: 'event-1',
      userId: 'user-1',
      orgId: 'org-1',
      spaceId: 'space-1',
      payload: { customer: { email: 'customer@example.com' } },
      fields: { customer_email: 'customer@example.com' },
      query: { source: 'test' },
      receivedAt: '2026-06-25T08:00:00.000Z',
    })

    expect(result).toEqual({
      processed: true,
      matched_automation_ids: ['flow-1', 'flow-2'],
      queued: true,
    })
    expect(automationsRepo.listPublishedWebhookAutomations).toHaveBeenCalledWith(
      expect.anything(),
      'space-1',
      'endpoint-1',
    )
    expect(enqueueSpy).toHaveBeenCalledTimes(2)
    expect(enqueueSpy).toHaveBeenNthCalledWith(
      1,
      'flow-1',
      expect.objectContaining({
        type: 'webhook_received',
        webhook_endpoint_id: 'endpoint-1',
        webhook_event_id: 'event-1',
        fields: { customer_email: 'customer@example.com' },
        webhook: {
          endpoint_id: 'endpoint-1',
          event_id: 'event-1',
          received_at: '2026-06-25T08:00:00.000Z',
        },
      }),
      expect.objectContaining({ spaceId: 'space-1', userId: 'user-1' }),
      'itemless',
    )
    expect(fallbackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: 'flow-2',
        spaceId: 'space-1',
        event: expect.objectContaining({ type: 'webhook_received' }),
      }),
    )
  })

  it('returns ignored metadata when no published Flows use the endpoint', async () => {
    const { service } = buildService([])
    const enqueueSpy = vi.spyOn(service, 'enqueueAutomationRuntimeJob')

    const result = await service.processWebhookEvent({} as never, {
      endpointId: 'endpoint-1',
      eventId: 'event-1',
      userId: 'user-1',
      orgId: null,
      spaceId: 'space-1',
      payload: {},
      fields: {},
      query: {},
      receivedAt: '2026-06-25T08:00:00.000Z',
    })

    expect(result).toEqual({ processed: false, matched_automation_ids: [], queued: false })
    expect(enqueueSpy).not.toHaveBeenCalled()
  })
})
