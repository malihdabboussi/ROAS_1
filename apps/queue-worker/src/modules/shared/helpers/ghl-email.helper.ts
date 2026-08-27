import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseService } from '../../../lib/services/database.service'
import { decryptVaultValue } from '../../../lib/services/vault-decrypt'
import { QueueLoggerService } from '../../logger'

const USE_INTEGRATION_SCOPE_RESOLVER_V2 = process.env.INTEGRATION_SCOPE_RESOLVER_V2 !== '0'

export interface GhlIntegrationRow {
  id: string
  user_id: string
  org_id?: string | null
  provider: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  metadata: { locationId?: string } | null
  status: string
  scope_mode?: 'personal' | 'org_shared'
  is_default?: boolean
}

export interface GhlSendEmailOptions {
  contactId: string
  emailFrom: string
  emailTo: string
  subject: string
  html?: string
  message?: string
}

export interface GhlSendEmailResult {
  success: boolean
  messageId?: string
  conversationId?: string
  emailMessageId?: string
  error?: string
}

interface GhlContact {
  id: string
}

@Injectable()
export class GhlEmailHelper {
  private readonly logger = new Logger(GhlEmailHelper.name)

  private readonly API_BASE = 'https://services.leadconnectorhq.com'

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly queueLoggerService: QueueLoggerService,
  ) {}

  async ensureLeadHasGhlContactId(params: {
    userId: string
    leadId: string
    email: string
    name?: string | null
    phone?: string | null
    existingContactId?: string | null
    orgId?: string | null
  }): Promise<string> {
    const supabase = this.databaseService.getClient()
    const integration = await this.getUserIntegration(supabase, params.userId, params.orgId)
    if (!integration) throw new Error('No connected GoHighLevel integration found')

    const locationId = integration.metadata?.locationId
    if (!locationId) throw new Error('Missing GoHighLevel locationId in integration metadata')

    const accessToken = await this.getPit(supabase, integration.user_id)

    if (params.existingContactId) {
      return params.existingContactId
    }

    const contact = await this.findContactByEmail(accessToken, locationId, params.email)
    const ensured =
      contact ??
      (await this.createContact(accessToken, locationId, {
        email: params.email,
        name: params.name || undefined,
        phone: params.phone || undefined,
      }))

    await supabase.from('leads').update({ ghl_contact_id: ensured.id }).eq('id', params.leadId)
    return ensured.id
  }

  /**
   * Paginated contacts for CRM background sync (cursor / startAfterId).
   */
  async listContactsPageForCrmSync(
    userId: string,
    opts: { limit: number; startAfterId?: string },
    orgId?: string | null,
  ): Promise<{
    contacts: Array<{
      id: string
      email?: string
      firstName?: string
      lastName?: string
      name?: string
      phone?: string
    }>
    nextStartAfterId?: string
  }> {
    const supabase = this.databaseService.getClient()
    const integration = await this.getUserIntegration(supabase, userId, orgId)
    if (!integration) throw new Error('No connected GoHighLevel integration found')
    const locationId = integration.metadata?.locationId
    if (!locationId) throw new Error('Missing GoHighLevel locationId in integration metadata')
    const accessToken = await this.getPit(supabase, integration.user_id)
    return this.fetchContactsListPage(accessToken, locationId, opts)
  }

  private async fetchContactsListPage(
    accessToken: string,
    locationId: string,
    opts: { limit: number; startAfterId?: string },
  ): Promise<{
    contacts: Array<{
      id: string
      email?: string
      firstName?: string
      lastName?: string
      name?: string
      phone?: string
    }>
    nextStartAfterId?: string
  }> {
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
      contacts?: Array<{
        id?: string
        email?: string
        firstName?: string
        lastName?: string
        name?: string
        phone?: string
      }>
    }
    const contacts = (parsed.contacts ?? [])
      .map((c) => ({
        id: String(c.id ?? ''),
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        name: c.name,
        phone: c.phone,
      }))
      .filter((c) => c.id.length > 0)
    const last = contacts[contacts.length - 1]
    const nextStartAfterId = contacts.length === limit && last?.id ? String(last.id) : undefined
    return { contacts, nextStartAfterId }
  }

  async sendEmail(
    userId: string,
    options: GhlSendEmailOptions,
    orgId?: string | null,
  ): Promise<GhlSendEmailResult> {
    const supabase = this.databaseService.getClient()
    try {
      const integration = await this.getUserIntegration(supabase, userId, orgId)
      if (!integration)
        return { success: false, error: 'No connected GoHighLevel integration found' }

      const accessToken = await this.getPit(supabase, integration.user_id)
      const result = await this.callGhlSendEmailApi(accessToken, options)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await this.queueLoggerService.logError({
        app: 'queue-worker',
        severity: 'error',
        feature: 'ghl-email/send',
        error_code: 'GHL_EMAIL_SEND_FAILED',
        message: `GHL email send failed: ${errorMessage}`,
        stack: error instanceof Error ? error.stack : undefined,
        context: { userId, emailTo: options.emailTo, contactId: options.contactId },
        user_id: userId,
      })
      return { success: false, error: errorMessage }
    }
  }

  private async getUserIntegration(
    supabase: SupabaseClient,
    userId: string,
    orgId?: string | null,
  ): Promise<GhlIntegrationRow | null> {
    let query = supabase
      .from('user_integrations')
      .select('*')
      .eq('provider', 'gohighlevel')
      .eq('status', 'connected')
    if (orgId !== undefined) {
      if (orgId) {
        query = query.eq('org_id', orgId)
      } else {
        query = query.eq('user_id', userId).is('org_id', null)
      }
    } else {
      query = query.eq('user_id', userId).is('org_id', null)
    }
    const { data, error } = await query.order('updated_at', { ascending: false }).limit(25)
    if (error) {
      this.logger.error(`Failed to fetch GHL integration: ${error.message}`)
      return null
    }
    const rows = (data ?? []) as GhlIntegrationRow[]
    if (!rows.length) return null
    if (!orgId) return rows[0]
    return this.pickPreferredGhlIntegration(rows, userId)
  }

  private async getPit(supabase: SupabaseClient, userId: string): Promise<string> {
    const keyHex = this.configService.get<string>('vault.encryptionKey') || ''
    if (!keyHex || Buffer.from(keyHex, 'hex').length !== 32) {
      throw new Error('VAULT_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
    }
    const { data, error } = await supabase
      .from('vault_secrets')
      .select('encrypted_value')
      .eq('user_id', userId)
      .eq('provider', 'gohighlevel')
      .eq('label', 'pit')
      .maybeSingle()
    if (error) throw new Error(`Vault read failed: ${error.message}`)
    const encrypted = data?.encrypted_value as string | undefined
    if (!encrypted) {
      throw new Error('GoHighLevel is not connected (missing Private Integration Token)')
    }
    return decryptVaultValue(encrypted, keyHex)
  }

  private async findContactByEmail(
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
    if (!response.ok)
      throw new Error(`GHL find contact failed (${response.status}): ${raw.slice(0, 200)}`)
    const parsed = JSON.parse(raw) as { contacts?: Array<{ id: string }> }
    return parsed.contacts?.[0] ? ({ id: parsed.contacts[0].id } as GhlContact) : null
  }

  private async createContact(
    accessToken: string,
    locationId: string,
    input: { email: string; name?: string; phone?: string },
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
        name: input.name || undefined,
        phone: input.phone || undefined,
      }),
    })
    const raw = await response.text()
    if (!response.ok)
      throw new Error(`GHL create contact failed (${response.status}): ${raw.slice(0, 200)}`)
    const parsed = JSON.parse(raw) as { contact?: { id?: string } } & { id?: string }
    const id = parsed.contact?.id || parsed.id
    if (!id) throw new Error('GHL create contact failed: missing contact id')
    return { id }
  }

  private async callGhlSendEmailApi(
    accessToken: string,
    options: GhlSendEmailOptions,
  ): Promise<GhlSendEmailResult> {
    const url = `${this.API_BASE}/conversations/messages`
    const body: Record<string, unknown> = {
      type: 'Email',
      contactId: options.contactId,
      emailFrom: options.emailFrom,
      emailTo: options.emailTo,
      subject: options.subject,
    }
    if (options.html) body.html = options.html
    if (options.message) body.message = options.message

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
    if (!response.ok)
      return { success: false, error: `GHL API error (${response.status}): ${raw.slice(0, 200)}` }

    const parsed = JSON.parse(raw) as {
      messageId?: string
      conversationId?: string
      emailMessageId?: string
    }
    if (!parsed.messageId)
      return { success: false, error: 'GHL send email failed: missing messageId in response' }

    this.logger.log(`Email sent via GHL: messageId=${parsed.messageId}`)
    return {
      success: true,
      messageId: parsed.messageId,
      conversationId: parsed.conversationId,
      emailMessageId: parsed.emailMessageId,
    }
  }

  private pickPreferredGhlIntegration(
    rows: GhlIntegrationRow[],
    userId: string,
  ): GhlIntegrationRow | null {
    if (!rows.length) return null
    if (!USE_INTEGRATION_SCOPE_RESOLVER_V2) return rows[0]
    const personal = rows.find(
      (row) => String(row.scope_mode ?? '') === 'personal' && String(row.user_id) === userId,
    )
    if (personal) return personal
    const sharedDefault = rows.find(
      (row) => String(row.scope_mode ?? '') === 'org_shared' && Boolean(row.is_default),
    )
    if (sharedDefault) return sharedDefault
    const sharedAny = rows.find((row) => String(row.scope_mode ?? '') === 'org_shared')
    if (sharedAny) return sharedAny
    return rows[0]
  }
}
