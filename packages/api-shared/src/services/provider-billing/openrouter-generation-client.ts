import {
  normalizeOpenRouterGenerationPayload,
  validateOpenRouterSettledCost,
} from './openrouter-metadata'
import type { OpenRouterGenerationSettlement } from './provider-billing.types'

export const OPENROUTER_GENERATION_LOOKUP_URL =
  'https://openrouter.ai/api/v1/generation'

export class OpenRouterGenerationLookupError extends Error {
  readonly status: number
  readonly retryable: boolean
  readonly responseBody?: string

  constructor(message: string, status: number, retryable: boolean, responseBody?: string) {
    super(message)
    this.name = 'OpenRouterGenerationLookupError'
    this.status = status
    this.retryable = retryable
    this.responseBody = responseBody
  }
}

export interface FetchOpenRouterGenerationOptions {
  apiKey: string
  generationId: string
  fetchImpl?: typeof fetch
  appTitle?: string
  referer?: string
}

export async function fetchOpenRouterGeneration(
  options: FetchOpenRouterGenerationOptions,
): Promise<OpenRouterGenerationSettlement> {
  const fetchFn = options.fetchImpl ?? fetch
  const url = new URL(OPENROUTER_GENERATION_LOOKUP_URL)
  url.searchParams.set('id', options.generationId)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${options.apiKey}`,
  }
  if (options.appTitle) headers['X-Title'] = options.appTitle
  if (options.referer) headers['HTTP-Referer'] = options.referer

  const response = await fetchFn(url.toString(), { headers })
  if (!response.ok) {
    const body = await safeResponseText(response)
    throw new OpenRouterGenerationLookupError(
      `OpenRouter generation lookup failed with status ${response.status}`,
      response.status,
      isRetryableOpenRouterGenerationStatus(response.status),
      body,
    )
  }

  const payload = await response.json()
  const settlement = normalizeOpenRouterGenerationPayload(payload)
  if (!settlement.generationId) {
    settlement.raw = {
      ...settlement.raw,
      requested_generation_id: options.generationId,
    }
    return { ...settlement, generationId: options.generationId }
  }
  return settlement
}

export function isRetryableOpenRouterGenerationStatus(status: number): boolean {
  return status === 404 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

export function isRetryableOpenRouterGenerationLookupError(error: unknown): boolean {
  return error instanceof OpenRouterGenerationLookupError && error.retryable
}

export function isOpenRouterSettlementReady(
  settlement: OpenRouterGenerationSettlement,
  modelName?: string | null,
): boolean {
  return validateOpenRouterSettledCost(settlement, modelName).acceptable
}

async function safeResponseText(response: Response): Promise<string | undefined> {
  try {
    const text = await response.text()
    return text.slice(0, 2000)
  } catch {
    return undefined
  }
}
