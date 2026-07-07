import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgentTaskExecutionBlock } from './AgentTaskExecutionBlock'

const actionMocks = vi.hoisted(() => ({
  AgentTurnFeedbackActions: vi.fn(() => <div data-testid="task-agent-feedback-actions" />),
}))
const orderedBlocksMock = vi.hoisted(() => ({
  ChannelOrderedBlocks: vi.fn(() => <div data-testid="channel-ordered-blocks" />),
}))

vi.mock('@/components/chat/AgentTurnFeedbackActions', () => actionMocks)
vi.mock('@/components/vibey/vibey-chat-orb', () => ({
  VibeyChatOrb: () => <div data-testid="vibey-chat-orb" />,
}))
vi.mock('@/components/channels/ChannelOrderedBlocksAdapter', () => orderedBlocksMock)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AgentTaskExecutionBlock', () => {
  it('renders feedback actions for completed task agent executions', () => {
    render(
      <AgentTaskExecutionBlock
        entry={
          {
            id: '55555555-5555-4555-8555-555555555555',
            source: 'agent',
            user_id: null,
            event_type: 'agent_task_execution',
            payload: {
              agent_key: 'task-agent',
              status: 'completed',
              content: 'Updated the task',
            },
            created_at: '2026-06-24T10:00:00.000Z',
          } as never
        }
        displayName="Task Agent"
      />,
    )

    expect(screen.getByTestId('task-agent-feedback-actions')).not.toBeNull()
    expect(actionMocks.AgentTurnFeedbackActions).toHaveBeenCalledWith(
      expect.objectContaining({
        targetKind: 'space_item_activity',
        targetId: '55555555-5555-4555-8555-555555555555',
        sourceSurface: 'task_activity',
        content: 'Updated the task',
      }),
      undefined,
    )
  })

  it('passes completed duration to ordered block work grouping', () => {
    render(
      <AgentTaskExecutionBlock
        entry={
          {
            id: '66666666-6666-4666-8666-666666666666',
            source: 'agent',
            user_id: null,
            event_type: 'agent_task_execution',
            payload: {
              agent_key: 'task-agent',
              status: 'done',
              content: 'Updated the task',
              duration_ms: 12_500,
              content_blocks_ordered: [
                {
                  type: 'thinking_transcript',
                  id: 'thinking-1',
                  content: 'Checked the task context',
                  state: 'complete',
                },
                {
                  type: 'tool',
                  id: 'tool-1',
                  name: 'read',
                  label: 'Read task context',
                  state: 'complete',
                  startedAt: 1,
                  endedAt: 2,
                },
                {
                  type: 'text',
                  id: 'text-final',
                  content: 'Updated the task',
                },
              ],
            },
            created_at: '2026-06-24T10:00:00.000Z',
          } as never
        }
        displayName="Task Agent"
      />,
    )

    expect(screen.getByTestId('channel-ordered-blocks')).not.toBeNull()
    expect(orderedBlocksMock.ChannelOrderedBlocks).toHaveBeenCalledWith(
      expect.objectContaining({
        collapseCompletedWorkSummary: true,
        durationMs: 12_500,
        isStreaming: false,
      }),
      undefined,
    )
  })
})
