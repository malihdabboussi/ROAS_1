import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MeetingPostCallReviewCard } from './MeetingPostCallReviewCard'

vi.mock('@/lib/agency-clients', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/agency-clients')>()),
  useClientCampaignGroups: () => ({
    groups: [{ clientId: 'client-1', clientName: 'Yasir Khan', campaigns: [] }],
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
          attendeeIds: [],
          attendees: 'Yasir, Dylan, Nate',
          callKind: 'client',
          callStatus: 'completed',
          fields: {
            callKind: { id: 'call_kind', name: 'Call Kind', type: 'select', options: [] },
            callStatus: { id: 'call_status', name: 'Call status', type: 'select', options: [] },
            attendees: { id: 'attendees', name: 'Attendees', type: 'multi_select', options: [] },
          },
          followUpCount: 7,
          followUps: [
            {
              id: 'follow-up-1',
              title: 'Build the VSL funnel',
              status: 'proposed',
              owner: 'Dylan',
              dueDate: '2026-08-28',
            },
          ],
          followUpMessage: 'Original follow-up',
        }}
        onContinue={onContinue}
      />,
    )

    expect(screen.getByDisplayValue('Build the VSL funnel')).toBeInTheDocument()
    fireEvent.change(screen.getByDisplayValue('Original summary'), {
      target: { value: 'Edited summary' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Build the VSL funnel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue to task review' }))

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Edited summary',
        followUpMessage: 'Original follow-up',
        followUps: [],
        followUpCount: 0,
      }),
    )
  })
})
