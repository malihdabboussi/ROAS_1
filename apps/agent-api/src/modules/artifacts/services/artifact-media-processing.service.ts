import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Injectable, Logger } from '@nestjs/common'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'
import {
  parseConversationIdFromSessionKey,
  type ArtifactActionHandler,
} from './artifact-action.registry'
import { ArtifactIgStoryRendererService } from './artifact-ig-story-renderer.service'
import { ArtifactLegacyMediaUploadService } from './artifact-legacy-media-upload.service'
import {
  ArtifactMediaProcessingAdvancedOperationsService,
  type ArtifactMediaProcessingOperationRuntime,
} from './artifact-media-processing-advanced-operations.service'
import { ArtifactMediaProcessingCoreOperationsService } from './artifact-media-processing-core-operations.service'
import { ArtifactMediaProcessingEditOperationsService } from './artifact-media-processing-edit-operations.service'
import {
  VALID_PROCESS_MEDIA_OPERATIONS,
  type ProcessOperation,
} from './artifact-media-processing-operation-catalog'
import { ArtifactMediaProcessingOperationRuntimeService } from './artifact-media-processing-operation-runtime.service'
import { ArtifactMediaProcessingPersistenceService } from './artifact-media-processing-persistence.service'
import { ArtifactMediaProcessingVisualOperationsService } from './artifact-media-processing-visual-operations.service'
import { ArtifactStaticAdRendererService } from './artifact-static-ad-renderer.service'
import {
  ArtifactValidateMessagingRendererService,
  type ValidateMessagingLine,
} from './artifact-validate-messaging-renderer.service'

const MAX_VALIDATE_MESSAGING_LINES = 8

@Injectable()
export class ArtifactMediaProcessingService {
  constructor(
    private readonly repository: ArtifactMediaAssetsRepository = new ArtifactMediaAssetsRepository(),
  ) {
    this.persistenceService = new ArtifactMediaProcessingPersistenceService(repository)
    this.mediaUploadService = new ArtifactLegacyMediaUploadService(repository)
    this.staticAdRenderer = new ArtifactStaticAdRendererService(repository)
  }

  private readonly logger = new Logger(ArtifactMediaProcessingService.name)
  private readonly advancedOperations = new ArtifactMediaProcessingAdvancedOperationsService()
  private readonly coreOperations = new ArtifactMediaProcessingCoreOperationsService()
  private readonly editOperations = new ArtifactMediaProcessingEditOperationsService()
  private readonly igStoryRenderer = new ArtifactIgStoryRendererService()
  private readonly operationRuntimeService = new ArtifactMediaProcessingOperationRuntimeService()
  private readonly persistenceService: ArtifactMediaProcessingPersistenceService
  private readonly mediaUploadService: ArtifactLegacyMediaUploadService
  private readonly validateMessagingRenderer = new ArtifactValidateMessagingRendererService()
  private readonly staticAdRenderer: ArtifactStaticAdRendererService
  private readonly visualOperations = new ArtifactMediaProcessingVisualOperationsService()

  getHandlers(target: Record<string, any>): Record<string, ArtifactActionHandler> {
    return {
      process_media: (data, sessionKey, onProgress) =>
        this.processMedia(target, data, sessionKey, onProgress),
    }
  }

