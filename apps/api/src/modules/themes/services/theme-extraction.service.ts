import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { THEME_ERRORS } from '../config/theme-errors.config'
import { FirecrawlIntegration } from '../integrations/firecrawl.integration'
import type { MappedThemeData } from '../types'
import { ThemeBrandingMapperService } from './theme-branding-mapper.service'

@Injectable()
export class ThemeExtractionService {
  private readonly logger = new Logger(ThemeExtractionService.name)

  constructor(
    private readonly firecrawl: FirecrawlIntegration,
    private readonly brandingMapper: ThemeBrandingMapperService,
  ) {}

  async extractFromWebsite(url: string): Promise<{
    success: boolean
    data?: MappedThemeData & { sourceUrl: string }
    error?: string
    statusCode?: number
  }> {
    try {
      const brandingResult = await this.firecrawl.scrapeBranding(url)

      if (!brandingResult.success || !brandingResult.branding) {
        return {
          success: false,
          error: THEME_ERRORS.URL_CONNECTION_FAILED.userMessage,
          statusCode: THEME_ERRORS.URL_CONNECTION_FAILED.httpStatus,
        }
      }

      if (!brandingResult.branding.colors && !brandingResult.branding.fonts) {
        return {
          success: false,
          error: THEME_ERRORS.EXTRACTION_NO_DATA.userMessage,
          statusCode: THEME_ERRORS.EXTRACTION_NO_DATA.httpStatus,
        }
      }

      const mappedTheme = this.brandingMapper.mapBrandingToTheme(
        brandingResult.branding,
        url,
        brandingResult.metadata,
      )

      return { success: true, data: { ...mappedTheme, sourceUrl: url } }
    } catch (error) {
      this.logger.error(`Failed to extract branding from website: ${error}`)
      return {
        success: false,
        error: THEME_ERRORS.INTERNAL_ERROR.userMessage,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      }
    }
  }
}
