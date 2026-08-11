import { describe, expect, it, vi } from 'vitest'
import { SlackPendingOfferAcceptanceService } from '../slack-pending-offer-acceptance.service'

describe('SlackPendingOfferAcceptanceService', () => {
  it('accepts check reactions and dispatches fulfillment', async () => {
    const offers = { acceptByThread: vi.fn().mockResolvedValue('offer-1') }
    const fulfillment = { dispatch: vi.fn().mockResolvedValue(undefined) }
    const service = new SlackPendingOfferAcceptanceService(
      { findFallbackChannelByTeam: vi.fn().mockResolvedValue({ org_id: 'org-1' }) } as never,
      offers as never,
      fulfillment as never,
    )
    await expect(
      service.handleReactionAdded({
        supabase: {} as never,
        teamId: 'T1',
        channelId: 'D1',
        messageTs: '1.1',
        reaction: 'white_check_mark',
      }),
    ).resolves.toBe(true)
    expect(fulfillment.dispatch).toHaveBeenCalledWith(expect.anything(), 'offer-1')
  })

  it('accepts affirmative thread replies and ignores unrelated text', async () => {
    const offers = { acceptByThread: vi.fn().mockResolvedValue('offer-1') }
    const fulfillment = { dispatch: vi.fn().mockResolvedValue(undefined) }
    const service = new SlackPendingOfferAcceptanceService(
      { findFallbackChannelByTeam: vi.fn().mockResolvedValue({ org_id: 'org-1' }) } as never,
      offers as never,
      fulfillment as never,
    )
    await expect(
      service.handleThreadReply({
        supabase: {} as never,
        teamId: 'T1',
        channelId: 'D1',
        threadTs: '1.1',
        text: 'yes',
      }),
    ).resolves.toBe(true)
    await expect(
      service.handleThreadReply({
        supabase: {} as never,
        teamId: 'T1',
        channelId: 'D1',
        threadTs: '1.1',
        text: 'What data is included?',
      }),
    ).resolves.toBe(false)
  })
})
