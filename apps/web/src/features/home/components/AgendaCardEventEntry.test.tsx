import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import { AgendaEventEntry } from './AgendaCardEventEntry'

const EVENT = {
  id: 'meeting-1',
  title: 'Campaign review',
  start: '2026-07-29T17:00:00.000Z',
  end: '2026-07-29T18:00:00.000Z',
  source: 'google_calendar',
  account_id: 'account-1',
  attendees: [],
  all_day: false,
  video_url: null,
  video_label: null,
  html_link: null,
  color_id: null,
} satisfies CalendarAgendaEvent

describe('AgendaEventEntry', () => {
  afterEach(cleanup)

  it('uses a minimize control instead of dismissing the meeting', () => {
    const onMinimizedChange = vi.fn()

    render(
      <AgendaEventEntry
        ev={EVENT}
        isExpanded
        onSelect={vi.fn()}
        onMinimizedChange={onMinimizedChange}
        nowTick={Date.parse('2026-07-29T16:00:00.000Z')}
        showAccountLabel={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Minimize meeting' }))
    expect(onMinimizedChange).toHaveBeenCalledWith(true)
  })

  it('renders a compact retained row and restores it', () => {
    const onMinimizedChange = vi.fn()

    render(
      <AgendaEventEntry
        ev={EVENT}
        isExpanded={false}
        isMinimized
        onSelect={vi.fn()}
        onMinimizedChange={onMinimizedChange}
        nowTick={Date.parse('2026-07-29T16:00:00.000Z')}
        showAccountLabel={false}
      />,
    )

    expect(screen.queryByText('Campaign review')).toBeNull()
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Restore minimized meeting: Campaign review' })[0]!,
    )
    expect(onMinimizedChange).toHaveBeenCalledWith(false)
  })

  it('does not render a camera icon for meetings with video links', () => {
    const { container } = render(
      <AgendaEventEntry
        ev={{ ...EVENT, video_url: 'https://zoom.us/j/123', video_label: 'Zoom' }}
        isExpanded={false}
        onSelect={vi.fn()}
        nowTick={Date.parse('2026-07-29T16:00:00.000Z')}
        showAccountLabel={false}
      />,
    )

    expect(container.querySelector('svg')).toBeNull()
  })
})
