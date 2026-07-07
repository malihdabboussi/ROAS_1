const MB = 1024 * 1024

export const READ_DOCUMENT_TOOL_SCHEMA = {
  name: 'read_document',
  description:
    'Read a file by asset_id. Use mode=describe for metadata, mode=read for page ranges, mode=search for indexed lookup.',
  parameters: {
    type: 'object',
    properties: {
      asset_id: { type: 'string' },
      mode: { type: 'string', enum: ['describe', 'read', 'search'], default: 'read' },
      page_range: {
        type: 'array',
        minItems: 2,
        maxItems: 2,
        items: { type: 'integer' },
      },
      query: { type: 'string' },
      max_pages: { type: 'integer', default: 20 },
      model_id: { type: 'string' },
    },
    required: ['asset_id'],
  },
} as const

export const MODEL_LIMITS = {
  'google/gemini-3.5-flash': { pdf: { maxPages: 3000, maxBytes: 50 * MB } },
  'gemini-2.5-flash': { pdf: { maxPages: 1000, maxBytes: 50 * MB } },
  'gemini-2.5-pro': { pdf: { maxPages: 1000, maxBytes: 50 * MB } },
  'anthropic/claude-sonnet-4.6': { pdf: { maxPages: 600, maxBytes: 32 * MB } },
  'anthropic/claude-opus-4.6': { pdf: { maxPages: 600, maxBytes: 32 * MB } },
  'anthropic/claude-opus-4.7': { pdf: { maxPages: 600, maxBytes: 32 * MB } },
  'anthropic/claude-sonnet-4-20250514': { pdf: { maxPages: 100, maxBytes: 32 * MB } },
  'anthropic/claude-opus-4-20250514': { pdf: { maxPages: 100, maxBytes: 32 * MB } },
  'openai/gpt-5.4': { pdf: { maxPages: null as number | null, maxBytes: 50 * MB } },
  'openai/gpt-5.4-pro': { pdf: { maxPages: null as number | null, maxBytes: 50 * MB } },
  'openai/gpt-5.5': { pdf: { maxPages: null as number | null, maxBytes: 50 * MB } },
} as const

export function canUseNativeInput(modelId: string, bytes: number, pagesInRange: number): boolean {
  const normalized = modelId.replace(/^openrouter\//, '')
  const limits =
    MODEL_LIMITS[normalized as keyof typeof MODEL_LIMITS] ??
    MODEL_LIMITS[`openrouter/${normalized}` as keyof typeof MODEL_LIMITS]
  if (!limits) return bytes <= 32 * MB && pagesInRange <= 600
  const { maxBytes, maxPages } = limits.pdf
  if (bytes > maxBytes) return false
  if (maxPages != null && pagesInRange > maxPages) return false
  return true
}
