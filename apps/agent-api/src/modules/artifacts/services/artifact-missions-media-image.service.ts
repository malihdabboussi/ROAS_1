import { Logger } from '@nestjs/common'
import { ArtifactMissionsMediaDownloadClient } from '../integrations/artifact-missions-media-download.client'
import { ArtifactMissionsMediaGeminiClient } from '../integrations/artifact-missions-media-gemini.client'
import { ArtifactMediaAssetsRepository } from '../repositories/artifact-media-assets.repository'

type ImageRequest =
  | { type: 'url'; url: string }
  | { type: 'asset'; asset_id: string }
  | { type: 'data_url'; dataUrl: string }

type PublicImageSource =
  | { type: 'url'; url: string }
  | { type: 'asset'; asset_id: string }
  | { type: 'data_url' }

type LoadedImage = {
  source: ImageRequest
  buffer: Buffer
  mimeType: string
}

const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const DEFAULT_MAX_IMAGES = 10
const HARD_MAX_IMAGES = 20
const GEMINI_IMAGE_ANALYSIS_MODEL = 'gemini-3.5-flash'
const IMAGE_FETCH_TIMEOUT_MS = 10_000
const IMAGE_ACCEPT_HEADER = 'image/png,image/jpeg,image/webp,image/gif'

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('169.254.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '::1' ||
    host.includes(':') ||
    host === 'metadata.google.internal'
  )
}

function parseDataUrl(raw: string): { mimeType: string; buffer: Buffer } | null {
  const match = raw.match(/^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i)
  if (!match) return null
  return {
    mimeType: match[1]!.toLowerCase(),
    buffer: Buffer.from(match[2]!.replace(/\s/g, ''), 'base64'),
  }
}

function defaultPrompt(): string {
  return [
    'Analyze this image for a marketing creative workflow.',
    'Describe visible subject, style, text, brand cues, composition, quality, and risks.',
    'If useful for carousel selection, include a concise carousel_score from 1 to 10 with the reason.',
    'Return concise structured notes.',
  ].join(' ')
}

function publicSource(source: ImageRequest): PublicImageSource {
  if (source.type === 'data_url') return { type: 'data_url' }
  return source
}

export class ArtifactMissionsMediaImageService {
  private readonly logger = new Logger(ArtifactMissionsMediaImageService.name)

  constructor(
    private readonly mediaAssetsRepository: ArtifactMediaAssetsRepository,
    private readonly geminiClient = new ArtifactMissionsMediaGeminiClient(),
    private readonly downloadClient = new ArtifactMissionsMediaDownloadClient(),
  ) {}

  async analyzeImage(
    target: Record<string, any>,
    input: Record<string, unknown>,
    sessionKey?: string,
    onProgress?: (message: string) => void | Promise<void>,
  ) {
    const apiKey = (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '').trim()
    if (!apiKey) {
      return {
        success: false,
        error: 'Image analysis is not configured for this workspace.',
      }
    }

    const requests = this.collectImageRequests(input)
    if (requests.length === 0) {
      return { success: false, error: 'image_url, image_urls, asset_id, or asset_ids is required' }
    }

    const requestedMax = Number(input.max_images ?? DEFAULT_MAX_IMAGES)
    const maxImages = Number.isFinite(requestedMax)
      ? Math.min(Math.max(Math.floor(requestedMax), 1), HARD_MAX_IMAGES)
      : DEFAULT_MAX_IMAGES
    const selected = requests.slice(0, maxImages)
    const prompt = stringValue(input.prompt) || defaultPrompt()
    const billing = this.resolveBillingContext(target, sessionKey)

    const analyses: Array<Record<string, unknown>> = []
    for (let i = 0; i < selected.length; i++) {
      const request = selected[i]!
      await onProgress?.(`Analyzing image ${i + 1}/${selected.length}`)
      const loaded = await this.loadImage(target, request, sessionKey)
      if ('error' in loaded) {
        analyses.push({ source: publicSource(request), success: false, error: loaded.error })
        continue
      }
      const analysis = await this.callGemini(apiKey, loaded, prompt)
      if (analysis.success) {
        await this.chargeImageAnalysisUsage(target, billing, prompt, analysis.text, i)
      }
      analyses.push({
        source: publicSource(loaded.source),
        success: analysis.success,
        mime_type: loaded.mimeType,
        ...(analysis.success
          ? { analysis: analysis.text }
          : { error: analysis.error ?? 'Image analysis failed' }),
      })
    }

    return {
      success: analyses.some((item) => item.success === true),
      count: analyses.length,
      model: GEMINI_IMAGE_ANALYSIS_MODEL,
      analyses,
      truncated: requests.length > selected.length,
    }
  }

  private collectImageRequests(input: Record<string, unknown>): ImageRequest[] {
    const urls = [
      stringValue(input.image_url ?? input.url ?? input.file_url),
      ...stringArray(input.image_urls ?? input.urls ?? input.file_urls),
    ].filter(Boolean)
    const assetIds = [
      stringValue(input.asset_id ?? input.media_asset_id),
      ...stringArray(input.asset_ids ?? input.media_asset_ids),
    ].filter(Boolean)

    const urlRequests = urls.map(
      (url): ImageRequest =>
        url.startsWith('data:')
          ? ({ type: 'data_url', dataUrl: url } as ImageRequest)
          : ({ type: 'url', url } as ImageRequest),
    )
    const assetRequests = assetIds.map((asset_id): ImageRequest => ({ type: 'asset', asset_id }))
    return [...urlRequests, ...assetRequests]
  }

