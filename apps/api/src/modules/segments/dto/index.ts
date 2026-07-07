import { z } from 'zod'

// Segment Filters Schema
export const SegmentFiltersSchema = z.object({
  campaigns: z.array(z.string().uuid()).optional(),
  funnels: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  contact_type: z.array(z.string()).optional(),
  country: z.array(z.string()).optional(),
  date_range: z
    .object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional(),
    })
    .optional(),
})

export type SegmentFiltersInput = z.infer<typeof SegmentFiltersSchema>

// Create Segment DTO
export const CreateSegmentDtoSchema = z.object({
  name: z
    .string()
    .min(1, 'Segment name is required')
    .max(100, 'Segment name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  filters: SegmentFiltersSchema,
})

export type CreateSegmentInput = z.infer<typeof CreateSegmentDtoSchema>

// Update Segment DTO
export const UpdateSegmentDtoSchema = z.object({
  name: z
    .string()
    .min(1, 'Segment name is required')
    .max(100, 'Segment name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .nullable()
    .optional(),
  filters: SegmentFiltersSchema.optional(),
})

export type UpdateSegmentInput = z.infer<typeof UpdateSegmentDtoSchema>
