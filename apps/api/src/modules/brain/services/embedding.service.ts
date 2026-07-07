import { createHash } from 'crypto'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CreditsService } from '../../billing/services/credits.service'

const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-2'
const LLM_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'
const EMBEDDING_DIMENSIONS = 768
const DEFAULT_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
const LLM_MODEL_FOR_PRICING = 'gemini-3.5-flash'

export interface GeminiTokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type BrainGeminiBillingContext = { userId: string; orgId?: string | null }

export type GeminiEmbeddingTaskType =
  | 'RETRIEVAL_QUERY'
  | 'RETRIEVAL_DOCUMENT'
  | 'SEMANTIC_SIMILARITY'
  | 'CLASSIFICATION'
  | 'CLUSTERING'

export type GeminiEmbeddingPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }

export interface GeminiEmbeddingOptions {
  taskType?: GeminiEmbeddingTaskType
  outputDimensionality?: number
  model?: string
  billing?: BrainGeminiBillingContext
}

/**
 * Embedding Service (US-007)
 *
 * Gemini-based embedding generation and LLM calls.
 * Used for memory/snapshot embeddings, crystallization, extraction,
 * and connection classification.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(CreditsService) private readonly creditsService: CreditsService | null,
  ) {}

  // ── Embedding generation ──────────────────────────────────────────────

  /**
   * Generate a 768-dimension embedding via Gemini gemini-embedding-2.
   * Returns null if API key not configured or API call fails — does NOT throw.
   */
  async getEmbedding(text: string, options: GeminiEmbeddingOptions = {}): Promise<number[] | null> {
    const result = await this.getEmbeddingWithUsage(text, options)
    return result.embedding
  }

  async getEmbeddingWithUsage(
    text: string,
    options: GeminiEmbeddingOptions = {},
  ): Promise<{ embedding: number[] | null; usage: GeminiTokenUsage }> {
    const cleanedText = text.trim()
    if (!cleanedText) {
      this.logger.warn('Skipping embedding for empty text input')
      return { embedding: null, usage: { ...DEFAULT_USAGE } }
    }
    return this.getMultimodalEmbeddingWithUsage([{ text: cleanedText }], options)
  }

  async getMultimodalEmbedding(
    parts: GeminiEmbeddingPart[],
    options: GeminiEmbeddingOptions = {},
  ): Promise<number[] | null> {
    const result = await this.getMultimodalEmbeddingWithUsage(parts, options)
    return result.embedding
  }

  async getMultimodalEmbeddingWithUsage(
    parts: GeminiEmbeddingPart[],
    options: GeminiEmbeddingOptions = {},
  ): Promise<{ embedding: number[] | null; usage: GeminiTokenUsage }> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not configured — skipping embedding')
      return { embedding: null, usage: { ...DEFAULT_USAGE } }
    }
    if (!parts.length) {
      this.logger.warn('Skipping embedding for empty parts input')
      return { embedding: null, usage: { ...DEFAULT_USAGE } }
    }

    const model =
      options.model || this.config.get<string>('EMBEDDING_MODEL') || DEFAULT_EMBEDDING_MODEL
    const outputDimensionality = options.outputDimensionality ?? EMBEDDING_DIMENSIONS
    let chargingProviderUsage = false

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts },
            outputDimensionality,
            ...(options.taskType ? { taskType: options.taskType } : {}),
          }),
        },
      )

      if (!res.ok) {
        const errorBody = await res.text()
        this.logger.warn(
          `Gemini embedding API error: ${res.status} ${res.statusText} - ${errorBody.slice(0, 500)}`,
        )
        return { embedding: null, usage: { ...DEFAULT_USAGE } }
      }

      const data = await res.json()
      const embedding = data.embedding?.values ?? null
      const usage = this.parseUsageFromGeminiResponse(data)
      const costSource = usage.totalTokens > 0 ? 'runtime_tokens' : 'char_estimate'
      let chargeUsage = usage
      if (usage.totalTokens <= 0 && options.billing?.userId) {
        chargeUsage = {
          inputTokens: Math.ceil(JSON.stringify(parts).length / 4),
          outputTokens: 0,
          totalTokens: Math.ceil(JSON.stringify(parts).length / 4),
        }
      }
      chargingProviderUsage = true
      await this.chargeBrainUsage(options.billing, model, chargeUsage, 'embedding', costSource)
      chargingProviderUsage = false

      return { embedding, usage }
    } catch (err) {
      if (chargingProviderUsage) {
        this.logger.error(
          `Brain Gemini embedding credit tracking failed after provider usage was incurred: ${err instanceof Error ? err.message : 'Unknown'}`,
        )
        throw err
      }
      this.logger.warn(`Gemini embedding failed: ${err instanceof Error ? err.message : 'Unknown'}`)
      return { embedding: null, usage: { ...DEFAULT_USAGE } }
    }
  }

  async getImageEmbedding(
    base64: string,
    mimeType: string,
    caption?: string,
    options: GeminiEmbeddingOptions = {},
  ): Promise<number[] | null> {
    const cleanedData = base64.trim()
    const cleanedMimeType = mimeType.trim()
    if (!cleanedData || !cleanedMimeType) {
      this.logger.warn('Skipping image embedding for empty image payload')
      return null
    }

    const parts: GeminiEmbeddingPart[] = []
    if (caption?.trim()) parts.push({ text: caption.trim() })
    parts.push({
      inline_data: {
        mime_type: cleanedMimeType,
        data: cleanedData,
      },
    })

    return this.getMultimodalEmbedding(parts, options)
  }

  // ── LLM calls ─────────────────────────────────────────────────────────

  /**
   * Call Gemini 2.0 Flash for structured JSON output.
   * Used for crystallization, extraction, connection classification.
   * Temperature: 0.2, responseMimeType: application/json.
   */
  async callGemini(
    prompt: string,
    systemPrompt?: string,
    billing?: BrainGeminiBillingContext,
  ): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] }
    }

    const res = await fetch(`${LLM_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`Gemini LLM API error: ${res.status} ${res.statusText}`)
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty response from Gemini')

    const meta = data.usageMetadata as { totalTokenCount?: number } | undefined
    const usage = this.parseUsageFromGeminiResponse(data)
    const costSource =
      meta && Number(meta.totalTokenCount ?? 0) > 0 ? 'runtime_tokens' : 'char_estimate'
    let chargeUsage = usage
    if (usage.totalTokens <= 0 && billing?.userId) {
      const inputTokens = Math.ceil(prompt.length / 4)
      const outputTokens = Math.ceil(text.length / 4)
      chargeUsage = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      }
    }
    await this.chargeBrainUsage(
      billing,
      LLM_MODEL_FOR_PRICING,
      chargeUsage,
      'gemini_llm',
      costSource,
    )

    return text
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  /**
   * Build embedding text from snapshot fields.
   * Concatenates name + core + one_liner with " — " separator.
   */
  buildEmbeddingText(snapshot: {
    name?: string
    core?: string
    one_liner?: string
    [key: string]: unknown
  }): string {
    return [snapshot.name, snapshot.core, snapshot.one_liner].filter(Boolean).join(' — ')
  }

  /**
   * SHA-256 hash of trimmed lowercase content.
   */
  computeContentHash(text: string): string {
    return createHash('sha256').update(text.trim().toLowerCase()).digest('hex')
  }

  private async chargeBrainUsage(
    billing: BrainGeminiBillingContext | undefined,
    modelName: string,
    usage: GeminiTokenUsage,
    action: 'embedding' | 'gemini_llm',
    costSource: 'runtime_tokens' | 'char_estimate',
  ): Promise<void> {
    if (!billing?.userId || usage.totalTokens <= 0) return
    if (!this.creditsService) {
      throw new Error('Credits service is required for Brain Gemini billing')
    }
    await this.creditsService.processDirectTextUsage({
      userId: billing.userId,
      orgId: billing.orgId ?? undefined,
      feature: 'brain',
      action,
      modelName,
      usage: {
        input: usage.inputTokens,
        output: usage.outputTokens,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: usage.totalTokens,
      },
      costSource,
    })
  }

  private parseUsageFromGeminiResponse(data: any): GeminiTokenUsage {
    const usage = data?.usageMetadata ?? {}
    const inputTokens = Number(usage.promptTokenCount ?? 0)
    const outputTokens = Number(usage.candidatesTokenCount ?? 0)
    const totalTokens = Number(usage.totalTokenCount ?? inputTokens + outputTokens)
    return {
      inputTokens: Number.isFinite(inputTokens) ? inputTokens : 0,
      outputTokens: Number.isFinite(outputTokens) ? outputTokens : 0,
      totalTokens: Number.isFinite(totalTokens) ? totalTokens : 0,
    }
  }
}
