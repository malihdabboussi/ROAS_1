import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CreditsService } from '../../billing/services/credits.service'

const OCR_MODEL = 'gemini-3.5-flash'
const OCR_URL = `https://generativelanguage.googleapis.com/v1beta/models/${OCR_MODEL}:generateContent`

export interface GeminiOcrBillingContext {
  userId: string
  orgId?: string
  conversationId?: string
  campaignId?: string
  feature: string
  action?: string
}

@Injectable()
export class GeminiOcrService {
  private readonly logger = new Logger(GeminiOcrService.name)

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly creditsService?: CreditsService,
  ) {}

  async extractTextFromImage(
    buffer: Buffer,
    mimeType: string,
    filename?: string,
    billing?: GeminiOcrBillingContext,
  ): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    if (!buffer.length) {
      throw new Error('Cannot OCR empty image buffer')
    }

    const prompt = `Extract all readable text from this image.
Return only the extracted text as plain UTF-8 text.
Do not summarize.
Do not add markdown.
If no readable text exists, return an empty string.`

    const response = await fetch(`${OCR_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: buffer.toString('base64'),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 32000,
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      this.logger.error(
        `Gemini OCR failed ${response.status} ${response.statusText} for ${filename ?? 'image'}: ${errorBody.slice(0, 500)}`,
      )
      throw new Error(`Gemini OCR API error: ${response.status} ${response.statusText}`)
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        finishReason?: string
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
      usageMetadata?: {
        promptTokenCount?: number
        candidatesTokenCount?: number
        totalTokenCount?: number
      }
    }

    if (billing && this.creditsService && payload.usageMetadata) {
      const u = payload.usageMetadata
      const totalTokens =
        u.totalTokenCount ?? (u.promptTokenCount ?? 0) + (u.candidatesTokenCount ?? 0)
      if (totalTokens > 0) {
        await this.creditsService.processDirectTextUsage({
          userId: billing.userId,
          orgId: billing.orgId,
          conversationId: billing.conversationId,
          campaignId: billing.campaignId,
          feature: billing.feature,
          action: billing.action ?? 'document_ocr',
          modelName: OCR_MODEL,
          usage: {
            input: u.promptTokenCount ?? 0,
            output: u.candidatesTokenCount ?? 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens,
          },
          costSource: 'runtime_tokens',
        })
      }
    }

    const finishReason = payload.candidates?.[0]?.finishReason ?? 'unknown'
    const outputTokens = payload.usageMetadata?.candidatesTokenCount ?? 0
    this.logger.log(
      `Gemini OCR response for ${filename ?? 'image'} finished with reason=${finishReason} output_tokens=${outputTokens}`,
    )

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n')
    return (text ?? '').trim()
  }

  async extractTextFromDocument(
    buffer: Buffer,
    mimeType: string,
    filename?: string,
    billing?: GeminiOcrBillingContext,
    options?: { prompt?: string },
  ): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    if (!buffer.length) {
      throw new Error('Cannot OCR empty document buffer')
    }

    const prompt =
      options?.prompt ??
      `Extract all readable text from this document.
Return only the extracted text as plain UTF-8 text.
Do not summarize.
Do not add markdown.
If no readable text exists, return an empty string.
File: ${filename ?? 'document'}`

    const response = await fetch(`${OCR_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: buffer.toString('base64'),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 32000,
        },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      this.logger.error(
        `Gemini document OCR failed ${response.status} ${response.statusText} for ${filename ?? 'document'}: ${errorBody.slice(0, 500)}`,
      )
      throw new Error(`Gemini OCR API error: ${response.status} ${response.statusText}`)
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        finishReason?: string
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
      usageMetadata?: {
        promptTokenCount?: number
        candidatesTokenCount?: number
        totalTokenCount?: number
      }
    }

    if (billing && this.creditsService && payload.usageMetadata) {
      const u = payload.usageMetadata
      const totalTokens =
        u.totalTokenCount ?? (u.promptTokenCount ?? 0) + (u.candidatesTokenCount ?? 0)
      if (totalTokens > 0) {
        await this.creditsService.processDirectTextUsage({
          userId: billing.userId,
          orgId: billing.orgId,
          conversationId: billing.conversationId,
          campaignId: billing.campaignId,
          feature: billing.feature,
          action: billing.action ?? 'document_ocr',
          modelName: OCR_MODEL,
          usage: {
            input: u.promptTokenCount ?? 0,
            output: u.candidatesTokenCount ?? 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens,
          },
          costSource: 'runtime_tokens',
        })
      }
    }

    const finishReason = payload.candidates?.[0]?.finishReason ?? 'unknown'
    const outputTokens = payload.usageMetadata?.candidatesTokenCount ?? 0
    this.logger.log(
      `Gemini document OCR response for ${filename ?? 'document'} finished with reason=${finishReason} output_tokens=${outputTokens}`,
    )

    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('\n')
    return (text ?? '').trim()
  }
}
