import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceDialog } from './MeetingWorkspaceDialog'

const mocks = vi.hoisted(() => ({
  addMeetingSnippet: vi.fn(),
  attachMeetingContext: vi.fn(),
  fetchMeetingWorkspace: vi.fn(),
  openChatDrawer: vi.fn(),
  startMeetingCall: vi.fn(),
  updateMeetingActionStatus: vi.fn(),
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  addMeetingSnippet: mocks.addMeetingSnippet,
  fetchMeetingWorkspace: mocks.fetchMeetingWorkspace,
  startMeetingCall: mocks.startMeetingCall,
  updateMeetingActionStatus: mocks.updateMeetingActionStatus,
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (
    selector: (state: { attachMeetingContext: typeof mocks.attachMeetingContext }) => unknown,
  ) => selector({ attachMeetingContext: mocks.attachMeetingContext }),
}))

vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: (selector: (state: { openChatDrawer: typeof mocks.openChatDrawer }) => unknown) =>
    selector({ openChatDrawer: mocks.openChatDrawer }),
}))

const bundle = {
  meeting: {
    id: 'meeting-1',
    title: 'Strategy call',
    description: 'Align on launch.',
    custom_data: {},
  },
  workspace: {
    meeting_item_id: 'meeting-1',
    phase: 'scheduled' as const,
    conversation_id: 'conversation-1',
    agenda_doc_item_id: null,
    notes_doc_item_id: null,
    recap_doc_item_id: null,
    live_started_at: null,
  },
  recordings: [],
  actions: [],
  snippets: [],
  deliverables: [],
  context_links: [],
  continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
}

describe('MeetingWorkspaceDialog', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens the persistent meeting conversation in the main shell chat', async () => {
    mocks.fetchMeetingWorkspace.mockResolvedValue(bundle)

    render(
      <MeetingWorkspaceDialog
        spaceId="space-1"
        meetingItemId="meeting-1"
        joinUrl={null}
        fallbackTitle="Strategy call"
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(mocks.openChatDrawer).toHaveBeenCalledWith('conversation-1')
      expect(mocks.attachMeetingContext).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingItemId: 'meeting-1',
          spaceId: 'space-1',
          conversationId: 'conversation-1',
        }),
      )
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Meeting chat')).not.toBeInTheDocument()
    expect(screen.queryByText('Meeting AI')).not.toBeInTheDocument()
  })

  it('saves live notes and call snippets into the connected chat timeline', async () => {
    mocks.fetchMeetingWorkspace.mockResolvedValue(bundle)
    mocks.addMeetingSnippet.mockResolvedValue({
      snippet: {
        id: 'snippet-1',
        source_type: 'call_quote',
        text: 'Customer needs the revised scope.',
        source_label: 'Call snippet',
        created_at: '2026-07-29T12:00:00.000Z',
      },
      conversation_id: 'conversation-1',
      message_id: 'message-1',
    })

    render(
      <MeetingWorkspaceDialog
        spaceId="space-1"
        meetingItemId="meeting-1"
        joinUrl={null}
        fallbackTitle="Strategy call"
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await waitFor(() => expect(mocks.openChatDrawer).toHaveBeenCalledWith('conversation-1'))
    fireEvent.click(screen.getByRole('button', { name: 'Call snippet' }))
    fireEvent.change(screen.getByPlaceholderText('Add a live note or paste a call snippet…'), {
      target: { value: 'Customer needs the revised scope.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add to meeting chat' }))

    await waitFor(() => {
      expect(mocks.addMeetingSnippet).toHaveBeenCalledWith(
        'space-1',
        'meeting-1',
        'Customer needs the revised scope.',
        'call_quote',
      )
      expect(mocks.attachMeetingContext).toHaveBeenLastCalledWith(
        expect.objectContaining({ timelineVersion: 1 }),
      )
    })
  })
})
