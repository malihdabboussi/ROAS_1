import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ArtifactEmailsRepository } from '../repositories/artifact-emails.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'

@Injectable()
export class ArtifactEmailsService {
  constructor(
    private readonly repository: ArtifactEmailsRepository = new ArtifactEmailsRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_emails: (data, sessionKey) => this.listEmails(target, data, sessionKey),
      save_email: (data, sessionKey) => this.saveEmail(target, data, sessionKey),
      get_email: (data, sessionKey) => this.getEmail(target, data, sessionKey),
      update_email: (data, sessionKey) => this.updateEmail(target, data, sessionKey),
      delete_email: (data, sessionKey) => this.deleteEmail(target, data, sessionKey),
    }
  }

  private buildDeleteConfirmBlock(input: {
    action: string
    entityType: string
    entityId: string
    entityName: string
  }) {
    return {
      type: 'delete_confirm',
      id: `delete-${input.entityType}-${input.entityId}-${Date.now()}`,
      delete_action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_name: input.entityName,
      status: 'pending',
    }
  }

  private async listEmails(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = target.resolveUserId(sessionKey)
    const supabase = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
    const campaignId =
      typeof input.campaign_id === 'string' && input.campaign_id.trim().length > 0
        ? input.campaign_id.trim()
        : await target.resolveCampaignId?.(supabase, input, userId, sessionKey)
    const spaceId = String(input.space_id ?? '').trim()
    const sourceItemId = String(input.source_item_id ?? '').trim()
    const status = String(input.status ?? '').trim()
    const requestedLimit = Number(input.limit ?? 50)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100)
      : 50

    const { data, error } = await this.repository.listEmails(supabase, {
      campaignId,
      spaceId,
      sourceItemId,
      status,
      limit,
    })
    if (error) throw error
    return data ?? []
  }

  private async saveEmail(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const subject = String(input.subject ?? '').trim()
    const body = String(input.body ?? '').trim()
    const spaceId = String(input.space_id ?? '').trim()
    const sourceItemId = String(input.source_item_id ?? '').trim()
    if (!subject) return { success: false, error: 'subject is required' }
    if (!body) return { success: false, error: 'body is required' }
    if (!spaceId) return { success: false, error: 'space_id is required' }
    if (!sourceItemId) return { success: false, error: 'source_item_id is required' }

    const userId = target.resolveUserId(sessionKey)
    const orgId = (target.resolveOrgId?.(sessionKey) as string | null | undefined) ?? null
    const supabase = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient

    const { data: task, error: taskError } = await this.repository.findSourceSpaceItem(supabase, {
      sourceItemId,
      spaceId,
    })
    if (taskError) throw taskError
    if (!task) return { success: false, error: 'Source task not found' }

    let campaignId =
      typeof input.campaign_id === 'string' && input.campaign_id.trim().length > 0
        ? input.campaign_id.trim()
        : null
    if (!campaignId) {
      campaignId = await this.repository.findSpaceCampaignId(supabase, spaceId)
    }
    const { data: email, error } = await this.repository.createEmail(supabase, {
      subject,
      body,
      status: 'draft',
      campaign_id: campaignId,
      space_id: spaceId,
      source_item_id: sourceItemId,
      user_id: userId,
      org_id: orgId ?? null,
      created_by: userId,
    })
    if (error) throw error
    if (!email) return { success: false, error: 'Email artifact was not created' }

    const existingCustom =
      task.custom_data && typeof task.custom_data === 'object' && !Array.isArray(task.custom_data)
        ? (task.custom_data as Record<string, unknown>)
        : {}
    const emailId = String(email.id)
    const existingArtifacts = Array.isArray(existingCustom.artifacts)
      ? (existingCustom.artifacts as unknown[])
      : []
    const nextArtifacts = [
      ...existingArtifacts.filter((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return true
        const raw = entry as Record<string, unknown>
        return !(raw.kind === 'email' && raw.id === emailId)
      }),
      { kind: 'email', id: emailId },
    ]
    await this.repository.updateSpaceItemCustomData(supabase, {
      sourceItemId,
      spaceId,
      customData: {
        ...existingCustom,
        artifact: { kind: 'email', id: emailId },
        artifacts: nextArtifacts,
      },
    })

    return {
      success: true,
      artifact_id: emailId,
      kind: 'email',
      subject,
      body,
      space_id: spaceId,
      source_item_id: sourceItemId,
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `email-${emailId}`,
          artifactType: 'email',
          artifactId: emailId,
          name: subject,
          subtitle: 'Email draft',
          bodyPreview: body.slice(0, 240),
          status: 'draft',
        },
      ],
    }
  }

  private async getEmail(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const emailId = String(input.email_id ?? '').trim()
    if (!emailId) return { success: false, error: 'email_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
    const { data, error } = await this.repository.findEmail(supabase, {
      emailId,
      columns: '*',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Email artifact not found' }
    return data
  }

  private async updateEmail(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const emailId = String(input.email_id ?? '').trim()
    if (!emailId) return { success: false, error: 'email_id is required' }

    const updates: Record<string, unknown> = {}
    if (input.subject !== undefined) {
      const subject = String(input.subject ?? '').trim()
      if (!subject) return { success: false, error: 'subject must be a non-empty string' }
      updates.subject = subject
    }
    if (input.body !== undefined) {
      const body = String(input.body ?? '').trim()
      if (!body) return { success: false, error: 'body must be a non-empty string' }
      updates.body = body
    }
    if (Object.keys(updates).length === 0) return { success: false, error: 'No fields to update' }
    updates.updated_at = new Date().toISOString()

    const userId = target.resolveUserId(sessionKey)
    const supabase = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
    const { data, error } = await this.repository.updateEmail(supabase, { emailId, updates })
    if (error) throw error
    if (!data) return { success: false, error: 'Email artifact not found' }

    const subject = String(data.subject ?? '')
    const body = String(data.body ?? '')
    return {
      success: true,
      ...data,
      ui_blocks: [
        {
          type: 'artifact_preview',
          id: `email-${data.id}`,
          artifactType: 'email',
          artifactId: data.id,
          name: subject || 'Untitled Email',
          subtitle: 'Email draft',
          bodyPreview: body.slice(0, 240),
          status: data.status ?? 'draft',
        },
      ],
    }
  }

  private async deleteEmail(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const emailId = String(input.email_id ?? '').trim()
    if (!emailId) return { success: false, error: 'email_id is required' }
    const userId = target.resolveUserId(sessionKey)
    const supabase = (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
    const { data, error } = await this.repository.findEmail(supabase, {
      emailId,
      columns: 'id, subject',
    })
    if (error) throw error
    if (!data) return { success: false, error: 'Email artifact not found' }
    return {
      success: true,
      status: 'pending_approval',
      ui_blocks: [
        this.buildDeleteConfirmBlock({
          action: 'delete_email',
          entityType: 'email',
          entityId: String(data.id),
          entityName: String(data.subject ?? 'Untitled Email'),
        }),
      ],
    }
  }
}
