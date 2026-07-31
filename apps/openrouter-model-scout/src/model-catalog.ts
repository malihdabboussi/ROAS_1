import { ERRORS } from './errors.config.js'

const MODELS_URL = 'https://openrouter.ai/api/v1/models'
const MODEL_URL = 'https://openrouter.ai/api/v1/model'

export type ModelSort =
  | 'context-high-to-low'
  | 'latency-low-to-high'
  | 'most-popular'
  | 'newest'
  | 'pricing-high-to-low'
  | 'pricing-low-to-high'
  | 'throughput-high-to-low'

interface OpenRouterModel {
  architecture?: {
    input_modalities?: string[]
    output_modalities?: string[]
  }
  canonical_slug?: string
  context_length?: number
  id: string
  name?: string
  pricing?: Record<string, string | unknown>
  supported_parameters?: string[]
  top_provider?: {
    max_completion_tokens?: number | null
  }
}

export interface ModelCatalogEntry {
  canonicalSlug: string
  completionPricePerMillion: number | null
  contextLength: number | null
  id: string
  inputModalities: string[]
  maxCompletionTokens: number | null
  name: string
  outputModalities: string[]
  promptPricePerMillion: number | null
  supportedParameters: string[]
  supportsReasoning: boolean
  supportsStructuredOutputs: boolean
  supportsTools: boolean
}

interface FetchOptions {
  apiKey: string
  fetchImpl?: typeof fetch
}

export interface ModelSearchInput {
  limit?: number
  outputModalities?: string[]
  query?: string
  requireTools?: boolean
  sort?: ModelSort
}

function perMillion(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Number((parsed * 1_000_000).toPrecision(12)) : null
}

function normalizeModel(model: OpenRouterModel): ModelCatalogEntry {
  const supportedParameters = model.supported_parameters ?? []
  return {
    canonicalSlug: model.canonical_slug ?? model.id,
    completionPricePerMillion: perMillion(model.pricing?.completion),
    contextLength: model.context_length ?? null,
    id: model.id,
    inputModalities: model.architecture?.input_modalities ?? ['text'],
    maxCompletionTokens: model.top_provider?.max_completion_tokens ?? null,
    name: model.name ?? model.id,
    outputModalities: model.architecture?.output_modalities ?? ['text'],
    promptPricePerMillion: perMillion(model.pricing?.prompt),
    supportedParameters,
    supportsReasoning:
      supportedParameters.includes('reasoning') || supportedParameters.includes('reasoning_effort'),
    supportsStructuredOutputs: supportedParameters.includes('structured_outputs'),
    supportsTools: supportedParameters.includes('tools'),
  }
}

async function readJson<T>(url: URL, options: FetchOptions): Promise<T> {
  const response = await (options.fetchImpl ?? fetch)(url, {
    headers: { Authorization: `Bearer ${options.apiKey}` },
  })
  if (!response.ok) {
    throw new Error(`OpenRouter model catalog request failed: ${response.status}`)
  }
  return (await response.json()) as T
}

export async function searchModels(
  input: ModelSearchInput,
  options: FetchOptions,
): Promise<{ models: ModelCatalogEntry[]; returned: number }> {
  const url = new URL(MODELS_URL)
  if (input.query?.trim()) url.searchParams.set('q', input.query.trim())
  if (input.requireTools) url.searchParams.set('supported_parameters', 'tools')
  if (input.outputModalities?.length) {
    url.searchParams.set('output_modalities', input.outputModalities.join(','))
  }
  if (input.sort) url.searchParams.set('sort', input.sort)

  const payload = await readJson<{ data?: OpenRouterModel[] }>(url, options)
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 25)
  const models = (payload.data ?? []).slice(0, limit).map(normalizeModel)
  return { models, returned: models.length }
}

export async function fetchModel(id: string, options: FetchOptions): Promise<ModelCatalogEntry> {
  const normalizedId = id.trim().replace(/^openrouter\//, '')
  if (!/^[a-z0-9._-]+\/[a-z0-9._:-]+$/i.test(normalizedId)) {
    throw new Error(ERRORS.modelIdFormat)
  }
  const url = new URL(`${MODEL_URL}/${normalizedId}`)
  const payload = await readJson<{ data: OpenRouterModel }>(url, options)
  return normalizeModel(payload.data)
}
