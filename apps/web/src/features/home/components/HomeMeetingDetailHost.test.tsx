import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { HomeMeetingDetailHost } from './HomeMeetingDetailHost'

const mocks = vi.hoisted(() => ({
  resolveMeetingsSpaceId: vi.fn(),
  resolveScheduledMeeting: vi.fn(),
}))

vi.mock('@/features/home/lib/resolve-meetings-space-id', () => ({
  resolveMeetingsSpaceId: mocks.resolveMeetingsSpaceId,
}))

vi.mock('@/features/home/services/meeting-workspace-api', () => ({
  resolveScheduledMeeting: mocks.resolveScheduledMeeting,
}))

vi.mock('@/features/home/components/MeetingWorkspaceDialog', () => ({
  MeetingWorkspaceDialog: ({
    spaceId,
    meetingItemId,
    fallbackTitle,
    joinUrl,
  }: {
    spaceId: string
    meetingItemId: string
    fallbackTitle: string
    joinUrl: string | null
  }) => (
    <div role="dialog" aria-label={`${fallbackTitle} meeting workspace`}>
      {spaceId}:{meetingItemId}:{joinUrl}
    </div>
  ),
}))

const baseEvent: CalendarAgendaEvent = {
  id: 'evt-1',
  title: 'Nate X Dylan BOW Huddle',
  start: '2026-07-30T17:00:00.000Z',
  end: '2026-07-30T17:50:00.000Z',
  all_day: false,
  location: null,
  description: 'Bring the AM support notes.',
  video_url: 'https://us06web.zoom.us/j/123',
  video_label: 'Zoom',
  html_link: 'https://calendar.google.com/event?eid=abc',
  color_id: null,
  account_label: 'Mine',
  attendees: [
    { name: 'Dylan', email: 'dylan@dylanvanas.com', status: 'accepted' },
    { name: 'Nate', email: 'nate@roas.co', status: 'needsAction' },
  ],
  source: 'google_calendar',
}

describe('HomeMeetingDetailHost', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('opens a linked call directly in the curated meeting workspace', () => {
    render(
      <HomeMeetingDetailHost
        event={{
          ...baseEvent,
          related: {
            space_id: 'space-1',
            call_item_id: 'call-1',
            title: 'Support huddle',
            recording_url: null,
            follow_ups: [],
          },
        }}
        onClose={vi.fn()}
        onOpenPrep={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Nate X Dylan BOW Huddle meeting workspace' }),
    ).toHaveTextContent('space-1:call-1')
    expect(mocks.resolveScheduledMeeting).not.toHaveBeenCalled()
  })

  it('creates or reuses a scheduled workspace before opening a future call', async () => {
    mocks.resolveMeetingsSpaceId.mockResolvedValue('meetings-space')
    mocks.resolveScheduledMeeting.mockResolvedValue({
      space_id: 'meetings-space',
      meeting_item_id: 'scheduled-call',
      conversation_id: 'meeting-conversation',
    })

    render(<HomeMeetingDetailHost event={baseEvent} onClose={vi.fn()} onOpenPrep={vi.fn()} />)

    expect(screen.getByText('Getting your meeting space ready...')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: 'Nate X Dylan BOW Huddle meeting workspace' }),
      ).toHaveTextContent('meetings-space:scheduled-call:https://us06web.zoom.us/j/123')
    })
    expect(mocks.resolveScheduledMeeting).toHaveBeenCalledWith('meetings-space', baseEvent)
  })
})
