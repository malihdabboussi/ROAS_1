import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MeetingRecordingsSection } from './MeetingRecordingsSection'

const mocks = vi.hoisted(() => ({
  listFathomMeetings: vi.fn(),
  linkMeetingRecording: vi.fn(),
  openDocumentInShell: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('@/lib/brain', () => ({
  listFathomMeetings: mocks.listFathomMeetings,
}))

vi.mock('@/lib/artifacts', () => ({
  openDocumentInShell: mocks.openDocumentInShell,
}))

vi.mock('@/features/home/services/meeting-workspace-api', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/home/services/meeting-workspace-api')
  >('@/features/home/services/meeting-workspace-api')
  return {
    ...actual,
    linkMeetingRecording: mocks.linkMeetingRecording,
  }
})

describe('MeetingRecordingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listFathomMeetings.mockResolvedValue({
      items: [
        {
          recording_id: 'fathom-1',
          title: 'Aaron x Dylan x Nate',
          created_at: '2026-08-04T18:00:00.000Z',
        },
      ],
      next_cursor: undefined,
    })
    mocks.linkMeetingRecording.mockResolvedValue({
      success: true,
      recording_id: 'row-1',
      primary_recording_id: 'row-1',
      meeting_item_id: 'meeting-1',
    })
  })

  afterEach(cleanup)

  it('lets the user click a Fathom recording to link it', async () => {
    const onLinked = vi.fn().mockResolvedValue(undefined)
    render(
      <MeetingRecordingsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        recordings={[]}
        onLinked={onLinked}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Link a call recording' }))
    expect(await screen.findByText('Aaron x Dylan x Nate')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Aaron x Dylan x Nate/i }))
    await waitFor(() => {
      expect(mocks.linkMeetingRecording).toHaveBeenCalledWith(
        'space-1',
        'meeting-1',
        expect.objectContaining({ recording_id: 'fathom-1' }),
      )
    })
    expect(mocks.toastSuccess).toHaveBeenCalled()
    expect(onLinked).toHaveBeenCalled()
  })

  it('renames generic Impromptu Zoom titles using invitees', async () => {
    mocks.listFathomMeetings.mockResolvedValue({
      items: [
        {
          recording_id: 'fathom-2',
          title: 'Impromptu Zoom Meeting',
          calendar_invitees: [{ name: 'Aaron Scott' }, { name: 'Dylan Vanas' }],
        },
      ],
    })
    render(
      <MeetingRecordingsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        recordings={[]}
        onLinked={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Link a call recording' }))
    expect(await screen.findByRole('button', { name: 'Aaron + Dylan' })).toBeInTheDocument()
  })

  it('puts Open transcript beside Open recording and Link recording under them', () => {
    render(
      <MeetingRecordingsSection
        spaceId="space-1"
        meetingItemId="meeting-1"
        recordings={[
          {
            id: 'recording-1',
            title: 'Strategy call',
            provider: 'fathom',
            recording_url: 'https://fathom.video/calls/1',
            duration_seconds: 1800,
            is_primary: true,
            provider_summary: null,
            transcript_doc_item_id: 'transcript-1',
          },
        ]}
        onLinked={vi.fn()}
      />,
    )

    const recordingLink = screen.getByRole('link', { name: /Open recording/i })
    const transcript = screen.getByRole('button', { name: 'Open transcript' })
    expect(recordingLink.compareDocumentPosition(transcript)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(
      transcript.compareDocumentPosition(
        screen.getByRole('button', { name: 'Link a call recording' }),
      ),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(transcript.className).toContain('text-primary')
  })
})
