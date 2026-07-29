import { beforeEach, describe, expect, it } from 'vitest'
import type { CalendarAgendaEvent } from '@/lib/services/calendar-api'
import {
  agendaEventMinimizeKey,
  readMinimizedAgendaKeys,
  setAgendaEventMinimized,
} from './agenda-minimize'

const EVENT = {
  id: 'meeting-1',
  start: '2026-07-29T17:00:00.000Z',
  source: 'google_calendar',
  account_id: 'account-1',
} as CalendarAgendaEvent

describe('agenda minimize persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('keeps a minimized occurrence persisted until it is restored', () => {
    expect(setAgendaEventMinimized(EVENT, true)).toEqual(
      new Set([agendaEventMinimizeKey(EVENT)]),
    )
    expect(readMinimizedAgendaKeys()).toEqual(new Set([agendaEventMinimizeKey(EVENT)]))

    expect(setAgendaEventMinimized(EVENT, false)).toEqual(new Set())
    expect(readMinimizedAgendaKeys()).toEqual(new Set())
  })

  it('migrates meetings hidden by the previous dismiss behavior', () => {
    const key = agendaEventMinimizeKey(EVENT)
    window.localStorage.setItem('vibey-home-agenda-dismissed', JSON.stringify([key]))

    expect(readMinimizedAgendaKeys()).toEqual(new Set([key]))
    expect(window.localStorage.getItem('vibey-home-agenda-dismissed')).toBeNull()
  })
})
