import { Injectable } from '@nestjs/common'
import type { ArtifactActionHandler } from './artifact-action.registry'

type CalendarProvider = 'google_calendar' | 'outlook'

@Injectable()
export class ArtifactCalendarService {
  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_calendar_events: (data, sessionKey) => this.listEvents(target, data, sessionKey),
      create_calendar_event: (data, sessionKey) => this.createEvent(target, data, sessionKey),
      update_calendar_event: (data, sessionKey) => this.updateEvent(target, data, sessionKey),
      delete_calendar_event: (data, sessionKey) => this.deleteEvent(target, data, sessionKey),
    }
  }

  private requiredString(data: Record<string, unknown>, key: string): string | null {
    const value = data[key]
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  private optionalString(data: Record<string, unknown>, key: string): string | undefined {
    const value = data[key]
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }

  private provider(data: Record<string, unknown>): CalendarProvider | null {
    const provider = this.requiredString(data, 'provider')
    if (provider === 'google_calendar' || provider === 'outlook') return provider
    return null
  }

  private attendees(data: Record<string, unknown>) {
    const value = data.attendees
    if (!Array.isArray(value)) return undefined
    return value
      .filter((entry): entry is Record<string, unknown> => {
        return Boolean(entry && typeof entry === 'object' && !Array.isArray(entry))
      })
      .map((entry) => ({
        email: String(entry.email ?? '').trim(),
        name: typeof entry.name === 'string' ? entry.name.trim() : undefined,
        optional: entry.optional === true,
      }))
      .filter((entry) => entry.email.length > 0)
  }

  private writeBody(data: Record<string, unknown>, includeProvider: boolean) {
    const body: Record<string, unknown> = {
      title: this.optionalString(data, 'title'),
      start: this.optionalString(data, 'start'),
      end: this.optionalString(data, 'end'),
      timezone: this.optionalString(data, 'timezone'),
      description: data.description === null ? null : this.optionalString(data, 'description'),
      location: data.location === null ? null : this.optionalString(data, 'location'),
      attendees: this.attendees(data),
      calendar_id: this.optionalString(data, 'calendar_id'),
      create_video_meeting:
        typeof data.create_video_meeting === 'boolean' ? data.create_video_meeting : undefined,
    }
    if (includeProvider) body.provider = this.provider(data)
    return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined))
  }

  private async listEvents(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const start = this.requiredString(data, 'start')
    const end = this.requiredString(data, 'end')
    if (!start) return { success: false, error: 'start is required' }
    if (!end) return { success: false, error: 'end is required' }

    const params = new URLSearchParams({ start, end })
    const timezone = this.optionalString(data, 'timezone')
    if (timezone) params.set('timezone', timezone)
    const provider = this.optionalString(data, 'provider')
    if (provider) params.set('provider', provider)
    return target.mainApiCall(
      'GET',
      `/api/integrations/calendar/agenda?${params.toString()}`,
      sessionKey,
    )
  }

  private async createEvent(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const provider = this.provider(data)
    const title = this.requiredString(data, 'title')
    const start = this.requiredString(data, 'start')
    const end = this.requiredString(data, 'end')
    if (!provider) return { success: false, error: 'provider must be google_calendar or outlook' }
    if (!title) return { success: false, error: 'title is required' }
    if (!start) return { success: false, error: 'start is required' }
    if (!end) return { success: false, error: 'end is required' }
    return target.mainApiCall(
      'POST',
      '/api/integrations/calendar/events',
      sessionKey,
      this.writeBody(data, true),
    )
  }

  private async updateEvent(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const provider = this.provider(data)
    const eventId = this.requiredString(data, 'event_id')
    if (!provider) return { success: false, error: 'provider must be google_calendar or outlook' }
    if (!eventId) return { success: false, error: 'event_id is required' }
    return target.mainApiCall(
      'PATCH',
      `/api/integrations/calendar/events/${provider}/${encodeURIComponent(eventId)}`,
      sessionKey,
      this.writeBody(data, false),
    )
  }

  private async deleteEvent(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const provider = this.provider(data)
    const eventId = this.requiredString(data, 'event_id')
    if (!provider) return { success: false, error: 'provider must be google_calendar or outlook' }
    if (!eventId) return { success: false, error: 'event_id is required' }
    const params = new URLSearchParams()
    const calendarId = this.optionalString(data, 'calendar_id')
    if (calendarId) params.set('calendar_id', calendarId)
    const suffix = params.size > 0 ? `?${params.toString()}` : ''
    return target.mainApiCall(
      'DELETE',
      `/api/integrations/calendar/events/${provider}/${encodeURIComponent(eventId)}${suffix}`,
      sessionKey,
    )
  }
}
