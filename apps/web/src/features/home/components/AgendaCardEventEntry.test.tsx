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

const RELATED_RECORDING = {
  space_id: 'space-1',
  call_item_id: 'call-1',
  title: 'Campaign review',
  recording_url: 'https://fathom.video/calls/123',
  follow_ups: [],
} satisfies NonNullable<CalendarAgendaEvent['related']>

describe('AgendaEventEntry', () => {
  afterEach(cleanup)

  it('links the Fathom recording from related.recording_url on the expanded card', () => {
    render(
      <AgendaEventEntry
        ev={{ ...EVENT, related: RELATED_RECORDING }}
        isExpanded
        nowTick={Date.parse('2026-07-30T16:00:00.000Z')}
        showAccountLabel={false}
      />,
    )

    const link = screen.getByRole('link', { name: 'Watch recording' })
    expect(link.getAttribute('href')).toBe('https://fathom.video/calls/123')
  })

  it('keeps the join link when the meeting has both a video link and a recording', () => {
    render(
      <AgendaEventEntry
        ev={{ ...EVENT, video_url: 'https://meet.google.com/xyz', related: RELATED_RECORDING }}
        isExpanded
        nowTick={Date.parse('2026-07-29T16:00:00.000Z')}
        showAccountLabel={false}
      />,
    )

    expect(screen.getByRole('link', { name: 'Join meeting' }).getAttribute('href')).toBe(
      'https://meet.google.com/xyz',
    )
    expect(screen.getByRole('link', { name: 'Watch recording' }).getAttribute('href')).toBe(
      'https://fathom.video/calls/123',
    )
  })

  it('shows a recording affordance on compact rows without opening the meeting', () => {
    const onOpenMeeting = vi.fn()
    render(
      <AgendaEventEntry
        ev={{ ...EVENT, related: RELATED_RECORDING }}
        isExpanded={false}
        onOpenMeeting={onOpenMeeting}
        nowTick={Date.parse('2026-07-30T16:00:00.000Z')}
        showAccountLabel={false}
      />,
    )

    const link = screen.getByRole('link', { name: 'Watch recording' })
    expect(link.getAttribute('href')).toBe('https://fathom.video/calls/123')
    fireEvent.click(link)
    expect(onOpenMeeting).not.toHaveBeenCalled()
  })

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

  it('hides minimized meeting details behind a thin restore row', () => {
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

    expect(screen.queryByText('Minimized')).toBeNull()
    expect(screen.queryByText('Campaign review')).toBeNull()
    const [restoreRow] = screen.getAllByRole('button', {
      name: 'Restore minimized meeting: Campaign review',
    })
    if (!restoreRow) throw new Error('Restore row not rendered')
    fireEvent.click(restoreRow)
    expect(onMinimizedChange).toHaveBeenCalledWith(false)
  })
})
