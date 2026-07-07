import { z } from 'zod'

export const GenerateSubdomainSchema = z.object({
  preferred_username: z
    .string()
    .min(3)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
    .optional(),
})

export type GenerateSubdomainDto = z.infer<typeof GenerateSubdomainSchema>
