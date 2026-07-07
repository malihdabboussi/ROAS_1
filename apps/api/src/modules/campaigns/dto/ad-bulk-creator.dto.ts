import { z } from 'zod'

export const GenerateVariationsSchema = z.object({
  baseImageUrl: z.string().url().min(1),
  baseImageAssetId: z.string().uuid().optional(),
  variationCount: z.number().int().min(1).max(10).default(3),
})

export type GenerateVariationsInput = z.infer<typeof GenerateVariationsSchema>

export const RegenerateVariationSchema = z.object({
  baseImageUrl: z.string().url().min(1),
  prompt: z.string().max(2000).optional(),
  presetName: z.string().max(100).optional(),
})

export type RegenerateVariationInput = z.infer<typeof RegenerateVariationSchema>

export const GenerateAdCopySchema = z.object({
  imageUrl: z.string().url().optional(),
  context: z.string().max(5000).optional(),
  count: z.number().int().min(1).max(10).default(3),
})

export type GenerateAdCopyInput = z.infer<typeof GenerateAdCopySchema>
