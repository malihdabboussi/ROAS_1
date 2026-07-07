import { Profiler } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MissionAgent } from '@/lib/agents'
import type { Message } from '@/lib/chat/studio-chat-runtime-adapter'
import { AgentVoiceMode } from './AgentVoiceMode'

const mocks = vi.hoisted(() => {
  const liveSession = {
    state: 'connecting',
    inputTranscript: '',
    outputTranscript: '',
    audioLevelRef: { current: 0 },
    error: null as string | null,
    isMuted: false,
    delegationTasks: [] as Array<{
      delegationId: string
      messageId: string
      task: string
      status: 'running' | 'completed' | 'failed'
    }>,
    startSession: vi.fn(),
    reconnectSession: vi.fn(),
    endSession: vi.fn(),
    toggleMute: vi.fn(),
    sendApproval: vi.fn(),
  }

  return {
    liveSession,
    messagesByConversation: {} as Record<string, Message[]>,
    lastScope: null as unknown,
  }
})

vi.mock('next/dynamic', () => ({
  default: () =>
    function BrainVoiceOrbSceneMock(props: { animationState: string }) {
      return <div data-testid="brain-voice-orb" data-state={props.animationState} />
    },
}))

vi.mock('@/features/brain/hooks/use-brain-live-session', () => ({
  useBrainLiveSession: (scope: unknown) => {
    mocks.lastScope = scope
    return mocks.liveSession
  },
}))

vi.mock('@/lib/brain/brain-live-session-adapter', () => ({
  useBrainLiveSession: (scope: unknown) => {
    mocks.lastScope = scope
    return mocks.liveSession
  },
}))

vi.mock('@/features/studio/store/use-chat-store', () => ({
  useChatStore: (selector: (state: { messagesByConversation: Record<string, Message[]> }) => unknown) =>
    selector({ messagesByConversation: mocks.messagesByConversation }),
}))

vi.mock('@/lib/chat/studio-chat-runtime-adapter', () => ({
  useChatStore: (selector: (state: { messagesByConversation: Record<string, Message[]> }) => unknown) =>
    selector({ messagesByConversation: mocks.messagesByConversation }),
}))

function MessageBubbleMock({
  message,
  isStreaming,
}: {
  message: Message
  isStreaming?: boolean
}) {
  return (
    <div data-testid="message-bubble">
      {message.role}:{message.content}
      {isStreaming ? ':streaming' : ''}
    </div>
  )
}

vi.mock('@/features/studio/components/MessageBubble', () => ({
  MessageBubble: MessageBubbleMock,
}))

vi.mock('@/components/chat/MessageBubbleAdapter', () => ({
  MessageBubble: MessageBubbleMock,
}))

function StatusIndicatorMock({ conversationIdOverride }: { conversationIdOverride?: string | null }) {
  return <div data-testid="status-indicator">{conversationIdOverride}</div>
}

vi.mock('@/features/studio/components/chat/StatusIndicator', () => ({
  StatusIndicator: StatusIndicatorMock,
}))

vi.mock('@/components/chat/StatusIndicatorAdapter', () => ({
  StatusIndicator: StatusIndicatorMock,
}))

function buildAgent(overrides: Partial<MissionAgent> = {}): MissionAgent {
  return {
    id: 'agent-row-1',
    user_id: 'user-1',
    agent_key: 'agent-alpha',
    name: 'Agent Alpha',
    role: 'Operations',
    status: 'online',
    skills: [],
    image_url: 'https://cdn.example.com/agent.png',
    is_active: true,
    sync_status: 'ready',
    created_at: '2026-06-30T00:00:00.000Z',
    updated_at: '2026-06-30T00:00:00.000Z',
    ...overrides,
  }
}

function buildMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    conversation_id: 'conversation-1',
    role: 'assistant',
    content: 'Hello',
    content_blocks: null,
    metadata: {},
    created_at: '2026-06-30T00:00:00.000Z',
    ...overrides,
  }
}

