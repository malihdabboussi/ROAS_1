import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GlobalChatPanel } from './GlobalChatPanel'

const mocks = vi.hoisted(() => ({
  createPreview: vi.fn(),
  state: {
    workContext: { surface: 'general' },
    meetingContext: null as Record<string, unknown> | null,
    postCallReview: null as Record<string, unknown> | null,
    setCollapsed: vi.fn(),
    clearMeetingContext: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/features/spaces/components/chat/SpaceVibeyChatPanel', () => ({
  SpaceVibeyChatPanel: () => <div>Chat surface</div>,
}))

vi.mock('@/features/spaces/store/use-spaces-store', () => ({
  useSpacesStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ activeSpaceId: null, spaces: [] }),
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ activeConversationId: null, conversations: [] }),
}))

vi.mock('../store/use-global-chat-store', () => ({
  useGlobalChatStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector(mocks.state),
}))

vi.mock('@/features/home/services/meeting-follow-up-review-api', () => ({
  createAuthenticatedMeetingDelegationPreview: mocks.createPreview,
}))

vi.mock('../components/MeetingPostCallReviewCard', () => ({
  MeetingPostCallReviewCard: ({ review, onContinue }: Record<string, unknown>) => (
    <button type="button" onClick={() => void (onContinue as (value: unknown) => void)(review)}>
      Continue review
    </button>
  ),
}))

vi.mock('../components/MeetingPostCallReviewStages', () => ({
  MeetingTaskReviewStep: ({ preview }: Record<string, unknown>) => (
    <a href={(preview as { confirm_url: string }).confirm_url}>Open task review</a>
  ),
  MeetingFollowUpMessageStep: () => <div>Follow-up message</div>,
}))

vi.mock('../components/ChatSurfaceRecommendation', () => ({
  ChatSurfaceRecommendation: () => null,
}))
vi.mock('../components/ChatCampaignBrainNudge', () => ({ ChatCampaignBrainNudge: () => null }))
vi.mock('../components/QuickMissionsHubHost', () => ({
  QuickMissionsHubHost: () => <div data-testid="active-chat-quick-missions-host" />,
}))
vi.mock('../hooks/useWorkRequestHomeChatSeed', () => ({
  useWorkRequestHomeChatSeed: () => undefined,
}))

describe('GlobalChatPanel', () => {
  it('owns the Mission host beside the mounted active chat surface', () => {
    render(<GlobalChatPanel />)

    expect(screen.getByText('Chat surface')).toBeInTheDocument()
    expect(screen.getByTestId('active-chat-quick-missions-host')).toBeInTheDocument()
  })

  it('opens the deterministic Portal review without seeding Pixel', async () => {
    mocks.state.meetingContext = {
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      conversationId: 'conversation-1',
    }
    mocks.state.postCallReview = {
      spaceId: 'space-1',
      meetingItemId: 'meeting-1',
      conversationId: 'conversation-1',
      meetingTitle: 'Meeting',
      summary: 'Summary',
      clientCampaign: { client_id: 'client-1', campaign_id: 'campaign-1' },
      attendeeIds: [],
      attendees: '',
      callKind: 'Client',
      callStatus: 'Completed',
      followUpMessage: 'Follow up',
      followUps: [
        {
          id: 'follow-up-1',
          title: 'Send notes',
          owner: 'Nate',
          dueDate: '2026-08-28',
        },
      ],
    }
    mocks.createPreview.mockResolvedValue({
      confirm_url: 'https://portal.roas.io/delegations/review-1',
    })

    render(<GlobalChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue review' }))

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Open task review' })).toHaveAttribute(
        'href',
        'https://portal.roas.io/delegations/review-1',
      ),
    )
    expect(mocks.createPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        space_id: 'space-1',
        meeting_item_id: 'meeting-1',
        client_campaign: { client_id: 'client-1', campaign_id: 'campaign-1' },
      }),
    )
  })
})
