import { z } from 'zod'
import { DAILY_RECOMMENDATION_KEYS } from '../config/daily-recommendation-rules'

export const ListRecentCommunicationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(15),
})

export type ListRecentCommunicationsQuery = z.infer<typeof ListRecentCommunicationsQuerySchema>

export const DailyRecommendationKeySchema = z.enum(DAILY_RECOMMENDATION_KEYS)

export const DailyRecommendationQuerySchema = z.object({
  retain: z
    .string()
    .optional()
    .transform((value) => {
      if (!value?.trim()) return []
      return value
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean)
    })
    .pipe(z.array(DailyRecommendationKeySchema)),
})

export type DailyRecommendationQuery = z.infer<typeof DailyRecommendationQuerySchema>

export const NextMoveParamsSchema = z.object({
  id: z.string().uuid(),
})

export const NextMoveSnoozeBodySchema = z.object({
  duration: z.enum(['week', 'dismiss']),
})

export const NextMoveFeedbackBodySchema = z.object({
  feedback: z.enum(['accepted', 'false_positive']),
})
