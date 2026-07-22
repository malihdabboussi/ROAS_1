import { createHash } from 'crypto'
import { Inject, Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { resolveGeminiApiKeys, shouldTryNextGeminiApiKey } from '@vibey/api-shared'
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

export type GeminiTextResult = {
  text: string
  usage: GeminiTokenUsage
  providerCostUsd: number
}

export type GeminiTextOptions = {
  maxOutputTokens?: number
  responseSchema?: Record<string, unknown>
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high'
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
  billingBatch?: BrainEmbeddingBillingBatch
}

export type BrainEmbeddingBillingBatch = {
  billing: BrainGeminiBillingContext
  modelName: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  requestCount: number
  costSource: 'runtime_tokens' | 'char_estimate'
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

  createEmbeddingBillingBatch(billing: BrainGeminiBillingContext): BrainEmbeddingBillingBatch {
    return {
      billing,
      modelName: this.config.get<string>('EMBEDDING_MODEL') || DEFAULT_EMBEDDING_MODEL,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      requestCount: 0,
      costSource: 'runtime_tokens',
    }
  }

  async settleEmbeddingBillingBatch(batch: BrainEmbeddingBillingBatch): Promise<void> {
    if (batch.totalTokens <= 0) return
    const usage = {
      inputTokens: batch.inputTokens,
      outputTokens: batch.outputTokens,
      totalTokens: batch.totalTokens,
    }
    try {
      await this.chargeBrainUsage(
        batch.billing,
        batch.modelName,
        usage,
        'embedding',
        batch.costSource,
      )
      batch.inputTokens = 0
      batch.outputTokens = 0
      batch.totalTokens = 0
      batch.requestCount = 0
    } catch (err) {
      this.logger.error(
        `Brain Gemini embedding batch credit tracking failed after provider usage was incurred: ${err instanceof Error ? err.message : 'Unknown'}`,
      )
    }
  }

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
    const apiKeys = resolveGeminiApiKeys((key) => this.config.get<string>(key))
    if (!apiKeys.length) {
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
    const requestBody = JSON.stringify({
      content: { parts },
      outputDimensionality,
      ...(options.taskType ? { taskType: options.taskType } : {}),
    })
    let chargingProviderUsage = false
    let lastError = 'Unknown Gemini embedding error'

    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
      const apiKey = apiKeys[keyIndex]
      chargingProviderUsage = false

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          },
        )

        if (!res.ok) {
          const errorBody = await res.text()
          lastError = `${res.status} ${res.statusText} - ${errorBody.slice(0, 500)}`
          this.logger.warn(`Gemini embedding API error: ${lastError}`)
          if (shouldTryNextGeminiApiKey(res.status) && keyIndex < apiKeys.length - 1) {
            this.logger.warn('Trying next Gemini API key for embedding')
            continue
          }
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
        if (options.billingBatch) {
          this.accumulateEmbeddingBillingBatch(options.billingBatch, model, chargeUsage, costSource)
        } else {
          chargingProviderUsage = true
          try {
            await this.chargeBrainUsage(
              options.billing,
              model,
              chargeUsage,
              'embedding',
              costSource,
            )
          } catch (err) {
            this.logger.error(
              `Brain Gemini embedding credit tracking failed after provider usage was incurred: ${err instanceof Error ? err.message : 'Unknown'}`,
            )
          } finally {
            chargingProviderUsage = false
          }
        }

        return { embedding, usage }
      } catch (err) {
        if (chargingProviderUsage) {
          this.logger.error(
            `Brain Gemini embedding credit tracking failed after provider usage was incurred: ${err instanceof Error ? err.message : 'Unknown'}`,
          )
          return { embedding: null, usage: { ...DEFAULT_USAGE } }
        }
        lastError = err instanceof Error ? err.message : 'Unknown'
        this.logger.warn(`Gemini embedding failed: ${lastError}`)
      }
    }

    this.logger.warn(`Gemini embedding failed after ${apiKeys.length} key(s): ${lastError}`)
    return { embedding: null, usage: { ...DEFAULT_USAGE } }
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
    const result = await this.callGeminiWithUsage(prompt, systemPrompt, billing)
    return result.text
  }

  async callGeminiWithUsage(
    prompt: string,
    systemPrompt?: string,
    billing?: BrainGeminiBillingContext,
    options: GeminiTextOptions = {},
  ): Promise<GeminiTextResult> {
    const apiKeys = resolveGeminiApiKeys((key) => this.config.get<string>(key))
    if (!apiKeys.length) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const generationConfig: Record<string, unknown> = {
      temperature: 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
      responseMimeType: 'application/json',
    }
    if (options.responseSchema) generationConfig.responseSchema = options.responseSchema
    if (options.thinkingLevel) {
      generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel }
    }
    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    }

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] }
    }

    let lastError = 'Gemini LLM API error'
    for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
      const apiKey = apiKeys[keyIndex]
      const res = await fetch(`${LLM_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        lastError = `Gemini LLM API error: ${res.status} ${res.statusText}`
        if (shouldTryNextGeminiApiKey(res.status) && keyIndex < apiKeys.length - 1) {
          this.logger.warn('Trying next Gemini API key for Gemini LLM call')
          continue
        }
        throw new Error(lastError)
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
      const providerCostUsd = await this.chargeBrainUsage(
        billing,
        LLM_MODEL_FOR_PRICING,
        chargeUsage,
        'gemini_llm',
        costSource,
      )

      return { text, usage: chargeUsage, providerCostUsd }
    }

    throw new Error(lastError)
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
  ): Promise<number> {
    if (!billing?.userId || usage.totalTokens <= 0) return 0
    if (!this.creditsService) {
      throw new Error('Credits service is required for Brain Gemini billing')
    }
    const result = await this.creditsService.processDirectTextUsage({
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
    return result?.apiCost ?? 0
  }

  private accumulateEmbeddingBillingBatch(
    batch: BrainEmbeddingBillingBatch,
    modelName: string,
    usage: GeminiTokenUsage,
    costSource: 'runtime_tokens' | 'char_estimate',
  ): void {
    if (batch.modelName !== modelName) {
      throw new Error(
        `Embedding billing batch model mismatch: expected ${batch.modelName}, received ${modelName}`,
      )
    }
    batch.inputTokens += usage.inputTokens
    batch.outputTokens += usage.outputTokens
    batch.totalTokens += usage.totalTokens
    batch.requestCount += 1
    if (costSource === 'char_estimate') batch.costSource = 'char_estimate'
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
