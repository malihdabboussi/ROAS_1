import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import { SupabaseServiceClient } from '@vibey/api-shared'
import { InternalAuthGuard } from '../../funnels/guards/internal-auth.guard'
import { CampaignsService } from '../services/campaigns.service'

@Controller('internal/campaign-knowledge')
@UseGuards(InternalAuthGuard)
export class InternalCampaignKnowledgeController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly serviceClient: SupabaseServiceClient,
  ) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  async ingest(
    @Body()
    body: {
      user_id?: string
      campaign_id?: string
      title?: string
      content?: string
      node_type?: 'document' | 'user_upload' | 'url_import'
      domain?: 'strategy' | 'marketing' | 'finance' | 'operations' | 'creative' | 'general'
      sourceType?: 'upload' | 'drive' | 'dropbox'
      mediaType?: 'text' | 'image' | 'audio' | 'video' | 'pdf' | 'multimodal'
      mediaUrl?: string | null
      mediaMimeType?: string | null
      mediaBase64?: string | null
      mediaCaption?: string | null
    },
  ) {
    const userId = body.user_id?.trim()
    if (!userId) throw new BadRequestException('user_id is required')
    const campaignId = body.campaign_id?.trim()
    if (!campaignId) throw new BadRequestException('campaign_id is required')
    if (!body.title?.trim()) throw new BadRequestException('title is required')
    if (!body.content?.trim()) throw new BadRequestException('content is required')

    const VALID_SOURCE_TYPES = [
      'mission',
      'upload',
      'drive',
      'dropbox',
      'url',
      'auto_sync',
    ] as const
    type ValidSourceType = (typeof VALID_SOURCE_TYPES)[number]
    const rawSourceType = body.sourceType as string | undefined
    const sourceType: ValidSourceType =
      rawSourceType && (VALID_SOURCE_TYPES as readonly string[]).includes(rawSourceType)
        ? (rawSourceType as ValidSourceType)
        : 'upload'

    const result = await this.campaignsService.createManualKnowledgeNode(
      this.serviceClient.client,
      userId,
      campaignId,
      {
        title: body.title!,
        content: body.content!,
        node_type: body.node_type,
        domain: body.domain,
        sourceType,
        mediaType: body.mediaType,
        mediaUrl: body.mediaUrl,
        mediaMimeType: body.mediaMimeType,
        mediaBase64: body.mediaBase64,
        mediaCaption: body.mediaCaption,
      },
    )

    return { success: true, ...result }
  }
}
