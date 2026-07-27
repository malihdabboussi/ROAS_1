import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { HomeMeetingDetailHost } from './HomeMeetingDetailHost'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
  }),
}))

vi.mock('@/features/home/lib/ask-meeting-in-chat', () => ({
  askAboutMeetingInChat: vi.fn(),
}))

const baseEvent: CalendarAgendaEvent = {
  id: 'evt-1',
  title: 'Nate X Dylan BOW Huddle',
  start: '2026-07-27T17:00:00.000Z',
  end: '2026-07-27T17:50:00.000Z',
  all_day: false,
  location: null,
  video_url: null,
  video_label: null,
  html_link: null,
  color_id: null,
  attendees: [{ name: 'Dylan', email: 'dylan@dylanvanas.com', status: 'accepted' }],
  source: 'google_calendar',
  related: {
    space_id: 'space-1',
    call_item_id: 'call-1',
    title: 'Dylan and Nate align on AM support layer',
    summary: 'Restructure operations to bridge the AM-builder gap.',
    recording_url: 'https://fathom.video/share/abc',
    follow_ups: [
      {
        id: 'fu-mine',
        title: 'Confirm Carol Ops Lead scope',
        status: 'logged',
        assignee_id: 'user-1',
        assignee_type: 'human',
      },
      {
        id: 'fu-other',
        title: 'Walk AMs through creating tasks',
        status: 'logged',
        assignee_id: 'user-2',
        assignee_type: 'human',
      },
    ],
  },
}

describe('HomeMeetingDetailHost', () => {
  afterEach(cleanup)

  it('shows summary, Fathom link, and yours vs other action items without raw logged status', async () => {
    render(
      <HomeMeetingDetailHost
        event={baseEvent}
        onClose={vi.fn()}
        onOpenPrep={vi.fn()}
        onStartPrep={vi.fn()}
      />,
    )

    expect(
      screen.getByText('Restructure operations to bridge the AM-builder gap.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Fathom recording' })).toHaveAttribute(
      'href',
      'https://fathom.video/share/abc',
    )
    await waitFor(() => {
      expect(screen.getByText('Your action items')).toBeInTheDocument()
    })
    expect(screen.getByText('Other action items')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Carol Ops Lead scope' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Walk AMs through creating tasks' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/· logged/i)).not.toBeInTheDocument()
  })
})
