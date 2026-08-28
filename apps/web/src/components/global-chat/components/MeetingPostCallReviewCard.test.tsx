import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MeetingPostCallReviewCard } from './MeetingPostCallReviewCard'

vi.mock('@/lib/agency-clients', () => ({
  useClientCampaignGroups: () => ({
    groups: [{ clientId: 'client-1', clientName: 'Yasir Khan', campaigns: [] }],
  }),
  toClientOnlyMapping: (group: { clientId: string; clientName: string }) => ({
    client_id: group.clientId,
    client_name: group.clientName,
    campaign_id: '',
    campaign_name: '',
  }),
}))

describe('MeetingPostCallReviewCard', () => {
  it('shows editable Slack recap details and continues with the edited values', () => {
    const onContinue = vi.fn()
    render(
      <MeetingPostCallReviewCard
        review={{
          spaceId: 'space-1',
          conversationId: 'conversation-1',
          meetingItemId: 'meeting-1',
          meetingTitle: 'Yasir webinar review',
          summary: 'Original summary',
          clientWorkspace: 'Yasir Khan',
          clientCampaign: {
            client_id: 'client-1',
            client_name: 'Yasir Khan',
            campaign_id: '',
            campaign_name: '',
          },
          attendees: 'Yasir, Dylan, Nate',
          followUpCount: 7,
          followUps: [{ id: 'follow-up-1', title: 'Build the VSL funnel', status: 'proposed' }],
          followUpMessage: 'Original follow-up',
        }}
        onContinue={onContinue}
      />,
    )

    expect(screen.getByText('Build the VSL funnel')).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('Original summary'), {
      target: { value: 'Edited summary' },
    })
    fireEvent.change(screen.getByDisplayValue('Original follow-up'), {
      target: { value: 'Edited follow-up' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Build the VSL funnel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue to task review' }))

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Edited summary',
        followUpMessage: 'Edited follow-up',
        followUps: [],
        followUpCount: 0,
      }),
    )
  })
})
