import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OpenRouterBillingClientService } from '../../provider-billing/services/openrouter-billing-client.service'
import type { ImageGenerationModelId } from '../dto'

/**
 * Image generation: Gemini via Google Generative Language API; OpenRouter for GPT Image 2 and Gemini fallback on rate limits.
 */
@Injectable()
export class GeminiImageIntegration {
  private readonly logger = new Logger(GeminiImageIntegration.name)
  private readonly apiKey: string
  private readonly openRouterConfigured: boolean
  private readonly primaryModel = 'gemini-3.1-flash-image-preview'
  private readonly fallbackModel = 'gemini-3-pro-image-preview'
  private readonly openRouterGeminiFlashSlug = 'google/gemini-3.1-flash-image-preview'
  private readonly openRouterGptImageSlug = 'openai/gpt-5.4-image-2'
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(
    private readonly config: ConfigService,
    private readonly openRouterBilling: OpenRouterBillingClientService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') || ''
    this.openRouterConfigured = Boolean(this.config.get<string>('OPENROUTER_API_KEY') || '')
    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured — Gemini image paths will fail')
    }
    if (!this.openRouterConfigured) {
      this.logger.warn(
        'OPENROUTER_API_KEY not configured — GPT Image 2 and OpenRouter fallback unavailable',
      )
    }
  }

  isConfigured(): boolean {
    return !!(this.apiKey || this.openRouterConfigured)
  }

  private isGeminiImageModel(model: string): boolean {
    return model === this.primaryModel || model === this.fallbackModel
  }

  async generate(
    prompt: string,
    aspectRatio: string = '16:9',
    options?: {
      model?: ImageGenerationModelId
      userId?: string
      orgId?: string | null
      campaignId?: string | null
    },
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const explicit = options?.model

    if (explicit === 'gpt-5.4-image-2') {
      if (!this.openRouterConfigured) {
        throw new Error('OPENROUTER_API_KEY not configured')
      }
      this.logger.log(
        `Generating image (user-selected=gpt-5.4-image-2 via OpenRouter): "${prompt.slice(0, 80)}..." [${aspectRatio}]`,
      )
      return this.generateViaOpenRouter(prompt, aspectRatio, this.openRouterGptImageSlug, options)
    }

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    if (explicit && this.isGeminiImageModel(explicit)) {
      this.logger.log(
        `Generating image (user-selected=${explicit}): "${prompt.slice(0, 80)}..." [${aspectRatio}]`,
      )
      return await this.generateViaModel(explicit, prompt, aspectRatio)
    }

    this.logger.log(
      `Generating image (primary=${this.primaryModel}): "${prompt.slice(0, 80)}..." [${aspectRatio}]`,
    )

    try {
      return await this.generateViaModel(this.primaryModel, prompt, aspectRatio)
    } catch (primaryErr) {
      const errMsg = primaryErr instanceof Error ? primaryErr.message : 'Unknown error'

      if (this.isRateLimitError(errMsg) && this.openRouterConfigured) {
        this.logger.warn(
          `[Image] Google rate-limited, routing to OpenRouter (${this.openRouterGeminiFlashSlug}): ${errMsg}`,
        )
        return this.generateViaOpenRouter(
          prompt,
          aspectRatio,
          this.openRouterGeminiFlashSlug,
          options,
        )
      }

      this.logger.error(
        `[Image] Primary model failed, trying fallback (${this.fallbackModel}): ${errMsg}`,
      )
      return this.generateViaModel(this.fallbackModel, prompt, aspectRatio)
    }
  }

  private isRateLimitError(msg: string): boolean {
    const lower = msg.toLowerCase()
    return (
      lower.includes('429') ||
      lower.includes('rate') ||
      lower.includes('resource_exhausted') ||
      lower.includes('quota')
    )
  }

  private async generateViaOpenRouter(
    prompt: string,
    aspectRatio: string,
    openRouterModelSlug: string,
    options?: { userId?: string; orgId?: string | null; campaignId?: string | null },
    inputImages?: Array<{ buffer: Buffer; mimeType: string }>,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120_000)
    try {
      const result = await this.openRouterBilling.createImage({
        owner: {
          userId: options?.userId ?? null,
          orgId: options?.orgId ?? null,
          campaignId: options?.campaignId ?? null,
          billingOwnerType: 'platform',
        },
        feature: 'media',
        action: 'generate_image',
        sourcePath: 'media/gemini-image-openrouter',
        model: openRouterModelSlug,
        prompt,
        aspectRatio,
        inputReferences: inputImages?.map((image) => ({
          base64: image.buffer.toString('base64'),
          mimeType: image.mimeType,
        })),
        signal: controller.signal,
        metadata: {
          aspect_ratio: aspectRatio,
          fixed_price_customer_billing: true,
          input_images_count: inputImages?.length ?? 0,
        },
      })
      this.logger.log(
        `[Image] Generated via OpenRouter: ${result.buffer.length} bytes, ${result.mimeType}`,
      )
      return { buffer: result.buffer, mimeType: result.mimeType }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Image generation timed out after 120s')
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  private async generateViaModel(
    model: string,
    prompt: string,
    aspectRatio: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    if (model.startsWith('gemini-')) {
      return this.generateViaGeminiContent(model, prompt, aspectRatio)
    }

    const url = `${this.baseUrl}/models/${model}:generateImages?key=${this.apiKey}`

    const body = {
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio,
        outputMimeType: 'image/png',
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      this.logger.error(`[Image] API error ${response.status} model=${model}: ${errText}`)
      throw new Error(`Image generation failed: ${response.status}`)
    }

    const data = (await response.json()) as {
      generatedImages?: Array<{
        image?: {
          imageBytes?: string
          mimeType?: string
        }
      }>
    }

    const generated = data.generatedImages?.[0]?.image
    const imageBytesB64 = generated?.imageBytes ?? ''
    if (!imageBytesB64) {
      this.logger.error(`[Image] No image data in response model=${model}`)
      throw new Error('No image returned from generation')
    }

    const buffer = Buffer.from(imageBytesB64, 'base64')
    const mimeType = generated?.mimeType || 'image/png'
    this.logger.log(`[Image] Generated via ${model}: ${buffer.length} bytes, ${mimeType}`)
    return { buffer, mimeType }
  }

  private async generateViaGeminiContent(
    model: string,
    prompt: string,
    aspectRatio: string,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`
    const body = {
      contents: [{ parts: [{ text: `${prompt}\n\nAspect ratio: ${aspectRatio}` }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const rawText = await response.text()

    if (!response.ok) {
      this.logger.error(`[Image] API error ${response.status} model=${model}: ${rawText}`)
      throw new Error(`Image generation failed: ${response.status}`)
    }

    let data: unknown
    try {
      data = JSON.parse(rawText) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { mimeType?: string; data?: string }
              text?: string
            }>
          }
        }>
      }
    } catch {
      throw new Error('Invalid JSON in image generation response')
    }

    const typedData = data as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { mimeType?: string; data?: string }
            text?: string
          }>
        }
      }>
    }
    const parts = typedData.candidates?.[0]?.content?.parts
    const imagePart = parts?.find((part) => part.inlineData?.data)

    if (!imagePart?.inlineData?.data) {
      this.logger.error(`[Image] No image data in response model=${model}`)
      throw new Error('No image returned from generation')
    }

    const buffer = Buffer.from(imagePart.inlineData.data, 'base64')
    const mimeType = imagePart.inlineData.mimeType || 'image/png'
    this.logger.log(`[Image] Generated via ${model}: ${buffer.length} bytes, ${mimeType}`)
    return { buffer, mimeType }
  }

  async editImage(
    inputImages: Array<{ buffer: Buffer; mimeType: string }>,
    prompt: string,
    aspectRatio: string = '16:9',
    options?: {
      model?: ImageGenerationModelId
      userId?: string
      orgId?: string | null
      campaignId?: string | null
    },
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const model = options?.model ?? this.primaryModel
    if (inputImages.length === 0) {
      throw new Error('At least one source image is required')
    }
    if (model === 'gpt-5.4-image-2') {
      if (!this.openRouterConfigured) {
        throw new Error('OPENROUTER_API_KEY not configured')
      }
      this.logger.log(
        `Editing image (model=${model} via OpenRouter): "${prompt.slice(0, 80)}..." [${aspectRatio}]`,
      )
      return this.generateViaOpenRouter(
        prompt,
        aspectRatio,
        this.openRouterGptImageSlug,
        options,
        inputImages,
      )
    }
    if (!this.isGeminiImageModel(model)) {
      throw new Error(`Unsupported image edit model: ${model}`)
    }
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    this.logger.log(`Editing image (model=${model}): "${prompt.slice(0, 80)}..." [${aspectRatio}]`)

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`
    const body = {
      contents: [
        {
          parts: [
            ...inputImages.map((image) => ({
              inlineData: {
                mimeType: image.mimeType,
                data: image.buffer.toString('base64'),
              },
            })),
            { text: `${prompt}\n\nAspect ratio: ${aspectRatio}` },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const rawText = await response.text()
    if (!response.ok) {
      this.logger.error(`[Image Edit] API error ${response.status} model=${model}: ${rawText}`)
      throw new Error(`Image edit failed: ${response.status}`)
    }

    let data: {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { mimeType?: string; data?: string }
            text?: string
          }>
        }
      }>
    }
    try {
      data = JSON.parse(rawText)
    } catch {
      throw new Error('Invalid JSON in image edit response')
    }

    const parts = data.candidates?.[0]?.content?.parts
    const imagePart = parts?.find((part) => part.inlineData?.data)
    if (!imagePart?.inlineData?.data) {
      this.logger.error(`[Image Edit] No image data in response model=${model}`)
      throw new Error('No image returned from edit')
    }

    const buffer = Buffer.from(imagePart.inlineData.data, 'base64')
    const mimeType = imagePart.inlineData.mimeType || 'image/png'
    this.logger.log(`[Image Edit] Edited via ${model}: ${buffer.length} bytes, ${mimeType}`)
    return { buffer, mimeType }
  }
}
