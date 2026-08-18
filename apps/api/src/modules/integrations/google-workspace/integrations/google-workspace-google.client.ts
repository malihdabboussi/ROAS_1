import { BadRequestException, Injectable } from '@nestjs/common'
import { importPKCS8, SignJWT } from 'jose'
import type {
  GoogleWorkspaceAgendaEvent,
  GoogleWorkspaceDirectoryUser,
  GoogleWorkspaceServiceAccount,
} from '../types/google-workspace.types'
import { listAllGoogleCalendarEventItems } from './google-workspace-calendar-pages'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const DIRECTORY_SCOPE = 'https://www.googleapis.com/auth/admin.directory.user.readonly'
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

@Injectable()
export class GoogleWorkspaceGoogleClient {
  parseServiceAccount(raw: string): GoogleWorkspaceServiceAccount {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new BadRequestException('Service account JSON is invalid')
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('Service account JSON must be an object')
    }
    const row = parsed as Record<string, unknown>
    const clientEmail = String(row.client_email ?? '').trim()
    const privateKey = String(row.private_key ?? '').trim()
    if (!clientEmail || !privateKey) {
      throw new BadRequestException('Service account JSON requires client_email and private_key')
    }
    return {
      ...row,
      client_email: clientEmail,
      private_key: privateKey,
    } as GoogleWorkspaceServiceAccount
  }

  async getAccessToken(
    serviceAccount: GoogleWorkspaceServiceAccount,
    subject: string,
    scopes: string[],
  ): Promise<string> {
    const subjectEmail = subject.trim().toLowerCase()
    if (!subjectEmail.includes('@')) {
      throw new BadRequestException('Impersonation subject must be an email')
    }
    const key = await importPKCS8(serviceAccount.private_key.replace(/\\n/g, '\n'), 'RS256')
    const assertion = await new SignJWT({
      scope: scopes.join(' '),
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(serviceAccount.client_email)
      .setSubject(subjectEmail)
      .setAudience(TOKEN_URL)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key)

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    })
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const payload = (await response.json().catch(() => ({}))) as {
      access_token?: string
      error?: string
      error_description?: string
    }
    if (!response.ok || !payload.access_token) {
      throw new BadRequestException(
        payload.error_description ||
          payload.error ||
          'Failed to mint Google Workspace access token',
      )
    }
    return payload.access_token
  }

  async listDirectoryUsers(
    serviceAccount: GoogleWorkspaceServiceAccount,
    adminEmail: string,
  ): Promise<GoogleWorkspaceDirectoryUser[]> {
    const token = await this.getAccessToken(serviceAccount, adminEmail, [DIRECTORY_SCOPE])
    const users: GoogleWorkspaceDirectoryUser[] = []
    let pageToken: string | undefined
    do {
      const url = new URL('https://admin.googleapis.com/admin/directory/v1/users')
      url.searchParams.set('customer', 'my_customer')
      url.searchParams.set('maxResults', '200')
      url.searchParams.set('orderBy', 'email')
      url.searchParams.set('projection', 'basic')
      if (pageToken) url.searchParams.set('pageToken', pageToken)
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await response.json().catch(() => ({}))) as {
        users?: Array<Record<string, unknown>>
        nextPageToken?: string
        error?: { message?: string }
      }
      if (!response.ok) {
        throw new BadRequestException(
          payload.error?.message || 'Failed to list Google Workspace directory users',
        )
      }
      for (const row of payload.users ?? []) {
        const primaryEmail = String(row.primaryEmail ?? '')
          .trim()
          .toLowerCase()
        if (!primaryEmail) continue
        const name =
          row.name && typeof row.name === 'object' && !Array.isArray(row.name)
            ? (row.name as Record<string, unknown>)
            : null
        users.push({
          id: String(row.id ?? primaryEmail),
          primaryEmail,
          fullName: name?.fullName ? String(name.fullName) : null,
          suspended: row.suspended === true,
        })
      }
      pageToken = payload.nextPageToken
    } while (pageToken)
    return users
  }

  async listCalendarEvents(input: {
    serviceAccount: GoogleWorkspaceServiceAccount
    calendarEmail: string
    start: string
    end: string
    timezone?: string
  }): Promise<GoogleWorkspaceAgendaEvent[]> {
    const token = await this.getAccessToken(input.serviceAccount, input.calendarEmail, [
      CALENDAR_SCOPE,
    ])
    const items = await listAllGoogleCalendarEventItems(async (pageToken) => {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(input.calendarEmail)}/events`,
      )
      url.searchParams.set('timeMin', input.start)
      url.searchParams.set('timeMax', input.end)
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('maxResults', '2500')
      if (input.timezone) url.searchParams.set('timeZone', input.timezone)
      if (pageToken) url.searchParams.set('pageToken', pageToken)

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await response.json().catch(() => ({}))) as {
        items?: Array<Record<string, unknown>>
        nextPageToken?: string
        error?: { message?: string }
      }
      if (!response.ok) {
        throw new BadRequestException(
          payload.error?.message || `Failed to load calendar for ${input.calendarEmail}`,
        )
      }
      return payload
    })

    return items
      .filter((item) => String(item.status ?? '').toLowerCase() !== 'cancelled')
      .map((item) => this.mapEvent(item, input.calendarEmail))
  }

  private mapEvent(
    item: Record<string, unknown>,
    calendarEmail: string,
  ): GoogleWorkspaceAgendaEvent {
    const startObj =
      item.start && typeof item.start === 'object' && !Array.isArray(item.start)
        ? (item.start as Record<string, unknown>)
        : {}
    const endObj =
      item.end && typeof item.end === 'object' && !Array.isArray(item.end)
        ? (item.end as Record<string, unknown>)
        : {}
    const allDay = typeof startObj.date === 'string' && !startObj.dateTime
    const start = String(startObj.dateTime ?? startObj.date ?? '')
    const end = String(endObj.dateTime ?? endObj.date ?? '')
    const attendeesRaw = Array.isArray(item.attendees) ? item.attendees : []
    const attendees = attendeesRaw
      .filter((entry): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === 'object'),
      )
      .map((entry) => ({
        email: String(entry.email ?? '')
          .trim()
          .toLowerCase(),
        name: entry.displayName ? String(entry.displayName) : null,
      }))
      .filter((entry) => entry.email.length > 0)

    const conference =
      item.conferenceData && typeof item.conferenceData === 'object'
        ? (item.conferenceData as Record<string, unknown>)
        : null
    const entryPoints = Array.isArray(conference?.entryPoints) ? conference.entryPoints : []
    const videoEntry = entryPoints.find((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object' && entry.entryPointType === 'video'),
    )
    const location = item.location ? String(item.location) : null
    const description = item.description ? String(item.description) : null
    let videoUrl = videoEntry?.uri ? String(videoEntry.uri) : null
    if (!videoUrl) {
      const haystack = `${location ?? ''} ${description ?? ''}`
      const urlMatch = haystack.match(
        /https?:\/\/[^\s<>"]+(?:zoom\.us|teams\.microsoft\.com|meet\.google\.com)[^\s<>"]*/i,
      )
      if (urlMatch) videoUrl = urlMatch[0]
    }

    return {
      id: String(item.id ?? ''),
      title: String(item.summary ?? '(No title)'),
      start,
      end,
      all_day: allDay,
      location,
      description,
      video_url: videoUrl,
      html_link: item.htmlLink ? String(item.htmlLink) : null,
      ical_uid: item.iCalUID ? String(item.iCalUID) : null,
      attendees,
      source: 'google_workspace',
      calendar_email: calendarEmail,
    }
  }
}
