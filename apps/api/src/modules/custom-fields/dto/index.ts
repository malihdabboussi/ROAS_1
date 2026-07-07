import { z } from 'zod'

export const FIELD_TYPES = ['text', 'number', 'date', 'dropdown', 'boolean'] as const
export type FieldType = (typeof FIELD_TYPES)[number]

// Create Custom Field Definition DTO
export const CreateCustomFieldDtoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
  field_type: z.enum(FIELD_TYPES).default('text'),
  options: z.array(z.string()).optional().default([]),
  default_value: z.string().nullable().optional(),
  is_required: z.boolean().optional().default(false),
})

export type CreateCustomFieldInput = z.infer<typeof CreateCustomFieldDtoSchema>

// Update Custom Field Definition DTO
export const UpdateCustomFieldDtoSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  field_type: z.enum(FIELD_TYPES).optional(),
  options: z.array(z.string()).optional(),
  default_value: z.string().nullable().optional(),
  is_required: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
})

export type UpdateCustomFieldInput = z.infer<typeof UpdateCustomFieldDtoSchema>

// Field ID Param DTO
export const CustomFieldIdParamSchema = z.object({
  id: z.string().uuid('Invalid custom field ID format'),
})

export type CustomFieldIdParam = z.infer<typeof CustomFieldIdParamSchema>

// Custom Field Definition response type
export interface CustomFieldDefinition {
  id: string
  user_id: string
  name: string
  field_key: string
  field_type: FieldType
  options: string[]
  default_value: string | null
  is_required: boolean
  is_system?: boolean
  display_order: number
  created_at: string
  updated_at: string
}
