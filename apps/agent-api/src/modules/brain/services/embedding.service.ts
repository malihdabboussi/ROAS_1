import { createHash } from 'crypto'
import { Injectable, Logger, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CreditsService } from '../../billing/services/credits.service'

const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-2'
const LLM_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'
const EMBEDDING_DIMENSIONS = 768
const DEFAULT_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
const LLM_MODEL_FOR_PRICING = 'gemini-3.5-flash'
const EMBEDDING_MAX_ATTEMPTS = 4

export interface GeminiTokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type BrainEmbeddingUsageSummary = {
  model: string
  calls: number
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

type BrainEmbeddingTimingContext = {
  requestId: string
  startedAt: number
  base: Record<string, unknown>
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
  private embeddingTimingSequence = 0
  private readonly usage: BrainEmbeddingUsageSummary = {
    model: DEFAULT_EMBEDDING_MODEL,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  }

  constructor(
    private readonly config: ConfigService,
    @Optional() private readonly creditsService?: CreditsService,
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

  getUsageSummary(): BrainEmbeddingUsageSummary {
    return { ...this.usage }
  }

  resetUsageSummary(): void {
    this.usage.model = DEFAULT_EMBEDDING_MODEL
    this.usage.calls = 0
    this.usage.inputTokens = 0
    this.usage.outputTokens = 0
    this.usage.totalTokens = 0
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
    const timing = this.createEmbeddingTimingContext(parts, options, model, outputDimensionality)
    let chargingProviderUsage = false
    this.logEmbeddingTiming('start', timing, { max_attempts: EMBEDDING_MAX_ATTEMPTS })

    for (let attempt = 1; attempt <= EMBEDDING_MAX_ATTEMPTS; attempt += 1) {
      const attemptMeta = { attempt, max_attempts: EMBEDDING_MAX_ATTEMPTS }
      try {
        const requestBody = JSON.stringify({
          content: { parts },
          outputDimensionality,
          ...(options.taskType ? { taskType: options.taskType } : {}),
        })
        const fetchStartedAt = Date.now()
        this.logEmbeddingTiming('fetch_start', timing, attemptMeta)
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          },
        )
        this.logEmbeddingTiming('headers_received', timing, {
          ...attemptMeta,
          fetch_ms: Date.now() - fetchStartedAt,
          ok: res.ok,
          status: res.status,
          status_text: res.statusText,
        })

        if (!res.ok) {
          this.logger.warn(`Gemini embedding API error: ${res.status} ${res.statusText}`)
          this.logEmbeddingTiming('provider_error', timing, {
            ...attemptMeta,
            status: res.status,
            status_text: res.statusText,
            will_retry:
              (res.status === 429 || res.status >= 500) && attempt < EMBEDDING_MAX_ATTEMPTS,
          })
          if ((res.status === 429 || res.status >= 500) && attempt < EMBEDDING_MAX_ATTEMPTS) {
            await this.sleep(750 * attempt * attempt)
            continue
          }
          this.logEmbeddingTiming('done', timing, { ...attemptMeta, status: 'provider_error' })
          return { embedding: null, usage: { ...DEFAULT_USAGE } }
        }

        const jsonStartedAt = Date.now()
        const data = await res.json()
        const usage = this.parseUsageFromGeminiResponse(data)
        const embedding = data.embedding?.values ?? null
        this.logEmbeddingTiming('json_parsed', timing, {
          ...attemptMeta,
          json_ms: Date.now() - jsonStartedAt,
          embedding_present: Array.isArray(embedding),
          dimensions: Array.isArray(embedding) ? embedding.length : 0,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          total_tokens: usage.totalTokens,
        })
        this.recordUsage(model, usage)
        this.logEmbeddingTiming('usage_recorded', timing, {
          ...attemptMeta,
          calls: this.usage.calls,
          total_tokens: this.usage.totalTokens,
        })

        const costSource = usage.totalTokens > 0 ? 'runtime_tokens' : 'char_estimate'
        let chargeUsage = usage
        if (usage.totalTokens <= 0 && options.billing?.userId) {
          const estimatedTokens = Math.max(1, Math.ceil(JSON.stringify(parts).length / 4))
          chargeUsage = {
            inputTokens: estimatedTokens,
            outputTokens: 0,
            totalTokens: estimatedTokens,
          }
        }
        chargingProviderUsage = true
        await this.chargeBrainUsage(
          options.billing,
          model,
          chargeUsage,
          'embedding',
          costSource,
          timing,
        )
        chargingProviderUsage = false

        this.logEmbeddingTiming('done', timing, {
          ...attemptMeta,
          status: 'success',
          embedding_present: Array.isArray(embedding),
          dimensions: Array.isArray(embedding) ? embedding.length : 0,
        })
        return { embedding, usage }
      } catch (err) {
        if (chargingProviderUsage) {
          this.logEmbeddingTiming('done', timing, { ...attemptMeta, status: 'charge_error' })
          throw err
        }
        this.logger.warn(
          `Gemini embedding failed: ${err instanceof Error ? err.message : 'Unknown'}`,
        )
        this.logEmbeddingTiming('error', timing, {
          ...attemptMeta,
          error: err instanceof Error ? err.message.slice(0, 200) : 'Unknown',
          will_retry: attempt < EMBEDDING_MAX_ATTEMPTS,
        })
        if (attempt < EMBEDDING_MAX_ATTEMPTS) {
          await this.sleep(750 * attempt * attempt)
          continue
        }
        this.logEmbeddingTiming('done', timing, { ...attemptMeta, status: 'error' })
        return { embedding: null, usage: { ...DEFAULT_USAGE } }
      }
    }
    this.logEmbeddingTiming('done', timing, { status: 'exhausted' })
    return { embedding: null, usage: { ...DEFAULT_USAGE } }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
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
  ): Promise<{ text: string; usage: GeminiTokenUsage }> {
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
    const usage = this.parseUsageFromGeminiResponse(data)
    const costSource = usage.totalTokens > 0 ? 'runtime_tokens' : 'char_estimate'
    let chargeUsage = usage
    if (usage.totalTokens <= 0 && billing?.userId) {
      const inputTokens = Math.max(1, Math.ceil(prompt.length / 4))
      const outputTokens = Math.max(1, Math.ceil(text.length / 4))
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

    return { text, usage }
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
    costSource: 'runtime_tokens' | 'char_estimate' = 'runtime_tokens',
    timing?: BrainEmbeddingTimingContext,
  ): Promise<void> {
    if (!billing?.userId || usage.totalTokens <= 0) {
      if (timing) {
        this.logEmbeddingTiming('usage_charge_skipped', timing, {
          action,
          reason: !billing?.userId
            ? 'missing_billing_user'
            : 'zero_tokens',
        })
      }
      return
    }
    if (!this.creditsService) {
      throw new Error('Credits service is required for Brain Gemini billing')
    }
    const chargeStartedAt = Date.now()
    this.logEmbeddingTiming('usage_charge_started', timing, { action, model_name: modelName })
    try {
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
      this.logEmbeddingTiming('usage_charge_done', timing, {
        action,
        usage_charge_ms: Date.now() - chargeStartedAt,
        charged: result != null,
      })
    } catch (err) {
      this.logEmbeddingTiming('usage_charge_error', timing, {
        action,
        usage_charge_ms: Date.now() - chargeStartedAt,
        error: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
      })
      this.logger.error(`Brain Gemini credit tracking failed: ${err}`)
      throw err
    }
  }

  private recordUsage(model: string, usage: GeminiTokenUsage): void {
    this.usage.model = model
    this.usage.calls += 1
    this.usage.inputTokens += usage.inputTokens
    this.usage.outputTokens += usage.outputTokens
    this.usage.totalTokens += usage.totalTokens
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

  private createEmbeddingTimingContext(
    parts: GeminiEmbeddingPart[],
    options: GeminiEmbeddingOptions,
    model: string,
    outputDimensionality: number,
  ): BrainEmbeddingTimingContext {
    const requestId = this.nextEmbeddingTimingRequestId()
    return {
      requestId,
      startedAt: Date.now(),
      base: {
        request_id: requestId,
        model,
        task_type: options.taskType ?? null,
        output_dimensionality: outputDimensionality,
        part_count: parts.length,
        text_chars: parts.reduce((sum, part) => sum + ('text' in part ? part.text.length : 0), 0),
        inline_part_count: parts.filter((part) => 'inline_data' in part).length,
        billing_present: Boolean(options.billing?.userId),
        user_id: options.billing?.userId ?? null,
        org_id: options.billing?.orgId ?? null,
      },
    }
  }

  private nextEmbeddingTimingRequestId(): string {
    this.embeddingTimingSequence =
      this.embeddingTimingSequence >= Number.MAX_SAFE_INTEGER ? 1 : this.embeddingTimingSequence + 1
    return `emb_${Date.now().toString(36)}_${this.embeddingTimingSequence}`
  }

  private logEmbeddingTiming(
    stage: string,
    timing: BrainEmbeddingTimingContext | undefined,
    extra?: Record<string, unknown>,
  ): void {
    if (!timing || !this.embeddingTimingLogsEnabled()) return
    this.logger.log(
      JSON.stringify({
        feature: 'brain_embedding_timing_v1',
        stage,
        latency_ms: Date.now() - timing.startedAt,
        ...timing.base,
        ...(extra ?? {}),
      }),
    )
  }

  private embeddingTimingLogsEnabled(): boolean {
    const setting = this.config.get<string>('BRAIN_EMBEDDING_TIMING_LOGS')
    if (setting === undefined) return false
    return !['0', 'false', 'off', 'no'].includes(setting.toLowerCase())
  }
}
