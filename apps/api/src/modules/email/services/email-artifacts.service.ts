import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateCampaignEmailArtifactDto,
  CreateEmailArtifactDto,
  UpdateEmailArtifactDto,
} from '../dto/email-artifacts.dto'
import { EmailArtifactsRepository } from '../repositories/email-artifacts.repository'

@Injectable()
export class EmailArtifactsService {
  constructor(
    private readonly emailArtifacts: EmailArtifactsRepository = new EmailArtifactsRepository(),
  ) {}

  async create(
    supabase: SupabaseClient,
    userId: string,
    orgId: string | null,
    dto: CreateEmailArtifactDto,
  ) {
    const task = await this.emailArtifacts.findSourceTask(
      supabase,
      dto.source_item_id,
      dto.space_id,
    )
    if (!task) throw new NotFoundException('Source task not found')

    let campaignId = dto.campaign_id ?? null
    if (!campaignId) {
      campaignId = await this.emailArtifacts.findSpaceCampaignId(supabase, dto.space_id)
    }

    const email = await this.emailArtifacts.createEmail(supabase, {
      subject: dto.subject,
      body: dto.body,
      status: 'draft',
      campaign_id: campaignId,
      space_id: dto.space_id,
      source_item_id: dto.source_item_id,
      user_id: userId,
      org_id: orgId,
      created_by: userId,
    })

    await this.linkToSourceTask(supabase, task as Record<string, unknown>, String(email.id))
    return email
  }

  async createForCampaign(
    supabase: SupabaseClient,
    userId: string,
    campaignId: string,
    dto: CreateCampaignEmailArtifactDto,
    orgId: string | null,
  ) {
    const space = await this.emailArtifacts.findCampaignSpace(supabase, dto.space_id)
    if (!space) throw new NotFoundException('Space not found')
    if (space.campaign_id !== campaignId) {
      throw new BadRequestException('Space is not linked to this campaign')
    }

    return this.emailArtifacts.createEmail(supabase, {
      subject: dto.subject ?? 'Untitled Email',
      body: '',
      status: 'draft',
      campaign_id: campaignId,
      space_id: dto.space_id,
      user_id: userId,
      org_id: orgId,
      created_by: userId,
    })
  }

  async listByCampaign(supabase: SupabaseClient, campaignId: string, spaceId?: string) {
    return this.emailArtifacts.listByCampaign(supabase, campaignId, spaceId)
  }

  async getById(supabase: SupabaseClient, id: string) {
    const email = await this.emailArtifacts.findById(supabase, id)
    if (!email) throw new NotFoundException('Email artifact not found')
    return email
  }

  async update(supabase: SupabaseClient, id: string, dto: UpdateEmailArtifactDto) {
    await this.getById(supabase, id)
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (dto.subject !== undefined) updates.subject = dto.subject
    if (dto.body !== undefined) updates.body = dto.body
    if (dto.status !== undefined) updates.status = dto.status
    return this.emailArtifacts.update(supabase, id, updates)
  }

  async delete(supabase: SupabaseClient, id: string) {
    const email = await this.getById(supabase, id)
    await this.emailArtifacts.delete(supabase, id)

    await this.unlinkFromSourceTask(supabase, email)
    return { success: true, id }
  }

  private async unlinkFromSourceTask(supabase: SupabaseClient, email: Record<string, unknown>) {
    const sourceItemId = typeof email.source_item_id === 'string' ? email.source_item_id : ''
    const spaceId = typeof email.space_id === 'string' ? email.space_id : ''
    if (!sourceItemId || !spaceId) return

    const task = await this.emailArtifacts.findTaskCustomData(supabase, sourceItemId, spaceId)
    const customData =
      task?.custom_data && typeof task.custom_data === 'object' && !Array.isArray(task.custom_data)
        ? (task.custom_data as Record<string, unknown>)
        : null
    if (!customData) return

    const emailId = String(email.id)
    const nextCustomData = { ...customData }
    if (
      nextCustomData.artifact &&
      typeof nextCustomData.artifact === 'object' &&
      !Array.isArray(nextCustomData.artifact)
    ) {
      const artifact = nextCustomData.artifact as Record<string, unknown>
      if (artifact.kind === 'email' && artifact.id === emailId) {
        delete nextCustomData.artifact
      }
    }
    if (Array.isArray(nextCustomData.artifacts)) {
      nextCustomData.artifacts = nextCustomData.artifacts.filter((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return true
        const artifact = entry as Record<string, unknown>
        return !(artifact.kind === 'email' && artifact.id === emailId)
      })
    }

    await this.emailArtifacts.updateTaskCustomData(supabase, sourceItemId, spaceId, nextCustomData)
  }

  private async linkToSourceTask(
    supabase: SupabaseClient,
    task: Record<string, unknown>,
    emailId: string,
  ) {
    const customData =
      task.custom_data && typeof task.custom_data === 'object' && !Array.isArray(task.custom_data)
        ? (task.custom_data as Record<string, unknown>)
        : {}
    const existingArtifacts = Array.isArray(customData.artifacts)
      ? (customData.artifacts as unknown[])
      : []
    const nextArtifacts = [
      ...existingArtifacts.filter((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return true
        const artifact = entry as Record<string, unknown>
        return !(artifact.kind === 'email' && artifact.id === emailId)
      }),
      { kind: 'email', id: emailId },
    ]
    await this.emailArtifacts.updateTaskCustomData(supabase, task.id as string, task.space_id as string, {
      ...customData,
      artifact: { kind: 'email', id: emailId },
      artifacts: nextArtifacts,
    })
  }
}
