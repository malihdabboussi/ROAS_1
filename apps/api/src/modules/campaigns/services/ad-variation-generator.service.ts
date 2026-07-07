/**
 * Ad Variation Generator Service
 *
 * Generates image variations using Google Gemini, applying variation strategies
 * ported from adlab.io. Each strategy produces a meaningfully different version
 * for A/B testing.
 */
import { Injectable, Logger, Optional } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CampaignAdVariationMediaRepository } from '../repositories/campaign-ad-variation-media.repository'

export interface VariationResult {
  id: string
  imageUrl: string
  strategy: string
  assetId: string | null
}

export interface CopyVariation {
  headline: string
  primaryText: string
  description: string
}

export interface CopyGenerationResult {
  variations: CopyVariation[]
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    cachedContentTokenCount: number
    totalTokenCount: number
  }
}

export const VARIATION_STRATEGIES = [
  {
    name: 'color_mood_shift',
    prompt:
      'DRAMATICALLY shift the color mood — if the original is warm/golden, make this cool with blues and teals. If cool, shift to warm oranges and ambers. If vibrant, make it muted and sophisticated. If muted, make it bold and saturated. The color change must be immediately obvious.',
  },
  {
    name: 'layout_rearrangement',
    prompt:
      'Reimagine the layout structure completely. Move text to a different position (if top, move to bottom. If centered, align left or right). Adjust the subject placement and visual hierarchy. Keep all the same elements but arrange them in a noticeably different way.',
  },
  {
    name: 'background_treatment',
    prompt:
      'Transform the background treatment. If it has a gradient, use a solid color or texture instead. If busy or detailed, simplify to clean minimal. If minimal, add environmental depth or a bold gradient. If solid, add a dynamic pattern or atmospheric effect.',
  },
  {
    name: 'typography_style',
    prompt:
      'Change the typography and text treatment significantly. If bold and impactful, make it elegant and refined. If subtle, make it bolder with stronger hierarchy. Add or adjust text effects like shadows, outlines, glows, or backgrounds behind text.',
  },
  {
    name: 'visual_intensity',
    prompt:
      'Shift the visual intensity dramatically. If the original is high-energy, bold, and aggressive, make this version calmer, cleaner, and more sophisticated. If the original is minimal and quiet, make this version more dynamic, attention-grabbing, and energetic.',
  },
  {
    name: 'framing_change',
    prompt:
      'Change the framing and composition approach. If tightly cropped, pull out wider with more context. If wide shot, zoom in tighter on the key subject. Switch from centered composition to rule-of-thirds, or vice versa. Adjust the visual balance.',
  },
]

export const REGENERATION_PRESETS = [
  {
    name: 'add_urgency',
    label: 'Add Urgency',
    prompt:
      'Add urgency and scarcity elements to this ad. Include things like "Limited Spots Available" or "Only X Seats Left", countdown or deadline text ("Ends Friday", "3 Days Left"), "Early Bird Pricing" or time-sensitive language. Make the viewer feel they need to act NOW or miss out.',
  },
  {
    name: 'stronger_hook',
    label: 'Stronger Hook',
    prompt:
      'Rewrite the headline to be more attention-grabbing and scroll-stopping: Lead with a specific number or result, make a bold claim or promise, call out the target audience directly, use pattern interrupt language. The headline should make someone STOP scrolling.',
  },
  {
    name: 'feature_offer',
    label: 'Feature Offer',
    prompt:
      "Make the offer and price more prominent and compelling: Make the price larger and more visible, add value framing or comparison, show what's included, make the deal feel irresistible. The viewer should immediately understand the value.",
  },
  {
    name: 'bolder_cta',
    label: 'Bolder CTA',
    prompt:
      'Make the call-to-action much larger, bolder, and more compelling: Significantly increase CTA size, use action-oriented text ("Get Instant Access", "Claim Your Spot"), add urgency to the CTA text, make it impossible to miss. The CTA should be the most prominent clickable element.',
  },
  {
    name: 'more_contrast',
    label: 'More Contrast',
    prompt:
      'Increase the visual impact and contrast: Bolder, more saturated colors, stronger contrast between text and background, more dramatic visual effects, make all text highly readable. This ad should DEMAND attention in a busy feed.',
  },
  {
    name: 'different_angle',
    label: 'Different Angle',
    prompt:
      'Create a completely different version of this ad: Try a different headline approach, change the visual layout significantly, test a different emotional angle, experiment with a different style. Give me something fresh that might outperform the original.',
  },
]

