import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceDialog } from './MeetingWorkspaceDialog'

const mocks = vi.hoisted(() => ({
  clearMeetingContext: vi.fn(),
  continueMeetingConversation: vi.fn(),
  fetchMeetingWorkspace: vi.fn(),
  openChatDrawer: vi.fn(),
  seedComposer: vi.fn(),
  setWorkAreaOpen: vi.fn(),
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  fetchMeetingWorkspace: mocks.fetchMeetingWorkspace,
  endMeetingCall: vi.fn(),
  startMeetingCall: vi.fn(),
  toggleMeetingActionStatus: vi.fn(),
  updateMeetingActionStatus: vi.fn(),
}))
vi.mock('@/features/home/lib/sync-agenda-fathom-recording', () => ({
  syncAgendaFathomRecordingToWorkspace: vi.fn().mockResolvedValue(false),
}))
vi.mock('@/features/home/components/MeetingAgendaDocEditor', () => ({
  MeetingAgendaDocEditor: ({ itemId }: { itemId: string }) => (
    <div data-testid="meeting-agenda-doc" data-item-id={itemId} />
  ),
}))
vi.mock('@/components/global-chat/store/use-global-chat-store', () => {
  const useGlobalChatStore = Object.assign(
    (
      selector: (state: {
        clearMeetingContext: typeof mocks.clearMeetingContext
        continueMeetingConversation: typeof mocks.continueMeetingConversation
      }) => unknown,
    ) =>
      selector({
        clearMeetingContext: mocks.clearMeetingContext,
        continueMeetingConversation: mocks.continueMeetingConversation,
      }),
    { getState: () => ({ seedComposer: mocks.seedComposer }) },
  )
  return { useGlobalChatStore }
})
vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: (
    selector: (state: {
      openChatDrawer: typeof mocks.openChatDrawer
      setWorkAreaOpen: typeof mocks.setWorkAreaOpen
    }) => unknown,
  ) =>
    selector({
      openChatDrawer: mocks.openChatDrawer,
      setWorkAreaOpen: mocks.setWorkAreaOpen,
    }),
}))
vi.mock('@/lib/spaces/spaces-api', () => ({
  fetchSpaceById: vi.fn().mockResolvedValue({ id: 'space-1', title: 'Meetings' }),
  updateSpaceItem: vi.fn(),
}))

describe('MeetingWorkspaceDialog agenda doc', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('seeds Start agenda into chat so Pixel writes the right-side Space Doc', async () => {
    mocks.fetchMeetingWorkspace.mockResolvedValue({
      meeting: { id: 'meeting-1', title: 'Strategy call', description: null, custom_data: {} },
      workspace: {
        meeting_item_id: 'meeting-1',
        phase: 'scheduled',
        conversation_id: 'conversation-1',
        agenda_doc_item_id: 'agenda-doc-1',
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

    await waitFor(() => {
      expect(screen.getByTestId('meeting-agenda-doc')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start agenda' }))

    expect(mocks.seedComposer).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        content: expect.stringContaining('agenda-doc-1'),
      }),
    )
    expect(mocks.seedComposer.mock.calls[0]?.[0]?.content).toContain('update_document')
  })
})
