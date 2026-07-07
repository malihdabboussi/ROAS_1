import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  CurrentUser,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { CreditsGuard } from '../../billing/guards/credits.guard'
import { CreditsService } from '../../billing/services/credits.service'
import {
  GenerateAdCopyInput,
  GenerateAdCopySchema,
} from '../dto/ad-bulk-creator.dto'
import { AdVariationGeneratorService } from '../services/ad-variation-generator.service'

@Controller()
@UseGuards(AuthGuard, ThrottlerGuard, OrgContextGuard, OrgRoleGuard)
export class AdCopyGenerationArtifactsController {
  constructor(
    private readonly adVariationGenerator: AdVariationGeneratorService,
    private readonly creditsService: CreditsService,
  ) {}

  @Post('ad-sets/:adSetId/ads/generate-copy')
  @UseGuards(CreditsGuard)
  @HttpCode(HttpStatus.OK)
  async generateAdCopy(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(GenerateAdCopySchema)) body: GenerateAdCopyInput,
    @OrgContext() scope: RequestScope,
  ) {
    const result = await this.adVariationGenerator.generateAdCopy({
      imageUrl: body.imageUrl,
      context: body.context,
      count: body.count,
    })

    if (result.usageMetadata) {
      await this.creditsService.processDirectTextUsage({
        userId: user.id,
        orgId: scope.orgId ?? undefined,
        feature: 'ads',
        action: 'generate_copy',
        modelName: 'gemini-3.5-flash',
        usage: {
          input: Math.max(
            0,
            result.usageMetadata.promptTokenCount - result.usageMetadata.cachedContentTokenCount,
          ),
          output: result.usageMetadata.candidatesTokenCount,
          cacheRead: result.usageMetadata.cachedContentTokenCount,
          cacheWrite: 0,
          totalTokens: result.usageMetadata.totalTokenCount,
        },
      })
    }

    return { variations: result.variations }
  }
}
