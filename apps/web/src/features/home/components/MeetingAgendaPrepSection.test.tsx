import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOME_AGENDA_MESSAGES } from '@/features/home/config/home-agenda-messages.config'
import type { ParsedMeetingPrep } from '@/features/home/lib/meeting-workspace-display'
import { MeetingAgendaPrepSection } from './MeetingAgendaPrepSection'

vi.mock('@/features/home/components/MeetingAgendaDocEditor', () => ({
  MeetingAgendaDocEditor: ({ itemId }: { itemId: string }) => (
    <div data-testid="meeting-agenda-doc" data-item-id={itemId} />
  ),
}))

const emptyPrep: ParsedMeetingPrep = {
  notes: '',
  meetingId: null,
  passcode: null,
  strippedBoilerplate: false,
}

describe('MeetingAgendaPrepSection', () => {
  afterEach(() => {
    cleanup()
  })

  it('runs Create with AI from the Agenda & prep header', () => {
    const onCreateWithAi = vi.fn()
    render(
      <MeetingAgendaPrepSection
        spaceId="space-1"
        agendaDocItemId={null}
        agendaTitle="Agenda"
        prep={emptyPrep}
        prepDescription={null}
        joinUrl={null}
        onCreateWithAi={onCreateWithAi}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: HOME_AGENDA_MESSAGES.CREATE_WITH_AI.message }),
    )
    expect(onCreateWithAi).toHaveBeenCalledTimes(1)
    expect(screen.getByText(HOME_AGENDA_MESSAGES.AGENDA_EMPTY.message)).toBeInTheDocument()
  })

  it('links a Google agenda when the invite already has one', () => {
    render(
      <MeetingAgendaPrepSection
        spaceId="space-1"
        agendaDocItemId={null}
        agendaTitle="Agenda"
        prep={emptyPrep}
        prepDescription={null}
        joinUrl={null}
        googleAgendaHref="https://docs.google.com/document/d/agenda-doc"
      />,
    )

    expect(
      screen.getByRole('link', { name: HOME_AGENDA_MESSAGES.GOOGLE_AGENDA.message }),
    ).toHaveAttribute('href', 'https://docs.google.com/document/d/agenda-doc')
  })

  it('hides Create with AI when no generator is wired', () => {
    render(
      <MeetingAgendaPrepSection
        spaceId="space-1"
        agendaDocItemId={null}
        agendaTitle="Agenda"
        prep={emptyPrep}
        prepDescription={null}
        joinUrl={null}
      />,
    )

    expect(
      screen.queryByRole('button', { name: HOME_AGENDA_MESSAGES.CREATE_WITH_AI.message }),
    ).toBeNull()
  })
})
