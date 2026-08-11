import { describe, expect, it, vi } from 'vitest'
import { SlackOfferFulfillmentService } from '../slack-offer-fulfillment.service'

describe('SlackOfferFulfillmentService', () => {
  it.each(['recap_brief', 'case_study', 'spend_breakdown'])(
    'delivers %s in the accepted offer thread',
    async (kind) => {
      const offer = {
        id: 'offer-1',
        org_id: 'org-1',
        recipient_person_id: 'person-1',
        shadow_action_id: 'action-1',
        thread_channel_id: 'D1',
        thread_ts: '1.1',
        deliverable_kind: kind,
        spec: {},
        status: 'accepted',
        promised_by: null,
      }
      const repository = {
        claimAccepted: vi.fn().mockResolvedValue(offer),
        evidence: vi
          .fn()
          .mockResolvedValue({ userId: 'user-1', lines: ['$12,450 spend', '4.82x ROAS'] }),
        markDelivered: vi.fn().mockResolvedValue(undefined),
      }
      const slack = { sendMessage: vi.fn().mockResolvedValue({ ts: '2.2' }) }
      const service = new SlackOfferFulfillmentService(repository as never, slack as never)

      await service.fulfill({} as never, 'offer-1')

      expect(slack.sendMessage).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        'org-1',
        expect.objectContaining({
          channel_id: 'D1',
          thread_ts: '1.1',
          text: expect.stringContaining('$12,450'),
        }),
      )
      expect(repository.markDelivered).toHaveBeenCalledWith(expect.anything(), 'offer-1', '2.2')
    },
  )

  it('marks past promises missed and reports the miss in-thread', async () => {
    const offer = {
      id: 'offer-1',
      org_id: 'org-1',
      recipient_person_id: 'person-1',
      shadow_action_id: 'action-1',
      thread_channel_id: 'D1',
      thread_ts: '1.1',
      deliverable_kind: 'case_study',
      spec: {},
      status: 'in_progress',
      promised_by: '2026-08-10T18:00:00Z',
    }
    const repository = {
      listPastDue: vi.fn().mockResolvedValue([offer]),
      markMissed: vi.fn().mockResolvedValue(true),
      evidence: vi.fn().mockResolvedValue({ userId: 'user-1', lines: [] }),
    }
    const slack = { sendMessage: vi.fn().mockResolvedValue({ ts: '2.2' }) }
    const service = new SlackOfferFulfillmentService(repository as never, slack as never)

    await service.checkMissed({} as never, new Date('2026-08-10T20:00:00Z'))

    expect(slack.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'org-1',
      expect.objectContaining({ text: expect.stringContaining('missed the original promise') }),
    )
  })
})
