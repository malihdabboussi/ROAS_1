import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BroadcastSendPayload, SequenceSendPayload } from '../dto/email-campaigns.dto'
import { EmailCampaignsRepository } from '../repositories/email-campaigns.repository'
import { EmailActiveCampaignService } from './email-active-campaign.service'
import {
  loadBroadcastEmailSource,
  type SequenceEmailSource,
} from './email-campaign-message-loader'
import { EmailProviderDirectoryService } from './email-provider-directory.service'

interface RecipeStep {
  step_order: number
  action_slug: string
  params_template: Record<string, unknown>
  result_key: string | null
  result_alias: string | null
  description: string | null
}

@Injectable()
export class EmailOrchestratorService {
  private readonly logger = new Logger(EmailOrchestratorService.name)

  constructor(
    private readonly repository: EmailCampaignsRepository,
    private readonly activeCampaign: EmailActiveCampaignService,
    private readonly providerDirectory: EmailProviderDirectoryService,
  ) {}

  private getAdmin(): SupabaseClient {
    return this.repository.getAdminClient()
  }

  async send(
    userId: string,
    payload: BroadcastSendPayload | SequenceSendPayload,
    orgId?: string | null,
  ) {
    const { provider, send_type } = payload

    const admin = this.getAdmin()
    const { data: cap } = await this.repository
      .table(admin, 'email_provider_capabilities')
      .select('*')
      .eq('provider', provider)
      .maybeSingle()

    if (!cap)
      throw new BadRequestException(`Provider "${provider}" is not configured for email campaigns`)

    if (cap.is_bullmq_provider) {
      return this.routeToBullMQ(userId, payload, admin, orgId)
    }

    if (provider === 'active_campaign') {
      if (send_type === 'broadcast') {
        return this.activeCampaign.sendBroadcast(userId, payload as BroadcastSendPayload, admin)
      }
      return this.activeCampaign.sendSequence(userId, payload as SequenceSendPayload, admin)
    }

    const recipe = await this.loadRecipe(provider, send_type, admin)
    if (recipe.length === 0) {
      throw new BadRequestException(`No ${send_type} recipe found for provider "${provider}"`)
    }

    if (send_type === 'broadcast') {
      return this.executeBroadcast(userId, payload as BroadcastSendPayload, recipe, admin)
    }
    return this.executeSequence(userId, payload as SequenceSendPayload, recipe, admin)
  }

  private async loadRecipe(
    provider: string,
    recipeType: string,
    admin: SupabaseClient,
  ): Promise<RecipeStep[]> {
    const { data } = await this.repository
      .table(admin, 'email_provider_recipes')
      .select('step_order, action_slug, params_template, result_key, result_alias, description')
      .eq('provider', provider)
      .eq('recipe_type', recipeType)
      .order('step_order', { ascending: true })

    return (data ?? []) as RecipeStep[]
  }

  private async executeBroadcast(
    userId: string,
    payload: BroadcastSendPayload,
    recipe: RecipeStep[],
    admin: SupabaseClient,
  ) {
    const email = await loadBroadcastEmailSource(this.repository, admin, payload)

    const variables: Record<string, string> = {
      name: `Broadcast: ${email.subject}`,
      subject: email.subject,
      html: email.body,
      text: this.stripHtml(email.body),
      from_email: payload.from_email,
      from_name: payload.from_name,
      schedule_date:
        payload.schedule_date || new Date().toISOString().replace('T', ' ').slice(0, 19),
      list_id: payload.list_id || '',
      segment_id: payload.segment_id || '',
    }

    const results = await this.executeRecipe(userId, payload.provider, recipe, variables)
    return { success: true, send_type: 'broadcast', provider: payload.provider, results }
  }

