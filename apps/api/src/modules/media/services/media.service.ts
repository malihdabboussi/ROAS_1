import { MediaServiceBase04 } from './media-service-04.base'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ErrorReporter } from '@vibey/api-shared'
import { SpaceRetrievalIndexService } from '../../space-retrieval/services/space-retrieval-index.service'
import { GeminiImageIntegration } from '../integrations/gemini-image.integration'
import { MediaRepository } from '../repositories/media.repository'
import { MediaUploadRepository } from '../repositories/media-upload.repository'
import { MediaIndexerService } from './media-indexer.service'

export type SendFn = (type: string, data: Record<string, unknown>) => Promise<void>

@Injectable()
export class MediaService extends MediaServiceBase04 {
  constructor(
    gemini: GeminiImageIntegration,
    config: ConfigService,
    mediaIndexer: MediaIndexerService,
    mediaRepository: MediaRepository,
    mediaUploadRepository: MediaUploadRepository,
    errorReporter: ErrorReporter,
    spaceRetrievalIndex?: SpaceRetrievalIndexService,
  ) {
    super(
      gemini,
      config,
      mediaIndexer,
      mediaRepository,
      mediaUploadRepository,
      errorReporter,
      spaceRetrievalIndex,
    )
  }
}
