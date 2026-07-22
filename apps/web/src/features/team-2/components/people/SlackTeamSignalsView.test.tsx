import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SlackTeamSignalsView } from './SlackTeamSignalsView'

describe('SlackTeamSignalsView', () => {
  it('shows readable source evidence for a selected signal', () => {
    render(
      <SlackTeamSignalsView
        actions={[
          {
            id: 'signal-1',
            agent_key: 'pixel',
            target_member_id: null,
            action_kind: 'workflow',
            proposed_content: 'Josh asked three unanswered questions.',
            rationale: 'The thread has no later human reply.',
            status: 'proposed',
            workflow_key: 'slack_team:all',
            source_channel_id: 'C123',
            source_message_ts: '1721000000.000100',
            sent_at: null,
            metadata: {
              confidence: 0.95,
              source_channel_name: 'roas-allbright-coaching-644',
              source_sender_display_name: 'Josh ALLBRiGHT',
              source_sender_slack_user_id: 'U123',
              source_message_text: 'Where is the replay from 7/16?',
            },
            created_at: '2026-07-22T09:00:00.000Z',
          },
        ]}
        selectedSignalId="signal-1"
        onBack={vi.fn()}
        onSelectSignal={vi.fn()}
        onReview={vi.fn()}
      />,
    )

    expect(screen.getByText('Why Pixel flagged this')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show source evidence' }))
    expect(screen.getByText('#roas-allbright-coaching-644')).toBeInTheDocument()
    expect(screen.getByText(/Josh ALLBRiGHT/)).toBeInTheDocument()
    expect(screen.getByText('Where is the replay from 7/16?')).toBeInTheDocument()
    expect(screen.getByText('95% confidence')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open source message in Slack' })).toHaveAttribute(
      'href',
      'https://slack.com/archives/C123/p1721000000000100',
    )
  })
})
