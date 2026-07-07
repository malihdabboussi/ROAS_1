import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatRenderMessage } from '@/lib/chat/chat-render-message'
import { SpaceVoiceRunsView, type SpaceVoiceRunTask } from './SpaceVoiceRunsView'

vi.mock('@/components/chat/MessageBubbleAdapter', () => ({
  MessageBubble: ({
    message,
    isStreaming,
    conversationIdOverride,
  }: {
    message: ChatRenderMessage
    isStreaming?: boolean
    conversationIdOverride?: string | null
  }) => (
    <div data-testid={`message-bubble-${message.id}`}>
      {message.id}:{String(isStreaming)}:{conversationIdOverride}
    </div>
  ),
}))

function message(overrides: Partial<ChatRenderMessage>): ChatRenderMessage {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: null,
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('SpaceVoiceRunsView', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the empty task state', () => {
    render(<SpaceVoiceRunsView conversationId="conversation-1" tasks={[]} messages={[]} onBack={vi.fn()} />)

    expect(screen.getByText('Tasks & Runs')).toBeTruthy()
    expect(screen.getByText('0 total')).toBeTruthy()
    expect(screen.getByText('No running tasks')).toBeTruthy()
  })

  it('renders task rows, auto-expands the latest running task, and toggles rows', async () => {
    const tasks: SpaceVoiceRunTask[] = [
      {
        delegationId: 'delegation-complete',
        messageId: 'message-complete',
        task: 'Completed research task',
        status: 'completed',
      },
      {
        delegationId: 'delegation-running',
        messageId: 'message-running',
        task: 'Running launch copy task',
        status: 'running',
      },
    ]
    const messages = [
      message({
        id: 'message-complete',
        content: 'Completed fallback',
        metadata: { voice_task_label: 'Completed metadata label' },
      }),
      message({ id: 'message-running', content: 'Running fallback' }),
    ]

    render(
      <SpaceVoiceRunsView
        conversationId="conversation-1"
        tasks={tasks}
        messages={messages}
        onBack={vi.fn()}
      />,
    )

    expect(screen.getByText('1 running')).toBeTruthy()
    expect(screen.getByText('Completed research task')).toBeTruthy()
    expect(screen.getByText('Running launch copy task')).toBeTruthy()
    expect(screen.getByText('Done')).toBeTruthy()
    expect(screen.getByText('Running')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByTestId('message-bubble-message-running').textContent).toBe(
        'message-running:true:conversation-1',
      )
    })

    fireEvent.click(screen.getByRole('button', { name: /Completed research task/ }))

    expect(screen.getByTestId('message-bubble-message-complete').textContent).toBe(
      'message-complete:false:conversation-1',
    )
  })
})
