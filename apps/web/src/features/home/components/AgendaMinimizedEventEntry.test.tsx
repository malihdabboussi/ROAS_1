import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgendaMinimizedEventEntry } from './AgendaMinimizedEventEntry'

describe('AgendaMinimizedEventEntry', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a restoreable line without strikethrough title text', () => {
    const onRestore = vi.fn()
    render(
      <AgendaMinimizedEventEntry
        ev={{
          id: 'event-1',
          title: 'Leadership alignment',
          start: '2026-08-04T17:00:00.000Z',
          end: '2026-08-04T17:30:00.000Z',
          all_day: false,
        }}
        accountLabel="Dylan"
        eventColor="#6366f1"
        onRestore={onRestore}
      />,
    )

    expect(screen.queryByText('Leadership alignment')).not.toBeInTheDocument()
    expect(screen.queryByText('Minimized')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /Restore minimized meeting/i })[0]!)
    expect(onRestore).toHaveBeenCalled()
  })
})
