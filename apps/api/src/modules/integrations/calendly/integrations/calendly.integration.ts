import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type {
  CalendlyAvailableTime,
  CalendlyEventType,
  CalendlyOAuthTokenResponse,
  CalendlyScheduledEvent,
  CalendlyUser,
  CalendlyWebhookSubscription,
  CreateEventTypeInput,
  CreateOneOffEventTypeInput,
  CreateScheduledEventInput,
  UpdateEventTypeInput,
} from '../types/calendly.types'

@Injectable()
export class CalendlyIntegration {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string

  private readonly AUTH_BASE = 'https://auth.calendly.com'
  private readonly API_BASE = 'https://api.calendly.com'

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('CALENDLY_CLIENT_ID') || ''
    this.clientSecret = this.config.get<string>('CALENDLY_CLIENT_SECRET') || ''
    this.redirectUri = this.config.get<string>('CALENDLY_REDIRECT_URI') || ''
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri)
  }

  // ── Auth ──

  buildAuthorizationUrl(state: string): string {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing Calendly OAuth configuration')
    }
    const params = new URLSearchParams()
    params.set('response_type', 'code')
    params.set('client_id', this.clientId)
    params.set('redirect_uri', this.redirectUri)
    params.set('state', state)
    return `${this.AUTH_BASE}/oauth/authorize?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<CalendlyOAuthTokenResponse> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing Calendly OAuth configuration')
    }

    const body = new URLSearchParams()
    body.set('grant_type', 'authorization_code')
    body.set('code', code)
    body.set('redirect_uri', this.redirectUri)

    const response = await fetch(`${this.AUTH_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: body.toString(),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`Calendly token exchange failed (${response.status}): ${raw}`)
    }
    return JSON.parse(raw) as CalendlyOAuthTokenResponse
  }

  async refreshAccessToken(refreshToken: string): Promise<CalendlyOAuthTokenResponse> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Missing Calendly OAuth configuration')
    }

    const body = new URLSearchParams()
    body.set('grant_type', 'refresh_token')
    body.set('refresh_token', refreshToken)

    const response = await fetch(`${this.AUTH_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: body.toString(),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`Calendly token refresh failed (${response.status}): ${raw}`)
    }
    return JSON.parse(raw) as CalendlyOAuthTokenResponse
  }

  // ── User ──

  async getCurrentUser(accessToken: string): Promise<CalendlyUser> {
    const res = (await this.request('GET', '/users/me', accessToken)) as {
      resource: CalendlyUser
    }
    return res.resource
  }

  // ── Event Types (CRUD) ──

  async listEventTypes(
    accessToken: string,
    userUri: string,
  ): Promise<{ collection: CalendlyEventType[] }> {
    return this.request(
      'GET',
      `/event_types?user=${encodeURIComponent(userUri)}`,
      accessToken,
    ) as Promise<{ collection: CalendlyEventType[] }>
  }

  async getEventType(accessToken: string, uuid: string): Promise<{ resource: CalendlyEventType }> {
    return this.request('GET', `/event_types/${uuid}`, accessToken) as Promise<{
      resource: CalendlyEventType
    }>
  }

  async createEventType(accessToken: string, input: CreateEventTypeInput): Promise<unknown> {
    return this.request('POST', '/event_types', accessToken, input)
  }

  async updateEventType(
    accessToken: string,
    uuid: string,
    input: UpdateEventTypeInput,
  ): Promise<unknown> {
    return this.request('PATCH', `/event_types/${uuid}`, accessToken, input)
  }

  async createOneOffEventType(
    accessToken: string,
    input: CreateOneOffEventTypeInput,
  ): Promise<unknown> {
    return this.request('POST', '/one_off_event_types', accessToken, input)
  }

  // ── Scheduled Events ──

  async listScheduledEvents(
    accessToken: string,
    userUri: string,
    params?: { min_start_time?: string; max_start_time?: string; status?: string },
  ): Promise<{ collection: CalendlyScheduledEvent[] }> {
    const qs = new URLSearchParams()
    qs.set('user', userUri)
    if (params?.min_start_time) qs.set('min_start_time', params.min_start_time)
    if (params?.max_start_time) qs.set('max_start_time', params.max_start_time)
    if (params?.status) qs.set('status', params.status)
    return this.request('GET', `/scheduled_events?${qs.toString()}`, accessToken) as Promise<{
      collection: CalendlyScheduledEvent[]
    }>
  }

  async getScheduledEvent(
    accessToken: string,
    uuid: string,
  ): Promise<{ resource: CalendlyScheduledEvent }> {
    return this.request('GET', `/scheduled_events/${uuid}`, accessToken) as Promise<{
      resource: CalendlyScheduledEvent
    }>
  }

  async createScheduledEvent(
    accessToken: string,
    input: CreateScheduledEventInput,
  ): Promise<unknown> {
    return this.request('POST', '/scheduled_events', accessToken, input)
  }

  async cancelScheduledEvent(accessToken: string, uuid: string, reason?: string): Promise<unknown> {
    const body = reason ? { reason } : {}
    return this.request('POST', `/scheduled_events/${uuid}/cancellation`, accessToken, body)
  }

  // ── Available Times ──

  async listAvailableTimes(
    accessToken: string,
    eventTypeUri: string,
    startTime: string,
    endTime: string,
  ): Promise<{ collection: CalendlyAvailableTime[] }> {
    const qs = new URLSearchParams()
    qs.set('event_type', eventTypeUri)
    qs.set('start_time', startTime)
    qs.set('end_time', endTime)
    return this.request(
      'GET',
      `/event_type_available_times?${qs.toString()}`,
      accessToken,
    ) as Promise<{ collection: CalendlyAvailableTime[] }>
  }

  // ── Event Type Hosts ──

  async listEventTypeHosts(
    accessToken: string,
    uuid: string,
  ): Promise<{ collection: Array<{ user: string; email: string }> }> {
    return this.request('GET', `/event_types/${uuid}/hosts`, accessToken) as Promise<{
      collection: Array<{ user: string; email: string }>
    }>
  }

  // ── Webhooks ──

  async createWebhookSubscription(
    accessToken: string,
    orgUri: string,
    userUri: string,
    callbackUrl: string,
    events: string[] = ['invitee.created', 'invitee.canceled'],
  ): Promise<{ resource: CalendlyWebhookSubscription }> {
    return this.request('POST', '/webhook_subscriptions', accessToken, {
      url: callbackUrl,
      events,
      organization: orgUri,
      user: userUri,
      scope: 'user',
    }) as Promise<{ resource: CalendlyWebhookSubscription }>
  }

  async deleteWebhookSubscription(accessToken: string, webhookUri: string): Promise<void> {
    const uuid = webhookUri.split('/').pop()
    await this.request('DELETE', `/webhook_subscriptions/${uuid}`, accessToken)
  }

  async listWebhookSubscriptions(
    accessToken: string,
    orgUri: string,
  ): Promise<{ collection: CalendlyWebhookSubscription[] }> {
    return this.request(
      'GET',
      `/webhook_subscriptions?organization=${encodeURIComponent(orgUri)}&scope=user`,
      accessToken,
    ) as Promise<{ collection: CalendlyWebhookSubscription[] }>
  }

  // ── Shared ──

  private async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    accessToken: string,
    body?: unknown,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(`${this.API_BASE}${path}`, {
      method,
      headers,
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
    })

    if (method === 'DELETE' && response.status === 204) return undefined

    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(`Calendly API failed (${response.status}): ${raw}`)
    }
    if (!raw) return undefined
    return JSON.parse(raw) as unknown
  }
}