  private async executeSequence(
    userId: string,
    payload: SequenceSendPayload,
    recipe: RecipeStep[],
    admin: SupabaseClient,
  ) {
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

    const sequenceName = sequence?.name || 'Untitled Sequence'
    const startDate = payload.start_date ? new Date(payload.start_date) : new Date()
    const allResults: Array<{ email_index: number; subject: string; results: unknown }> = []

    for (const email of emails as SequenceEmailSource[]) {
      const sdate = new Date(startDate.getTime() + email.delay_hours * 60 * 60 * 1000)
      const variables: Record<string, string> = {
        sequence_name: sequenceName,
        email_index: String(email.order_index + 1),
        name: `${sequenceName} - Email ${email.order_index + 1}`,
        subject: email.subject,
        html: email.body,
        text: this.stripHtml(email.body),
        from_email: payload.from_email,
        from_name: payload.from_name,
        calculated_sdate: sdate.toISOString().replace('T', ' ').slice(0, 19),
        list_id: payload.list_id || '',
        segment_id: payload.segment_id || '',
      }

      const results = await this.executeRecipe(userId, payload.provider, recipe, variables)
      allResults.push({ email_index: email.order_index + 1, subject: email.subject, results })
    }

    const lastEmail = emails[emails.length - 1] as SequenceEmailSource
    const totalDays = Math.ceil(lastEmail.delay_hours / 24)

    return {
      success: true,
      send_type: 'sequence',
      provider: payload.provider,
      total_emails: emails.length,
      total_days: totalDays,
      sequence_name: sequenceName,
      results: allResults,
    }
  }

  private async executeRecipe(
    userId: string,
    provider: string,
    recipe: RecipeStep[],
    variables: Record<string, string>,
  ): Promise<Array<{ step: number; action: string; result: unknown }>> {
    const context = { ...variables }
    const stepResults: Array<{ step: number; action: string; result: unknown }> = []

    for (const step of recipe) {
      const renderedParams = this.renderTemplate(step.params_template, context)
      const result = await this.callIntegration(userId, provider, step.action_slug, renderedParams)

      if (step.result_key && step.result_alias) {
        const extracted = this.extractValue(result, step.result_key)
        if (extracted !== undefined) {
          context[step.result_alias] = String(extracted)
        }
      }

      stepResults.push({ step: step.step_order, action: step.action_slug, result })
    }

    return stepResults
  }

  private async callIntegration(
    userId: string,
    provider: string,
    actionSlug: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    const apiUrl = process.env.MAIN_API_URL || `http://localhost:${process.env.PORT || '3001'}`
    const admin = this.getAdmin()

    const { data: tokenRow } = await this.repository
      .table(admin, 'user_integrations')
      .select('metadata')
      .eq('user_id', userId)
      .eq('integration_id', provider)
      .eq('status', 'connected')
      .is('org_id', null)
      .maybeSingle()

    if (!tokenRow) throw new BadRequestException(`Provider "${provider}" is not connected`)

    const controllerBase = provider.replace(/_/g, '-')
    const routePath = this.actionToRoute(actionSlug, params)
    if (!routePath)
      throw new BadRequestException(`Unknown action "${actionSlug}" for provider "${provider}"`)

    const url = `${apiUrl}/api/integrations/${controllerBase}${routePath.path}`

    const res = await fetch(url, {
      method: routePath.method,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN || '',
      },
      ...(routePath.body ? { body: JSON.stringify(routePath.body) } : {}),
    })

    if (!res.ok) {
      const text = await res.text()
      this.logger.error(
        `Integration call failed: ${routePath.method} ${url} → ${res.status} ${text}`,
      )
      throw new BadRequestException(`Integration call failed: ${actionSlug} → ${res.status}`)
    }

