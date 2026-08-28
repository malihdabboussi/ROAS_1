import { describe, expect, it, vi } from 'vitest'
import { MeetingFollowUpReviewService } from './meeting-follow-up-review.service'

describe('MeetingFollowUpReviewService', () => {
  it('sends the mapped Portal client id and campaign id to delegation preview', async () => {
    const createDelegationPreview = vi.fn().mockResolvedValue({
      delegation_id: 'delegation-1',
      confirm_url: 'https://portal.roas.io/delegations/delegation-1',
      tasks: [],
      campaign_id: 'campaign-1',
    })
    const updateResult = { error: null }
    const service = new MeetingFollowUpReviewService(
      {
        client: {
          from: vi.fn(() => ({
            update: vi.fn(() => ({
              eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue(updateResult) })),
            })),
          })),
        },
      } as never,
      {} as never,
      {} as never,
      { get: vi.fn(() => ({ createDelegationPreview })) } as never,
    )
    vi.spyOn(service as never, 'requireCall').mockResolvedValue({
      id: 'meeting-1',
      space_id: 'space-1',
      user_id: 'user-1',
      custom_data: {},
    })
    vi.spyOn(service, 'getReview').mockResolvedValue({
      meeting: {
        client_campaign: { client_id: 'client-1', campaign_id: 'campaign-1' },
        follow_ups: [{ title: 'Send the notes', owner: 'Nate', due_date: '2026-08-28' }],
      },
    } as never)

    await service.createDelegationPreview('review-token')

    expect(createDelegationPreview).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        client_id: 'client-1',
        client_ref: 'client-1',
        campaign_id: 'campaign-1',
      }),
    )
  })
})
