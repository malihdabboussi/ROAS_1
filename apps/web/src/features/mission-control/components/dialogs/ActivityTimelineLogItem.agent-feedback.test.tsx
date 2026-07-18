import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActivityTimelineLogItem } from './ActivityTimelineLogItem'

const actionMocks = vi.hoisted(() => ({
  AgentTurnFeedbackActions: vi.fn(() => <div data-testid="mission-agent-feedback-actions" />),
}))

vi.mock('@/components/chat/AgentTurnFeedbackActions', () => actionMocks)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ActivityTimelineLogItem agent feedback', () => {
  it('renders feedback actions for mission progress agent logs', () => {
    render(
      <ActivityTimelineLogItem
        log={
          {
            id: '66666666-6666-4666-8666-666666666666',
            mission_id: 'mission-1',
            user_id: 'user-1',
            event_type: 'mission.progress',
            from_status: null,
            to_status: null,
            agent_key: 'planner',
            correlation_id: null,
            payload: { note: 'Drafted the plan' },
            created_at: '2026-06-24T10:00:00.000Z',
          } as never
        }
        logIndex={0}
        sortedLogs={[]}
        subtasks={[]}
        agents={[]}
        userProfile={null}
      />,
    )

    expect(screen.getByTestId('mission-agent-feedback-actions')).not.toBeNull()
    expect(actionMocks.AgentTurnFeedbackActions).toHaveBeenCalledWith(
      expect.objectContaining({
        targetKind: 'mission_log',
        targetId: '66666666-6666-4666-8666-666666666666',
        sourceSurface: 'mission_activity',
        content: 'Drafted the plan',
      }),
      undefined,
    )
  })

  it('does not render a dead attachment link when a legacy comment has no file URL', () => {
    render(
      <ActivityTimelineLogItem
        log={
          {
            id: '77777777-7777-4777-8777-777777777777',
            mission_id: 'mission-1',
            user_id: 'user-1',
            event_type: 'user.comment',
            from_status: null,
            to_status: null,
            agent_key: null,
            correlation_id: null,
            payload: {
              message: 'Files attached',
              attachments: [
                {
                  filename: 'available.pdf',
                  mimeType: 'application/pdf',
                  sizeBytes: 100,
                  fileUrl: 'https://example.com/available.pdf',
                  type: 'text',
                },
                {
                  filename: 'unavailable.pdf',
                  mimeType: 'application/pdf',
                  sizeBytes: 100,
                  type: 'text',
                },
              ],
            },
            created_at: '2026-06-24T10:00:00.000Z',
          } as never
        }
        logIndex={0}
        sortedLogs={[]}
        subtasks={[]}
        agents={[]}
        userProfile={null}
      />,
    )

    expect(screen.getByRole('link', { name: /^available\.pdf$/i })).toHaveAttribute(
      'href',
      'https://example.com/available.pdf',
    )
    expect(screen.queryByRole('link', { name: /^unavailable\.pdf$/i })).toBeNull()
    expect(screen.getByText('unavailable.pdf')).not.toBeNull()
  })
})
