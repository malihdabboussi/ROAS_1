import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarBoard, type CalendarEvent } from '.'

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe('CalendarBoard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-18T12:00:00.000Z'))
    Object.assign(globalThis, { ResizeObserver: ResizeObserverMock })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders exclusive-end provider all-day events in the week all-day strip', () => {
    const events: CalendarEvent[] = [
      {
        id: 'google:birthday',
        sourceId: 'google_calendar',
        start: '2026-06-18T00:00:00.000Z',
        end: '2026-06-19T00:00:00.000Z',
        allDay: true,
        title: 'Happy birthday!',
        raw: { all_day: true },
      },
    ]

    render(
      <CalendarBoard
        events={events}
        defaultScope="week"
        readOnly
        renderMonthEvent={(event, ctx) => (
          <span data-testid={`strip-${ctx.role}`}>{event.title}</span>
        )}
        renderHourEvent={(event) => <span data-testid="hour-event">{event.title}</span>}
        renderDayEvent={(event) => <span>{event.title}</span>}
      />,
    )

    expect(screen.getByText('all-day')).toBeTruthy()
    expect(screen.getByTestId('strip-single').textContent).toContain('Happy birthday!')
    expect(screen.queryByTestId('strip-start')).toBeNull()
    expect(screen.queryByTestId('hour-event')).toBeNull()
  })
})
