import { extractGoogleCalendarIds } from './integrations-calendar-list'

type AgendaEvent = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  video_url: string | null
  video_label: string | null
  html_link: string | null
  color_id: string | null
  attendees: unknown[]
  source: 'google_calendar' | 'outlook'
}

type ExecuteTool = (
  tool: string,
  userId: string,
  params: Record<string, unknown>,
  connectionId: string,
) => Promise<unknown>

const MAX_CALENDARS = 15

/** Fetch Google Calendar agenda events across calendars in one connected account. */
export async function fetchGoogleMultiCalendarAgenda(input: {
  executeTool: ExecuteTool
  userId: string
  connectionId: string
  start: string
  end: string
  timezone: string
  parseEvents: (raw: unknown) => AgendaEvent[]
}): Promise<{ events: AgendaEvent[]; errors: string[] }> {
  const events: AgendaEvent[] = []
  const errors: string[] = []

  let calendarIds = ['primary']
  try {
    const listRaw = await input.executeTool(
      'GOOGLECALENDAR_LIST_CALENDARS',
      input.userId,
      {},
      input.connectionId,
    )
    calendarIds = extractGoogleCalendarIds(listRaw).slice(0, MAX_CALENDARS)
  } catch {
    calendarIds = ['primary']
  }

  const results = await Promise.all(
    calendarIds.map(async (calendarId) => {
      try {
        const raw = await input.executeTool(
          'GOOGLECALENDAR_EVENTS_LIST',
          input.userId,
          {
            calendarId,
            timeMin: input.start,
            timeMax: input.end,
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: input.timezone,
            maxResults: 100,
          },
          input.connectionId,
        )
        return { events: input.parseEvents(raw), error: null as string | null }
      } catch (e) {
        return {
          events: [] as AgendaEvent[],
          error:
            e instanceof Error
              ? `Google Calendar (${calendarId}): ${e.message}`
              : `Google Calendar (${calendarId}) fetch failed`,
        }
      }
    }),
  )

  for (const result of results) {
    events.push(...result.events)
    if (result.error) errors.push(result.error)
  }

  return { events, errors }
}
