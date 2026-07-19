import { z } from 'zod'

const HomeLayoutSchema = z.object({
  cardIds: z.array(z.string().min(1).max(64)).max(32),
  cardSizes: z.record(z.string(), z.enum(['half', 'full'])).optional(),
})

export const UpdatePreferencesSchema = z
  .object({
    home_layout: HomeLayoutSchema.optional(),
  })
  .strict()

export type UpdatePreferencesInput = z.infer<typeof UpdatePreferencesSchema>
