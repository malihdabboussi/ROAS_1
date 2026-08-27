import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { GhlContact, GhlLocation, GhlSendEmailInput } from '../types/gohighlevel.types'

@Injectable()
export class GoHighLevelIntegration {
  private readonly logger = new Logger(GoHighLevelIntegration.name)
  private readonly API_BASE = 'https://services.leadconnectorhq.com'

  async getLocation(accessToken: string, locationId: string): Promise<GhlLocation> {
    const response = await fetch(`${this.API_BASE}/locations/${encodeURIComponent(locationId)}`, {
      method: 'GET',
      headers: this.headers(accessToken),
    })
    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(
        `GoHighLevel rejected this token or location (${response.status}). Check the Private Integration Token, Location ID, and scopes.`,
      )
    }
    const parsed = JSON.parse(raw) as { location?: GhlLocation } & GhlLocation
    const location = parsed.location ?? parsed
    if (!location?.id) throw new BadRequestException('GoHighLevel location lookup returned no id')
    return { id: location.id, name: location.name, companyId: location.companyId }
  }

  async findContactByEmail(
    accessToken: string,
    locationId: string,
    email: string,
  ): Promise<GhlContact | null> {
    const url = new URL(`${this.API_BASE}/contacts/`)
    url.searchParams.set('locationId', locationId)
    url.searchParams.set('query', email)
    const parsed = await this.readJson<{ contacts?: GhlContact[] }>(
      await fetch(url.toString(), { method: 'GET', headers: this.headers(accessToken) }),
      'GHL find contact failed',
    )
    return parsed.contacts?.[0] ?? null
  }

  async listContactsPage(
    accessToken: string,
    locationId: string,
    opts: { limit?: number; startAfterId?: string },
  ): Promise<{ contacts: GhlContact[]; nextStartAfterId?: string }> {
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 100)
    const url = new URL(`${this.API_BASE}/contacts/`)
    url.searchParams.set('locationId', locationId)
    url.searchParams.set('limit', String(limit))
    if (opts.startAfterId) url.searchParams.set('startAfterId', opts.startAfterId)
    const parsed = await this.readJson<{ contacts?: GhlContact[] }>(
      await fetch(url.toString(), { method: 'GET', headers: this.headers(accessToken) }),
      'GHL list contacts failed',
    )
    const contacts = parsed.contacts ?? []
    const last = contacts[contacts.length - 1]
    const nextStartAfterId = contacts.length === limit && last?.id ? String(last.id) : undefined
    return { contacts, nextStartAfterId }
  }

  async createContact(
    accessToken: string,
    locationId: string,
    input: { email: string; firstName?: string; lastName?: string; name?: string; phone?: string },
  ): Promise<GhlContact> {
    const parsed = await this.readJson<{ contact?: GhlContact } & GhlContact>(
      await fetch(`${this.API_BASE}/contacts/`, {
        method: 'POST',
        headers: this.headers(accessToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          locationId,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          name:
            input.name || `${input.firstName || ''} ${input.lastName || ''}`.trim() || undefined,
          phone: input.phone,
        }),
      }),
      'GHL create contact failed',
    )
    return parsed.contact ?? parsed
  }

  async updateContact(
    accessToken: string,
    locationId: string,
    contactId: string,
    updates: { firstName?: string; lastName?: string; name?: string; phone?: string },
  ): Promise<GhlContact> {
    const url = new URL(`${this.API_BASE}/contacts/${contactId}/`)
    url.searchParams.set('locationId', locationId)
    const parsed = await this.readJson<{ contact?: GhlContact } & GhlContact>(
      await fetch(url.toString(), {
        method: 'PUT',
        headers: this.headers(accessToken, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...updates,
          name:
            updates.name ||
            `${updates.firstName || ''} ${updates.lastName || ''}`.trim() ||
            undefined,
        }),
      }),
      'GHL update contact failed',
    )
    return parsed.contact ?? parsed
  }

  async sendEmail(
    accessToken: string,
    input: GhlSendEmailInput,
  ): Promise<{ messageId: string; conversationId?: string; emailMessageId?: string }> {
    const body: Record<string, unknown> = {
      type: 'Email',
      contactId: input.contactId,
      emailFrom: input.emailFrom,
      emailTo: input.emailTo,
      subject: input.subject,
    }
    if (input.html) body.html = input.html
    if (input.message) body.message = input.message
    if (input.emailCc?.length) body.emailCc = input.emailCc
    if (input.emailBcc?.length) body.emailBcc = input.emailBcc

    const response = await fetch(`${this.API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: this.headers(accessToken, {
        'Content-Type': 'application/json',
        Version: '2021-04-15',
      }),
      body: JSON.stringify(body),
    })
    const raw = await response.text()
    if (!response.ok) {
      this.logger.error(`GHL send email failed: ${response.status} ${raw.slice(0, 200)}`)
      throw new Error(`GHL send email failed (${response.status}): ${raw.slice(0, 200)}`)
    }
    const parsed = JSON.parse(raw) as {
      messageId?: string
      conversationId?: string
      emailMessageId?: string
    }
    if (!parsed.messageId) throw new Error('GHL send email failed: missing messageId in response')
    return {
      messageId: parsed.messageId,
      conversationId: parsed.conversationId,
      emailMessageId: parsed.emailMessageId,
    }
  }

  async proxyRequest(
    accessToken: string,
    opts: {
      method: string
      path: string
      query?: Record<string, string>
      body?: unknown
      version?: string
    },
  ): Promise<{ status: number; data: unknown }> {
    const version = opts.version ?? '2021-07-28'
    const p = opts.path.startsWith('/') ? opts.path : `/${opts.path}`
    const u = new URL(this.API_BASE.replace(/\/$/, '') + p)
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && String(v) !== '') u.searchParams.set(k, String(v))
    }
    const m = opts.method.toUpperCase()
    const headers = this.headers(accessToken, { Version: version })
    const init: RequestInit = { method: m, headers }
    if (m === 'POST' || m === 'PUT' || m === 'PATCH') {
      headers['Content-Type'] = 'application/json'
      init.body = opts.body !== undefined && opts.body !== null ? JSON.stringify(opts.body) : '{}'
    }
    const response = await fetch(u.toString(), init)
    const text = await response.text()
    if (!text) return { status: response.status, data: null }
    try {
      return { status: response.status, data: JSON.parse(text) as unknown }
    } catch {
      return { status: response.status, data: text }
    }
  }

  private headers(accessToken: string, extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      Version: '2021-07-28',
      ...extra,
    }
  }

  private async readJson<T>(response: Response, errorPrefix: string): Promise<T> {
    const raw = await response.text()
    if (!response.ok) throw new Error(`${errorPrefix} (${response.status}): ${raw.slice(0, 200)}`)
    return JSON.parse(raw) as T
  }
}
