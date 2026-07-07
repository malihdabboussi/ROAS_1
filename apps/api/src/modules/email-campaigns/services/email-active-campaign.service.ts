import { createDecipheriv } from 'crypto'
import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BroadcastSendPayload, SequenceSendPayload } from '../dto/email-campaigns.dto'
import { EmailCampaignsRepository } from '../repositories/email-campaigns.repository'
import {
  loadBroadcastEmailSource,
  type SequenceEmailSource,
} from './email-campaign-message-loader'

@Injectable()
export class EmailActiveCampaignService {
  private readonly logger = new Logger(EmailActiveCampaignService.name)

  constructor(private readonly repository: EmailCampaignsRepository) {}

  async sendBroadcast(userId: string, payload: BroadcastSendPayload, admin: SupabaseClient) {
    const email = await loadBroadcastEmailSource(this.repository, admin, payload)
    const { base, headers } = await this.getCredentials(userId, admin)
    const apiKey = headers['Api-Token']
    if (!apiKey) throw new BadRequestException('ActiveCampaign API key missing')
    const scheduledDate =
      payload.schedule_date ||
      new Date(Date.now() + 60_000).toISOString().replace('T', ' ').slice(0, 19)

    const messageRes = await this.acFetch<{ message?: { id?: string | number } }>(
      base,
      headers,
      'POST',
      '/messages',
      {
        message: {
          fromname: payload.from_name,
          fromemail: payload.from_email,
          subject: email.subject,
          html: email.body,
          text: this.stripHtml(email.body),
          format: 'html',
        },
      },
    )
    const messageId = messageRes?.message?.id
    if (!messageId) {
      throw new BadRequestException('ActiveCampaign message creation failed: missing message id')
    }
    this.logger.log(`AC broadcast: created message ${String(messageId)}`)

    if (!payload.list_id) {
      throw new BadRequestException('ActiveCampaign requires a list for broadcast sends')
    }

    const campaignRes = await this.acLegacyPostForm(base, apiKey, 'campaign_create', {
      type: 'single',
      name: `Broadcast: ${email.subject}`,
      sdate: scheduledDate,
      status: '1',
      public: '1',
      trackreads: '1',
      htmlunsub: '1',
      textunsub: '1',
      [`p[${payload.list_id}]`]: String(payload.list_id),
      [`m[${String(messageId)}]`]: '100',
      segmentid: payload.segment_id ? String(payload.segment_id) : '0',
    })
    const resultCode = Number(campaignRes.result_code ?? 0)
    if (resultCode !== 1) {
      const resultMessage = String(campaignRes.result_message ?? 'Campaign create failed')
      throw new BadRequestException(`ActiveCampaign campaign_create failed: ${resultMessage}`)
    }

    const campaignId = Number(campaignRes.id ?? 0)
    this.logger.log(`AC broadcast: created+scheduled campaign ${campaignId}`)

    return {
      success: true,
      send_type: 'broadcast',
      provider: 'active_campaign',
      campaignId,
      messageId: String(messageId),
    }
  }

  async sendSequence(userId: string, payload: SequenceSendPayload, admin: SupabaseClient) {
    const { data: emails } = await this.repository
      .table(admin, 'sequence_emails')
      .select('id, subject, body, delay_hours, order_index')
      .eq('sequence_id', payload.sequence_id)
      .order('order_index', { ascending: true })
    if (!emails?.length) throw new BadRequestException('No emails found in sequence')

    const { data: sequence } = await this.repository
      .table(admin, 'sequences')
      .select('name')
      .eq('id', payload.sequence_id)
      .maybeSingle()

    const seqName = sequence?.name || 'Untitled Sequence'
    const { base, headers } = await this.getCredentials(userId, admin)
    const apiKey = headers['Api-Token']
    if (!apiKey) throw new BadRequestException('ActiveCampaign API key missing')
    const startDate = payload.start_date ? new Date(payload.start_date) : new Date()
    if (!payload.list_id) {
      throw new BadRequestException('ActiveCampaign requires a list for sequence sends')
    }

    for (const email of emails as SequenceEmailSource[]) {
      const sdate = new Date(startDate.getTime() + email.delay_hours * 60 * 60 * 1000)
      const scheduledDate = sdate.toISOString().replace('T', ' ').slice(0, 19)
      const messageRes = await this.acFetch<{ message?: { id?: string | number } }>(
        base,
        headers,
        'POST',
        '/messages',
        {
          message: {
            fromname: payload.from_name,
            fromemail: payload.from_email,
            subject: email.subject,
            html: email.body,
            text: this.stripHtml(email.body),
            format: 'html',
          },
        },
      )
      const messageId = messageRes?.message?.id
      if (!messageId) {
        throw new BadRequestException(
          `ActiveCampaign message creation failed for sequence email ${email.order_index + 1}`,
        )
      }

      const campaignRes = await this.acLegacyPostForm(base, apiKey, 'campaign_create', {
        type: 'single',
        name: `${seqName} - Email ${email.order_index + 1}`,
        sdate: scheduledDate,
        status: '1',
        public: '1',
        trackreads: '1',
        htmlunsub: '1',
        textunsub: '1',
        [`p[${payload.list_id}]`]: String(payload.list_id),
        [`m[${String(messageId)}]`]: '100',
        segmentid: payload.segment_id ? String(payload.segment_id) : '0',
      })
      const resultCode = Number(campaignRes.result_code ?? 0)
      if (resultCode !== 1) {
        const resultMessage = String(campaignRes.result_message ?? 'Campaign create failed')
        throw new BadRequestException(
          `ActiveCampaign sequence campaign_create failed (email ${email.order_index + 1}): ${resultMessage}`,
        )
      }
    }

    const lastEmail = emails[emails.length - 1] as SequenceEmailSource
    return {
      success: true,
      send_type: 'sequence',
      provider: 'active_campaign',
      total_emails: emails.length,
      total_days: Math.ceil(lastEmail.delay_hours / 24),
      sequence_name: seqName,
    }
  }

