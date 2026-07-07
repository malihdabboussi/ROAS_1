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

export const KnowledgeGraphQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => {
      const numeric = Number(value ?? 500)
      return Number.isFinite(numeric) ? Math.min(Math.max(Math.floor(numeric), 1), 1000) : 500
    }),
})

export type KnowledgeGraphQuery = z.infer<typeof KnowledgeGraphQuerySchema>
