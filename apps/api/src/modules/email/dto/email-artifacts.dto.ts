import { z } from 'zod'

export const EmailIdParamSchema = z.object({
  id: z.string().uuid(),
})
export type EmailIdParam = z.infer<typeof EmailIdParamSchema>

export const CampaignIdParamSchema = z.object({
  campaignId: z.string().uuid(),
})
export type CampaignIdParam = z.infer<typeof CampaignIdParamSchema>

export const CreateEmailArtifactSchema = z.object({
  subject: z.string().min(1).max(1000),
  body: z.string().min(1).max(20000),
  space_id: z.string().uuid(),
  source_item_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
})
export type CreateEmailArtifactDto = z.infer<typeof CreateEmailArtifactSchema>

export const CreateCampaignEmailArtifactSchema = z.object({
  space_id: z.string().uuid(),
  subject: z.string().min(1).max(1000).optional(),
})
export type CreateCampaignEmailArtifactDto = z.infer<typeof CreateCampaignEmailArtifactSchema>

export const EmailArtifactStatusSchema = z.enum(['draft', 'ready', 'sent'])

export const UpdateEmailArtifactSchema = z
  .object({
    subject: z.string().min(1).max(1000).optional(),
    body: z.string().max(20000).optional(),
    status: EmailArtifactStatusSchema.optional(),
  })
  .refine(
    (value) =>
      value.subject !== undefined || value.body !== undefined || value.status !== undefined,
    { message: 'At least one of subject, body, or status is required' },
  )
export type UpdateEmailArtifactDto = z.infer<typeof UpdateEmailArtifactSchema>
