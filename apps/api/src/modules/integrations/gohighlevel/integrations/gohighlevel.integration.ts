import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { GhlContact, GhlSendEmailInput, GhlTokenResponse } from '../types/gohighlevel.types'

@Injectable()
export class GoHighLevelIntegration {
  private readonly logger = new Logger(GoHighLevelIntegration.name)

  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string

  private readonly AUTH_URL = 'https://marketplace.gohighlevel.com/oauth/chooselocation'
  private readonly TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token'
  private readonly API_BASE = 'https://services.leadconnectorhq.com'

  private readonly SCOPES = [
    'blogs/post.write',
    'blogs/post-update.write',
    'blogs/check-slug.readonly',
    'blogs/category.readonly',
    'blogs/author.readonly',
    'blogs/posts.readonly',
    'blogs/list.readonly',
    'calendars.readonly',
    'calendars.write',
    'calendars/events.readonly',
    'calendars/events.write',
    'calendars/groups.readonly',
    'calendars/groups.write',
    'calendars/resources.readonly',
    'calendars/resources.write',
    'campaigns.readonly',
    'contacts.readonly',
    'contacts.write',
    'conversations.readonly',
    'conversations.write',
    'conversations/message.readonly',
    'conversations/message.write',
    'conversations/reports.readonly',
    'conversations/livechat.write',
    'locations/customFields.readonly',
    'locations/customFields.write',
    'emails/builder.write',
    'emails/builder.readonly',
    'emails/schedule.readonly',
    'forms.readonly',
    'forms.write',
    'funnels/redirect.readonly',
    'funnels/page.readonly',
    'funnels/funnel.readonly',
    'funnels/pagecount.readonly',
    'funnels/redirect.write',
    'invoices.readonly',
    'invoices.write',
    'invoices/schedule.readonly',
    'invoices/schedule.write',
    'invoices/template.readonly',
    'invoices/template.write',
    'invoices/estimate.readonly',
    'invoices/estimate.write',
    'lc-email.readonly',
    'links.readonly',
    'links.write',
    'medias.readonly',
    'medias.write',
    'objects/schema.readonly',
    'objects/schema.write',
    'objects/record.readonly',
    'objects/record.write',
    'opportunities.readonly',
    'opportunities.write',
    'payments/orders.readonly',
    'payments/orders.write',
    'payments/orders.collectPayment',
    'payments/integration.readonly',
    'payments/integration.write',
    'payments/transactions.readonly',
    'payments/subscriptions.readonly',
    'payments/coupons.readonly',
    'payments/coupons.write',
    'payments/custom-provider.readonly',
    'payments/custom-provider.write',
    'phonenumbers.read',
    'phonenumbers.write',
    'numberpools.read',
    'products.readonly',
    'products.write',
    'products/prices.readonly',
    'products/prices.write',
    'products/collection.readonly',
    'products/collection.write',
    'documents_contracts/list.readonly',
    'documents_contracts/sendLink.write',
    'documents_contracts_template/sendLink.write',
    'documents_contracts_template/list.readonly',
    'store/shipping.readonly',
    'store/shipping.write',
    'store/setting.readonly',
    'store/setting.write',
    'surveys.readonly',
    'twilioaccount.read',
    'workflows.readonly',
  ]

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('GHL_OAUTH_CLIENT_ID') || ''
    this.clientSecret = this.config.get<string>('GHL_OAUTH_CLIENT_SECRET') || ''
    this.redirectUri = this.config.get<string>('GHL_OAUTH_REDIRECT_URI') || ''
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri)
  }

  getScopes(): string[] {
    return [...this.SCOPES]
  }

  buildAuthorizationUrl(state: string): string {
    if (!this.clientId || !this.redirectUri) {
      throw new BadRequestException('Missing GHL OAuth configuration')
    }

    const params = new URLSearchParams()
    params.set('response_type', 'code')
    params.set('client_id', this.clientId)
    params.set('redirect_uri', this.redirectUri)
    params.set('scope', this.SCOPES.join(' '))
    params.set('state', state)
    return `${this.AUTH_URL}?${params.toString()}`
  }

  async exchangeCodeForTokens(code: string): Promise<GhlTokenResponse> {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new BadRequestException('Missing GHL OAuth configuration')
    }

    const params = new URLSearchParams()
    params.set('grant_type', 'authorization_code')
    params.set('client_id', this.clientId)
    params.set('client_secret', this.clientSecret)
    params.set('code', code)
    params.set('redirect_uri', this.redirectUri)

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(
        `GHL token exchange failed (${response.status}): ${raw.slice(0, 200)}`,
      )
    }

    return JSON.parse(raw) as GhlTokenResponse
  }

  async refreshAccessToken(refreshToken: string): Promise<GhlTokenResponse> {
    if (!this.clientId || !this.clientSecret) {
      throw new BadRequestException('Missing GHL OAuth configuration')
    }

    const params = new URLSearchParams()
    params.set('grant_type', 'refresh_token')
    params.set('client_id', this.clientId)
    params.set('client_secret', this.clientSecret)
    params.set('refresh_token', refreshToken)

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new BadRequestException(
        `GHL token refresh failed (${response.status}): ${raw.slice(0, 200)}`,
      )
    }

    return JSON.parse(raw) as GhlTokenResponse
  }

  async findContactByEmail(
    accessToken: string,
    locationId: string,
    email: string,
  ): Promise<GhlContact | null> {
    const url = new URL(`${this.API_BASE}/contacts/`)
    url.searchParams.set('locationId', locationId)
    url.searchParams.set('query', email)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        Version: '2021-07-28',
      },
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new Error(`GHL find contact failed (${response.status}): ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as { contacts?: GhlContact[] }
    const contacts = parsed.contacts ?? []
    return contacts[0] ?? null
  }

  /**
   * List contacts for a location (cursor pagination). Version header 2021-07-28.
   */
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

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        Version: '2021-07-28',
      },
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new Error(`GHL list contacts failed (${response.status}): ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as {
      contacts?: GhlContact[]
      meta?: { startAfterId?: string }
    }
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
    const url = `${this.API_BASE}/contacts/`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-07-28',
      },
      body: JSON.stringify({
        locationId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        name: input.name || `${input.firstName || ''} ${input.lastName || ''}`.trim() || undefined,
        phone: input.phone,
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new Error(`GHL create contact failed (${response.status}): ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as { contact?: GhlContact } & GhlContact
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

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-07-28',
      },
      body: JSON.stringify({
        ...updates,
        name:
          updates.name ||
          `${updates.firstName || ''} ${updates.lastName || ''}`.trim() ||
          undefined,
      }),
    })

    const raw = await response.text()
    if (!response.ok) {
      throw new Error(`GHL update contact failed (${response.status}): ${raw.slice(0, 200)}`)
    }

    const parsed = JSON.parse(raw) as { contact?: GhlContact } & GhlContact
    return parsed.contact ?? parsed
  }

  async sendEmail(
    accessToken: string,
    input: GhlSendEmailInput,
  ): Promise<{ messageId: string; conversationId?: string; emailMessageId?: string }> {
    const url = `${this.API_BASE}/conversations/messages`

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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Version: '2021-04-15',
      },
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
    const base = this.API_BASE.replace(/\/$/, '')
    const p = opts.path.startsWith('/') ? opts.path : `/${opts.path}`
    const u = new URL(base + p)
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null && String(v) !== '') u.searchParams.set(k, String(v))
    }
    const m = opts.method.toUpperCase()
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      Version: version,
    }
    const init: RequestInit = { method: m, headers }
    if (m === 'POST' || m === 'PUT' || m === 'PATCH') {
      headers['Content-Type'] = 'application/json'
      init.body = opts.body !== undefined && opts.body !== null ? JSON.stringify(opts.body) : '{}'
    }
    const response = await fetch(u.toString(), init)
    const text = await response.text()
    let data: unknown
    if (!text) data = null
    else {
      try {
        data = JSON.parse(text) as unknown
      } catch {
        data = text
      }
    }
    return { status: response.status, data }
  }
}
