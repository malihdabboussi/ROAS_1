import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetingWorkspaceDialog } from './MeetingWorkspaceDialog'

const mocks = vi.hoisted(() => ({
  clearMeetingContext: vi.fn(),
  endMeetingCall: vi.fn(),
  ensureMeetingConversation: vi.fn(),
  fetchMeetingWorkspace: vi.fn(),
  fetchMeetingRelatedCalls: vi.fn(),
  openChatDrawer: vi.fn(),
  continueMeetingConversation: vi.fn(),
  seedComposer: vi.fn(),
  openDocumentInShell: vi.fn(),
  setWorkAreaOpen: vi.fn(),
  recordWorkAreaPage: vi.fn(),
  startMeetingCall: vi.fn(),
  updateSpaceItem: vi.fn(),
  fetchSpaceById: vi.fn(),
  toggleMeetingActionStatus: vi.fn(),
  updateMeetingActionStatus: vi.fn(),
}))
vi.mock('@/lib/artifacts', () => ({
  openDocumentInShell: mocks.openDocumentInShell,
}))
vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  endMeetingCall: mocks.endMeetingCall,
  ensureMeetingConversation: mocks.ensureMeetingConversation,
  fetchMeetingWorkspace: mocks.fetchMeetingWorkspace,
  fetchMeetingRelatedCalls: mocks.fetchMeetingRelatedCalls,
  startMeetingCall: mocks.startMeetingCall,
  toggleMeetingActionStatus: mocks.toggleMeetingActionStatus,
  updateMeetingActionStatus: mocks.updateMeetingActionStatus,
}))
vi.mock('@/features/home/lib/sync-agenda-fathom-recording', () => ({
  syncAgendaFathomRecordingToWorkspace: vi.fn().mockResolvedValue(false),
}))
vi.mock('@/features/home/hooks/use-meeting-follow-up-review-entry', () => ({
  useMeetingFollowUpReviewEntry: vi.fn(),
}))
vi.mock('@/features/home/components/MeetingAgendaDocEditor', () => ({
  MeetingAgendaDocEditor: ({ itemId }: { itemId: string }) => (
    <div data-testid="meeting-agenda-doc" data-item-id={itemId} />
  ),
}))
vi.mock('@/components/work-views/AllTasksNativeList', () => ({
  AllTasksNativeList: ({ items }: { items: Array<{ id: string; title: string }> }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
      <button type="button">Add task</button>
    </div>
  ),
}))
vi.mock('@/components/work-views/AllMeetingsNativeList', () => ({
  AllMeetingsNativeList: ({ items }: { items: Array<{ id: string; title: string }> }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ),
}))
vi.mock('@/lib/work-items', () => ({
  campaignNameFromMappingPath: () => '',
  useSpaceMappingIndex: () => null,
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
    {
      getState: () => ({
        seedComposer: mocks.seedComposer,
      }),
    },
  )
  return { useGlobalChatStore }
})
vi.mock('@/lib/campaigns/campaign-api', () => ({
  fetchCampaign: vi.fn().mockResolvedValue({ id: 'campaign-1', name: 'ROAS' }),
}))
vi.mock('@/lib/spaces', () => ({
  fetchSpaceById: mocks.fetchSpaceById,
  updateSpaceItem: mocks.updateSpaceItem,
}))
vi.mock('@/components/shell/use-shell-store', () => ({
  useShellStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      openChatDrawer: mocks.openChatDrawer,
      setWorkAreaOpen: mocks.setWorkAreaOpen,
      recordWorkAreaPage: mocks.recordWorkAreaPage,
      chatDrawer: { conversationId: null },
    }),
}))

const meetingStatusField = {
  id: 'call_status',
  name: 'Call status',
  type: 'select' as const,
  options: [
    { id: 'live', label: 'Live', color: 'emerald' },
    { id: 'completed', label: 'Completed', color: 'blue' },
    { id: 'no_show', label: 'No Show', color: 'red' },
    { id: 'rescheduled', label: 'Rescheduled', color: 'amber' },
  ],
}

