import { describe, expect, it } from 'vitest'
import { extractGoogleCalendarIds } from '../integrations-calendar-list'
import { extractGoogleCalendarAccountEmail } from '../integrations-identity-tools'

describe('Google Calendar list helpers', () => {
  it('extracts calendar ids from LIST_CALENDARS payload', () => {
    expect(
      extractGoogleCalendarIds({
        data: {
          items: [
            { id: 'primary-user@gmail.com', primary: true },
            { id: 'sales@group.calendar.google.com', summary: 'Sales' },
            { id: 'hidden@group.calendar.google.com', hidden: true },
          ],
        },
      }),
    ).toEqual(['primary-user@gmail.com', 'sales@group.calendar.google.com'])
  })

  it('falls back to primary when list is empty', () => {
    expect(extractGoogleCalendarIds({ data: { items: [] } })).toEqual(['primary'])
  })

  it('extracts account email from dataOwner or primary calendar id', () => {
    expect(
      extractGoogleCalendarAccountEmail({
        dataOwner: 'dylanvanas@gmail.com',
        items: [],
      }),
    ).toBe('dylanvanas@gmail.com')

    expect(
      extractGoogleCalendarAccountEmail({
        items: [{ id: 'dylanvanas@gmail.com', primary: true }],
      }),
    ).toBe('dylanvanas@gmail.com')
  })
})
