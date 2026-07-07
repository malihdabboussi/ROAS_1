import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { ProviderBillingModule } from '../provider-billing/provider-billing.module'
import { ThemeExtractionController } from './controllers/theme-extraction.controller'
import { ThemesController } from './controllers/themes.controller'
import { FirecrawlIntegration } from './integrations/firecrawl.integration'
import { ThemesRepository } from './repositories/themes.repository'
import { ThemeBrandingMapperService } from './services/theme-branding-mapper.service'
import { ThemeExtractionService } from './services/theme-extraction.service'
import { ThemeImageStyleService } from './services/theme-image-style.service'
import { ThemesService } from './services/themes.service'

@Module({
  imports: [BillingModule, ProviderBillingModule],
  controllers: [ThemesController, ThemeExtractionController],
  providers: [
    ThemesService,
    ThemesRepository,
    ThemeExtractionService,
    ThemeBrandingMapperService,
    ThemeImageStyleService,
    FirecrawlIntegration,
  ],
  exports: [ThemesService, ThemesRepository],
})
export class ThemesModule {}