const baseBundle = {
  meeting: {
    id: 'meeting-1',
    title: 'Strategy call',
    description: 'Align on launch.',
    status: 'needs_follow_up',
    custom_data: { call_status: 'completed' },
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

function renderWorkspace(props: Partial<Parameters<typeof MeetingWorkspaceDialog>[0]> = {}) {
  return render(
    <MeetingWorkspaceDialog
      spaceId="space-1"
      meetingItemId="meeting-1"
      joinUrl={null}
      fallbackTitle="Strategy call"
      onBack={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />,
  )
}

describe('MeetingWorkspaceDialog', () => {
  beforeEach(() => {
    mocks.fetchMeetingRelatedCalls.mockResolvedValue([])
    mocks.fetchSpaceById.mockResolvedValue({
      id: 'space-1',
      title: 'Meetings',
      schema: { version: 1, fields: [meetingStatusField], views: [] },
    })
  })

  afterEach(() => {
    cleanup()
    for (const mock of Object.values(mocks)) {
      if (typeof mock === 'function' && 'mockClear' in mock) mock.mockClear()
    }
  })

  it('shows a meeting loader instead of temporary empty workspace sections', async () => {
    let resolveBundle: ((value: typeof baseBundle) => void) | undefined
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace.mockReturnValue(
      new Promise<typeof baseBundle>((resolve) => {
        resolveBundle = resolve
      }),
    )

    renderWorkspace()

    expect(screen.getByRole('status', { name: 'Loading meeting details…' })).toBeInTheDocument()
    expect(screen.queryByText('Recordings & attachments')).not.toBeInTheDocument()

    resolveBundle?.(baseBundle)
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Loading meeting details…' })).toBeNull()
      expect(screen.getByText('Recordings & attachments')).toBeInTheDocument()
    })
  })

  it('does not steal the open chat until Continue in chat', async () => {
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace
      .mockResolvedValueOnce({
        ...baseBundle,
        workspace: { ...baseBundle.workspace, conversation_id: null },
      })
      .mockResolvedValue(baseBundle)
    mocks.ensureMeetingConversation.mockResolvedValue(baseBundle.workspace)

    renderWorkspace()

    await waitFor(() => {
      expect(mocks.setWorkAreaOpen).toHaveBeenCalledWith(true)
      expect(
        screen.getByRole('region', { name: 'Strategy call meeting workspace' }),
      ).toBeInTheDocument()
    })
    expect(mocks.openChatDrawer).not.toHaveBeenCalled()
    expect(mocks.continueMeetingConversation).not.toHaveBeenCalled()
    expect(mocks.ensureMeetingConversation).toHaveBeenCalledWith('space-1', 'meeting-1')
    expect(mocks.startMeetingCall).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Start agenda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue in chat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue in chat' }))
    expect(mocks.continueMeetingConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingItemId: 'meeting-1',
        spaceId: 'space-1',
        conversationId: 'conversation-1',
        meetingTitle: 'Strategy call',
      }),
    )
    expect(mocks.openChatDrawer).toHaveBeenCalledWith('conversation-1')
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
    const completedBundle = {
      ...liveBundle,
      workspace: { ...liveBundle.workspace, phase: 'processing' as const },
    }
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace.mockResolvedValueOnce(liveBundle).mockResolvedValue(completedBundle)
    mocks.endMeetingCall.mockResolvedValue({
      ...liveBundle.workspace,
      phase: 'processing',
    })

    renderWorkspace({ joinUrl: 'https://zoom.example/j/1' })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'End call' })).toBeInTheDocument(),
    )
    expect(screen.getByRole('link', { name: 'Open call link' })).toHaveAttribute(
      'href',
      'https://zoom.example/j/1',
    )
    expect(screen.getByRole('button', { name: 'Continue in chat' })).toBeInTheDocument()
    expect(mocks.continueMeetingConversation).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'End call' }))
    await waitFor(() => {
      expect(mocks.endMeetingCall).toHaveBeenCalledWith('space-1', 'meeting-1')
      expect(screen.getByRole('button', { name: 'Continue in chat' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Recap message' })).toBeInTheDocument()
    })
  })

  it('keeps Continue in chat, Call status, and recap on one row after the calendar meeting ends', async () => {
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace.mockResolvedValue(baseBundle)

    renderWorkspace({
      meetingStart: '2020-01-01T10:00:00.000Z',
      meetingEnd: '2020-01-01T10:30:00.000Z',
      fallbackTitle: 'Past strategy call',
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Recap message' })).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Continue in chat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument()
    const row = screen.getByRole('button', { name: 'Continue in chat' }).parentElement
    expect(row).toContainElement(screen.getByRole('button', { name: 'Recap message' }))
    expect(row).toContainElement(screen.getByRole('button', { name: 'Completed' }))

    fireEvent.click(screen.getByRole('button', { name: 'Continue in chat' }))
    expect(mocks.continueMeetingConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conversation-1',
        meetingItemId: 'meeting-1',
      }),
    )
    expect(mocks.openChatDrawer).toHaveBeenLastCalledWith('conversation-1')
  })

  it('writes All Meetings Call status instead of task Status', async () => {
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace.mockResolvedValue(baseBundle)
    mocks.updateSpaceItem.mockResolvedValue({})

    renderWorkspace()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Completed' }))
    fireEvent.click(screen.getByRole('button', { name: 'Live' }))
    await waitFor(() => {
      expect(mocks.updateSpaceItem).toHaveBeenCalledWith('space-1', 'meeting-1', {
        custom_data: { call_status: 'live' },
      })
    })
    expect(mocks.endMeetingCall).not.toHaveBeenCalled()
    expect(mocks.startMeetingCall).not.toHaveBeenCalled()
  })

  it('separates calendar prep from post-call recap and keeps recordings first', async () => {
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace.mockResolvedValue({
      ...baseBundle,
      meeting: {
        ...baseBundle.meeting,
        source: 'fathom',
        description: 'Transcript-derived content must not appear as agenda prep.',
      },
      workspace: { ...baseBundle.workspace, phase: 'complete' as const },
      recordings: [
        {
          id: 'recording-1',
          title: 'Strategy call',
          provider: 'fathom',
          recording_url: 'https://fathom.video/calls/1',
          duration_seconds: 1800,
          is_primary: true,
          provider_summary: 'The team agreed on the launch plan.',
          transcript_doc_item_id: null,
        },
      ],
      snippets: [
        {
          id: 'note-1',
          source_type: 'manual',
          text: 'Watch campaign pacing on day one.',
          source_label: 'Dylan',
          created_at: '2026-08-10T18:00:00.000Z',
        },
      ],
    })

    renderWorkspace({
      agendaEvent: {
        id: 'calendar-1',
        title: 'Strategy call',
        description: 'Review launch goals before the meeting.',
        start: '2026-08-10T17:00:00.000Z',
        end: '2026-08-10T17:30:00.000Z',
        attendees: [],
      } as never,
    })

    await waitFor(() => expect(screen.getByText('Post-meeting recap')).toBeInTheDocument())
    expect(screen.getByText('Review launch goals before the meeting.')).toBeInTheDocument()
    expect(
      screen.queryByText('Transcript-derived content must not appear as agenda prep.'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('The team agreed on the launch plan.')).toBeInTheDocument()
    expect(screen.getByText('Watch campaign pacing on day one.')).toBeInTheDocument()
    expect(screen.queryByText('Attachments')).not.toBeInTheDocument()

    const recordings = screen.getByText('Recordings & attachments').closest('section')
    const actions = screen.getByText(/Action items/).closest('section')
    const agenda = screen.getByText('Agenda & prep').closest('section')
    expect(recordings?.compareDocumentPosition(agenda!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(agenda?.compareDocumentPosition(actions!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('renders completed Space action items in the All Tasks table', async () => {
    const action = {
      id: 'action-1',
      title: 'Send the launch recap',
      source_type: 'provider' as const,
      status: 'resolved',
      canonical_assignee_name: 'Dylan',
      canonical_assignee_email: null,
      evidence: {},
    }
    mocks.fetchMeetingWorkspace.mockReset()
    mocks.fetchMeetingWorkspace.mockResolvedValue({ ...baseBundle, actions: [action] })

    renderWorkspace()

    expect(await screen.findByText('Send the launch recap')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add task' })).toBeInTheDocument()
  })
})
