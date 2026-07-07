import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { CreditsService } from '../../billing/services/credits.service'
import { GenerateImageSchema, IMAGE_GENERATION_MODELS_PUBLIC } from '../dto'
import { MediaService } from '../services/media.service'

@Controller('media')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MediaImageGenerationController {
  private readonly logger = new Logger(MediaImageGenerationController.name)

  constructor(
    private readonly mediaService: MediaService,
    private readonly creditsService: CreditsService,
  ) {}

  /**
   * POST /api/media/generate
   * Generate an AI image and save to user's media library (non-streaming)
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CreditsGuard)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async generateImage(
    @CurrentUser() user: { id: string; email: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    this.logger.log(`POST /media/generate — user: ${user.id}`)

    const parsed = GenerateImageSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'Invalid request',
        details: parsed.error.issues,
      })
    }

    if ((parsed.data.count ?? 1) > 1) {
      throw new BadRequestException({
        error: 'Batch generation requires POST /api/media/generate-stream',
      })
    }

    const result = await this.mediaService.generateImage(parsed.data, user, scope.orgId)

    if (result.success) {
      await this.creditsService.processImageUsage({
        userId: user.id,
        campaignId: parsed.data.campaign_id,
        orgId: scope.orgId ?? undefined,
        modelName: parsed.data.model,
      })
    }

    return result
  }

  /**
   * GET /api/media/generate/models
   * Models for POST generate / generate-stream (Gemini via Google; GPT Image 2 via OpenRouter).
   */
  @Get('generate/models')
  @HttpCode(HttpStatus.OK)
  getImageGenerationModels() {
    return {
      success: true as const,
      models: IMAGE_GENERATION_MODELS_PUBLIC,
      defaultModel: 'gemini-3.1-flash-image-preview' as const,
      tier: 'free' as const,
    }
  }
}
