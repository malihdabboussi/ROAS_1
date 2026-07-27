import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
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
import { ConversationProcessingService } from '../services/conversation-processing.service'
import { MemoriesService } from '../services/memories.service'
import type { CreateMemoryDto, ProcessConversationDto, SearchMemoryDto } from '../types/brain.types'
import { assertBrainFeatureAllowed } from './brain-controller-access'

/**
 * Memories Controller (Layer 1)
 *
 * Thin request handler — delegates ALL business logic to MemoriesService.
 * Uses BrainAuthGuard for dual auth (JWT + agent token).
 * User brain is free for all authenticated users — no BrainPlanGuard.
 */
@Controller('brain')
@UseGuards(BrainAuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class MemoriesController {
  constructor(
    private readonly memoriesService: MemoriesService,
    private readonly importJobs: BrainImportJobsService,
    private readonly conversationProcessing: ConversationProcessingService,
  ) {}

  // ── Create & Search ────────────────────────────────────────────────────

  @Post('remember')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async remember(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: CreateMemoryDto & { asset_id?: string | null; asset_ref?: AssetRef | null },
    @OrgContext() scope: RequestScope,
  ) {
    assertBrainFeatureAllowed(scope)
    const content = body.content?.trim()
    if (!content) throw new Error('content is required')
    const sourceType = (body.source_type ?? 'document') as 'document' | 'dropbox' | 'google_drive'
    if (!['document', 'dropbox', 'google_drive'].includes(sourceType)) {
      throw new Error('source_type is invalid')
    }
    const queued = await this.importJobs.enqueueDocumentRemember(
      user.id,
      {
        content,
        sourceType,
        sourceId: body.source_id ?? null,
        sourceTitle: body.source_title ?? null,
        mediaType: body.media_type ?? 'text',
        mediaUrl: body.media_url ?? null,
        mediaMimeType: body.media_mime_type ?? null,
        mediaBase64: body.media_base64 ?? null,
        mediaCaption: body.media_caption ?? null,
        assetId: body.asset_id ?? null,
        assetRef: body.asset_ref ?? null,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  async search(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @Body() body: SearchMemoryDto & { query_embedding?: number[] },
    @OrgContext() scope: RequestScope,
  ) {
    assertBrainFeatureAllowed(scope)
    return this.memoriesService.searchMemories(
      supabase,
      { ...body, user_id: user.id, org_id: scope.orgId },
      scope.orgId,
    )
  }

  @Post('remember-link')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(CreditsGuard)
  async rememberLink(
    @CurrentUser() user: { id: string; email: string },
    @Body() body: { url: string; title?: string },
    @OrgContext() scope: RequestScope,
  ) {
    assertBrainFeatureAllowed(scope)
    if (!body.url?.trim()) throw new Error('url is required')
    const queued = await this.importJobs.enqueueUserLinkImport(
      user.id,
      {
        url: body.url.trim(),
        title: body.title?.trim() || null,
      },
      scope.orgId,
    )
    return { success: true, ...queued }
  }

  // ── Conversation Processing ──────────────────────────────────────────

  @Post('process/conversation')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  async processConversation(
    @Supabase() supabase: SupabaseClient,
    @CurrentUser() user: { id: string; email: string },
    @Body() body: ProcessConversationDto,
    @OrgContext() scope: RequestScope,
  ) {
    assertBrainFeatureAllowed(scope)
    return this.conversationProcessing.processConversation(supabase, {
      ...body,
      owner_id: body.owner_id ?? user.id,
      org_id: scope.orgId,
    })
  }
}
