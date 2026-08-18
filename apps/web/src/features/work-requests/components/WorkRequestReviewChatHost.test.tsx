import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WorkRequestReviewChatHost } from './WorkRequestReviewChatHost'

vi.mock('../hooks/useWorkRequestReviewChat', () => ({
  useWorkRequestReviewChat: () => ({
    messages: [
      {
        id: 'msg-1',
        conversation_id: 'conv-1',
        role: 'assistant',
        content:
          'Review and finalize it here: https://app.roas.io/request-review/aseJrZz1ZQeZs9sBv0Adc-AJBg5IcliECGOIO9A5xZc',
        created_at: '2026-08-17T00:00:00.000Z',
        metadata: {},
      },
    ],
    conversationId: 'conv-1',
    loading: false,
    isStreaming: false,
    agentPhase: 'idle',
    agentStatusMessage: null,
    error: null,
    unavailable: false,
    sendMessage: vi.fn(),
    stopStreaming: vi.fn(),
  }),
}))

vi.mock('@/components/chat/MessageBubbleAdapter', () => ({
  MessageBubble: ({ message }: { message: { content: string | null } }) => (
    <div>{message.content}</div>
  ),
}))

vi.mock('@/components/chat/ChatInputAdapter', () => ({
  ChatInput: ({ placeholder }: { placeholder?: string }) => (
    <input aria-label="composer" placeholder={placeholder} />
  ),
}))

vi.mock('@/lib/settings/workspace-settings-modal-context', () => ({
  WorkspaceSettingsModalProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/components/vibey/vibey-chat-orb', () => ({ VibeyChatOrb: () => null }))
vi.mock('@/components/vibey/vibey-loading-orb', () => ({ VibeyLoadingOrb: () => null }))

describe('WorkRequestReviewChatHost', () => {
  afterEach(cleanup)

  it('shows the stamped thread without a Message Pixel composer', () => {
    render(
      <WorkRequestReviewChatHost
        token="aseJrZz1ZQeZs9sBv0Adc-AJBg5IcliECGOIO9A5xZc"
        draft={{
          id: 'draft-1',
          client_workspace_id: 'ws-1',
          campaign_space_id: null,
          request_type: 'funnel',
          assignee_name: null,
          title: 'Redesign post-webinar replay sales page',
          description: 'Polish speaklikeaceo.com',
          due_date: '2026-08-18',
          priority: 'high',
          structured_fields: {},
          links: [],
          required_fields: ['title'],
          missing_fields: [],
          assets: [],
          dependencies: [],
          requester: { name: null },
          status: 'draft',
          expires_at: '2026-08-17T00:00:00.000Z',
          final_task_id: null,
          sync_status: 'not_started',
          resume_conversation_id: 'conv-1',
          task_url: null,
          clickup_url: null,
        }}
        options={{ client_workspaces: [], campaign_spaces: [], team_members: [] }}
        onSave={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByPlaceholderText('Message Pixel…')).not.toBeInTheDocument()
    expect(screen.queryByText('Already on this request')).not.toBeInTheDocument()
    expect(screen.queryByText('Save draft')).not.toBeInTheDocument()
    expect(screen.getByText(/Review and finalize it here/i)).toBeInTheDocument()
  })
})
