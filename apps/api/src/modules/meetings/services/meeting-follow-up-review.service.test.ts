import { describe, expect, it, vi } from 'vitest'
import { MeetingFollowUpReviewService } from './meeting-follow-up-review.service'

describe('MeetingFollowUpReviewService', () => {
  it('restores deleted follow-up rows from canonical provider actions', async () => {
    const actions = [
      {
        source_key: 'fathom:action-1',
        source_text: 'Send AI meeting notes',
        status: 'confirmed',
        canonical_assignee_name: 'Nate Tilley',
        canonical_assignee_email: 'nate@example.com',
        evidence: { recording_timestamp: '00:42:00' },
      },
    ]
    const result = Promise.resolve({ data: actions, error: null })
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      neq: vi.fn(),
      order: vi.fn(() => result),
    }
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.neq.mockReturnValue(chain)
    const upsertProviderFollowUps = vi.fn().mockResolvedValue(['follow-up-1'])
    const service = new MeetingFollowUpReviewService(
      { client: { from: vi.fn(() => chain) } } as never,
      {} as never,
      {} as never,
      {} as never,
      { upsertProviderFollowUps } as never,
    )
    const call = {
      id: 'meeting-1',
      space_id: 'space-1',
      user_id: 'user-1',
      org_id: 'org-1',
      title: 'Yasir webinar review',
    }
    vi.spyOn(service as never, 'requireCall').mockResolvedValue(call)
    vi.spyOn(service as never, 'getReviewForCall').mockResolvedValue({ meeting: {} } as never)

    await service.refreshFollowUps('review-token')

    expect(upsertProviderFollowUps).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        meetingItemId: 'meeting-1',
        actions: [expect.objectContaining({ sourceText: 'Send AI meeting notes' })],
      }),
    )
  })

  it('fills a missing meeting campaign id from the connected client scope map', async () => {
    const chain = (result: { data: unknown; error: null }) => {
      const promise = Promise.resolve(result)
      const value = {
        select: () => value,
        eq: () => value,
        or: () => value,
        order: () => promise,
        maybeSingle: () => promise,
        then: promise.then.bind(promise),
      }
      return value
    }
    const service = new MeetingFollowUpReviewService(
      {
        client: {
          from: vi.fn((table: string) => {
            if (table === 'meeting_workspaces') {
              return chain({ data: { conversation_id: 'conversation-1' }, error: null })
            }
            if (table === 'spaces') return chain({ data: { schema: {} }, error: null })
            if (table === 'space_items') return chain({ data: [], error: null })
            return chain({
              data: [
                {
                  metadata: {
                    client_scope_map: {
                      'client-1': {
                        campaign_id: 'campaign-1',
                        campaign_name: 'Yasir Khan Coaching LTD',
                        space_id: 'client-space-1',
                      },
                    },
                  },
                },
              ],
              error: null,
            })
          }),
        },
      } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )
    vi.spyOn(service as never, 'requireCall').mockResolvedValue({
      id: 'meeting-1',
      space_id: 'space-1',
      user_id: 'user-1',
      title: 'Yasir call',
      custom_data: {
        client_campaign: { client_id: 'client-1', client_name: 'Yasir Khan Coaching LTD' },
      },
    })

    const review = await service.getReview('review-token')

    expect(review.meeting.client_campaign).toEqual(
      expect.objectContaining({
        client_id: 'client-1',
        campaign_id: 'campaign-1',
        roas_space_id: 'client-space-1',
      }),
    )
  })

  it('sends the mapped Portal client id and campaign id to delegation preview', async () => {
    const createDelegationPreview = vi.fn().mockResolvedValue({
      delegation_id: 'delegation-1',
      confirm_url: 'https://portal.roas.io/delegations/delegation-1',
      tasks: [],
      campaign_id: 'campaign-1',
    })
    const updateResult = { error: null }
    const pageGrader = {
      listClientCampaigns: vi.fn().mockResolvedValue([
        {
          id: 'campaign-1',
          client_id: 'client-1',
          name: 'Current campaign',
          platform_status: 'live',
        },
      ]),
      createDelegationPreview,
    }
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
      { get: vi.fn(() => pageGrader) } as never,
      {} as never,
    )
    vi.spyOn(service as never, 'requireCall').mockResolvedValue({
      id: 'meeting-1',
      space_id: 'space-1',
      user_id: 'user-1',
      custom_data: {},
    })
    vi.spyOn(service as never, 'getReviewForCall').mockResolvedValue({
      meeting: {
        client_campaign: { client_id: 'client-1', campaign_id: 'campaign-1' },
        follow_ups: [{ title: 'Send the notes', owner: 'Nate', due_date: '2026-08-28' }],
      },
    } as never)

    const result = await service.createDelegationPreview('review-token')

    expect(createDelegationPreview).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        client_id: 'client-1',
        client_ref: 'client-1',
        campaign_id: 'campaign-1',
      }),
    )
    expect(result.confirm_url).toBe('https://portal.roas.io/dashboard?delegation=delegation-1')
  })

  it('replaces a deleted mapped campaign with the only live Portal campaign', async () => {
    const createDelegationPreview = vi.fn().mockResolvedValue({
      delegation_id: 'delegation-1',
      confirm_url: 'https://portal.roas.io/delegations/delegation-1',
      tasks: [],
      campaign_id: 'campaign-live',
    })
    const mergeClientScopeEntry = vi.fn().mockResolvedValue(undefined)
    const pageGrader = {
      listClientCampaigns: vi.fn().mockResolvedValue([
        {
          id: 'campaign-live',
          client_id: 'client-1',
          name: 'Current webinar',
          platform_status: 'live',
        },
        {
          id: 'campaign-closed',
          client_id: 'client-1',
          name: 'Old cohort',
          platform_status: 'on_hold_closed',
        },
      ]),
      mergeClientScopeEntry,
      createDelegationPreview,
    }
    const service = new MeetingFollowUpReviewService(
      {
        client: {
          from: vi.fn(() => ({
            update: vi.fn(() => ({
              eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
            })),
          })),
        },
      } as never,
      {} as never,
      {} as never,
      { get: vi.fn(() => pageGrader) } as never,
      {} as never,
    )
    vi.spyOn(service as never, 'requireCall').mockResolvedValue({
      id: 'meeting-1',
      space_id: 'meeting-space-1',
      user_id: 'user-1',
      custom_data: { client_campaign: { client_id: 'client-1', campaign_id: 'campaign-deleted' } },
    })
    vi.spyOn(service as never, 'getReviewForCall').mockResolvedValue({
      meeting: {
        client_campaign: {
          client_id: 'client-1',
          campaign_id: 'campaign-deleted',
          roas_space_id: 'client-space-1',
        },
        follow_ups: [{ title: 'Send the notes', owner: 'Nate', due_date: '2026-08-28' }],
      },
    } as never)

    await service.createDelegationPreview('review-token')

    expect(createDelegationPreview).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ campaign_id: 'campaign-live' }),
    )
    expect(mergeClientScopeEntry).toHaveBeenCalledWith('user-1', {
      clientId: 'client-1',
      campaignId: 'campaign-live',
      campaignName: 'Current webinar',
      spaceId: 'client-space-1',
    })
  })

  it('uses the owned meeting path for the authenticated inline preview', async () => {
    const service = new MeetingFollowUpReviewService(
      { client: {} } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )
    const call = { id: 'meeting-1', space_id: 'space-1', user_id: 'user-1' }
    const input = {
      space_id: 'space-1',
      meeting_item_id: 'meeting-1',
      summary: 'Summary',
      client_campaign: { client_id: 'client-1', campaign_id: 'campaign-1' },
      attendee_ids: [],
      call_kind: 'Client',
      call_status: 'Completed',
      follow_up_message: 'Follow up',
      dismissed_follow_up_ids: [],
      follow_ups: [
        { id: 'follow-up-1', title: 'Send notes', owner: 'Nate', due_date: '2026-08-28' },
      ],
    }
    const requireOwnedCall = vi.spyOn(service as never, 'requireOwnedCall').mockResolvedValue(call)
    const updateReviewForCall = vi
      .spyOn(service as never, 'updateReviewForCall')
      .mockResolvedValue(undefined)
    const createDelegationPreviewForCall = vi
      .spyOn(service as never, 'createDelegationPreviewForCall')
      .mockResolvedValue({ confirm_url: 'https://portal.roas.io/review' })

    const result = await service.createAuthenticatedDelegationPreview('user-1', input)

    expect(requireOwnedCall).toHaveBeenCalledWith('user-1', 'space-1', 'meeting-1')
    expect(updateReviewForCall).toHaveBeenCalledWith(call, input)
    expect(createDelegationPreviewForCall).toHaveBeenCalledWith(call)
    expect(result).toEqual({ confirm_url: 'https://portal.roas.io/review' })
  })
})
