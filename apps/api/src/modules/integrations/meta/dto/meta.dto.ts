import { z } from 'zod'

export const StartMetaOAuthSchema = z.object({
  redirectTo: z.string().min(1, 'redirectTo is required'),
  connection_scope: z.enum(['personal', 'org_shared']).optional(),
})

export type StartMetaOAuthDto = z.infer<typeof StartMetaOAuthSchema>

export const CreateMetaPixelSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  data_use_setting: z.string().optional(),
})

export type CreateMetaPixelDto = z.infer<typeof CreateMetaPixelSchema>

export const CreateMetaCustomAudienceSchema = z.object({
  name: z.string().min(1, 'name is required'),
  rule: z.record(z.unknown()).optional(),
  retention_days: z.number().int().min(0).optional(),
})

export type CreateMetaCustomAudienceDto = z.infer<typeof CreateMetaCustomAudienceSchema>

export const CreateMetaLookalikeSchema = z.object({
  name: z.string().min(1, 'name is required'),
  origin_audience_id: z.string().min(1, 'origin_audience_id is required'),
  country: z.string().min(1, 'country is required'),
  ratio: z.number().min(0.01).max(0.1).optional(),
})

export type CreateMetaLookalikeDto = z.infer<typeof CreateMetaLookalikeSchema>

export const CreateMetaCustomConversionSchema = z.object({
  name: z.string().min(1, 'name is required'),
  event_source_id: z.string().min(1, 'event_source_id is required'),
  custom_event_type: z.string().min(1, 'custom_event_type is required'),
  rule: z.string().optional(),
})

export type CreateMetaCustomConversionDto = z.infer<typeof CreateMetaCustomConversionSchema>
