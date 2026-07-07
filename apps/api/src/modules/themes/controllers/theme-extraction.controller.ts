import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthGuard,
  OrgContext,
  OrgContextGuard,
  OrgRoleGuard,
  ZodValidationPipe,
  type RequestScope,
} from '@vibey/api-shared'
import { THEME_ERRORS } from '../config/theme-errors.config'
import { ExtractWebsiteSchema, type ExtractWebsiteInput } from '../dto/theme.dto'
import { ThemeExtractionService } from '../services/theme-extraction.service'

@Controller('themes/extract')
@UseGuards(AuthGuard, OrgContextGuard, OrgRoleGuard, ThrottlerGuard)
export class ThemeExtractionController {
  private readonly logger = new Logger(ThemeExtractionController.name)

  constructor(private readonly extractionService: ThemeExtractionService) {}

  @Post('website')
  @HttpCode(HttpStatus.OK)
  async extractFromWebsite(
    @OrgContext() _scope: RequestScope,
    @Body(new ZodValidationPipe(ExtractWebsiteSchema)) dto: ExtractWebsiteInput,
  ) {
    try {
      const result = await this.extractionService.extractFromWebsite(dto.url)

      if (!result.success || !result.data) {
        throw new HttpException(
          { success: false, error: result.error || THEME_ERRORS.EXTRACTION_NO_DATA.userMessage },
          result.statusCode || HttpStatus.BAD_REQUEST,
        )
      }

      return {
        success: true,
        data: {
          colors: result.data.colors,
          fontHeading: result.data.fontHeading,
          fontBody: result.data.fontBody,
          suggestedName: result.data.suggestedName,
          logoUrl: result.data.logoUrl,
          faviconUrl: result.data.faviconUrl,
          ogImageUrl: result.data.ogImageUrl,
          brandVoice: result.data.brandVoice,
          designSettings: result.data.designSettings,
          sourceUrl: dto.url,
        },
      }
    } catch (error) {
      if (error instanceof HttpException) throw error

      this.logger.error(`Failed to extract branding from website: ${error}`)
      throw new HttpException(
        { success: false, error: THEME_ERRORS.INTERNAL_ERROR.userMessage },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
