import {
  BadRequestException,
  Body,
  Controller,
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
import { GenerateAdConceptsSchema } from '../dto/ad-concept.dto'
import { AdConceptGenerationService } from '../services/ad-concept-generation.service'

@Controller('media')
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class MediaAdConceptsController {
  private readonly logger = new Logger(MediaAdConceptsController.name)

  constructor(private readonly adConceptGeneration: AdConceptGenerationService) {}

  /**
   * POST /api/media/generate-ad-concepts
   * Visual-contrast ad concept briefs (4 concepts) via Claude Opus on OpenRouter.
   */
  @Post('generate-ad-concepts')
  @UseGuards(CreditsGuard)
  @Throttle({ default: { ttl: 60000, limit: 8 } })
  @HttpCode(HttpStatus.OK)
  async generateAdConcepts(
    @CurrentUser() user: { id: string },
    @OrgContext() scope: RequestScope,
    @Body() body: unknown,
  ) {
    this.logger.log(`POST /media/generate-ad-concepts — user: ${user.id}`)
    const parsed = GenerateAdConceptsSchema.safeParse(body)
    if (!parsed.success) {
      throw new BadRequestException({
        error: 'Invalid request',
        details: parsed.error.issues,
      })
    }
    const result = await this.adConceptGeneration.generateConceptsText(parsed.data, {
      userId: user.id,
      orgId: scope.orgId ?? null,
    })

    return { success: true, text: result.text, model: 'anthropic/claude-opus-4.6' }
  }
}
