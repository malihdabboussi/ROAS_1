import { describe, expect, it, vi } from 'vitest'
import { EmailWebhookEventsService } from './email-webhook-events.service'

function createQuery(result: Record<string, unknown> = { data: null, error: null }) {
  const resolved = Promise.resolve(result)
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    like: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue(result),
    update: vi.fn(() => query),
    insert: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
  }
  query.then = resolved.then.bind(resolved)
  return query
}

function createClient(queriesByTable: Record<string, Array<Record<string, any>>>) {
  return {
    from: vi.fn((table: string) => {
      const query = queriesByTable[table]?.shift()
      if (query) return query
      throw new Error(`unexpected table: ${table}`)
    }),
  }
}

describe('EmailWebhookEventsService', () => {
  it('updates send status and records a SendGrid event', async () => {
    const sendLookup = createQuery({
      data: { id: 'send-1', user_id: 'user-1', org_id: 'org-1' },
      error: null,
    })
    const sendUpdate = createQuery({ error: null })
    const eventInsert = createQuery({ error: null })
    const client = createClient({ email_sends: [sendLookup, sendUpdate], email_events: [eventInsert] })
    const service = new EmailWebhookEventsService({ client } as never)

    await service.processEvent({
      sg_message_id: '<abc.0>',
      event: 'delivered',
      timestamp: 1780000000,
      sg_event_id: 'event-1',
    } as never)

    expect(sendLookup.like).toHaveBeenCalledWith('sendgrid_message_id', 'abc%')
    expect(sendUpdate.update).toHaveBeenCalledWith({
      updated_at: expect.any(String),
      delivered_at: '2026-05-28T20:26:40.000Z',
      status: 'delivered',
    })
    expect(eventInsert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email_send_id: 'send-1',
        event_type: 'delivered',
        sg_event_id: 'event-1',
      }),
    )
  })

  it('creates a suppression for hard bounces when none exists', async () => {
    const sendLookup = createQuery({
      data: { id: 'send-1', user_id: 'user-1', org_id: null },
      error: null,
    })
    const sendUpdate = createQuery({ error: null })
    const eventInsert = createQuery({ error: null })
    const suppressionLookup = createQuery({ data: null, error: null })
    const suppressionInsert = createQuery({ error: null })
    const client = createClient({
      email_sends: [sendLookup, sendUpdate],
      email_events: [eventInsert],
      email_suppressions: [suppressionLookup, suppressionInsert],
    })
    const service = new EmailWebhookEventsService({ client } as never)

    await service.processEvent({
      sg_message_id: 'abc.0',
      event: 'bounce',
      timestamp: 1780000000,
      email: 'person@example.com',
      type: 'hard',
      reason: 'blocked',
    } as never)

    expect(suppressionLookup.is).toHaveBeenCalledWith('org_id', null)
    expect(suppressionInsert.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      org_id: null,
      email: 'person@example.com',
      reason: 'hard_bounce',
      bounce_type: 'hard',
      bounce_reason: 'blocked',
    })
  })
})