    return res.json()
  }

  private actionToRoute(
    action: string,
    params: Record<string, unknown>,
  ): { method: string; path: string; body?: Record<string, unknown> } | null {
    const id = String(params.id ?? '')
    switch (action) {
      case 'create_campaign':
        return { method: 'POST', path: '/campaigns', body: params }
      case 'update_campaign': {
        const { id: _cid, ...campaignBody } = params
        return { method: 'PUT', path: `/campaigns/${id}`, body: campaignBody }
      }
      case 'create_message':
        return { method: 'POST', path: '/messages', body: params }
      case 'update_message': {
        const { id: _mid, ...messageBody } = params
        return { method: 'PUT', path: `/messages/${id}`, body: messageBody }
      }
      case 'list_lists':
        return { method: 'GET', path: '/lists' }
      case 'list_segments':
        return { method: 'GET', path: '/segments' }
      default:
        return { method: 'POST', path: `/${action.replace(/_/g, '-')}`, body: params }
    }
  }

  private async routeToBullMQ(
    userId: string,
    payload: BroadcastSendPayload | SequenceSendPayload,
    admin: SupabaseClient,
    orgId?: string | null,
  ) {
    let senderQ = this.repository
      .table(admin, 'email_sender_identities')
      .select('id, domain_id')
      .eq('user_id', userId)
      .eq('from_email', payload.from_email)
      .eq('is_verified', true)
    if (orgId !== undefined) {
      senderQ = orgId ? senderQ.eq('org_id', orgId) : senderQ.is('org_id', null)
    }
    const { data: senderIdentity } = await senderQ.maybeSingle()

    if (payload.send_type === 'sequence') {
      const seqPayload = payload as SequenceSendPayload
      const { data: emails } = await this.repository
        .table(admin, 'sequence_emails')
        .select('id, subject, body, delay_hours, order_index')
        .eq('sequence_id', seqPayload.sequence_id)
        .order('order_index', { ascending: true })

      if (!emails?.length) throw new BadRequestException('No emails found in sequence')

      const startDate = seqPayload.start_date ? new Date(seqPayload.start_date) : new Date()
      const scheduled: string[] = []

      for (const email of emails) {
        const scheduledAt = new Date(
          startDate.getTime() + (email.delay_hours ?? 0) * 60 * 60 * 1000,
        )
        const { error: insertError } = await this.repository
          .table(admin, 'email_single_schedules')
          .insert({
            user_id: userId,
            org_id: orgId ?? null,
            sequence_id: seqPayload.sequence_id,
            sequence_email_id: email.id,
            sender_identity_id: senderIdentity?.id || null,
            domain_id: senderIdentity?.domain_id || null,
            subject: email.subject,
            html_content: email.body,
            scheduled_at: scheduledAt.toISOString(),
            status: 'scheduled',
          })
        if (insertError) {
          this.logger.error(`Failed to insert single schedule: ${insertError.message}`)
          throw new BadRequestException(`Failed to schedule email: ${insertError.message}`)
        }
        scheduled.push(email.id)
      }

      return {
        success: true,
        send_type: 'sequence',
        provider: payload.provider,
        total_emails: emails.length,
        total_days: Math.ceil(
          ((emails as Array<{ delay_hours: number }>).at(-1)?.delay_hours ?? 0) / 24,
        ),
        scheduled_ids: scheduled,
      }
    }

    const bcPayload = payload as BroadcastSendPayload

    const email = await loadBroadcastEmailSource(this.repository, admin, bcPayload)

    const scheduledAt = bcPayload.schedule_date ? new Date(bcPayload.schedule_date) : new Date()

    const { error: insertError } = await this.repository
      .table(admin, 'email_broadcast_schedules')
      .insert({
        user_id: userId,
        org_id: orgId ?? null,
        segment_id: bcPayload.segment_id || null,
        sender_identity_id: senderIdentity?.id || null,
        domain_id: senderIdentity?.domain_id || null,
        subject: email.subject,
        html_content: email.body,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
      })
    if (insertError) {
      this.logger.error(`Failed to insert broadcast schedule: ${insertError.message}`)
      throw new BadRequestException(`Failed to schedule broadcast: ${insertError.message}`)
    }

    return { success: true, send_type: 'broadcast', provider: payload.provider }
  }

  private renderTemplate(
    template: unknown,
    variables: Record<string, string>,
  ): Record<string, unknown> {
    const json = JSON.stringify(template)
    const rendered = json.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const val = variables[key] ?? ''
      return JSON.stringify(val).slice(1, -1)
    })
    return JSON.parse(rendered) as Record<string, unknown>
  }

  private extractValue(obj: unknown, path: string): unknown {
    const parts = path.split('.')
    let current: unknown = obj
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private goHighLevelSmtpSettingsUrl(locationId: string): string {
    const id = String(locationId).trim()
    return `https://app.gohighlevel.com/v2/location/${encodeURIComponent(id)}/settings/smtp_service`
  }

  async getProviderSenders(
    userId: string,
    provider: string,
    orgId?: string | null,
  ): Promise<{
    senders: Array<{ id: string; name: string; email: string }>
    provider_settings_url: string | null
  }> {
    const admin = this.getAdmin()

    if (provider === 'vibey') {
      let senderQ = this.repository
        .table(admin, 'email_sender_identities')
        .select('id, from_name, from_email, is_verified, is_default')
        .eq('user_id', userId)
        .eq('is_verified', true)
      if (orgId !== undefined) {
        senderQ = orgId ? senderQ.eq('org_id', orgId) : senderQ.is('org_id', null)
      }
      const { data } = await senderQ.order('is_default', { ascending: false })

      return {
        senders: (data ?? []).map(
          (s: { id: string; from_name: string; from_email: string; is_default: boolean }) => ({
            id: s.id,
            name: s.from_name,
            email: s.from_email,
          }),
        ),
        provider_settings_url: null,
      }
    }

    if (provider === 'active_campaign') {
      return this.activeCampaign.getProviderSenders(userId, admin)
    }

    if (provider === 'gohighlevel') {
      const { data: ghlRow } = await this.repository
        .table(admin, 'user_integrations')
        .select('metadata')
        .eq('user_id', userId)
        .eq('integration_id', 'gohighlevel')
        .eq('status', 'connected')
        .is('org_id', null)
        .maybeSingle()
      const ghlMeta = (ghlRow?.metadata as Record<string, unknown> | null) ?? null
      const locationId = (ghlMeta?.locationId as string | undefined) ?? null
      const provider_settings_url = locationId ? this.goHighLevelSmtpSettingsUrl(locationId) : null
      return {
        senders: [{ id: 'location_default', name: 'Account Default', email: 'Configured in GHL' }],
        provider_settings_url,
      }
    }

    return { senders: [], provider_settings_url: null }
  }

  async getProviderCapabilities(): Promise<unknown[]> {
    return this.providerDirectory.getProviderCapabilities()
  }

  async getConnectedEmailProviders(userId: string, orgId?: string | null) {
    return this.providerDirectory.getConnectedEmailProviders(userId, orgId)
  }

  async getProviderAudiences(userId: string, provider: string, _orgId?: string | null) {
    return this.providerDirectory.getProviderAudiences(userId, provider, _orgId)
  }

  async createPendingSend(
    userId: string,
    payload: BroadcastSendPayload | SequenceSendPayload,
    channel: string,
    orgId?: string | null,
  ): Promise<string> {
    const admin = this.getAdmin()
    const { data, error } = await this.repository
      .table(admin, 'email_pending_sends')
      .insert({
        user_id: userId,
        org_id: orgId ?? null,
        sequence_id:
          payload.send_type === 'sequence' ? (payload as SequenceSendPayload).sequence_id : null,
        sequence_email_id:
          payload.send_type === 'broadcast'
            ? ((payload as BroadcastSendPayload).sequence_email_id ?? null)
            : null,
        send_type: payload.send_type,
        provider: payload.provider,
        payload: payload as unknown as Record<string, unknown>,
        status: 'pending',
        channel,
      })
      .select('id')
      .single()

    if (error || !data) throw new BadRequestException('Failed to create pending send')
    return data.id as string
  }

  async approvePendingSend(pendingSendId: string, requestingUserId: string, orgId?: string | null) {
    const admin = this.getAdmin()
    let pendingQ = this.repository
      .table(admin, 'email_pending_sends')
      .select('*')
      .eq('id', pendingSendId)
      .eq('status', 'pending')
    pendingQ = pendingQ.eq('user_id', requestingUserId)
    if (orgId !== undefined) {
      pendingQ = orgId ? pendingQ.eq('org_id', orgId) : pendingQ.is('org_id', null)
    }
    const { data, error } = await pendingQ.maybeSingle()

    if (error || !data) throw new BadRequestException('Pending send not found or already processed')

    const { data: updated } = await this.repository
      .table(admin, 'email_pending_sends')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', pendingSendId)
      .eq('status', 'pending')
      .select('id')
    if (!updated?.length)
      throw new BadRequestException('Pending send already processed by another request')

    try {
      const result = await this.send(
        data.user_id,
        data.payload as BroadcastSendPayload | SequenceSendPayload,
        orgId,
      )
      await this.repository
        .table(admin, 'email_pending_sends')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', pendingSendId)
      return result
    } catch (err) {
      await this.repository
        .table(admin, 'email_pending_sends')
        .update({
          status: 'error',
          error_message: err instanceof Error ? err.message : String(err),
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingSendId)
      throw err
    }
  }

  async cancelPendingSend(pendingSendId: string, requestingUserId: string, orgId?: string | null) {
    const admin = this.getAdmin()
    let cancelQ = this.repository
      .table(admin, 'email_pending_sends')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', pendingSendId)
      .eq('status', 'pending')
      .eq('user_id', requestingUserId)
    if (orgId !== undefined) {
      cancelQ = orgId ? cancelQ.eq('org_id', orgId) : cancelQ.is('org_id', null)
    }
    await cancelQ
    return { success: true }
  }
}
