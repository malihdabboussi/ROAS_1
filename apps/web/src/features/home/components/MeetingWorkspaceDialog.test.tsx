import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceDialog } from './MeetingWorkspaceDialog'

const mocks = vi.hoisted(() => ({
  attachMeetingContext: vi.fn(),
  clearMeetingContext: vi.fn(),
  endMeetingCall: vi.fn(),
  fetchMeetingWorkspace: vi.fn(),
  openChatDrawer: vi.fn(),
  openDocumentInShell: vi.fn(),
  setRailIntent: vi.fn(),
  setWorkAreaOpen: vi.fn(),
  startMeetingCall: vi.fn(),
  updateMeetingActionStatus: vi.fn(),
}))

vi.mock('@/lib/artifacts', () => ({
  openDocumentInShell: mocks.openDocumentInShell,
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  endMeetingCall: mocks.endMeetingCall,
  fetchMeetingWorkspace: mocks.fetchMeetingWorkspace,
  startMeetingCall: mocks.startMeetingCall,
  updateMeetingActionStatus: mocks.updateMeetingActionStatus,
}))

vi.mock('@/features/home/lib/sync-agenda-fathom-recording', () => ({
  syncAgendaFathomRecordingToWorkspace: vi.fn().mockResolvedValue(false),
}))

vi.mock('@/components/global-chat/store/use-global-chat-store', () => ({
  useGlobalChatStore: (
    selector: (state: {
      attachMeetingContext: typeof mocks.attachMeetingContext
      clearMeetingContext: typeof mocks.clearMeetingContext
      setRailIntent: typeof mocks.setRailIntent
    }) => unknown,
  ) =>
    selector({
      attachMeetingContext: mocks.attachMeetingContext,
      clearMeetingContext: mocks.clearMeetingContext,
      setRailIntent: mocks.setRailIntent,
    }),
}))

vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaign: vi.fn().mockResolvedValue({ id: 'campaign-1', name: 'ROAS' }),
}))

vi.mock('@/lib/spaces/spaces-api', () => ({
  fetchSpaceById: vi.fn().mockResolvedValue({ id: 'space-1', title: 'Meetings' }),
}))

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

const baseBundle = {
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
  context_links: [{ entity_type: 'campaign', entity_id: 'campaign-1', label: 'ROAS' }],
  continuity: { prior_meeting_item_id: null, unresolved_commitments: [] },
}

describe('MeetingWorkspaceDialog', () => {
  afterEach(() => {
    cleanup()
    for (const mock of Object.values(mocks)) mock.mockClear()
  })

  it('opens the persistent meeting conversation in the main shell chat', async () => {
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace.mockResolvedValue(baseBundle)

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
      expect(mocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
      expect(mocks.setRailIntent).toHaveBeenCalledWith(null)
      expect(mocks.attachMeetingContext).toHaveBeenCalledWith(
        expect.objectContaining({
          meetingItemId: 'meeting-1',
          spaceId: 'space-1',
          conversationId: 'conversation-1',
        }),
      )
    })
    const spaceLink = screen.getByRole('link', { name: 'Meetings' })
    expect(spaceLink).toHaveAttribute('href', '/spaces?space=space-1')
    expect(screen.getByRole('link', { name: /Campaign|ROAS/ })).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Strategy call meeting workspace' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start call' })).toBeInTheDocument()
    expect(screen.queryByText('Rejoin call')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close meeting workspace' }))
    expect(mocks.clearMeetingContext).toHaveBeenCalled()
  })

  it('ends a live call instead of rejoining', async () => {
    const liveBundle = {
      ...baseBundle,
      workspace: {
        ...baseBundle.workspace,
        phase: 'live' as const,
        live_started_at: '2026-08-04T17:00:00.000Z',
      },
    }
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace
      .mockResolvedValueOnce(liveBundle)
      .mockResolvedValueOnce({
        ...liveBundle,
        workspace: { ...liveBundle.workspace, phase: 'processing' as const },
      })
      .mockResolvedValue({
        ...liveBundle,
        workspace: { ...liveBundle.workspace, phase: 'processing' as const },
      })
    mocks.endMeetingCall.mockResolvedValue({
      ...liveBundle.workspace,
      phase: 'processing',
    })

    render(
      <MeetingWorkspaceDialog
        spaceId="space-1"
        meetingItemId="meeting-1"
        joinUrl="https://zoom.example/j/1"
        fallbackTitle="Strategy call"
        onBack={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'End call' })).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'Open call link' })).toHaveAttribute(
      'href',
      'https://zoom.example/j/1',
    )
    expect(mocks.attachMeetingContext).toHaveBeenCalledWith(
      expect.objectContaining({
        awarenessContext: expect.stringContaining('LIVE CALL MODE'),
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'End call' }))
    await waitFor(() => {
      expect(mocks.endMeetingCall).toHaveBeenCalledWith('space-1', 'meeting-1')
      expect(screen.getByRole('button', { name: 'Continue in chat' })).toBeInTheDocument()
    })
  })
})
