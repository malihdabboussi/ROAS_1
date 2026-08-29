import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PublicMeetingFollowUpReview } from '../services/meeting-follow-up-review-api'
import { PublicMeetingFollowUpReviewPage } from './PublicMeetingFollowUpReviewPage'

const { fetchMeetingFollowUpReview, updateMeetingFollowUpReview, createMeetingDelegationPreview } =
  vi.hoisted(() => ({
    fetchMeetingFollowUpReview: vi.fn(),
    updateMeetingFollowUpReview: vi.fn(),
    createMeetingDelegationPreview: vi.fn(),
  }))

vi.mock('../services/meeting-follow-up-review-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/meeting-follow-up-review-api')>()),
  fetchMeetingFollowUpReview,
  updateMeetingFollowUpReview,
  createMeetingDelegationPreview,
}))

vi.mock('@/lib/agency-clients', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/agency-clients')>()),
  useClientCampaignGroups: () => ({ groups: [] }),
}))

vi.mock('@/components/chat/MessageBubbleAdapter', () => ({
  MessageBubble: ({ message }: { message: { content: string } }) => <div>{message.content}</div>,
}))

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('PublicMeetingFollowUpReviewPage', () => {
  it('runs from meeting context through inline task review to the final follow-up message', async () => {
    const payload = reviewPayload()
    fetchMeetingFollowUpReview.mockResolvedValue(payload)
    updateMeetingFollowUpReview.mockResolvedValue(payload)
    createMeetingDelegationPreview.mockResolvedValue({
      delegation_id: 'delegation-1',
      confirm_url: 'https://portal.roas.io/dashboard?delegation=delegation-1',
      tasks: [],
      campaign_id: 'campaign-1',
    })

    render(<PublicMeetingFollowUpReviewPage token="review-token" />)

    await screen.findByRole('heading', { name: 'Yasir webinar review and growth pivot' })
    expect(screen.getByText('Aug 29, 2026')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Continue to task review' }))

    await waitFor(() => expect(updateMeetingFollowUpReview).toHaveBeenCalledOnce())
    expect(updateMeetingFollowUpReview).toHaveBeenCalledWith(
      'review-token',
      expect.objectContaining({
        follow_ups: [
          expect.objectContaining({
            title: 'Send AI meeting notes to Yasir and Jhanna',
            due_date: '2026-08-29',
          }),
        ],
      }),
    )
    expect(createMeetingDelegationPreview).toHaveBeenCalledWith('review-token')
    expect(await screen.findByTitle('Bulk task delegation review')).toHaveAttribute(
      'src',
      'https://portal.roas.io/dashboard?delegation=delegation-1',
    )

    fireEvent.click(screen.getByRole('button', { name: 'I finished task review' }))

    expect(screen.getByRole('heading', { name: 'FINALIZE FOLLOW-UP MESSAGE' })).toBeInTheDocument()
    expect(screen.getByText(/draft Follow-up message/)).toHaveTextContent(
      'Hey @channel, good call today.',
    )
  })
})

function reviewPayload(): PublicMeetingFollowUpReview {
  return {
    meeting: {
      id: 'meeting-1',
      space_id: 'space-1',
      title: 'Yasir webinar review and growth pivot',
      summary: 'Review webinar performance and agree on the next actions.',
      client_workspace: 'Yasir Khan Coaching LTD',
      client_campaign: {
        client_id: 'client-1',
        client_name: 'Yasir Khan Coaching LTD',
        campaign_id: 'campaign-1',
        campaign_name: 'Speak Like a CEO Workshop 2026 Webinar',
      },
      attendee_ids: ['attendee-1'],
      attendees: ['Yasir Khan', 'Dylan Vanas'],
      call_kind: 'client',
      call_status: 'completed',
      fields: {
        call_kind: {
          id: 'call_kind',
          name: 'Call Kind',
          type: 'select',
          options: [{ id: 'client', label: 'Client', color: 'cyan' }],
        },
        call_status: {
          id: 'call_status',
          name: 'Call status',
          type: 'select',
          options: [{ id: 'completed', label: 'Completed', color: 'blue' }],
        },
        attendees: {
          id: 'attendees',
          name: 'Attendees',
          type: 'multi_select',
          options: [{ id: 'attendee-1', label: 'Yasir Khan', color: 'blue' }],
        },
      },
      follow_ups: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          title: 'Send AI meeting notes to Yasir and Jhanna',
          status: 'confirmed',
          owner: 'Nate Tilley',
          due_date: '2026-08-29T00:00:00+00:00',
        },
      ],
      follow_up_message: 'Hey @channel, good call today.',
      conversation_id: 'conversation-1',
    },
    client_workspaces: [],
    expires_at: '2026-09-04T00:00:00.000Z',
    review_started: true,
  }
}