  async getProviderSenders(
    userId: string,
    admin: SupabaseClient,
  ): Promise<{
    senders: Array<{ id: string; name: string; email: string }>
    provider_settings_url: string | null
  }> {
    let acUiUrl: string | null = null
    try {
      const [apiUrl, apiKey] = await Promise.all([
        this.readCredential(userId, admin, 'api_url'),
        this.readCredential(userId, admin, 'api_key'),
      ])
      acUiUrl = apiUrl ? this.uiSettingsUrl(apiUrl) : null
      if (!apiUrl || !apiKey) {
        return { senders: [], provider_settings_url: acUiUrl }
      }

      const base = apiUrl.replace(/\/+$/, '')
      const res = await fetch(`${base}/api/3/users`, {
        headers: { 'Api-Token': apiKey, Accept: 'application/json' },
      })
      if (!res.ok) return { senders: [], provider_settings_url: acUiUrl }
      const json = (await res.json()) as Record<string, unknown>
      const users = Array.isArray(json?.users)
        ? (json.users as Array<Record<string, unknown>>)
        : []
      const senders = users
        .filter((u) => u.email)
        .map((u) => ({
          id: String(u.id ?? u.email),
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || String(u.email),
          email: String(u.email),
        }))
      return { senders, provider_settings_url: acUiUrl }
    } catch {
      return { senders: [], provider_settings_url: acUiUrl }
    }
  }

  private async getCredentials(
    userId: string,
    admin: SupabaseClient,
  ): Promise<{ base: string; headers: Record<string, string> }> {
    const [apiUrl, apiKey] = await Promise.all([
      this.readCredential(userId, admin, 'api_url'),
      this.readCredential(userId, admin, 'api_key'),
    ])
    if (!apiUrl || !apiKey) throw new BadRequestException('ActiveCampaign is not connected')
    return {
      base: apiUrl.replace(/\/+$/, ''),
      headers: {
        'Api-Token': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  }

  private async readCredential(userId: string, admin: SupabaseClient, label: string) {
    const { data } = await this.repository
      .table(admin, 'vault_secrets')
      .select('encrypted_value')
      .eq('user_id', userId)
      .eq('provider', 'active_campaign')
      .eq('label', label)
      .maybeSingle()
    const raw = (data?.encrypted_value as string) || ''
    return raw ? this.decryptVaultValue(raw) : ''
  }

  private decryptVaultValue(ciphertext: string): string {
    const keyHex = process.env.VAULT_ENCRYPTION_KEY || ''
    const key = keyHex.length >= 32 ? Buffer.from(keyHex, 'hex') : Buffer.alloc(32, 0)
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
    if (!ivHex || !authTagHex || !encryptedHex) return ''
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    return decipher.update(Buffer.from(encryptedHex, 'hex')) + decipher.final('utf8')
  }

  private async acFetch<T>(
    base: string,
    headers: Record<string, string>,
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(`${base}/api/3${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    if (!res.ok) {
      const text = await res.text()
      this.logger.error(`AC API ${method} ${path}: ${res.status} ${text}`)
      throw new BadRequestException(`AC API ${method} ${path}: ${res.status}`)
    }
    if (res.status === 204) return {} as T
    return (await res.json()) as T
  }

  private async acLegacyPostForm(
    base: string,
    apiKey: string,
    action: string,
    fields: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const params = new URLSearchParams()
    params.set('api_action', action)
    params.set('api_output', 'json')
    for (const [k, v] of Object.entries(fields)) params.set(k, v)

    const res = await fetch(`${base}/admin/api.php`, {
      method: 'POST',
      headers: {
        'API-TOKEN': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    if (!res.ok) {
      const text = await res.text()
      this.logger.error(`AC legacy API ${action}: ${res.status} ${text}`)
      throw new BadRequestException(`AC legacy API ${action}: ${res.status}`)
    }
    return (await res.json()) as Record<string, unknown>
  }

  private uiSettingsUrl(apiUrl: string): string | null {
    const raw = apiUrl.replace(/\/+$/, '')
    try {
      const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
      const host = new URL(withProto).hostname.toLowerCase()
      const apiSub = host.match(/^([^.]+)\.api-[a-z0-9.-]+\.[a-z]+$/i)
      if (apiSub) return `https://${apiSub[1]}.activehosted.com/app/settings/advanced`
      const hosted = host.match(/^([^.]+)\.activehosted\.com$/i)
      if (hosted) return `https://${hosted[1]}.activehosted.com/app/settings/advanced`
      return null
    } catch {
      return null
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
