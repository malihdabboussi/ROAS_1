import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MeetingTaskReviewStep } from './MeetingPostCallReviewStages'

describe('MeetingTaskReviewStep', () => {
  it('keeps the existing Portal delegation review inline', () => {
    render(
      <MeetingTaskReviewStep
        preview={{
          delegation_id: 'delegation-1',
          confirm_url: 'https://portal.roas.io/dashboard?delegation=delegation-1',
          tasks: [],
          campaign_id: 'campaign-1',
        }}
        onComplete={vi.fn()}
      />,
    )

    expect(screen.getByTitle('Bulk task delegation review')).toHaveAttribute(
      'src',
      'https://portal.roas.io/dashboard?delegation=delegation-1',
    )
    expect(screen.queryByRole('link', { name: 'Open task review' })).not.toBeInTheDocument()
  })
})