  private async loadImage(
    target: Record<string, any>,
    source: ImageRequest,
    sessionKey?: string,
  ): Promise<LoadedImage | { error: string }> {
    if (source.type === 'data_url') {
      const parsed = parseDataUrl(source.dataUrl)
      if (!parsed) return { error: 'Invalid image data URL' }
      if (parsed.buffer.length > MAX_IMAGE_BYTES) return { error: 'Image is too large' }
      return { source, buffer: parsed.buffer, mimeType: parsed.mimeType }
    }
    if (source.type === 'url') return this.loadUrlImage(source)
    return this.loadAssetImage(target, source, sessionKey)
  }

  private async loadUrlImage(source: Extract<ImageRequest, { type: 'url' }>) {
    let parsed: URL
    try {
      parsed = new URL(source.url)
    } catch {
      return { error: 'Invalid image URL' }
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: 'Image URL must be http or https' }
    }
    if (isPrivateHostname(parsed.hostname)) {
      return { error: 'Image URL must be public' }
    }

    const downloaded = await this.downloadClient.downloadImage({
      url: parsed.toString(),
      maxBytes: MAX_IMAGE_BYTES,
      timeoutMs: IMAGE_FETCH_TIMEOUT_MS,
      acceptHeader: IMAGE_ACCEPT_HEADER,
    })
    if (!downloaded.success) return { error: downloaded.error }
    return { source, buffer: downloaded.buffer, mimeType: downloaded.mimeType }
  }

  private async loadAssetImage(
    target: Record<string, any>,
    source: Extract<ImageRequest, { type: 'asset' }>,
    sessionKey?: string,
  ) {
    const userId = String(target.resolveUserId?.(sessionKey) ?? '').trim()
    if (!userId) return { error: 'Unable to resolve user for image asset' }
    const orgId =
      typeof target.resolveOrgId === 'function' ? (target.resolveOrgId(sessionKey) ?? null) : null

    const { data: asset, error } = await this.mediaAssetsRepository.findReadableMediaAsset(
      target.serviceClient,
      { assetId: source.asset_id, userId, orgId },
    )
    if (error || !asset) return { error: 'Image asset was not found' }

    const mimeType = stringValue(asset.mime_type).toLowerCase()
    if (!mimeType.startsWith('image/')) return { error: 'Asset is not an image' }
    const fileSize = Number(asset.file_size ?? 0)
    if (Number.isFinite(fileSize) && fileSize > MAX_IMAGE_BYTES) {
      return { error: 'Image is too large' }
    }

    const filePath = stringValue(asset.file_path)
    const bucketName = stringValue(asset.bucket_name) || 'media'
    if (filePath) {
      const download = await this.mediaAssetsRepository.downloadStorageObject(
        target.serviceClient,
        {
          bucketName,
          filePath,
        },
      )
      if (download.error || !download.data) return { error: 'Unable to download image asset' }
      const buffer = Buffer.from(await download.data.arrayBuffer())
      if (buffer.length === 0) return { error: 'Image asset is empty' }
      if (buffer.length > MAX_IMAGE_BYTES) return { error: 'Image is too large' }
      return { source, buffer, mimeType }
    }

    const publicUrl = stringValue(asset.public_url)
    if (publicUrl) return this.loadUrlImage({ type: 'url', url: publicUrl })
    return { error: 'Image asset has no readable file' }
  }

  private async callGemini(
    apiKey: string,
    image: LoadedImage,
    prompt: string,
  ): Promise<{ success: true; text: string } | { success: false; error?: string }> {
    try {
      const result = await this.geminiClient.analyzeImage({
        apiKey,
        model: GEMINI_IMAGE_ANALYSIS_MODEL,
        mimeType: image.mimeType,
        buffer: image.buffer,
        prompt,
      })
      if (!result.success) this.logger.warn('image_analysis provider_failed')
      return result
    } catch (error) {
      this.logger.warn(
        `image_analysis failed error=${error instanceof Error ? error.message : String(error)}`,
      )
      return { success: false, error: 'Image analysis failed' }
    }
  }

  private resolveBillingContext(target: Record<string, any>, sessionKey?: string) {
    const userId = String(target.resolveUserId?.(sessionKey) ?? '').trim()
    const orgId =
      sessionKey && typeof target.resolveOrgId === 'function'
        ? (target.resolveOrgId(sessionKey) as string | null)
        : null
    const conversationId =
      sessionKey && typeof target.parseConversationId === 'function'
        ? target.parseConversationId(sessionKey)
        : null
    return { userId, orgId, conversationId }
  }

  private async chargeImageAnalysisUsage(
    target: Record<string, any>,
    billing: { userId: string; orgId: string | null; conversationId: string | null },
    prompt: string,
    output: string,
    imageIndex: number,
  ): Promise<void> {
    if (!billing.userId) {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('artifact_image_analysis_billing_user_not_resolved')
    }
    const credits = target.credits
    if (!credits || typeof credits.processDirectTextUsage !== 'function') {
      if (process.env.NODE_ENV === 'test') return
      throw new Error('artifact_image_analysis_billing_service_not_configured')
    }
    const inputTokens = Math.max(1, Math.ceil(prompt.length / 4))
    const outputTokens = Math.max(1, Math.ceil(output.length / 4))
    await credits.processDirectTextUsage({
      userId: billing.userId,
      orgId: billing.orgId ?? undefined,
      conversationId: billing.conversationId ?? undefined,
      feature: 'media',
      action: 'analyze_image',
      modelName: GEMINI_IMAGE_ANALYSIS_MODEL,
      usage: {
        input: inputTokens,
        output: outputTokens,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: inputTokens + outputTokens,
      },
      costSource: 'char_estimate',
      metadata: { image_index: imageIndex },
    })
  }
}
