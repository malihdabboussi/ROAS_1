import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgendaCardHeader, AgendaCardRangeNav } from './AgendaCardChrome'

describe('AgendaCardChrome', () => {
  afterEach(cleanup)

  it('uses the shared compact and icon controls for the page toolbar', () => {
    render(
      <AgendaCardHeader
        showAgendaSurface
        bothConnected={false}
        provider="all"
        setProvider={vi.fn()}
        agendaScope="personal"
        setAgendaScope={vi.fn()}
        showTeamToggle
        view="list"
        setView={vi.fn()}
        teamCoverage={null}
        onStartInstantMeeting={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Mine' })).toHaveClass('button-compact')
    expect(screen.queryByRole('button', { name: 'Prep today' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Ask Pixel about your agenda' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Start impromptu call' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'List view' })).toHaveClass('btn-icon-glass')
    expect(screen.getByRole('button', { name: 'List view' })).toHaveClass('btn-icon-glass--active')
    expect(screen.getByRole('button', { name: 'Calendar views' })).toHaveClass('btn-icon-glass')
  })

  it('shows team calendar coverage menu for Team scope', () => {
    render(
      <AgendaCardHeader
        showAgendaSurface
        bothConnected={false}
        provider="all"
        setProvider={vi.fn()}
        agendaScope="team"
        setAgendaScope={vi.fn()}
        showTeamToggle
        view="list"
        setView={vi.fn()}
        teamCoverage={{
          included: [
            {
              identity_id: 'nate',
              email: 'nate@roas.co',
              display_name: 'Nate',
              match_status: 'confirmed',
              event_count: 2,
            },
          ],
          skipped: [],
          errors: [],
          totals: { directory: 1, pulled: 1, rejected: 0, capped: 0, failed: 0 },
        }}
        onStartInstantMeeting={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Team calendar coverage' })).toBeTruthy()
  })

  it('opens an app-styled date-range menu without arbitrary-value classes', () => {
    const setRangeOpen = vi.fn()
    const { container } = render(
      <AgendaCardRangeNav
        day={new Date('2026-07-26T12:00:00.000Z')}
        range="week"
        rangeOpen
        setRangeOpen={setRangeOpen}
        setDay={vi.fn()}
        setRange={vi.fn()}
      />,
    )

    expect(container.innerHTML).not.toContain('text-[11px]')
    expect(container.innerHTML).not.toContain('hover:bg-[var(')
  })
})
