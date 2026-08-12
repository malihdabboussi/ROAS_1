type AgendaEvent = {
  id: string
  title: string
  start: string
  end: string
  all_day: boolean
  location?: string | null
  video_url: string | null
  video_label: string | null
  html_link: string | null
  color_id: string | null
  attendees: unknown[]
  source: 'google_calendar' | 'outlook' | 'fathom'
}

type ExecuteTool = (
  tool: string,
  userId: string,
  params: Record<string, unknown>,
  connectionId: string,
) => Promise<unknown>

/** Fetch one unified Google Calendar agenda across every visible calendar. */
export async function fetchGoogleMultiCalendarAgenda(input: {
  executeTool: ExecuteTool
  userId: string
  connectionId: string
  start: string
  end: string
  timezone: string
  parseEvents: (raw: unknown) => AgendaEvent[]
}): Promise<{ events: AgendaEvent[]; errors: string[] }> {
  try {
    const raw = await input.executeTool(
      'GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS',
      input.userId,
      {
        time_min: input.start,
        time_max: input.end,
        single_events: true,
        response_detail: 'full',
      },
      input.connectionId,
    )
    return { events: input.parseEvents(raw), errors: [] }
  } catch (error) {
    return {
      events: [],
      errors: [
        error instanceof Error
          ? `Google Calendar: ${error.message}`
          : 'Google Calendar fetch failed',
      ],
    }
  }
}
