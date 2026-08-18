export type GoogleCalendarEventsPage = {
  items?: Array<Record<string, unknown>>
  nextPageToken?: string
}

/** Google Calendar events.list maxes at 2500 per page; default page size is 250. */
const MAX_GOOGLE_CALENDAR_EVENT_PAGES = 40

export async function listAllGoogleCalendarEventItems(
  fetchPage: (pageToken?: string) => Promise<GoogleCalendarEventsPage>,
): Promise<Array<Record<string, unknown>>> {
  const items: Array<Record<string, unknown>> = []
  let pageToken: string | undefined
  let pages = 0
  do {
    const payload = await fetchPage(pageToken)
    items.push(...(payload.items ?? []))
    pageToken = payload.nextPageToken?.trim() || undefined
    pages += 1
  } while (pageToken && pages < MAX_GOOGLE_CALENDAR_EVENT_PAGES)
  return items
}
