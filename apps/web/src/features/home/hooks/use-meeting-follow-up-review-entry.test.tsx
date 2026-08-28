import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMeetingFollowUpReviewEntry } from './use-meeting-follow-up-review-entry'

const mocks = vi.hoisted(() => ({
  continueMeetingConversation: vi.fn(),
  openChatDrawer: vi.fn(),
  replace: vi.fn(),
  startPostCallReview: vi.fn(),
  search: 'meeting=meeting-1&space=space-1&review=follow-up',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/home/meetings',
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ openChatDrawer: mocks.openChatDrawer }),
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => {
  const useGlobalChatStore = (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      continueMeetingConversation: mocks.continueMeetingConversation,
      startPostCallReview: mocks.startPostCallReview,
    })
  return { useGlobalChatStore }
})

describe('useMeetingFollowUpReviewEntry', () => {
  beforeEach(() => {
    mocks.continueMeetingConversation.mockClear()
    mocks.openChatDrawer.mockClear()
    mocks.replace.mockClear()
    mocks.startPostCallReview.mockClear()
    mocks.search = 'meeting=meeting-1&space=space-1&review=follow-up'
  })

  it('opens the linked chat, starts the guided review, and consumes the URL marker once', async () => {
    const { rerender } = renderHook(() =>
      useMeetingFollowUpReviewEntry({
        spaceId: 'space-1',
        meetingItemId: 'meeting-1',
        conversationId: 'conversation-1',
        meetingTitle: 'Strategy call',
        awarenessContext: 'Meeting context',
        timelineVersion: 2,
        review: {
          spaceId: 'space-1',
          conversationId: 'conversation-1',
          meetingItemId: 'meeting-1',
          meetingTitle: 'Strategy call',
          summary: 'Reviewed the launch.',
          clientWorkspace: 'Acme',
          clientCampaign: null,
          attendees: 'Dylan, Alex',
          followUpCount: 3,
          followUps: [{ id: 'follow-up-1', title: 'Ship recap', status: 'proposed' }],
          followUpMessage: 'Thanks for the call.',
        },
      }),
    )

    await waitFor(() => expect(mocks.startPostCallReview).toHaveBeenCalledTimes(1))
    expect(mocks.continueMeetingConversation).toHaveBeenCalledWith({
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      conversationId: 'conversation-1',
      meetingTitle: 'Strategy call',
      awarenessContext: 'Meeting context',
      timelineVersion: 2,
    })
    expect(mocks.openChatDrawer).toHaveBeenCalledWith('conversation-1')
    expect(mocks.startPostCallReview).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Reviewed the launch.', followUpCount: 3 }),
    )
    expect(mocks.replace).toHaveBeenCalledWith('/home/meetings?meeting=meeting-1&space=space-1', {
      scroll: false,
    })

    rerender()
    expect(mocks.startPostCallReview).toHaveBeenCalledTimes(1)
  })

  it('waits for a linked conversation before consuming the review marker', () => {
    renderHook(() =>
      useMeetingFollowUpReviewEntry({
        spaceId: 'space-1',
        meetingItemId: 'meeting-1',
        conversationId: null,
        meetingTitle: 'Strategy call',
        awarenessContext: 'Meeting context',
        timelineVersion: 0,
        review: null,
      }),
    )

    expect(mocks.startPostCallReview).not.toHaveBeenCalled()
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
