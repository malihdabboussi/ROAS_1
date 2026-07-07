import { Injectable } from '@nestjs/common'
import {
  buildDeleteConfirmBlock,
  callOrExtracted,
  tryPersistMissionDeliverable,
} from '../utils/artifact-domain-handler-shared.util'
import { ArtifactSequencesRepository } from '../repositories/artifact-sequences.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { getActiveSpaceId } from './artifact-space-scope'
import { ensureSpaceView } from './ensure-space-view'

@Injectable()
export class ArtifactSequencesService {
  constructor(
    private readonly repository: ArtifactSequencesRepository = new ArtifactSequencesRepository(),
  ) {}
  private static emailHtmlPreview(html: string, max = 400): string {
    let s = String(html ?? '')
      .replace(/\r\n/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|table|h[1-6]|li|blockquote|section|article)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\u00a0/g, ' ')
    s = s
      .split('\n')
      .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
      .join('\n')
    s = s.replace(/\n{3,}/g, '\n\n').trim()
    if (s.length <= max) return s
    let cut = s.slice(0, max)
    const lastNl = cut.lastIndexOf('\n')
    if (lastNl > max * 0.55) cut = cut.slice(0, lastNl)
    else {
      const lastSp = cut.lastIndexOf(' ')
      if (lastSp > max * 0.45) cut = cut.slice(0, lastSp)
    }
    return `${cut.trimEnd()}…`
  }

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_sequences: (data, sessionKey) =>
        callOrExtracted(
          target,
          'listSequences',
          () => this.listSequences(target, data, sessionKey),
          data,
          sessionKey,
        ),
      create_sequence: (data, sessionKey) =>
        callOrExtracted(
          target,
          'createSequence',
          () => this.createSequence(target, data, sessionKey),
          data,
          sessionKey,
        ),
      add_sequence_email: (data, sessionKey) =>
        callOrExtracted(
          target,
          'addSequenceEmail',
          () => this.addSequenceEmail(target, data, sessionKey),
          data,
          sessionKey,
        ),
      prepare_email_send: (data, sessionKey) =>
        callOrExtracted(
          target,
          'prepareEmailSend',
          () => this.prepareEmailSend(target, data, sessionKey),
          data,
          sessionKey,
        ),
      prepare_sequence_send: (data, sessionKey) =>
        callOrExtracted(
          target,
          'prepareSequenceSend',
          () => this.prepareSequenceSend(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_sequence: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getSequence',
          () => this.getSequence(target, data, sessionKey),
          data,
          sessionKey,
        ),
      get_sequence_email: (data, sessionKey) =>
        callOrExtracted(
          target,
          'getSequenceEmail',
          () => this.getSequenceEmail(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_sequence: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updateSequence',
          () => this.updateSequence(target, data, sessionKey),
          data,
          sessionKey,
        ),
      update_sequence_email: (data, sessionKey) =>
        callOrExtracted(
          target,
          'updateSequenceEmail',
          () => this.updateSequenceEmail(target, data, sessionKey),
          data,
          sessionKey,
        ),
      delete_sequence: (data, sessionKey) => this.deleteSequence(target, data, sessionKey),
      delete_sequence_email: (data, sessionKey) =>
        this.deleteSequenceEmail(target, data, sessionKey),
    }
  }

  private mapEmailCampaignProviders(raw: unknown): Array<{
    id: string
    name: string
    supports_sequences?: boolean
    supports_broadcast?: boolean
  }> {
    if (!Array.isArray(raw)) return []
    const out: Array<{
      id: string
      name: string
      supports_sequences?: boolean
      supports_broadcast?: boolean
    }> = []
    for (const p of raw) {
      if (!p || typeof p !== 'object' || Array.isArray(p)) continue
      const row = p as Record<string, unknown>
      const id = typeof row.provider === 'string' ? row.provider.trim() : ''
      if (!id) continue
      const name =
        typeof row.display_name === 'string' && row.display_name.trim().length > 0
          ? row.display_name.trim()
          : id
      const supports_sequences = row.supports_sequences !== false
      const supports_broadcast = row.supports_broadcast !== false
      out.push({ id, name, supports_sequences, supports_broadcast })
    }
    return out
  }

  private async fetchEmailCampaignProviders(
    target: Record<string, any>,
    sessionKey?: string,
  ): Promise<
    Array<{
      id: string
      name: string
      supports_sequences?: boolean
      supports_broadcast?: boolean
    }>
  > {
    const res = (await target.mainApiCall('GET', '/api/email-campaigns/providers', sessionKey)) as {
      success?: boolean
      providers?: unknown
    }
    return this.mapEmailCampaignProviders(res?.providers)
  }

  private async listSequences(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Select a campaign first.' }
    }
    const { data, error } = await this.repository.listSequences(supabase, {
      campaignId,
      orgId,
      userId,
    })
    if (error) throw error
    return data
  }

  private async createSequence(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)
    if (!campaignId) {
      return { success: false, error: 'campaign_id required. Create or select a campaign first.' }
    }
    const orgId = target.resolveOrgId?.(sessionKey) as string | null | undefined
    const spaceId = getActiveSpaceId(input)
    const { data, error } = await this.repository.createSequence(supabase, {
        user_id: userId,
        org_id: orgId ?? null,
        campaign_id: campaignId,
        ...(spaceId ? { space_id: spaceId } : {}),
        name: (input.name as string) ?? 'Untitled Sequence',
        trigger: input.trigger ?? {},
        config: input.config ?? {},
        status: (input.status as string) ?? 'draft',
      })
    if (error) throw error
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId,
      viewType: 'sequences',
      logger: target.logger,
    })
    await tryPersistMissionDeliverable(target, sessionKey, {
      type: 'sequence',
      entityId: String(data.id),
      entityTable: 'sequences',
      title: String(data.name ?? 'Untitled Sequence'),
      sourceAction: 'create_sequence',
    })
    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-sequence-${data.id}`,
          artifactType: 'sequence',
          artifactId: data.id,
          name: data.name ?? 'Untitled Sequence',
          spaceId: spaceId ?? undefined,
        },
      ],
      ...data,
    }
  }

  private async prepareEmailSend(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sequenceEmailId = String(input.sequence_email_id ?? '').trim()
    if (!sequenceEmailId) return { success: false, error: 'sequence_email_id is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: email, error: emailError } = await this.repository.findSequenceEmail(
      supabase,
      {
        sequenceEmailId,
        select: 'id, subject, sequence_id',
      },
    )

    if (emailError) throw emailError
    if (!email) return { success: false, error: 'sequence_email not found' }

    const { data: seq, error: seqError } = await this.repository.findSequence(supabase, {
      sequenceId: email.sequence_id as string,
      select: 'id, user_id',
    })

    if (seqError) throw seqError
    if (!seq || seq.user_id !== userId) {
      return { success: false, error: 'sequence_email not found or access denied' }
    }

    const available_providers = await this.fetchEmailCampaignProviders(target, sessionKey)
    const forBroadcast = available_providers.filter((p) => p.supports_broadcast !== false)

    const blockId = `email-send-broadcast-${sequenceEmailId}-${Date.now()}`
    const subject = typeof email.subject === 'string' ? email.subject : 'Untitled'

    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        {
          type: 'email_send_confirm',
          id: blockId,
          status: 'pending',
          send_type: 'broadcast',
          sequence_email_id: sequenceEmailId,
          subject,
          available_providers: forBroadcast.length > 0 ? forBroadcast : available_providers,
        },
      ],
    }
  }

  private async prepareSequenceSend(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sequenceId = String(input.sequence_id ?? '').trim()
    if (!sequenceId) return { success: false, error: 'sequence_id is required' }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)

    const { data: seq, error: seqError } = await this.repository.findSequence(supabase, {
      sequenceId,
      select: 'id, name, user_id',
    })

    if (seqError) throw seqError
    if (!seq || seq.user_id !== userId) {
      return { success: false, error: 'sequence not found or access denied' }
    }

    const { data: emails, error: emailsError } = await this.repository.listSequenceEmails(
      supabase,
      sequenceId,
    )

    if (emailsError) throw emailsError
    const list = (emails ?? []) as Array<{
      id: string
      subject: string | null
      order_index: number | null
      delay_hours: number | null
      body: string | null
    }>

    if (list.length === 0) {
      return { success: false, error: 'sequence has no emails; add_sequence_email first' }
    }

    const available_providers = await this.fetchEmailCampaignProviders(target, sessionKey)
    const forSequence = available_providers.filter((p) => p.supports_sequences !== false)

    const blockId = `email-send-sequence-${sequenceId}-${Date.now()}`
    const sequenceName = typeof seq.name === 'string' ? seq.name : 'Untitled sequence'

    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        {
          type: 'email_send_confirm',
          id: blockId,
          status: 'pending',
          send_type: 'sequence',
          sequence_id: sequenceId,
          sequence_name: sequenceName,
          emails: list.map((e) => ({
            id: e.id,
            subject: typeof e.subject === 'string' ? e.subject : 'Untitled',
            order_index: typeof e.order_index === 'number' ? e.order_index : 0,
            delay_hours: typeof e.delay_hours === 'number' ? e.delay_hours : 0,
            html_preview: ArtifactSequencesService.emailHtmlPreview(
              typeof e.body === 'string' ? e.body : '',
            ),
          })),
          available_providers: forSequence.length > 0 ? forSequence : available_providers,
        },
      ],
    }
  }

  private async addSequenceEmail(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    if (!input.sequence_id) return { success: false, error: 'sequence_id required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.addSequenceEmail(supabase, {
        sequence_id: input.sequence_id as string,
        subject: (input.subject as string) ?? 'Untitled Email',
        body: (input.body as string) ?? '',
        order_index: (input.order_index as number) ?? 0,
        delay_hours: (input.delay_hours as number) ?? 0,
      })
    if (error) throw error
    const { data: sequence } = await this.repository.findSequence(supabase, {
      sequenceId: input.sequence_id as string,
      select: 'campaign_id, space_id',
    })
    const spaceId =
      getActiveSpaceId(input) ??
      (typeof sequence?.space_id === 'string' && sequence.space_id.trim()
        ? sequence.space_id
        : null)
    await ensureSpaceView({
      supabase,
      spaceId,
      campaignId: sequence?.campaign_id as string | null | undefined,
      viewType: 'sequences',
      logger: target.logger,
    })

    const subject = (data.subject as string) ?? 'Untitled Email'
    const bodyHtml = (data.body as string) ?? ''
    const bodyPreview = ArtifactSequencesService.emailHtmlPreview(bodyHtml, 300)

    return {
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `artifact-email-${data.id}`,
          artifactType: 'sequence',
          artifactId: input.sequence_id as string,
          name: subject,
          emailSubject: subject,
          bodyPreview: bodyPreview || undefined,
          spaceId: spaceId ?? undefined,
        },
      ],
      ...data,
    }
  }
  private async getSequence(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sequenceId = String(input.sequence_id ?? '').trim()
    if (!sequenceId) return { success: false, error: 'sequence_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findSequence(supabase, {
      sequenceId,
      select: '*, sequence_emails(id, subject, order_index, delay_hours, body)',
      userId,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Sequence not found' }
    return data
  }

  private async getSequenceEmail(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sequenceEmailId = String(input.sequence_email_id ?? '').trim()
    if (!sequenceEmailId) return { success: false, error: 'sequence_email_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data: email, error: fetchError } = await this.repository.findSequenceEmail(
      supabase,
      {
        sequenceEmailId,
        select: '*',
      },
    )
    if (fetchError) throw fetchError
    if (!email) return { success: false, error: 'Sequence email not found' }
    const { data: sequence, error: sequenceError } = await this.repository.findSequence(
      supabase,
      {
        sequenceId: email.sequence_id as string,
        select: 'id, user_id, org_id, campaign_id, space_id, name',
      },
    )
    if (sequenceError) throw sequenceError
    if (!sequence || sequence.user_id !== userId) {
      return { success: false, error: 'Sequence email not found or access denied' }
    }
    return { ...email, sequence }
  }
  private async updateSequence(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sequenceId = String(input.sequence_id ?? '').trim()
    if (!sequenceId) return { success: false, error: 'sequence_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const allowedKeys = ['name', 'trigger', 'config', 'status'] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowedKeys) {
      if (input[key] !== undefined) updates[key] = input[key]
    }
    if (Object.keys(updates).length === 0) return { success: false, error: 'No fields to update' }
    const { data, error } = await this.repository.updateSequence(supabase, {
      sequenceId,
      userId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Sequence not found' }
    return data
  }

  private async updateSequenceEmail(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sequenceEmailId = String(input.sequence_email_id ?? '').trim()
    if (!sequenceEmailId) return { success: false, error: 'sequence_email_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data: email, error: fetchError } = await this.repository.findSequenceEmail(
      supabase,
      {
        sequenceEmailId,
        select: 'id, sequence_id',
      },
    )
    if (fetchError) throw fetchError
    if (!email) return { success: false, error: 'Sequence email not found' }
    const { data: seq } = await this.repository.findSequence(supabase, {
      sequenceId: email.sequence_id as string,
      select: 'id',
      userId,
    })
    if (!seq) return { success: false, error: 'Sequence email not found or access denied' }
    const allowedKeys = ['subject', 'body', 'delay_hours', 'order_index', 'status'] as const
    const updates: Record<string, unknown> = {}
    for (const key of allowedKeys) {
      if (input[key] !== undefined) updates[key] = input[key]
    }
    if (Object.keys(updates).length === 0) return { success: false, error: 'No fields to update' }
    const { data, error } = await this.repository.updateSequenceEmail(supabase, {
      sequenceEmailId,
      updates,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Sequence email not found' }
    return data
  }
  private async deleteSequence(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sequenceId = String(input.sequence_id ?? '').trim()
    if (!sequenceId) return { success: false, error: 'sequence_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data, error } = await this.repository.findSequence(supabase, {
      sequenceId,
      select: 'id, name',
      userId,
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Sequence not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_sequence',
          entityType: 'sequence',
          entityId: String(data.id),
          entityName: String(data.name ?? 'Untitled Sequence'),
        }),
      ],
    }
  }

  private async deleteSequenceEmail(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const sequenceEmailId = String(input.sequence_email_id ?? '').trim()
    if (!sequenceEmailId) return { success: false, error: 'sequence_email_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const { data: email, error: fetchError } = await this.repository.findSequenceEmail(
      supabase,
      {
        sequenceEmailId,
        select: 'id, subject, sequence_id',
      },
    )
    if (fetchError) throw fetchError
    if (!email) return { success: false, error: 'Sequence email not found' }
    const { data: seq } = await this.repository.findSequence(supabase, {
      sequenceId: email.sequence_id as string,
      select: 'id',
      userId,
    })
    if (!seq) return { success: false, error: 'Sequence email not found or access denied' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        buildDeleteConfirmBlock({
          action: 'delete_sequence_email',
          entityType: 'sequence_email',
          entityId: String(email.id),
          entityName: String(email.subject ?? 'Untitled Email'),
        }),
      ],
    }
  }
}
