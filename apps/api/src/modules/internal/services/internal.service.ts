import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildStorageAssetRef } from '@vibey/api-shared'
import { InternalRepository } from '../repositories/internal.repository'

/**
 * Internal Service
 *
 * Business logic for agent-to-backend write operations.
 * Uses service-role Supabase client (bypasses RLS).
 */
@Injectable()
export class InternalService {
  constructor(private readonly repository: InternalRepository) {}

  // ─── Offers ───

  async createOffer(data: { user_id: string; campaign_id: string; name: string }) {
    const supabase = this.repository.createServiceClient()

    // Check if an offer with the same name already exists in this campaign.
    // This prevents duplicates when the agent re-does a step after user feedback.
    if (data.campaign_id) {
      const { data: existing } = await this.repository.findOfferByCampaignName(
        supabase,
        data.campaign_id,
        data.name,
      )

      if (existing) {
        return existing
      }
    }

    const orgId = await this.resolveOrgIdFromCampaign(supabase, data.campaign_id)

    const { data: offer, error } = await this.repository.insertOffer(supabase, {
      user_id: data.user_id,
      campaign_id: data.campaign_id,
      name: data.name,
      processing_status: 'step_1_pending',
      org_id: orgId,
    })

    if (error) {
      throw new BadRequestException(`Failed to create offer: ${error.message}`)
    }

    return offer
  }

  async updateOfferStep(
    offerId: string,
    data: { step_number: number; step_name: string; data: unknown },
  ) {
    const supabase = this.repository.createServiceClient()

    const stepNum = data.step_number
    if (!Number.isInteger(stepNum) || stepNum < 1 || stepNum > 6) {
      throw new BadRequestException('step_number must be an integer between 1 and 6')
    }

    const stepColumn = `step${stepNum}_data`
    const stepData = data.data

    const { data: offer, error } = await this.repository.updateOfferStep(supabase, offerId, {
      [stepColumn]: stepData,
      processing_status: `step_${stepNum}_complete`,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      throw new NotFoundException(`Failed to update offer: ${error.message}`)
    }

    return offer
  }

  // ─── Documents ───

  async createDocument(data: {
    user_id: string
    conversation_id: string
    campaign_id?: string
    document_type: string
    title: string
    content: unknown
    resource_id?: string
  }) {
    const validTypes = ['offer', 'avatar', 'funnel', 'presentation', 'sequence', 'email']
    if (!validTypes.includes(data.document_type)) {
      throw new BadRequestException(`document_type must be one of: ${validTypes.join(', ')}`)
    }

    const supabase = this.repository.createServiceClient()

    // Upsert: if a document with the same title exists in this campaign, update it.
    // Prevents duplicates when agent re-runs or revises.
    if (data.campaign_id) {
      const { data: existing } = await this.repository.findDocumentByCampaignTitle(
        supabase,
        data.campaign_id,
        data.title,
      )

      if (existing) {
        const { data: updated, error: updateErr } = await this.repository.updateDocument(
          supabase,
          existing.id,
          {
            content: data.content,
            conversation_id: data.conversation_id,
            updated_at: new Date().toISOString(),
          },
        )

        if (updateErr) {
          throw new BadRequestException(`Failed to update document: ${updateErr.message}`)
        }
        return updated
      }
    }

    const insertData: Record<string, unknown> = {
      conversation_id: data.conversation_id,
      document_type: data.document_type,
      title: data.title,
      content: data.content,
    }
    if (data.campaign_id) insertData.campaign_id = data.campaign_id
    if (data.resource_id) insertData.resource_id = data.resource_id

    const { data: doc, error } = await this.repository.insertDocument(supabase, insertData)

    if (error) {
      throw new BadRequestException(`Failed to create document: ${error.message}`)
    }

    return doc
  }

  // ─── Sequences ───

  async createSequence(data: {
    user_id: string
    campaign_id?: string
    offer_id?: string
    name: string
    trigger?: unknown
    config?: unknown
  }) {
    const supabase = this.repository.createServiceClient()

    const orgId = data.campaign_id
      ? await this.resolveOrgIdFromCampaign(supabase, data.campaign_id)
      : null

    const insertData: Record<string, unknown> = {
      user_id: data.user_id,
      name: data.name,
      status: 'draft',
      org_id: orgId,
    }
    if (data.campaign_id) insertData.campaign_id = data.campaign_id
    if (data.offer_id) insertData.offer_id = data.offer_id
    if (data.trigger) insertData.trigger = data.trigger
    if (data.config) insertData.config = data.config

    const { data: sequence, error } = await this.repository.insertSequence(supabase, insertData)

    if (error) {
      throw new BadRequestException(`Failed to create sequence: ${error.message}`)
    }

    return sequence
  }

  async createSequenceEmail(
    sequenceId: string,
    data: {
      subject: string
      body: string
      delay_hours: number
      order_index: number
    },
  ) {
    const supabase = this.repository.createServiceClient()

    const { data: email, error } = await this.repository.insertSequenceEmail(supabase, {
      sequence_id: sequenceId,
      subject: data.subject,
      body: data.body,
      delay_hours: data.delay_hours,
      order_index: data.order_index,
      status: 'draft',
    })

    if (error) {
      throw new BadRequestException(`Failed to create sequence email: ${error.message}`)
    }

    return email
  }

  // ─── Storage ───

  async uploadFile(data: {
    user_id: string
    campaign_id: string
    file_path: string
    content: string
    content_type: string
  }) {
    const supabase = this.repository.createServiceClient()

    const buffer = Buffer.from(data.content, 'base64')
    const storagePath = `${data.user_id}/${data.campaign_id}/${data.file_path}`

    const { error } = await this.repository.uploadCampaignFile(
      supabase,
      storagePath,
      buffer,
      data.content_type,
    )

    if (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`)
    }

    const {
      data: { publicUrl },
    } = this.repository.getCampaignFilePublicUrl(supabase, storagePath)

    const fileName = data.file_path.split('/').pop() || data.file_path
    return {
      asset_ref: buildStorageAssetRef({
        bucket_name: 'campaigns',
        file_path: storagePath,
        url: publicUrl,
        mime_type: data.content_type,
        name: fileName,
        original_filename: fileName,
        file_size: buffer.length,
        user_id: data.user_id,
        org_id: null,
        source: 'internal_upload',
        source_surface: 'internal_storage',
        metadata: { campaign_id: data.campaign_id },
      }),
      url: publicUrl,
      path: storagePath,
    }
  }

  // ─── Helpers ───

  private async resolveOrgIdFromCampaign(
    supabase: SupabaseClient,
    campaignId: string,
  ): Promise<string | null> {
    if (!campaignId) return null
    const { data } = await this.repository.getCampaignOrgId(supabase, campaignId)
    return (data?.org_id as string) ?? null
  }
}
