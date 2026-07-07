import { z } from 'zod'

export const GenerateAdConceptsSchema = z.object({
  audience: z.string().max(8000).optional().default(''),
  offer_cta: z.string().max(8000).optional().default(''),
  brand_guidelines: z.string().max(8000).optional().default(''),
  attached_asset_instructions: z.string().max(8000).optional().default(''),
  reference_description: z.string().max(12000).optional().default(''),
})

export type GenerateAdConceptsInput = z.infer<typeof GenerateAdConceptsSchema>
