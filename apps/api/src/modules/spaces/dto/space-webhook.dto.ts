import { z } from 'zod'

export const WebhookEndpointIdParamSchema = z.object({
  endpointId: z.string().uuid(),
})

export const PublicWebhookTokenParamSchema = z.object({
  publicToken: z
    .string()
    .min(24)
    .max(160)
    .regex(/^[A-Za-z0-9_-]+$/),
})

export const WebhookValueTypeSchema = z.enum([
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'null',
  'unknown',
])

export const WebhookFieldMappingSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,63}$/),
  label: z.string().min(1).max(80),
  source_path: z
    .string()
    .min(1)
    .max(300)
    .refine((value) => value.startsWith('/'), {
      message: 'source_path must be a JSON Pointer path',
    }),
  value_type: WebhookValueTypeSchema.optional(),
})

const WebhookFieldMappingsSchema = z
  .array(WebhookFieldMappingSchema)
  .max(50)
  .superRefine((mappings, ctx) => {
    const seen = new Set<string>()
    mappings.forEach((mapping, index) => {
      if (seen.has(mapping.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate mapping key: ${mapping.key}`,
          path: [index, 'key'],
        })
      }
      seen.add(mapping.key)
    })
  })

export const CreateSpaceWebhookEndpointSchema = z.object({
  name: z.string().min(1).max(120),
  field_mappings: WebhookFieldMappingsSchema.optional(),
  sample_payload: z.unknown().optional(),
})

export const UpdateSpaceWebhookEndpointSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    status: z.enum(['active', 'disabled']).optional(),
    field_mappings: WebhookFieldMappingsSchema.optional(),
    sample_payload: z.unknown().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

export const SpaceWebhookEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
})

export type WebhookEndpointIdParam = z.infer<typeof WebhookEndpointIdParamSchema>
export type PublicWebhookTokenParam = z.infer<typeof PublicWebhookTokenParamSchema>
export type WebhookFieldMappingDto = z.infer<typeof WebhookFieldMappingSchema>
export type CreateSpaceWebhookEndpointDto = z.infer<typeof CreateSpaceWebhookEndpointSchema>
export type UpdateSpaceWebhookEndpointDto = z.infer<typeof UpdateSpaceWebhookEndpointSchema>
export type SpaceWebhookEventsQuery = z.infer<typeof SpaceWebhookEventsQuerySchema>
