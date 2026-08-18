import { describe, expect, it } from 'vitest'
import { listAllGoogleCalendarEventItems } from './google-workspace-calendar-pages'

describe('listAllGoogleCalendarEventItems', () => {
  it('walks nextPageToken so a busy month is not truncated at 250 events', async () => {
    const pages = [
      {
        items: [{ id: 'early' }],
        nextPageToken: 'page-2',
      },
      {
        items: [{ id: 'standup' }, { id: 'wholesale' }],
      },
    ]
    let calls = 0
    const items = await listAllGoogleCalendarEventItems(async (pageToken) => {
      const page = pages[calls]
      calls += 1
      if (calls === 1) expect(pageToken).toBeUndefined()
      if (calls === 2) expect(pageToken).toBe('page-2')
      return page
    })

    expect(calls).toBe(2)
    expect(items.map((item) => item.id)).toEqual(['early', 'standup', 'wholesale'])
  })
})
