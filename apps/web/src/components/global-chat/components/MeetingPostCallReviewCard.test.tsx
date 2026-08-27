import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MeetingPostCallReviewCard } from './MeetingPostCallReviewCard'

describe('MeetingPostCallReviewCard', () => {
  it('shows editable Slack recap details and continues with the edited values', () => {
    const onContinue = vi.fn()
    render(
      <MeetingPostCallReviewCard
        review={{
          conversationId: 'conversation-1',
          meetingItemId: 'meeting-1',
          meetingTitle: 'Yasir webinar review',
          summary: 'Original summary',
          clientWorkspace: 'Yasir Khan',
          attendees: 'Yasir, Dylan, Nate',
          followUpCount: 7,
          followUps: [
            { id: 'follow-up-1', title: 'Build the VSL funnel', status: 'proposed' },
          ],
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
    fireEvent.click(screen.getByRole('button', { name: 'Continue to task review' }))

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Edited summary', followUpMessage: 'Edited follow-up' }),
    )
  })
})
