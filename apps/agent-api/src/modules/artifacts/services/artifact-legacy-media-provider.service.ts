import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import {
  coerceFiniteNumber,
  normalizeProviderBillingUsage,
  readOpenRouterGenerationId,
  readOpenRouterRequestId,
} from '@vibey/api-shared'
import type { ProviderBillingAttemptsService } from '../../billing/services/provider-billing-attempts.service'

type OpenRouterImagePart = {
  image_url?: { url?: string }
  inlineData?: { mimeType?: string; data?: string }
}

@Injectable()
export class ArtifactLegacyMediaProviderService {
  readonly VIDEO_MODELS: Record<string, { replicateId: string; hasGoogleFallback: boolean }> = {
    'veo-3.1-fast': { replicateId: 'google/veo-3.1-fast', hasGoogleFallback: true },
    'kling-v3': { replicateId: 'kwaivgi/kling-v3-video', hasGoogleFallback: false },
    'grok-imagine-video': { replicateId: 'xai/grok-imagine-video', hasGoogleFallback: false },
    'gen-4.5': { replicateId: 'runwayml/gen-4.5', hasGoogleFallback: false },
    'fabric-1.0': { replicateId: 'veed/fabric-1.0', hasGoogleFallback: false },
    'seedance-2': { replicateId: 'bytedance/seedance-2.0', hasGoogleFallback: false },
  }

  readonly DEFAULT_IMAGE_MODEL = 'openai/gpt-5.4-image-2'
  readonly GOOGLE_IMAGE_MODEL_ID = 'gemini-3.1-flash-image-preview'
  readonly GOOGLE_VIDEO_MODEL_ID = 'veo-3.1-fast-generate-preview'
  readonly OPENROUTER_GEMINI_IMAGE_MODEL = 'google/gemini-3.1-flash-image'
  readonly OPENAI_IMAGE_MODEL = 'openai/gpt-5.4-image-2'

  readonly IMAGE_MODELS: Record<
    string,
    {
      provider: 'google' | 'openai'
      googleModel?: string
      openRouterModel?: string
      billingModel?: string
    }
  > = {
    'gemini-3.1-flash': { provider: 'google', googleModel: 'gemini-3.1-flash-image-preview' },
    'google/gemini-3.1-flash-image': {
      provider: 'google',
      openRouterModel: 'google/gemini-3.1-flash-image',
      billingModel: 'gemini-3.1-flash-image',
    },
    'openai/gpt-5.4-image-2': { provider: 'openai', openRouterModel: 'openai/gpt-5.4-image-2' },
  }

  readonly MODEL_ALIASES: Record<string, string> = {
    'nano banana': 'google/gemini-3.1-flash-image',
    'nano banana 2': 'google/gemini-3.1-flash-image',
    'gemini-3.1-flash-image': 'google/gemini-3.1-flash-image',
    'gpt image': 'openai/gpt-5.4-image-2',
    'gpt image 2': 'openai/gpt-5.4-image-2',
  }

