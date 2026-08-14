import { describe, expect, it, vi } from 'vitest'
import { SlackPendingOffersService } from '../slack-pending-offers.service'

describe('SlackPendingOffersService', () => {
  it('persists the composer spec and expires untouched offers after 72 hours', async () => {
    const repository = {
      create: vi.fn().mockResolvedValue(undefined),
      expire: vi.fn().mockResolvedValue(undefined),
    }
    const cases = { recordExternal: vi.fn().mockResolvedValue(undefined) }
    const service = new SlackPendingOffersService(repository as never, cases as never)
    await service.record({} as never, {
      orgId: 'org-1',
      recipientPersonId: 'person-1',
      shadowActionId: 'action-1',
      channelId: 'D1',
      threadTs: '1.1',
      offer: {
        kind: 'case_study',
        deliverable: 'One-page case study with setup, spend, result, and difference',
        ready_by: '2pm PT',
      },
    })
    expect(repository.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        deliverable_kind: 'case_study',
        spec: expect.objectContaining({ ready_by: '2pm PT' }),
      }),
    )
    expect(repository.expire).toHaveBeenCalled()
    expect(cases.recordExternal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        caseType: 'offer',
        sourceType: 'slack_offer',
        sourceKey: 'action-1',
        summary: 'One-page case study with setup, spend, result, and difference',
      }),
    )
  })
})
