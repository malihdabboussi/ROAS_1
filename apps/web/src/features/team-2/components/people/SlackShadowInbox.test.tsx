import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SlackShadowInbox } from './SlackShadowInbox'

describe('SlackShadowInbox', () => {
  it('badges preview proposals and does not offer approval or delivery', () => {
    render(
      <SlackShadowInbox
        actions={[
          {
            id: 'preview-1',
            agent_key: 'pixel',
            target_member_id: null,
            action_kind: 'message',
            proposed_content: 'Preview copy',
            rationale: null,
            status: 'proposed',
            workflow_key: 'slack_team:all',
            source_channel_id: 'C1',
            source_message_ts: '1.0',
            sent_at: null,
            metadata: { preview: true },
            created_at: '2026-08-11T00:00:00.000Z',
          },
        ]}
        peopleById={new Map()}
        onOpenPerson={vi.fn()}
        onReview={vi.fn()}
        onSend={vi.fn()}
      />,
    )

    expect(screen.getByText('Preview')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Send to Slack/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })
})