  collectStringUrlsFromInput(input: Record<string, unknown>, keys: string[]): string[] {
    const out: string[] = []
    for (const key of keys) {
      const v = input[key]
      if (Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === 'string' && item.trim()) out.push(item.trim())
        }
      }
    }
    return out
  }

  async fetchInputImagesFromInput(
    target: Record<string, any>,
    input: Record<string, unknown>,
  ): Promise<Array<{ base64: string; mimeType: string }>> {
    const rawImageUrls = this.collectStringUrlsFromInput(input, ['input_image_urls'])
    if (typeof input.input_image_url === 'string' && input.input_image_url.trim()) {
      rawImageUrls.unshift(input.input_image_url.trim())
    }
    const inputImages: Array<{ base64: string; mimeType: string }> = []
    for (const imgUrl of rawImageUrls.slice(0, 14)) {
      try {
        const imgRes = await fetch(imgUrl)
        if (!imgRes.ok) {
          target.logger.warn(`[Image] Failed to fetch input image ${imgUrl}: ${imgRes.status}`)
          continue
        }
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
        inputImages.push({
          base64: imgBuffer.toString('base64'),
          mimeType: imgRes.headers.get('content-type') || 'image/jpeg',
        })
      } catch (fetchErr) {
        target.logger.warn(`[Image] Failed to fetch input image ${imgUrl}: ${fetchErr}`)
      }
    }
    return inputImages
  }

  resolveSeedance2BillingModel(input: Record<string, unknown>): string {
    const refVideos = this.collectStringUrlsFromInput(input, [
      'reference_video_urls',
      'reference_videos',
    ])
    return refVideos.length > 0 ? 'seedance-2-video-in' : 'seedance-2-text'
  }

  buildReplicateInput(
    model: string,
    input: Record<string, unknown>,
    duration: number,
    aspectRatio: string,
  ): Record<string, unknown> {
    switch (model) {
      case 'kling-v3': {
        const payload: Record<string, unknown> = {
          prompt: input.prompt,
          duration,
          aspect_ratio: aspectRatio,
        }
        if (input.image_url) payload.image = input.image_url
        if (input.end_image_url) payload.end_image = input.end_image_url
        if (input.mode) payload.mode = input.mode
        if (input.generate_audio !== undefined)
          payload.generate_audio = Boolean(input.generate_audio)
        if (input.negative_prompt) payload.negative_prompt = input.negative_prompt
        if (input.multi_prompt) payload.multi_prompt = input.multi_prompt
        return payload
      }
      case 'grok-imagine-video': {
        const payload: Record<string, unknown> = {
          prompt: input.prompt,
          duration,
          aspect_ratio: aspectRatio,
        }
        if (input.image_url) payload.image = input.image_url
        if (input.video_url) payload.video = input.video_url
        if (input.resolution) payload.resolution = input.resolution
        return payload
      }
      case 'gen-4.5': {
        const payload: Record<string, unknown> = {
          prompt: input.prompt,
          duration,
          aspect_ratio: aspectRatio,
        }
        if (input.image_url) payload.image = input.image_url
        if (input.seed !== undefined) payload.seed = Number(input.seed)
        return payload
      }
      case 'fabric-1.0': {
        const payload: Record<string, unknown> = {}
        if (input.image_url) payload.image = input.image_url
        if (input.audio_url) payload.audio = input.audio_url
        payload.resolution = (input.resolution as string) ?? '720p'
        return payload
      }
      case 'seedance-2': {
        const payload: Record<string, unknown> = {
          prompt: input.prompt,
          duration,
          aspect_ratio: aspectRatio,
          resolution: (input.resolution as string) ?? '720p',
        }
        if (input.image_url) payload.image = input.image_url
        if (input.last_frame_url) payload.last_frame_image = input.last_frame_url
        const refImages = this.collectStringUrlsFromInput(input, [
          'reference_image_urls',
          'reference_images',
        ])
        if (refImages.length) payload.reference_images = refImages
        const refVideos = this.collectStringUrlsFromInput(input, [
          'reference_video_urls',
          'reference_videos',
        ])
        if (refVideos.length) payload.reference_videos = refVideos
        const refAudios = this.collectStringUrlsFromInput(input, [
          'reference_audio_urls',
          'reference_audios',
        ])
        if (refAudios.length) payload.reference_audios = refAudios
        if (input.generate_audio !== undefined)
          payload.generate_audio = Boolean(input.generate_audio)
        if (input.seed !== undefined) payload.seed = Number(input.seed)
        return payload
      }
      default: {
        const payload: Record<string, unknown> = {
          prompt: input.prompt,
          aspect_ratio: aspectRatio,
          duration,
        }
        if (input.generate_audio !== undefined)
          payload.generate_audio = Boolean(input.generate_audio)
        else payload.generate_audio = false
        if (input.image_url) payload.image = input.image_url
        if (input.last_frame_url) payload.last_frame = input.last_frame_url
        if (input.negative_prompt) payload.negative_prompt = input.negative_prompt
        if (input.resolution) payload.resolution = input.resolution
        if (input.seed !== undefined) payload.seed = Number(input.seed)
        return payload
      }
    }
  }

  normalizeGoogleImageAspectRatio(aspectRatio: string): string | undefined {
    const ar = (aspectRatio || '').trim()
    if (ar === '4:5') return '3:4'
    if (ar === '1:1' || ar === '3:4' || ar === '4:3' || ar === '9:16' || ar === '16:9') return ar
    return undefined
  }

  normalizeGoogleVideoAspectRatio(aspectRatio: string): string | undefined {
    const ar = (aspectRatio || '').trim()
    if (ar === '9:16' || ar === '16:9') return ar
    return undefined
  }

  async generateGoogleImageViaRest(
    target: Record<string, any>,
    model: string,
    prompt: string,
    aspectRatio: string,
    inputImages?: Array<{ base64: string; mimeType: string }>,
  ): Promise<{ imageBytesB64: string; mimeType: string }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${target.geminiApiKey}`
    const parts: Array<Record<string, unknown>> = []
    if (inputImages?.length) {
      for (const img of inputImages) {
        parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } })
      }
    }
    parts.push({ text: `${prompt}\n\nAspect ratio: ${aspectRatio}` })
    const body = {
      contents: [{ parts }],
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
      throw new Error(rawText || `Image generation failed: ${response.status}`)
    }

    let data: unknown
    try {
      data = JSON.parse(rawText)
    } catch {
      throw new Error('Invalid JSON in image generation response')
    }

    const typedData = data as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { mimeType?: string; data?: string }
          }>
        }
      }>
    }
    const imagePart = typedData.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.data,
    )
    if (!imagePart?.inlineData?.data) {
      throw new Error('No output from Google image generation')
    }

    return {
      imageBytesB64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? 'image/png',
    }
  }

  isImageRateLimitError(msg: string): boolean {
    const lower = msg.toLowerCase()
    return (
      lower.includes('429') ||
      lower.includes('rate') ||
      lower.includes('resource_exhausted') ||
      lower.includes('quota')
    )
  }

  private extractOpenRouterImagePart(
    parts: OpenRouterImagePart[] | undefined,
  ): { imageBytesB64: string; mimeType: string } | null {
    const imagePart = parts?.find(
      (p) => p.inlineData?.data || (p.image_url?.url && p.image_url.url.startsWith('data:')),
    )
    if (imagePart?.inlineData?.data) {
      return {
        imageBytesB64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png',
      }
    }
    if (imagePart?.image_url?.url) {
      const match = imagePart.image_url.url.match(/^data:([^;]+);base64,(.+)$/)
      if (match) return { imageBytesB64: match[2], mimeType: match[1] || 'image/png' }
    }
    return null
  }

  async generateImageViaOpenRouter(
    target: Record<string, any>,
    prompt: string,
    aspectRatio: string,
    modelOverride?: string,
    inputImages?: Array<{ base64: string; mimeType: string }>,
    billingContext?: {
      userId: string
      orgId?: string | null
      campaignId?: string | null
      conversationId?: string | null
    },
  ): Promise<{
    imageBytesB64: string
    mimeType: string
    usage?: { input: number; output: number }
  }> {
    const url = `${target.OPENROUTER_BASE_URL}/chat/completions`
    const orModel = modelOverride ?? target.OPENROUTER_IMAGE_MODEL
    const providerBillingAttempts = target.providerBillingAttempts as
      | ProviderBillingAttemptsService
      | undefined
    if (!providerBillingAttempts) {
      throw new Error('Provider billing attempts service is required for OpenRouter media generation')
    }

    const attemptKey = [
      'artifact-media-openrouter',
      billingContext?.conversationId ?? 'conversationless',
      randomUUID(),
    ].join(':')
    const baseAttempt = {
      attemptKey,
      sourceApp: 'agent-api',
      sourcePath: 'artifacts/artifact-legacy-media-provider',
      billingOwnerType: 'platform' as const,
      userId: billingContext?.userId ?? null,
      orgId: billingContext?.orgId ?? null,
      campaignId: billingContext?.campaignId ?? null,
      conversationId: billingContext?.conversationId ?? null,
      feature: 'media',
      action: 'generate_image',
      serviceType: 'image',
      provider: 'openrouter',
      requestedModel: orModel,
      metadata: {
        aspect_ratio: aspectRatio,
        fixed_price_customer_billing: true,
        input_images_count: inputImages?.length ?? 0,
      },
    }
    await providerBillingAttempts.recordAttempt(baseAttempt)
    const requestContent = inputImages?.length
      ? [
          { type: 'text', text: prompt },
          ...inputImages.map((image) => ({
            type: 'image_url',
            image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
          })),
        ]
      : prompt

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${target.openRouterApiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: orModel,
        messages: [{ role: 'user', content: requestContent }],
        modalities: ['image', 'text'],
        image_config: { aspect_ratio: aspectRatio },
        stream: false,
      }),
    })
    const providerGenerationId = readOpenRouterGenerationId(response.headers)
    const providerRequestId = readOpenRouterRequestId(response.headers)

    const rawText = await response.text()
    if (!response.ok) {
      target.logger.error(`[Image] OpenRouter error ${response.status}: ${rawText}`)
      throw new Error(`OpenRouter image generation failed: ${response.status}`)
    }

    let data: {
      id?: string
      model?: string
      choices?: Array<{
        message?: {
          content?:
            | string
            | Array<{
                type?: string
                image_url?: { url?: string }
                inlineData?: { mimeType?: string; data?: string }
              }>
          images?: OpenRouterImagePart[]
        }
      }>
      usage?: {
        prompt_tokens?: number
        completion_tokens?: number
        total_tokens?: number
        cost?: number
        total_cost?: number
      }
    }
    try {
      data = JSON.parse(rawText)
    } catch {
      throw new Error('Invalid JSON in OpenRouter image response')
    }

    const usage = data.usage
      ? { input: data.usage.prompt_tokens ?? 0, output: data.usage.completion_tokens ?? 0 }
      : undefined
    const normalizedUsage = normalizeProviderBillingUsage({
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
    })
    await providerBillingAttempts.recordAttempt({
      ...baseAttempt,
      resolvedModel: data.model ?? orModel,
      providerGenerationId: providerGenerationId ?? data.id ?? null,
      providerRequestId,
      inputTokens: normalizedUsage.input,
      outputTokens: normalizedUsage.output,
      cacheReadTokens: normalizedUsage.cacheRead,
      cacheWriteTokens: normalizedUsage.cacheWrite,
      totalTokens: normalizedUsage.totalTokens,
      providerCostUsd:
        coerceFiniteNumber(data.usage?.total_cost) ?? coerceFiniteNumber(data.usage?.cost),
      metadata: {
        ...baseAttempt.metadata,
        openrouter_response_id: data.id ?? null,
        openrouter_usage: data.usage ?? null,
      },
    })

    const message = data.choices?.[0]?.message
    const imageFromImages = this.extractOpenRouterImagePart(message?.images)
    if (imageFromImages) {
      target.logger.log(`[Image] Generated via OpenRouter (message.images)`)
      return { ...imageFromImages, usage }
    }

    const content = message?.content
    if (Array.isArray(content)) {
      const imageFromContent = this.extractOpenRouterImagePart(content)
      if (imageFromContent) {
        target.logger.log(`[Image] Generated via OpenRouter (content image)`)
        return { ...imageFromContent, usage }
      }
    }

    if (typeof content === 'string') {
      const dataUrlMatch = content.match(/data:([^;]+);base64,([A-Za-z0-9+/=]+)/)
      if (dataUrlMatch) {
        target.logger.log(`[Image] Generated via OpenRouter (string data URL)`)
        return { imageBytesB64: dataUrlMatch[2], mimeType: dataUrlMatch[1] || 'image/png', usage }
      }
    }

    throw new Error('No image data in OpenRouter response')
  }
}
