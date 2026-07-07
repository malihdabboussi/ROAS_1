import { Module } from '@nestjs/common'
import { BillingModule } from '../billing/billing.module'
import { BrainModule } from '../brain/brain.module'
import { ProviderBillingModule } from '../provider-billing/provider-billing.module'
import { SpaceRetrievalModule } from '../space-retrieval/space-retrieval.module'
import { MediaAdConceptsController } from './controllers/media-ad-concepts.controller'
import { MediaAssetsController } from './controllers/media-assets.controller'
import { MediaImageGenerationController } from './controllers/media-image-generation.controller'
import { MediaImageStreamController } from './controllers/media-image-stream.controller'
import { MediaSocialCacheController } from './controllers/media-social-cache.controller'
import { MediaUploadController } from './controllers/media-upload.controller'
import { GeminiImageIntegration } from './integrations/gemini-image.integration'
import { MediaRepository } from './repositories/media.repository'
import { MediaUploadRepository } from './repositories/media-upload.repository'
import { AdConceptGenerationService } from './services/ad-concept-generation.service'
import { MediaIndexerService } from './services/media-indexer.service'
import { MediaReaderService } from './services/media-reader.service'
import { MediaService } from './services/media.service'

@Module({
  imports: [BillingModule, BrainModule, ProviderBillingModule, SpaceRetrievalModule],
  controllers: [
    MediaUploadController,
    MediaSocialCacheController,
    MediaImageGenerationController,
    MediaImageStreamController,
    MediaAdConceptsController,
    MediaAssetsController,
  ],
  providers: [
    MediaService,
    GeminiImageIntegration,
    AdConceptGenerationService,
    MediaRepository,
    MediaUploadRepository,
    MediaReaderService,
    MediaIndexerService,
  ],
  exports: [MediaService, AdConceptGenerationService, MediaReaderService, MediaIndexerService],
})
export class MediaModule {}
