import { Injectable, Logger, Optional } from '@nestjs/common'
import { DocumentExtractionService } from '../../brain/services/document-extraction.service'
import { BrowserSessionsService } from '../../browser-sessions/services/browser-sessions.service'
import { ArtifactMissionsMediaDeepgramClient } from '../integrations/artifact-missions-media-deepgram.client'
import { ArtifactMissionsMediaDownloadClient } from '../integrations/artifact-missions-media-download.client'
import { ArtifactMissionsMediaGeminiClient } from '../integrations/artifact-missions-media-gemini.client'
import { ArtifactMissionsMediaProcessClient } from '../integrations/artifact-missions-media-process.client'
import { ArtifactMissionsMediaScrapeCreatorsClient } from '../integrations/artifact-missions-media-scrape-creators.client'
import { ArtifactMissionsMediaYoutubeTranscriptClient } from '../integrations/artifact-missions-media-youtube-transcript.client'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'
import type { ArtifactActionHandler } from './artifact-action.registry'
import { ArtifactMissionsMediaCatalogService } from './artifact-missions-media-catalog.service'
import { ArtifactMissionsMediaDocumentService } from './artifact-missions-media-document.service'
import { ArtifactMissionsMediaImageService } from './artifact-missions-media-image.service'
import { ArtifactMissionsMediaTranscriptService } from './artifact-missions-media-transcript.service'
import { ArtifactMissionsMediaUsageService } from './artifact-missions-media-usage.service'
import { ArtifactMissionsMediaVideoService } from './artifact-missions-media-video.service'

@Injectable()
export class ArtifactMissionsMediaService {
  private readonly logger = new Logger(ArtifactMissionsMediaService.name)
  private readonly catalog: ArtifactMissionsMediaCatalogService
  private readonly documents: ArtifactMissionsMediaDocumentService
  private readonly image: ArtifactMissionsMediaImageService
  private readonly transcripts: ArtifactMissionsMediaTranscriptService
  private readonly video: ArtifactMissionsMediaVideoService

  constructor(
    private readonly browserSessions: BrowserSessionsService,
    @Optional() private readonly documentExtraction?: DocumentExtractionService,
    @Optional()
    private readonly mediaAssetsRepository: ArtifactMediaAssetsRepository = new ArtifactMediaAssetsRepository(),
    @Optional()
    private readonly mediaGeminiClient: ArtifactMissionsMediaGeminiClient = new ArtifactMissionsMediaGeminiClient(),
    @Optional()
    private readonly mediaDownloadClient: ArtifactMissionsMediaDownloadClient = new ArtifactMissionsMediaDownloadClient(),
    @Optional()
    private readonly mediaDeepgramClient: ArtifactMissionsMediaDeepgramClient = new ArtifactMissionsMediaDeepgramClient(),
    @Optional()
    private readonly mediaProcessClient: ArtifactMissionsMediaProcessClient = new ArtifactMissionsMediaProcessClient(),
    @Optional()
    private readonly mediaScrapeCreatorsClient: ArtifactMissionsMediaScrapeCreatorsClient = new ArtifactMissionsMediaScrapeCreatorsClient(),
    @Optional()
    private readonly mediaYoutubeTranscriptClient: ArtifactMissionsMediaYoutubeTranscriptClient = new ArtifactMissionsMediaYoutubeTranscriptClient(),
  ) {
    const usage = new ArtifactMissionsMediaUsageService()
    this.catalog = new ArtifactMissionsMediaCatalogService(this.mediaAssetsRepository)
    this.image = new ArtifactMissionsMediaImageService(
      this.mediaAssetsRepository,
      this.mediaGeminiClient,
      this.mediaDownloadClient,
    )
    this.documents = new ArtifactMissionsMediaDocumentService(
      this.documentExtraction,
      this.mediaAssetsRepository,
      this.logger,
      this.mediaGeminiClient,
    )
    this.transcripts = new ArtifactMissionsMediaTranscriptService(
      this.browserSessions,
      usage,
      this.mediaProcessClient,
      this.mediaDeepgramClient,
      this.mediaScrapeCreatorsClient,
      this.mediaYoutubeTranscriptClient,
    )
    this.video = new ArtifactMissionsMediaVideoService(
      this.mediaAssetsRepository,
      usage,
      this.mediaProcessClient,
      this.mediaDownloadClient,
      this.mediaDeepgramClient,
    )
  }

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      get_media_generation_status: (data, sessionKey) =>
        this.callOrExtracted(
          target,
          'getMediaGenerationStatus',
          () => this.catalog.getMediaGenerationStatus(target, data, sessionKey),
          data,
          sessionKey,
        ),
      generate_image: (data, sessionKey) => target.generateImage(data, sessionKey),
      generate_video: (data, sessionKey) => target.generateVideo(data, sessionKey),
      get_video_status: (data, sessionKey) => target.getVideoStatus(data, sessionKey),
      analyze_video: (data, sessionKey, onProgress) =>
        this.callOrExtracted(
          target,
          'analyzeVideo',
          () => this.video.analyzeVideo(target, data, sessionKey, onProgress),
          data,
          sessionKey,
        ),
      transcribe_audio: (data, sessionKey, onProgress) =>
        this.callOrExtracted(
          target,
          'transcribeAudio',
          () => this.video.transcribeAudio(target, data, sessionKey, onProgress),
          data,
          sessionKey,
        ),
      analyze_image: (data, sessionKey, onProgress) =>
        this.callOrExtracted(
          target,
          'analyzeImage',
          () => this.image.analyzeImage(target, data, sessionKey, onProgress),
          data,
          sessionKey,
        ),
      extract_url_transcript: (data, sessionKey, onProgress) =>
        this.transcripts.extractUrlTranscript(target, data, sessionKey, onProgress),
      list_campaign_media: (data, sessionKey) =>
        this.catalog.listCampaignMedia(target, data, sessionKey),
      read_document: (data, sessionKey) => this.readDocument(target, data, sessionKey),
    }
  }

  private callOrExtracted(
    target: Record<string, any>,
    methodName: string,
    extracted: () => Promise<unknown> | unknown,
    data: Record<string, unknown>,
    sessionKey?: string,
  ): Promise<unknown> | unknown {
    if (
      Object.prototype.hasOwnProperty.call(target, methodName) &&
      typeof target[methodName] === 'function'
    ) {
      return target[methodName](data, sessionKey)
    }
    return extracted()
  }

  private readDocument(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
  ) {
    return this.documents.readDocument(target, input, sessionKey, {
      extractTextViaGemini: (buffer, mimeType, filename) =>
        this.extractTextViaGemini(buffer, mimeType, filename, target, sessionKey),
      createQueryEmbedding: (query) => this.createQueryEmbedding(query, target, sessionKey),
    })
  }

  private extractTextViaGemini(
    buffer: Buffer,
    mimeType: string,
    filename?: string,
    target?: Record<string, any>,
    sessionKey?: string,
  ): Promise<string> {
    return this.documents.extractTextViaGemini(buffer, mimeType, filename, target, sessionKey)
  }

  private createQueryEmbedding(
    query: string,
    target?: Record<string, any>,
    sessionKey?: string,
  ): Promise<number[] | null> {
    return this.documents.createQueryEmbedding(query, target, sessionKey)
  }
}
