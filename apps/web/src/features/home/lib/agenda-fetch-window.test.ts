import { describe, expect, it } from 'vitest'
import { agendaListFetchWindow, startOfAgendaWeek } from './agenda-fetch-window'

describe('agendaListFetchWindow', () => {
  it('uses Monday through Sunday for a week anchored on Thursday', () => {
    const thursday = new Date(2026, 7, 13, 12)
    const window = agendaListFetchWindow(thursday, 'week')

    expect(startOfAgendaWeek(thursday).getDay()).toBe(1)
    expect(window.viewStart.getFullYear()).toBe(2026)
    expect(window.viewStart.getMonth()).toBe(7)
    expect(window.viewStart.getDate()).toBe(10)
    expect(window.viewEnd.getDate()).toBe(16)
    expect(window.viewEnd.getHours()).toBe(23)
  })
})
