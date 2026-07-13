import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CreateFormSchema,
  FormSchemaPayload,
  FormSettingsPayload,
  FormVisibilitySchema,
} from '@vibey/api-shared'
import type { RequestUploadAttachment } from '../../shared/services/request-context.service'
import {
  ArtifactFormsRepository,
  type ArtifactFormRow,
} from '../repositories/artifact-forms.repository'
import {
  parseConversationIdFromSessionKey,
  type ArtifactActionHandler,
} from './artifact-action.registry'

type FormAssetPlacement = 'cover' | 'icon' | 'end_page_icon'
type ResolvedFormAsset = {
  fileUrl: string
  mediaAssetId: string | null
  filename: string | null
  mimeType: string | null
  source: 'media_asset' | 'file_url' | 'current_upload'
}

const FORM_ASSET_SETTING_KEYS = {
  cover: 'cover_url',
  icon: 'icon_image_url',
  end_page_icon: 'end_page_icon_image_url',
} satisfies Record<FormAssetPlacement, string>

const ROAS_FUNNELS_BASE_DOMAIN = 'sites.roas.io'

@Injectable()
export class ArtifactFormsService {
  constructor(
    private readonly repository: ArtifactFormsRepository = new ArtifactFormsRepository(),
  ) {}

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      list_forms: (data, sessionKey) => this.listForms(target, data, sessionKey),
      get_form: (data, sessionKey) => this.getForm(target, data, sessionKey),
      create_form: (data, sessionKey) => this.createForm(target, data, sessionKey),
      update_form: (data, sessionKey) => this.updateForm(target, data, sessionKey),
      attach_form_asset: (data, sessionKey) => this.attachFormAsset(target, data, sessionKey),
      publish_form: (data, sessionKey) => this.publishForm(target, data, sessionKey),
      unpublish_form: (data, sessionKey) => this.unpublishForm(target, data, sessionKey),
      list_form_responses: (data, sessionKey) => this.listFormResponses(target, data, sessionKey),
    }
  }

  private resolveUserId(target: Record<string, any>, sessionKey?: string): string {
    if (typeof target.resolveUserId !== 'function') {
      throw new Error('Cannot resolve user for form action')
    }
    return String(target.resolveUserId(sessionKey))
  }

  private resolveOrgId(target: Record<string, any>, sessionKey?: string): string | null {
    return ((target.resolveOrgId?.(sessionKey) as string | null | undefined) ?? null) || null
  }

  private async getUserClient(
    target: Record<string, any>,
    userId: string,
    sessionKey?: string,
  ): Promise<SupabaseClient> {
    if (typeof target.getUserClient !== 'function') {
      throw new Error('User client unavailable for form action')
    }
    return (await target.getUserClient(userId, sessionKey as string)) as SupabaseClient
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  private recordValue(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }

  private parseLimit(value: unknown, fallback = 50, max = 100): number {
    const parsed = Number(value ?? fallback)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(Math.max(Math.trunc(parsed), 1), max)
  }

  private normalizePlacement(value: unknown): FormAssetPlacement | null {
    const raw = this.stringValue(value)?.toLowerCase()
    if (!raw) return null
    if (raw === 'cover' || raw === 'hero') return 'cover'
    if (raw === 'icon' || raw === 'logo') return 'icon'
    if (raw === 'end_page_icon' || raw === 'thank_you' || raw === 'thank_you_icon') {
      return 'end_page_icon'
    }
    return null
  }

  private isImageUpload(attachment: RequestUploadAttachment): boolean {
    if (attachment.type === 'image') return true
    if (attachment.mimeType?.toLowerCase().startsWith('image/')) return true
    const value = `${attachment.filename} ${attachment.fileUrl}`.toLowerCase()
    return /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/.test(value)
  }

  private getCurrentUploadedImage(
    target: Record<string, any>,
    sessionKey?: string,
  ): { attachment: RequestUploadAttachment | null; error?: string } {
    const conversationId = parseConversationIdFromSessionKey(sessionKey)
    if (!conversationId || typeof target.requestContext?.getUploadedAttachments !== 'function') {
      return { attachment: null }
    }
    const uploads = target.requestContext.getUploadedAttachments(
      conversationId,
    ) as RequestUploadAttachment[]
    const images = uploads.filter((attachment) => this.isImageUpload(attachment))
    if (images.length === 0) return { attachment: null }
    if (images.length > 1) {
      return {
        attachment: null,
        error:
          'Multiple uploaded images found. Pass media_asset_id or file_url for the image to attach.',
      }
    }
    return { attachment: images[0] ?? null }
  }

  private async resolveFormAsset(
    target: Record<string, any>,
    supabase: SupabaseClient,
    data: Record<string, unknown>,
    userId: string,
    orgId: string | null,
    sessionKey?: string,
  ): Promise<{ asset: ResolvedFormAsset | null; error?: string }> {
    const directUrl = this.stringValue(data.file_url) ?? this.stringValue(data.image_url)
    const mediaAssetId = this.stringValue(data.media_asset_id)
    if (directUrl) {
      return {
        asset: {
          fileUrl: directUrl,
          mediaAssetId,
          filename: null,
          mimeType: null,
          source: 'file_url',
        },
      }
    }

    if (mediaAssetId) {
      const { data: mediaAsset, error } = await this.repository.findMediaAsset(supabase, {
        mediaAssetId,
        userId,
        orgId,
      })
      if (error) return { asset: null, error: error.message }
      if (!mediaAsset) return { asset: null, error: 'Media asset not found' }
      const mimeType = this.stringValue(mediaAsset['mime_type'])
      if (mimeType && !mimeType.toLowerCase().startsWith('image/')) {
        return { asset: null, error: 'Media asset must be an image' }
      }
      const publicUrl = this.stringValue(mediaAsset['public_url'])
      if (publicUrl) {
        return {
          asset: {
            fileUrl: publicUrl,
            mediaAssetId,
            filename:
              this.stringValue(mediaAsset['original_filename']) ??
              this.stringValue(mediaAsset['name']),
            mimeType,
            source: 'media_asset',
          },
        }
      }
      const bucketName = this.stringValue(mediaAsset['bucket_name'])
      const filePath = this.stringValue(mediaAsset['file_path'])
      if (!bucketName || !filePath) {
        return { asset: null, error: 'Media asset has no usable URL' }
      }
      const { data: signedUrl, error: signedUrlError } =
        await this.repository.createStorageSignedUrl(supabase, {
          bucketName,
          filePath,
          ttlSeconds: 365 * 24 * 60 * 60,
        })
      if (signedUrlError) return { asset: null, error: signedUrlError.message }
      const fileUrl = this.stringValue(signedUrl?.signedUrl)
      if (!fileUrl) return { asset: null, error: 'Media asset has no usable URL' }
      return {
        asset: {
          fileUrl,
          mediaAssetId,
          filename:
            this.stringValue(mediaAsset['original_filename']) ??
            this.stringValue(mediaAsset['name']),
          mimeType,
          source: 'media_asset',
        },
      }
    }

    const uploaded = this.getCurrentUploadedImage(target, sessionKey)
    if (uploaded.error) return { asset: null, error: uploaded.error }
    if (!uploaded.attachment) {
      return {
        asset: null,
        error: 'No uploaded image found. Pass file_url or media_asset_id for attach_form_asset.',
      }
    }
    return {
      asset: {
        fileUrl: uploaded.attachment.fileUrl,
        mediaAssetId: uploaded.attachment.mediaAssetId ?? null,
        filename: uploaded.attachment.filename,
        mimeType: uploaded.attachment.mimeType ?? null,
        source: 'current_upload',
      },
    }
  }

  private async resolveCampaignId(
    target: Record<string, any>,
    supabase: SupabaseClient,
    data: Record<string, unknown>,
    userId: string,
    sessionKey?: string,
  ): Promise<string | null> {
    const supplied = this.stringValue(data.campaign_id)
    if (supplied) return supplied
    if (typeof target.resolveCampaignId !== 'function') return null
    try {
      const resolved = await target.resolveCampaignId(supabase, data, userId, sessionKey)
      return this.stringValue(resolved)
    } catch {
      return null
    }
  }

  private async loadForm(
    supabase: SupabaseClient,
    formId: string,
    orgId: string | null,
  ): Promise<ArtifactFormRow | null> {
    const { data, error } = await this.repository.loadForm(supabase, { formId, orgId })
    if (error) throw new Error(`DB error: ${error.message}`)
    return data ?? null
  }

  private async ensureSlug(supabase: SupabaseClient, form: ArtifactFormRow): Promise<string> {
    const existing = this.stringValue(form.slug)
    if (existing) return existing
    const base = String(form.name ?? 'form')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60)
    let slug = base || 'form'
    const { data, error } = await this.repository.findSlugConflict(supabase, {
      campaignId: String(form.campaign_id),
      slug,
      formId: String(form.id),
    })
    if (error) throw new Error(`DB error: ${error.message}`)
    if (data) slug = `${slug}-${randomUUID().slice(0, 8)}`
    return slug
  }

  private buildPublishedUrl(form: ArtifactFormRow, slug: string, userId: string): string {
    const existing = this.stringValue(form.published_url)
    if (existing) return existing
    const baseDomain = process.env.CLOUDFLARE_BASE_DOMAIN || ROAS_FUNNELS_BASE_DOMAIN
    const subdomain = `user-${userId.slice(0, 8)}.${baseDomain}`
    const tokenOrSlug = this.stringValue(form.share_token) ?? slug
    return `https://${subdomain}/form/${tokenOrSlug}`
  }

  private mergeRecords(
    base: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...base }
    for (const [key, value] of Object.entries(patch)) {
      const current = merged[key]
      if (
        current &&
        value &&
        typeof current === 'object' &&
        typeof value === 'object' &&
        !Array.isArray(current) &&
        !Array.isArray(value)
      ) {
        merged[key] = this.mergeRecords(
          current as Record<string, unknown>,
          value as Record<string, unknown>,
        )
      } else {
        merged[key] = value
      }
    }
    return merged
  }

  private async listForms(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = this.resolveUserId(target, sessionKey)
    const orgId = this.resolveOrgId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const campaignId = await this.resolveCampaignId(target, supabase, data, userId, sessionKey)
    if (!campaignId) return { success: false, error: 'campaign_id is required for list_forms' }

    const { data: forms, error } = await this.repository.listForms(supabase, {
      campaignId,
      orgId,
      includeArchived: data.include_archived === true || data.include_archived === 'true',
      hasSpaceIdFilter: Object.prototype.hasOwnProperty.call(data, 'space_id'),
      spaceId: this.stringValue(data.space_id),
      limit: this.parseLimit(data.limit),
    })
    if (error) return { success: false, error: error.message }
    return { success: true, forms: forms ?? [] }
  }

  private async getForm(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const formId = this.stringValue(data.form_id)
    if (!formId) return { success: false, error: 'form_id is required for get_form' }
    const userId = this.resolveUserId(target, sessionKey)
    const orgId = this.resolveOrgId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const form = await this.loadForm(supabase, formId, orgId)
    if (!form) return { success: false, error: 'Form not found' }
    return { success: true, form }
  }

  private async createForm(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const userId = this.resolveUserId(target, sessionKey)
    const orgId = this.resolveOrgId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const campaignId = await this.resolveCampaignId(target, supabase, data, userId, sessionKey)
    if (!campaignId) return { success: false, error: 'campaign_id is required for create_form' }

    const parsed = CreateFormSchema.safeParse({ ...data, campaign_id: campaignId })
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

    const { data: form, error } = await this.repository.createForm(supabase, {
      user_id: userId,
      org_id: orgId,
      campaign_id: parsed.data.campaign_id,
      space_id: parsed.data.space_id ?? null,
      name: parsed.data.name,
      ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}),
      schema: parsed.data.schema ?? { questions: [] },
      settings: parsed.data.settings ?? {},
    })
    if (error) return { success: false, error: error.message }
    return { success: true, form, form_id: (form as ArtifactFormRow).id }
  }

  private async updateForm(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const formId = this.stringValue(data.form_id)
    if (!formId) return { success: false, error: 'form_id is required for update_form' }
    const userId = this.resolveUserId(target, sessionKey)
    const orgId = this.resolveOrgId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const current = await this.loadForm(supabase, formId, orgId)
    if (!current) return { success: false, error: 'Form not found' }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const name = this.stringValue(data.name)
    if (name) patch.name = name
    if (Object.prototype.hasOwnProperty.call(data, 'space_id')) {
      patch.space_id = this.stringValue(data.space_id)
    }
    if (data.visibility !== undefined) {
      const visibility = FormVisibilitySchema.safeParse(data.visibility)
      if (!visibility.success) return { success: false, error: 'visibility is invalid' }
      patch.visibility = visibility.data
    }
    if (data.schema !== undefined) {
      const schema = FormSchemaPayload.safeParse(data.schema)
      if (!schema.success) return { success: false, error: schema.error.issues[0]?.message }
      patch.schema = schema.data
    }
    if (data.settings !== undefined) {
      const settings = FormSettingsPayload.safeParse(data.settings)
      if (!settings.success) return { success: false, error: settings.error.issues[0]?.message }
      patch.settings = settings.data
    }
    if (data.settings_patch !== undefined) {
      const settingsPatch = FormSettingsPayload.safeParse(data.settings_patch)
      if (!settingsPatch.success) {
        return { success: false, error: settingsPatch.error.issues[0]?.message }
      }
      const base = patch.settings
        ? this.recordValue(patch.settings)
        : this.recordValue(current.settings)
      patch.settings = this.mergeRecords(base, settingsPatch.data)
    }
    if (Object.keys(patch).length === 1) {
      return { success: false, error: 'At least one update field is required' }
    }

    const { data: form, error } = await this.repository.updateForm(supabase, { formId, patch })
    if (error) return { success: false, error: error.message }
    return { success: true, form }
  }

  private async attachFormAsset(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const formId = this.stringValue(data.form_id)
    if (!formId) return { success: false, error: 'form_id is required for attach_form_asset' }
    const placement = this.normalizePlacement(data.placement)
    if (!placement) {
      return {
        success: false,
        error: 'placement must be one of: cover, icon, end_page_icon',
      }
    }

    const userId = this.resolveUserId(target, sessionKey)
    const orgId = this.resolveOrgId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const current = await this.loadForm(supabase, formId, orgId)
    if (!current) return { success: false, error: 'Form not found' }

    const resolved = await this.resolveFormAsset(target, supabase, data, userId, orgId, sessionKey)
    if (resolved.error || !resolved.asset) {
      return { success: false, error: resolved.error ?? 'Image asset could not be resolved' }
    }

    const settingsPatch: Record<string, unknown> = {
      [FORM_ASSET_SETTING_KEYS[placement]]: resolved.asset.fileUrl,
    }
    if (placement === 'cover' && data.focal_y !== undefined) {
      const focalY = Number(data.focal_y)
      if (!Number.isFinite(focalY) || focalY < 0 || focalY > 100) {
        return { success: false, error: 'focal_y must be a number from 0 to 100' }
      }
      settingsPatch.cover_focal_y = focalY
    }

    const settings = this.mergeRecords(this.recordValue(current.settings), settingsPatch)
    const { data: form, error } = await this.repository.updateForm(supabase, {
      formId,
      patch: { settings, updated_at: new Date().toISOString() },
    })
    if (error) return { success: false, error: error.message }
    return {
      success: true,
      form,
      placement,
      file_url: resolved.asset.fileUrl,
      media_asset_id: resolved.asset.mediaAssetId,
      source: resolved.asset.source,
    }
  }

  private async publishForm(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const formId = this.stringValue(data.form_id)
    if (!formId) return { success: false, error: 'form_id is required for publish_form' }
    const userId = this.resolveUserId(target, sessionKey)
    const orgId = this.resolveOrgId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const current = await this.loadForm(supabase, formId, orgId)
    if (!current) return { success: false, error: 'Form not found' }

    const slug = await this.ensureSlug(supabase, current)
    const ownerUserId = this.stringValue(current.user_id) ?? userId
    const publishedUrl = this.buildPublishedUrl(current, slug, ownerUserId)
    const { data: form, error } = await this.repository.updateForm(supabase, {
      formId,
      patch: {
        slug,
        status: 'published',
        published_url: publishedUrl,
        updated_at: new Date().toISOString(),
      },
    })
    if (error) return { success: false, error: error.message }
    return { success: true, status: 'published', slug, url: publishedUrl, form }
  }

  private async unpublishForm(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const formId = this.stringValue(data.form_id)
    if (!formId) return { success: false, error: 'form_id is required for unpublish_form' }
    const userId = this.resolveUserId(target, sessionKey)
    const orgId = this.resolveOrgId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const current = await this.loadForm(supabase, formId, orgId)
    if (!current) return { success: false, error: 'Form not found' }

    const { data: form, error } = await this.repository.updateForm(supabase, {
      formId,
      patch: { status: 'draft', updated_at: new Date().toISOString() },
    })
    if (error) return { success: false, error: error.message }
    return { success: true, status: 'draft', form }
  }

  private async listFormResponses(
    target: Record<string, any>,
    data: Record<string, unknown>,
    sessionKey?: string,
  ) {
    const formId = this.stringValue(data.form_id)
    if (!formId) return { success: false, error: 'form_id is required for list_form_responses' }
    const userId = this.resolveUserId(target, sessionKey)
    const orgId = this.resolveOrgId(target, sessionKey)
    const supabase = await this.getUserClient(target, userId, sessionKey)
    const form = await this.loadForm(supabase, formId, orgId)
    if (!form) return { success: false, error: 'Form not found' }

    const { data: responses, error } = await this.repository.listFormResponses(supabase, {
      formId,
      limit: this.parseLimit(data.limit),
    })
    if (error) return { success: false, error: error.message }
    return { success: true, form_id: formId, responses: responses ?? [] }
  }
}
