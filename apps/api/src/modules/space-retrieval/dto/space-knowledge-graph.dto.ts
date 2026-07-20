import { z } from 'zod'

export const SpaceKnowledgeGraphParamSchema = z.object({
  spaceId: z.string().uuid(),
})

export type SpaceKnowledgeGraphParam = z.infer<typeof SpaceKnowledgeGraphParamSchema>

export const CampaignKnowledgeGraphParamSchema = z.object({
  campaignId: z.string().uuid(),
})

export type CampaignKnowledgeGraphParam = z.infer<typeof CampaignKnowledgeGraphParamSchema>

export const KnowledgeGraphStatsBatchQuerySchema = z.object({
  space_ids: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  campaign_ids: z
    .string()
    .optional()
    .transform((value) =>
      (value ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
})

export type KnowledgeGraphStatsBatchQuery = z.infer<typeof KnowledgeGraphStatsBatchQuerySchema>

/** Default/max high enough for Page Grader campaign rollups (~1k+ objects). */
export const KNOWLEDGE_GRAPH_DEFAULT_LIMIT = 2500
export const KNOWLEDGE_GRAPH_MAX_LIMIT = 5000

export const KnowledgeGraphQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => {
      const numeric = Number(value ?? KNOWLEDGE_GRAPH_DEFAULT_LIMIT)
      return Number.isFinite(numeric)
        ? Math.min(Math.max(Math.floor(numeric), 1), KNOWLEDGE_GRAPH_MAX_LIMIT)
        : KNOWLEDGE_GRAPH_DEFAULT_LIMIT
    }),
})

export type KnowledgeGraphQuery = z.infer<typeof KnowledgeGraphQuerySchema>
