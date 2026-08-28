import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingPostCallReviewCard } from './MeetingPostCallReviewCard'

vi.mock('@/lib/agency-clients', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/agency-clients')>()),
  useClientCampaignGroups: () => ({
    groups: [{ clientId: 'client-1', clientName: 'Yasir Khan', campaigns: [] }],
  }),
}))

afterEach(cleanup)

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
          summary: '*Purpose*\nOriginal summary\n\n*Key takeaways*\nA useful takeaway',
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
            callKind: {
              id: 'call_kind',
              name: 'Call Kind',
              type: 'select',
              options: [{ id: 'client', label: 'Client', color: 'cyan' }],
            },
            callStatus: {
              id: 'call_status',
              name: 'Call status',
              type: 'select',
              options: [{ id: 'completed', label: 'Completed', color: 'blue' }],
            },
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
    const summary = screen.getByLabelText('Meeting summary')
    expect(summary).toHaveValue('Purpose\nOriginal summary\n\nKey takeaways\nA useful takeaway')
    expect(summary).toHaveAttribute('rows', '8')
    fireEvent.click(screen.getByRole('button', { name: 'Client' }))
    expect(screen.getAllByText('Client')).toHaveLength(2)
    fireEvent.change(summary, {
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

  it('keeps the paired campaign when a client workspace is selected', () => {
    const onContinue = vi.fn()
    render(
      <MeetingPostCallReviewCard
        review={{
          spaceId: 'space-1',
          conversationId: 'conversation-1',
          meetingItemId: 'meeting-1',
          meetingTitle: 'Yasir webinar review',
          summary: 'Summary',
          clientWorkspace: '',
          clientCampaign: null,
          attendeeIds: [],
          attendees: '',
          callKind: 'client',
          callStatus: 'completed',
          fields: {
            callKind: { id: 'call_kind', name: 'Call Kind', type: 'select', options: [] },
            callStatus: { id: 'call_status', name: 'Call status', type: 'select', options: [] },
            attendees: { id: 'attendees', name: 'Attendees', type: 'multi_select', options: [] },
          },
          followUpCount: 0,
          followUps: [],
          followUpMessage: '',
        }}
        clientWorkspaceOptions={[
          {
            client_id: 'client-1',
            client_name: 'Yasir Khan',
            campaign_id: 'campaign-1',
            campaign_name: 'Yasir Khan',
            roas_space_id: 'space-1',
          },
        ]}
        onContinue={onContinue}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Select client workspace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yasir Khan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue to task review' }))

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        clientCampaign: expect.objectContaining({
          client_id: 'client-1',
          campaign_id: 'campaign-1',
        }),
      }),
    )
  })
})
