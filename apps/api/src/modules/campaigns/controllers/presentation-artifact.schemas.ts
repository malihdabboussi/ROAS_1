import { z } from 'zod'

export const PresentationFileBodySchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  role: z.string().optional(),
})

export const CreatePresentationBodySchema = z
  .object({
    name: z.string().optional(),
    space_id: z.string().nullable().optional(),
    files: z.array(PresentationFileBodySchema).optional(),
    entry_file: z.string().min(1).optional(),
  })
  .default({})

export const PresentationAssetBodySchema = z.object({
  path: z.string().min(1),
  media_asset_id: z.string().uuid(),
  role: z.string().optional(),
})

export const PresentationCommentBodySchema = z.object({
  body: z.string().trim().min(1),
  slide_index: z.number().int().nonnegative().nullable().optional(),
  element_trace: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const PresentationCommentPatchSchema = z.object({
  body: z.string().trim().min(1).optional(),
  resolved: z.boolean().optional(),
})

export type CreatePresentationBody = z.infer<typeof CreatePresentationBodySchema>
export type PresentationFileBody = z.infer<typeof PresentationFileBodySchema>
export type PresentationAssetBody = z.infer<typeof PresentationAssetBodySchema>
export type PresentationCommentBody = z.infer<typeof PresentationCommentBodySchema>
export type PresentationCommentPatch = z.infer<typeof PresentationCommentPatchSchema>