@Injectable()
export class AdVariationGeneratorService {
  private readonly logger = new Logger(AdVariationGeneratorService.name)

  private readonly GOOGLE_IMAGE_MODEL = 'gemini-3.1-flash-image-preview'
  private readonly GOOGLE_FALLBACK_MODEL = 'gemini-3-pro-image-preview'

  constructor(
    @Optional()
    private readonly mediaRepo: CampaignAdVariationMediaRepository = new CampaignAdVariationMediaRepository(),
  ) {}

  /**
   * Generate N variations of a base image using Gemini.
   */
  async generateVariations(
    supabase: SupabaseClient,
    userId: string,
    baseImageUrl: string,
    baseImageAssetId: string | undefined,
    variationCount: number,
    campaignId: string | null,
    customPrompt?: string,
    orgId?: string | null,
  ): Promise<VariationResult[]> {
    const strategies = Array.from({ length: variationCount }, (_, i) => ({
      index: i,
      ...VARIATION_STRATEGIES[i % VARIATION_STRATEGIES.length],
    }))

    const settled = await Promise.allSettled(
      strategies.map((strategy) =>
        this.generateSingleVariation(
          supabase,
          userId,
          baseImageUrl,
          strategy.name,
          customPrompt
            ? `${customPrompt}\n\nAlso apply this variation strategy: ${strategy.prompt}`
            : strategy.prompt,
          campaignId,
        ),
      ),
    )

    return settled.map((result, i) => {
      if (result.status === 'fulfilled') return result.value
      this.logger.error(
        `[generateVariations] Strategy ${strategies[i].name} failed: ${result.reason instanceof Error ? result.reason.message : 'unknown'}`,
      )
      return {
        id: `fallback-${Date.now()}-${i}`,
        imageUrl: baseImageUrl,
        strategy: strategies[i].name,
        assetId: baseImageAssetId ?? null,
      }
    })
  }

  /**
   * Regenerate a single variation with a specific preset or custom prompt.
   */
  async regenerateVariation(
    supabase: SupabaseClient,
    userId: string,
    baseImageUrl: string,
    prompt: string,
    campaignId: string | null,
    orgId?: string | null,
  ): Promise<VariationResult> {
    return this.generateSingleVariation(
      supabase,
      userId,
      baseImageUrl,
      'custom',
      prompt,
      campaignId,
    )
  }

  async generateAdCopy(params: {
    imageUrl?: string
    context?: string
    count: number
  }): Promise<CopyGenerationResult> {
    const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured')
    }

    const systemPrompt = `You are an expert direct-response ad copywriter. Generate ${params.count} distinct ad copy variations.

Each variation must include:
- headline: A scroll-stopping headline (5-12 words)
- primaryText: The main ad body text (50-150 words). Use short paragraphs, line breaks, and action-oriented language.
- description: A short supporting description (10-20 words)

Rules:
- Write in second person ("you", "your")
- Be specific with numbers and results
- Include a clear call-to-action
- Each variation should take a DIFFERENT angle (urgency, social proof, benefit-focused, curiosity, etc.)
- NEVER use generic phrases like "unlock your potential", "transform your life", "game-changer", "revolutionary", "journey starts here"

${params.context ? `Context about the ad/product: ${params.context}` : ''}

Respond with ONLY valid JSON in this format:
{
  "variations": [
    { "headline": "...", "primaryText": "...", "description": "..." }
  ]
}`

    const parts: Array<Record<string, unknown>> = [{ text: systemPrompt }]

    if (params.imageUrl) {
      try {
        const imageResponse = await fetch(params.imageUrl)
        if (imageResponse.ok) {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
          const imageBase64 = imageBuffer.toString('base64')
          const mimeType = imageResponse.headers.get('content-type') || 'image/png'
          parts.push({ inlineData: { mimeType, data: imageBase64 } })
        }
      } catch {
        this.logger.warn('[generateAdCopy] Failed to fetch image, continuing without it')
      }
    }

