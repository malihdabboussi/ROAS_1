import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { HomeMeetingDetailHost } from './HomeMeetingDetailHost'

const fetchSpaceItem = vi.fn()
const toastSuccess = vi.fn()

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

vi.mock('@/lib/spaces/spaces-api', () => ({
  fetchSpaceItem: (...args: unknown[]) => fetchSpaceItem(...args),
}))

vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => toastSuccess(...args) },
}))

const writeText = vi.fn().mockResolvedValue(undefined)
Object.assign(navigator, {
  clipboard: { writeText },
})

const baseEvent: CalendarAgendaEvent = {
  id: 'evt-1',
  title: 'Nate X Dylan BOW Huddle',
  start: '2026-07-27T17:00:00.000Z',
  end: '2026-07-27T17:50:00.000Z',
  all_day: false,
  location: null,
  description: 'Bring the AM support notes.',
  video_url: 'https://us06web.zoom.us/j/123',
  video_label: 'Zoom',
  html_link: 'https://calendar.google.com/event?eid=abc',
  color_id: null,
  account_label: 'Mine · Aaron McKeague',
  attendees: [
    { name: 'Dylan', email: 'dylan@dylanvanas.com', status: 'accepted' },
    { name: 'Nate', email: 'nate@roas.co', status: 'needsAction' },
  ],
  source: 'google_calendar',
  related: {
    space_id: 'space-1',
    call_item_id: 'call-1',
    title: 'Dylan and Nate align on AM support layer',
    summary: 'Restructure operations to bridge the AM-builder gap.',
    has_transcript: true,
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
  afterEach(() => {
    cleanup()
    fetchSpaceItem.mockReset()
    toastSuccess.mockReset()
    writeText.mockClear()
  })

  it('shows Join beside a copyable full link and guests with name + email once', () => {
    render(
      <HomeMeetingDetailHost
        event={baseEvent}
        onClose={vi.fn()}
        onOpenPrep={vi.fn()}
        onTalkWithPixel={vi.fn()}
      />,
    )

    expect(screen.getByRole('link', { name: 'Join Zoom' })).toBeTruthy()
    expect(screen.getByText('https://us06web.zoom.us/j/123')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy join link' })).toBeTruthy()
    expect(screen.getByText('Dylan')).toBeTruthy()
    expect(screen.getByText('dylan@dylanvanas.com')).toBeTruthy()
    expect(screen.queryByText('Mine · Aaron McKeague')).toBeNull()
    expect(screen.getByRole('button', { name: 'Prepare with Pixel' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Start pre-call prep' })).toBeNull()

    const dialog = screen.getByRole('dialog')
    expect(dialog.className).toContain('max-w-lg')
    expect(dialog.className).not.toContain('max-w-2xl')
  })

  it('copies the join link and expands details downward without widening', async () => {
    fetchSpaceItem.mockResolvedValue({
      id: 'call-1',
      description: null,
      custom_data: {
        transcript_text: 'Dylan: Hello\nNate: Let’s align on AM support.',
      },
    })

    render(
      <HomeMeetingDetailHost
        event={baseEvent}
        onClose={vi.fn()}
        onOpenPrep={vi.fn()}
        onTalkWithPixel={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy join link' }))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://us06web.zoom.us/j/123')
      expect(toastSuccess).toHaveBeenCalledWith('Link copied.')
    })

    fireEvent.click(screen.getByRole('button', { name: 'More details' }))

    expect(screen.getByText('Bring the AM support notes.')).toBeInTheDocument()
    expect(screen.getByText('Mine · Aaron McKeague')).toBeInTheDocument()
    expect(
      screen.getByText('Restructure operations to bridge the AM-builder gap.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog').className).toContain('max-w-lg')
    expect(screen.getByRole('dialog').className).not.toContain('max-w-2xl')

    fireEvent.click(screen.getByRole('button', { name: 'Full transcript' }))
    await waitFor(() => {
      expect(screen.getByText(/Dylan: Hello/)).toBeInTheDocument()
    })
    expect(fetchSpaceItem).toHaveBeenCalledWith('space-1', 'call-1')
  })
})