  private async processMedia(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    const operation = String(input.operation ?? '').trim() as ProcessOperation
    if (!VALID_PROCESS_MEDIA_OPERATIONS.has(operation)) {
      return {
        success: false,
        error: `Invalid operation "${operation}". Supported: ${[
          ...VALID_PROCESS_MEDIA_OPERATIONS,
        ].join(', ')}`,
      }
    }

    if (operation === 'probe') {
      return this.opProbe(input, onProgress)
    }

    const userId = target.resolveUserId(sessionKey)
    const supabase = await target.getUserClient(userId, sessionKey as string)
    const campaignId = await target.resolveCampaignId(supabase, input, userId, sessionKey)

    if (operation === 'render_validate_messaging') {
      return this.renderValidateMessaging(target, input, {
        userId,
        campaignId,
        sessionKey,
        onProgress,
      })
    }

    const tempRoot = await mkdtemp(join(tmpdir(), 'vibey-process-media-'))

    try {
      let outputPath: string
      let outputFormat: string

      switch (operation) {
        case 'trim':
          ;({ outputPath, outputFormat } = await this.opTrim(input, tempRoot, onProgress))
          break
        case 'concat':
          ;({ outputPath, outputFormat } = await this.opConcat(input, tempRoot, onProgress))
          break
        case 'convert':
          ;({ outputPath, outputFormat } = await this.opConvert(input, tempRoot, onProgress))
          break
        case 'extract_audio':
          ;({ outputPath, outputFormat } = await this.opExtractAudio(input, tempRoot, onProgress))
          break
        case 'add_audio':
          ;({ outputPath, outputFormat } = await this.opAddAudio(input, tempRoot, onProgress))
          break
        case 'resize':
          ;({ outputPath, outputFormat } = await this.opResize(input, tempRoot, onProgress))
          break
        case 'compose':
          ;({ outputPath, outputFormat } = await this.opCompose(input, tempRoot, onProgress))
          break
        case 'audio_effect':
          ;({ outputPath, outputFormat } = await this.opAudioEffect(input, tempRoot, onProgress))
          break
        case 'color_grade':
          ;({ outputPath, outputFormat } = await this.opColorGrade(input, tempRoot, onProgress))
          break
        case 'blur':
          ;({ outputPath, outputFormat } = await this.opBlur(input, tempRoot, onProgress))
          break
        case 'vignette':
          ;({ outputPath, outputFormat } = await this.opVignette(input, tempRoot, onProgress))
          break
        case 'sharpen':
          ;({ outputPath, outputFormat } = await this.opSharpen(input, tempRoot, onProgress))
          break
        case 'denoise':
          ;({ outputPath, outputFormat } = await this.opDenoise(input, tempRoot, onProgress))
          break
        case 'reverse':
          ;({ outputPath, outputFormat } = await this.opReverse(input, tempRoot, onProgress))
          break
        case 'loop':
          ;({ outputPath, outputFormat } = await this.opLoop(input, tempRoot, onProgress))
          break
        case 'speed':
          ;({ outputPath, outputFormat } = await this.opSpeed(input, tempRoot, onProgress))
          break
        case 'overlay':
          ;({ outputPath, outputFormat } = await this.opOverlay(input, tempRoot, onProgress))
          break
        case 'crop':
          ;({ outputPath, outputFormat } = await this.opCrop(input, tempRoot, onProgress))
          break
        case 'thumbnail':
          ;({ outputPath, outputFormat } = await this.opThumbnail(input, tempRoot, onProgress))
          break
        case 'text_overlay':
          ;({ outputPath, outputFormat } = await this.opTextOverlay(input, tempRoot, onProgress))
          break
        case 'transition':
          ;({ outputPath, outputFormat } = await this.opTransition(input, tempRoot, onProgress))
          break
        case 'chroma_key':
          ;({ outputPath, outputFormat } = await this.opChromaKey(input, tempRoot, onProgress))
          break
        case 'split_screen':
          ;({ outputPath, outputFormat } = await this.opSplitScreen(input, tempRoot, onProgress))
          break
        case 'subtitle_burn':
          ;({ outputPath, outputFormat } = await this.opSubtitleBurn(input, tempRoot, onProgress))
          break
        case 'silence_remove':
          ;({ outputPath, outputFormat } = await this.opSilenceRemove(input, tempRoot, onProgress))
          break
        case 'frame_extract':
          ;({ outputPath, outputFormat } = await this.opFrameExtract(input, tempRoot, onProgress))
          break
        case 'waveform':
          ;({ outputPath, outputFormat } = await this.opWaveform(input, tempRoot, onProgress))
          break
        case 'render_ig_story':
          ;({ outputPath, outputFormat } = await this.opRenderIgStory(input, tempRoot, onProgress))
          break
        case 'render_static_ad':
          ;({ outputPath, outputFormat } = await this.opRenderStaticAd(
            target,
            input,
            tempRoot,
            onProgress,
          ))
          break
        default:
          return { success: false, error: `Unhandled operation: ${operation}` }
      }

      await onProgress?.('Uploading processed media')
      return this.persistenceService.persistProcessedMedia({
        target,
        userId,
        sessionKey,
        campaignId,
        operation,
        outputPath,
        outputFormat,
        actionInput: input,
        logger: this.logger,
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'process_media failed',
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true })
    }
  }

  // --- Operations ---