    const copyModel = 'gemini-3.5-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${copyModel}:generateContent?key=${geminiApiKey}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Copy generation failed: ${errText.slice(0, 200)}`)
    }

    const json = await response.json()
    const textPart = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const usageMeta = json?.usageMetadata

    let variations: CopyVariation[] = []
    try {
      const parsed = JSON.parse(textPart)
      variations = parsed.variations ?? []
    } catch {
      this.logger.warn('[generateAdCopy] Failed to parse copy response')
    }

    return {
      variations,
      usageMetadata: usageMeta
        ? {
            promptTokenCount: usageMeta.promptTokenCount ?? 0,
            candidatesTokenCount: usageMeta.candidatesTokenCount ?? 0,
            cachedContentTokenCount: usageMeta.cachedContentTokenCount ?? 0,
            totalTokenCount: usageMeta.totalTokenCount ?? 0,
          }
        : undefined,
    }
  }

  private async generateSingleVariation(
    supabase: SupabaseClient,
    userId: string,
    baseImageUrl: string,
    strategyName: string,
    variationPrompt: string,
    campaignId: string | null,
  ): Promise<VariationResult> {
    const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured')
    }

    // Build the full prompt: reference the base image and apply the variation
    const fullPrompt = `You are an expert ad creative designer. Look at this advertisement image and create a VARIATION of it.

The variation should keep the same core message, product, and brand but apply this specific change:

${variationPrompt}

IMPORTANT: The result must still be a professional advertisement. Keep any text readable. Maintain the ad's purpose while making the requested changes visually obvious.`

    // Fetch the base image as base64
    const imageResponse = await fetch(baseImageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch base image: ${imageResponse.status}`)
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
    const imageBase64 = imageBuffer.toString('base64')
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/png'

    // Call Gemini with the base image + variation prompt
    let imageBytesB64: string | null = null
    let resultMimeType = 'image/png'

    for (const model of [this.GOOGLE_IMAGE_MODEL, this.GOOGLE_FALLBACK_MODEL]) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`
        const body = {
          contents: [
            {
              parts: [
                { text: fullPrompt },
                {
                  inlineData: {
                    mimeType: imageMimeType,
                    data: imageBase64,
                  },
                },
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

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Gemini ${model} failed: ${response.status} - ${errText.slice(0, 200)}`)
        }

        const json = await response.json()
        const parts = json?.candidates?.[0]?.content?.parts ?? []
        for (const part of parts) {
          if (part.inlineData?.data) {
            imageBytesB64 = part.inlineData.data
            resultMimeType = part.inlineData.mimeType || 'image/png'
            break
          }
        }

        if (imageBytesB64) break
      } catch (err) {
        this.logger.warn(
          `[generateSingleVariation] ${model} failed: ${err instanceof Error ? err.message : 'unknown'}`,
        )
        continue
      }
    }

    if (!imageBytesB64) {
      throw new Error('All Gemini models failed to generate a variation')
    }

    // Upload to Supabase Storage
    const ext = resultMimeType.includes('jpeg') || resultMimeType.includes('jpg') ? 'jpg' : 'png'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const storagePath = `${userId}/images/${fileName}`

    const imageBytes = Buffer.from(imageBytesB64, 'base64')

    await this.mediaRepo.uploadVariationImage(supabase, storagePath, imageBytes, resultMimeType)

    // Create signed URL (1 year)
    const publicUrl = await this.mediaRepo.createVariationSignedUrl(supabase, storagePath)

    // Create media_assets record
    const { data: asset, error: assetError } = await this.mediaRepo.createMediaAsset(supabase, {
      user_id: userId,
      campaign_id: campaignId,
      name: `Variation - ${strategyName}`,
      original_filename: fileName,
      file_path: storagePath,
      bucket_name: 'media',
      mime_type: resultMimeType,
      asset_type: 'image',
      file_size: imageBytes.length,
      source: 'generated',
      source_model: this.GOOGLE_IMAGE_MODEL,
      source_prompt: variationPrompt.slice(0, 500),
      public_url: publicUrl,
      tags: ['ai-generated', 'ad-variation', strategyName],
    })

    if (assetError) {
      this.logger.warn(`[generateSingleVariation] Asset insert failed: ${assetError.message}`)
    }

    return {
      id: asset?.id ?? `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      imageUrl: publicUrl,
      strategy: strategyName,
      assetId: asset?.id ?? null,
    }
  }
}
