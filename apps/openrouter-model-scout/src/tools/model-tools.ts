import { tool } from '@openrouter/agent/tool'
import { z } from 'zod'
import { fetchModel, searchModels } from '../model-catalog.js'

const sortSchema = z.enum([
  'pricing-low-to-high',
  'pricing-high-to-low',
  'context-high-to-low',
  'throughput-high-to-low',
  'latency-low-to-high',
  'most-popular',
  'newest',
])

export function createModelTools(apiKey: string) {
  const searchOpenRouterModels = tool({
    name: 'search_openrouter_models',
    description:
      'Search OpenRouter’s live model catalog. Returns exact model IDs, current per-million-token prices, context windows, modalities, and supported parameters.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(25).default(10),
      outputModalities: z.array(z.string()).optional(),
      query: z.string().optional(),
      requireTools: z.boolean().default(true),
      sort: sortSchema.default('pricing-low-to-high'),
    }),
    execute: async (input) => searchModels(input, { apiKey }),
  })

  const getOpenRouterModel = tool({
    name: 'get_openrouter_model',
    description:
      'Look up one exact OpenRouter provider/model ID and return its current canonical metadata.',
    inputSchema: z.object({
      id: z.string().describe('Exact provider/model ID, for example openai/gpt-5.6-luna'),
    }),
    execute: async ({ id }) => fetchModel(id, { apiKey }),
  })

  return [searchOpenRouterModels, getOpenRouterModel] as const
}