  private async opRenderIgStory(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.igStoryRenderer.render(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opRenderStaticAd(
    target: Record<string, any>,
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.staticAdRenderer.render(
      target,
      input,
      tempRoot,
      onProgress,
      this.operationRuntime(),
    )
  }

  private async renderValidateMessaging(
    target: Record<string, any>,
    input: Record<string, unknown>,
    context: {
      userId: string
      campaignId: string | null
      sessionKey?: string
      onProgress?: (message: string) => void | Promise<void>
    },
  ) {
    const lines = Array.isArray(input.lines)
      ? (input.lines.slice(0, MAX_VALIDATE_MESSAGING_LINES) as ValidateMessagingLine[])
      : []
    const orgId = target.resolveOrgId?.(context.sessionKey) as string | null | undefined
    const spaceId = typeof input.space_id === 'string' ? input.space_id.trim() || null : null
    const conversationId = parseConversationIdFromSessionKey(context.sessionKey)
    const registered: Array<Record<string, unknown>> = []

    const rendered = await this.validateMessagingRenderer.renderSet({
      lines,
      accent: String(input.brand_color),
      backgroundLight: typeof input.brand_bg_light === 'string' ? input.brand_bg_light : undefined,
      backgroundDark: typeof input.brand_bg_dark === 'string' ? input.brand_bg_dark : undefined,
    })

    for (let index = 0; index < rendered.length; index += 1) {
      const image = rendered[index]!
      await context.onProgress?.(`Registering image ${index + 1}/${rendered.length}`)
      const result = await this.mediaUploadService.uploadMediaFromBytes(
        target,
        image.buffer,
        'image/png',
        'image',
        context.userId,
        context.campaignId,
        image.sourcePrompt,
        'deterministic-renderer',
        orgId ?? null,
        spaceId,
        conversationId,
        image.name,
      )
      if (!result.success) return result
      const asset = result.asset as Record<string, unknown> | undefined
      registered.push({
        media_asset_id: typeof asset?.id === 'string' ? asset.id : null,
        name: image.name,
        url: result.url ?? null,
        asset_ref: result.asset_ref ?? null,
        source_prompt: image.sourcePrompt,
      })
    }

    return {
      success: registered.length === rendered.length && registered.length > 0,
      operation: 'render_validate_messaging',
      count: registered.length,
      media_assets: registered,
      campaign_id: context.campaignId,
      space_id: spaceId,
    }
  }

  private async opTrim(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.coreOperations.opTrim(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opConcat(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.coreOperations.opConcat(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opConvert(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.coreOperations.opConvert(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opExtractAudio(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.coreOperations.opExtractAudio(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opAddAudio(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.coreOperations.opAddAudio(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opResize(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.coreOperations.opResize(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opCompose(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.coreOperations.opCompose(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opAudioEffect(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.coreOperations.opAudioEffect(input, tempRoot, onProgress, this.operationRuntime())
  }

  // --- Phase 2: Visual Effects ---

  private async opColorGrade(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.visualOperations.opColorGrade(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opBlur(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.visualOperations.opBlur(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opVignette(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.visualOperations.opVignette(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opSharpen(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.visualOperations.opSharpen(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opDenoise(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.visualOperations.opDenoise(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opReverse(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.visualOperations.opReverse(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opLoop(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.visualOperations.opLoop(input, tempRoot, onProgress, this.operationRuntime())
  }

  // --- Phase 1: Core Editing ---

  private async opProbe(
    input: Record<string, unknown>,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    return this.coreOperations.opProbe(input, onProgress, this.operationRuntime())
  }

  private async opSpeed(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.editOperations.opSpeed(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opOverlay(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.editOperations.opOverlay(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opCrop(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.editOperations.opCrop(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opThumbnail(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.editOperations.opThumbnail(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opTextOverlay(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.editOperations.opTextOverlay(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opTransition(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.editOperations.opTransition(input, tempRoot, onProgress, this.operationRuntime())
  }

  // --- Phase 3: Advanced ---

  private async opChromaKey(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.advancedOperations.opChromaKey(input, tempRoot, onProgress, this.operationRuntime())
  }

  private async opSplitScreen(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.advancedOperations.opSplitScreen(
      input,
      tempRoot,
      onProgress,
      this.operationRuntime(),
    )
  }

  private async opSubtitleBurn(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.advancedOperations.opSubtitleBurn(
      input,
      tempRoot,
      onProgress,
      this.operationRuntime(),
    )
  }

  private async opSilenceRemove(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.advancedOperations.opSilenceRemove(
      input,
      tempRoot,
      onProgress,
      this.operationRuntime(),
    )
  }

  private async opFrameExtract(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.advancedOperations.opFrameExtract(
      input,
      tempRoot,
      onProgress,
      this.operationRuntime(),
    )
  }

  private async opWaveform(
    input: Record<string, unknown>,
    tempRoot: string,
    onProgress?: (message: string) => void | Promise<void>,
  ): Promise<{ outputPath: string; outputFormat: string }> {
    return this.advancedOperations.opWaveform(input, tempRoot, onProgress, this.operationRuntime())
  }

  // --- Helpers ---

  private operationRuntime(): ArtifactMediaProcessingOperationRuntime {
    return this.operationRuntimeService
  }
}
