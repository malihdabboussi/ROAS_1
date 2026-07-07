import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  Supabase,
  type AssetRef,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { BrainAuthGuard } from '../guards/brain-auth.guard'
import { BrainImportJobsService } from '../services/brain-import-jobs.service'
import { BrainPermissionsService } from '../services/brain-permissions.service'
import { DocumentExtractionService } from '../services/document-extraction.service'

@Controller('brain/sk')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class SkController {
  constructor(
    private readonly importJobs: BrainImportJobsService,
    private readonly documentExtraction: DocumentExtractionService,
    private readonly brainPermissions: BrainPermissionsService,
  ) {}

  @Post('extract-text')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async extractText(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @OrgContext() scope: RequestScope,
    @Body()
    body?: {
      fileUrl?: string
      filename?: string
      mimeType?: string
      asset_ref?: AssetRef
      assetRef?: AssetRef
    },
  ) {
    let buffer = file?.buffer
    let mimeType = file?.mimetype
    let filename = file?.originalname

    const assetRef = body?.asset_ref ?? body?.assetRef
    const assetUrl =
      typeof assetRef === 'object' && assetRef && 'url' in assetRef && typeof assetRef.url === 'string'
        ? assetRef.url
        : null
    const fetchUrl = body?.fileUrl?.trim() || assetUrl

    if (!buffer && fetchUrl) {
      const res = await fetch(fetchUrl)
      if (!res.ok) throw new BadRequestException('Failed to fetch file URL')
      buffer = Buffer.from(await res.arrayBuffer())
      mimeType =
        body?.mimeType?.trim() ||
        (typeof assetRef?.mime_type === 'string' ? assetRef.mime_type : null) ||
        res.headers.get('content-type') ||
        'application/octet-stream'
      filename =
        body?.filename?.trim() ||
        (typeof assetRef?.original_filename === 'string' ? assetRef.original_filename : null) ||
        (typeof assetRef?.name === 'string' ? assetRef.name : null) ||
        'upload'
    }

    if (!buffer || !mimeType || !filename) throw new BadRequestException('No file provided')
    const text = await this.documentExtraction.extractText(buffer, mimeType, filename, {
      userId: user.id,
      orgId: scope.orgId ?? undefined,
      feature: 'brain',
      action: 'document_ocr',
    })
    return { text }
  }

  @Post('ingest')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async ingest(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      text: string
      sourceType: string
      title: string
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
      brainId: string
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string
      mediaMimeType?: string
      mediaBase64?: string
      mediaCaption?: string
      assetId?: string | null
      assetRef?: AssetRef | null
      asset_id?: string | null
      asset_ref?: AssetRef | null
    },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    if (!body.brainId?.trim()) throw new Error('brainId is required')
    await this.brainPermissions.assertCanTrainBrain(supabase, user.id, scope, body.brainId.trim())
    const queued = await this.importJobs.enqueueSkIngest(
      user.id,
      {
        brainId: body.brainId.trim(),
        text: body.text,
        sourceType: body.sourceType,
        title: body.title,
        domain: body.domain,
        mediaType: body.mediaType ?? 'text',
        mediaUrl: body.mediaUrl ?? null,
        mediaMimeType: body.mediaMimeType ?? null,
        mediaBase64: body.mediaBase64 ?? null,
        mediaCaption: body.mediaCaption ?? null,
        assetId: body.assetId ?? body.asset_id ?? null,
        assetRef: body.assetRef ?? body.asset_ref ?? null,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  @Post('ingest-link')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async ingestLink(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      url: string
      sourceType?: string
      title?: string
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
      brainId: string
    },
    @OrgContext() scope: RequestScope,
    @Supabase() supabase: SupabaseClient,
  ) {
    if (!body.url?.trim()) throw new Error('url is required')
    if (!body.brainId?.trim()) throw new Error('brainId is required')
    await this.brainPermissions.assertCanTrainBrain(supabase, user.id, scope, body.brainId.trim())
    const queued = await this.importJobs.enqueueSkLinkIngest(
      user.id,
      {
        brainId: body.brainId.trim(),
        url: body.url.trim(),
        sourceType: body.sourceType?.trim(),
        title: body.title?.trim(),
        domain: body.domain,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }
}