describe('AgentVoiceMode', () => {
  beforeEach(() => {
    mocks.liveSession.state = 'connecting'
    mocks.liveSession.error = null
    mocks.liveSession.isMuted = false
    mocks.liveSession.delegationTasks = []
    mocks.messagesByConversation = {}
    mocks.lastScope = null
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    })
  })

  afterEach(() => {
    cleanup()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('starts a scoped voice session and renders visible conversation turns', () => {
    mocks.liveSession.state = 'listening'
    mocks.messagesByConversation['conversation-1'] = [
      buildMessage({ id: 'leading-1', role: 'assistant', content: 'Ready first' }),
      buildMessage({ id: 'hidden-1', role: 'assistant', content: 'Hidden', metadata: { hidden: true } }),
      buildMessage({ id: 'user-1', role: 'user', content: 'Can you help?' }),
      buildMessage({ id: 'assistant-1', role: 'assistant', content: 'On it' }),
      buildMessage({
        id: 'delegation-1',
        role: 'assistant',
        content: 'Delegation',
        metadata: { delegation_task: true },
      }),
    ]

    render(
      <AgentVoiceMode
        agent={buildAgent()}
        conversationId="conversation-1"
        voiceName="alloy"
        onEnd={vi.fn()}
      />,
    )

    expect(mocks.liveSession.startSession).toHaveBeenCalledTimes(1)
    expect(mocks.lastScope).toMatchObject({
      type: 'agent',
      agentId: 'agent-alpha',
      label: 'Agent Alpha',
      avatarUrl: 'https://cdn.example.com/agent.png',
      voiceName: 'alloy',
      conversationId: 'conversation-1',
    })
    expect(screen.getByTestId('brain-voice-orb')).toHaveAttribute('data-state', 'listening')
    expect(screen.getByTestId('status-indicator')).toHaveTextContent('conversation-1')
    expect(screen.getByText('assistant:Ready first')).toBeInTheDocument()
    expect(screen.getByText('user:Can you help?')).toBeInTheDocument()
    expect(screen.getByText('assistant:On it')).toBeInTheDocument()
    expect(screen.queryByText('assistant:Hidden')).not.toBeInTheDocument()
    expect(screen.queryByText('assistant:Delegation')).not.toBeInTheDocument()
  })

  it('handles mute, end, reconnect, task panel rendering, and rerender stability', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const onEnd = vi.fn()
    let commits = 0
    mocks.liveSession.state = 'listening'
    mocks.liveSession.delegationTasks = [
      {
        delegationId: 'delegation-1',
        messageId: 'task-message-1',
        task: 'Prepare the launch checklist',
        status: 'running',
      },
    ]
    mocks.messagesByConversation['conversation-1'] = [
      buildMessage({ id: 'task-message-1', role: 'assistant', content: 'Task output' }),
    ]

    const { rerender } = render(
      <Profiler id="agent-voice-mode" onRender={() => (commits += 1)}>
        <AgentVoiceMode agent={buildAgent()} conversationId="conversation-1" onEnd={onEnd} />
      </Profiler>,
    )

    fireEvent.click(screen.getByTitle('Mute'))
    fireEvent.click(screen.getByRole('button', { name: 'End' }))
    expect(mocks.liveSession.toggleMute).toHaveBeenCalledTimes(1)
    expect(mocks.liveSession.endSession).toHaveBeenCalledTimes(1)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.getByText('Prepare the launch checklist')).toBeInTheDocument()

    mocks.liveSession.state = 'error'
    mocks.liveSession.error = 'Microphone blocked'
    rerender(
      <Profiler id="agent-voice-mode" onRender={() => (commits += 1)}>
        <AgentVoiceMode agent={buildAgent()} conversationId="conversation-1" onEnd={onEnd} />
      </Profiler>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }))
    expect(mocks.liveSession.reconnectSession).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Microphone blocked')).toBeInTheDocument()
    expect(commits).toBeLessThan(25)
    expect(consoleErrorSpy.mock.calls.flat().join('\n')).not.toMatch(
      /maximum update depth|too many re-renders/i,
    )

    consoleErrorSpy.mockRestore()
  })
})
