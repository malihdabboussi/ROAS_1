import { z } from 'zod'

export const UpdateSkillRecommendationSettingsSchema = z.object({
  enabled: z.boolean(),
})

export type UpdateSkillRecommendationSettingsInput = z.infer<
  typeof UpdateSkillRecommendationSettingsSchema
>

export const UpdateSkillRecommendationSchema = z.object({
  status: z.enum(['dismissed', 'converted']),
})

export type UpdateSkillRecommendationInput = z.infer<typeof UpdateSkillRecommendationSchema>
